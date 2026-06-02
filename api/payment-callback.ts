// Webhook endpoint for MPesa and e-Mola payment confirmations
// Register this URL in your Vodacom/e-Mola developer portal:
//   https://{your-vercel-domain}/api/payment-callback?secret={PAYMENT_CALLBACK_SECRET}
//
// Uses Firestore REST API (no firebase-admin needed — rules are open)

const FIREBASE_PROJECT = 'hardware-sale';
const FIREBASE_DATABASE = '(default)';

function getFirebaseApiKey(): string {
  const key = process.env.FIREBASE_API_KEY;
  if (!key) throw new Error('FIREBASE_API_KEY env var is not set');
  return key;
}

// Parses orderId from ThirdPartyConversationID: "HWS-{20charOrderId}-{13digitTimestamp}"
function parseOrderId(conversationId: string): string {
  const match = conversationId.match(/^HWS-([A-Za-z0-9]{20})-\d{13}$/);
  return match?.[1] || '';
}

async function getCheckout(orderId: string): Promise<{ total?: number; sessionId?: string; userId?: string; rewardedAt?: number } | null> {
  const apiKey = getFirebaseApiKey();
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/${FIREBASE_DATABASE}/documents/checkouts/${orderId}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const f = data.fields || {};
  return {
    total: f.total?.doubleValue ?? f.total?.integerValue ? Number(f.total.doubleValue ?? f.total.integerValue) : undefined,
    sessionId: f.sessionId?.stringValue,
    userId: f.userId?.stringValue,
    rewardedAt: f.rewardedAt?.integerValue ? Number(f.rewardedAt.integerValue) : undefined,
  };
}

async function updateCheckoutPayment(orderId: string, status: 'confirmed' | 'failed', transactionId?: string) {
  const apiKey = getFirebaseApiKey();
  const maskParts = ['paymentStatus', 'status'];
  if (transactionId) maskParts.push('transactionId');
  if (status === 'confirmed') maskParts.push('rewardedAt');
  const mask = maskParts.map(f => `updateMask.fieldPaths=${f}`).join('&');

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/${FIREBASE_DATABASE}/documents/checkouts/${orderId}?key=${apiKey}&${mask}`;

  const fields: Record<string, any> = {
    paymentStatus: { stringValue: status },
    status:        { stringValue: status === 'confirmed' ? 'pago' : 'pendente' },
  };
  if (transactionId) fields.transactionId = { stringValue: transactionId };
  if (status === 'confirmed') fields.rewardedAt = { integerValue: String(Date.now()) };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore update failed: ${res.status} ${text}`);
  }
}

const PURCHASE_XP = 500;

// Server-authoritative purchase recording: increments xp/totalSpent/purchaseCount
// on the customer's client_profile after a payment is confirmed. The Firestore
// rule blocks the client from doing this directly, eliminating the previous
// XP-inflation vector.
async function rewardProfileForPurchase(sessionId: string, total: number): Promise<void> {
  if (!sessionId || !Number.isFinite(total) || total <= 0) return;
  const apiKey = getFirebaseApiKey();
  const docPath = `projects/${FIREBASE_PROJECT}/databases/${FIREBASE_DATABASE}/documents/client_profiles/${encodeURIComponent(sessionId)}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/${FIREBASE_DATABASE}/documents:commit?key=${apiKey}`;
  // Firestore documentTransform with FieldTransform integer increments
  const body = {
    writes: [{
      transform: {
        document: docPath,
        fieldTransforms: [
          { fieldPath: 'xp',            increment: { integerValue: String(PURCHASE_XP) } },
          { fieldPath: 'totalSpent',    increment: { integerValue: String(Math.round(total)) } },
          { fieldPath: 'purchaseCount', increment: { integerValue: '1' } },
        ],
      },
    }],
  };
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    // Profile may not exist yet — increment-on-missing returns NOT_FOUND.
    // That's fine: the customer hasn't browsed the hub. We just skip rewards.
    console.warn(`profile reward skipped (status ${res.status}): ${text}`);
  }
}

function verifySecret(req: any): boolean {
  const secret = process.env.PAYMENT_CALLBACK_SECRET;
  if (!secret) {
    // No secret configured — warn but allow (development or providers that don't support it)
    console.warn('payment-callback: PAYMENT_CALLBACK_SECRET not set, skipping auth check');
    return true;
  }
  const fromQuery  = req.query?.secret;
  const fromHeader = req.headers?.['x-callback-secret'];
  return fromQuery === secret || fromHeader === secret;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifySecret(req)) {
    console.warn('payment-callback: unauthorized request rejected');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body;

    // ---- MPesa Vodacom callback ----
    // Vodacom sends: output_ResponseCode, output_TransactionID, input_ThirdPartyConversationID
    if (body.output_ResponseCode !== undefined) {
      const conversationId: string = body.input_ThirdPartyConversationID || '';
      const orderId = parseOrderId(conversationId);
      const success = body.output_ResponseCode === 'INS-0';
      const transactionId = body.output_TransactionID;

      if (orderId) {
        // Idempotency: read existing checkout first; if already rewarded, skip
        const checkout = await getCheckout(orderId);
        await updateCheckoutPayment(orderId, success ? 'confirmed' : 'failed', transactionId);
        if (success && checkout?.sessionId && checkout?.total && !checkout?.rewardedAt) {
          await rewardProfileForPurchase(checkout.sessionId, checkout.total);
        }
      } else {
        console.warn('payment-callback MPesa: could not parse orderId from', conversationId);
      }

      // Vodacom expects 200 with specific body
      return res.status(200).json({ output_ResponseCode: 'INS-0', output_ResponseDesc: 'Request processed successfully' });
    }

    // ---- e-Mola callback ----
    // e-Mola sends: status, transaction_id, reference (orderId)
    if (body.transaction_id !== undefined || body.reference !== undefined) {
      const orderId: string = body.reference || parseOrderId(body.transaction_id || '');
      const success = body.status === 'success' || body.status === 'completed' || body.code === '200';
      const transactionId = body.transaction_id;

      if (orderId) {
        const checkout = await getCheckout(orderId);
        await updateCheckoutPayment(orderId, success ? 'confirmed' : 'failed', transactionId);
        if (success && checkout?.sessionId && checkout?.total && !checkout?.rewardedAt) {
          await rewardProfileForPurchase(checkout.sessionId, checkout.total);
        }
      } else {
        console.warn('payment-callback e-Mola: could not parse orderId from payload', JSON.stringify(body));
      }

      return res.status(200).json({ status: 'received' });
    }

    // Unknown callback format — log and acknowledge
    console.warn('payment-callback: unknown payload format', JSON.stringify(body));
    return res.status(200).json({ status: 'acknowledged' });

  } catch (err: any) {
    console.error('payment-callback error:', err.message);
    // Always return 200 to payment providers to avoid retries on our errors
    return res.status(200).json({ status: 'error_logged' });
  }
}
