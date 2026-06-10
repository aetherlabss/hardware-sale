// Webhook endpoint for MPesa and e-Mola payment confirmations.
// Register this URL in your Vodacom/e-Mola developer portal:
//   https://{your-vercel-domain}/api/payment-callback?secret={PAYMENT_CALLBACK_SECRET}
//
// Uses the Firebase Admin SDK (service account). The Admin SDK bypasses
// Firestore security rules — required because the rules (correctly) forbid the
// client and unauthenticated REST from confirming payments or granting rewards.
// The previous REST-with-public-key approach silently failed after the rules
// were locked down: orders never moved to "pago" and rewards never applied.

import { adminDb, FieldValue } from './_firebaseAdmin';

const PURCHASE_XP = 500;

// Parses orderId from ThirdPartyConversationID: "HWS-{20charOrderId}-{13digitTimestamp}"
function parseOrderId(conversationId: string): string {
  const match = String(conversationId || '').match(/^HWS-([A-Za-z0-9]{20})-\d{13}$/);
  return match?.[1] || '';
}

function verifySecret(req: any): boolean {
  const secret = process.env.PAYMENT_CALLBACK_SECRET;
  if (!secret) {
    console.warn('payment-callback: PAYMENT_CALLBACK_SECRET not set, skipping auth check');
    return true;
  }
  const fromQuery = req.query?.secret;
  const fromHeader = req.headers?.['x-callback-secret'];
  return fromQuery === secret || fromHeader === secret;
}

/**
 * Atomically: confirm/fail the checkout, and — only once, only on success —
 * grant XP/totalSpent/purchaseCount to the buyer's profile and decrement stock.
 * Idempotent: a second callback for the same order sees `rewardedAt` and is a
 * no-op for rewards/stock, so concurrent or retried callbacks never double-count.
 */
async function settlePayment(orderId: string, success: boolean, transactionId?: string): Promise<void> {
  const db = adminDb();
  const checkoutRef = db.collection('checkouts').doc(orderId);

  await db.runTransaction(async (tx) => {
    // ── READS PHASE (Firestore requires all reads before any writes) ──
    const snap = await tx.get(checkoutRef);
    if (!snap.exists) {
      console.warn(`payment-callback: checkout ${orderId} not found`);
      return;
    }
    const data = snap.data() as any;
    const alreadyRewarded = !!data.rewardedAt;
    const grantRewards = success && !alreadyRewarded;

    const sessionId: string | undefined = data.sessionId;
    const total = Number(data.total);
    const items: any[] = Array.isArray(data.items) ? data.items : [];

    let profileRef: FirebaseFirestore.DocumentReference | null = null;
    let profileExists = false;
    const stockWrites: { ref: FirebaseFirestore.DocumentReference; qty: number; tracksStock: boolean }[] = [];

    if (grantRewards) {
      if (sessionId && Number.isFinite(total) && total > 0) {
        profileRef = db.collection('client_profiles').doc(sessionId);
        profileExists = (await tx.get(profileRef)).exists;
      }
      for (const line of items) {
        const id = line?.id;
        const qty = Math.floor(Number(line?.qty)) || 0;
        if (!id || qty <= 0) continue;
        const ref = db.collection('products').doc(String(id));
        const prodSnap = await tx.get(ref);
        // Only touch products that still exist (avoid aborting the whole tx).
        if (prodSnap.exists) {
          const tracksStock = typeof prodSnap.get('stockQty') === 'number';
          stockWrites.push({ ref, qty, tracksStock });
        }
      }
    }

    // ── WRITES PHASE ──
    if (!success) {
      tx.update(checkoutRef, {
        paymentStatus: 'failed',
        ...(transactionId ? { transactionId } : {}),
      });
      return;
    }

    const update: Record<string, any> = {
      paymentStatus: 'confirmed',
      status: 'pago',
      ...(transactionId ? { transactionId } : {}),
    };
    if (grantRewards) {
      update.rewardedAt = Date.now();
      update.statusHistory = FieldValue.arrayUnion({ status: 'pago', at: Date.now() });
    }
    tx.update(checkoutRef, update);

    if (!grantRewards) return; // idempotent: rewards + stock applied only once

    if (profileRef && profileExists) {
      tx.update(profileRef, {
        xp: FieldValue.increment(PURCHASE_XP),
        totalSpent: FieldValue.increment(Math.round(total)),
        purchaseCount: FieldValue.increment(1),
      });
    }
    for (const w of stockWrites) {
      tx.update(w.ref, {
        soldCount: FieldValue.increment(w.qty),
        ...(w.tracksStock ? { stockQty: FieldValue.increment(-w.qty) } : {}),
      });
    }
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySecret(req)) {
    console.warn('payment-callback: unauthorized request rejected');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body || {};

    // ---- MPesa Vodacom callback ----
    if (body.output_ResponseCode !== undefined) {
      const orderId = parseOrderId(body.input_ThirdPartyConversationID || '');
      const success = body.output_ResponseCode === 'INS-0';
      if (orderId) {
        await settlePayment(orderId, success, body.output_TransactionID);
      } else {
        console.warn('payment-callback MPesa: could not parse orderId from', body.input_ThirdPartyConversationID);
      }
      return res.status(200).json({ output_ResponseCode: 'INS-0', output_ResponseDesc: 'Request processed successfully' });
    }

    // ---- e-Mola callback ----
    if (body.transaction_id !== undefined || body.reference !== undefined) {
      const orderId: string = body.reference || parseOrderId(body.transaction_id || '');
      const success = body.status === 'success' || body.status === 'completed' || body.code === '200';
      if (orderId) {
        await settlePayment(orderId, success, body.transaction_id);
      } else {
        console.warn('payment-callback e-Mola: could not parse orderId', JSON.stringify(body));
      }
      return res.status(200).json({ status: 'received' });
    }

    console.warn('payment-callback: unknown payload format', JSON.stringify(body));
    return res.status(200).json({ status: 'acknowledged' });
  } catch (err: any) {
    console.error('payment-callback error:', err?.message || err);
    // Always 200 so providers don't hammer retries on our internal errors.
    return res.status(200).json({ status: 'error_logged' });
  }
}
