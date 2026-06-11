// Server-authoritative order creation.
//
// THE financial trust boundary. The browser sends only product IDs + quantities
// (and the coords it used for shipping). This endpoint reads the REAL prices,
// re-validates and consumes the coupon atomically, recomputes shipping, and
// writes the checkout with a total the client cannot influence. The payment
// gateways then charge THIS stored total — see mpesa-push.ts / emola-push.ts.

import { adminDb, FieldValue } from './_firebaseAdmin.js';
import { computeOrderTotal, computeShippingCost, type ProductRecord, type CouponRecord, type ShippingSettings } from './_orderMath.js';
import { gateBrowserRequest } from './_security.js';

function genOrderId(): string {
  // 20 alphanumeric chars — matches parseOrderId() in payment-callback.ts
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return id;
}

function normaliseCode(code: string): string {
  return String(code || '').toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
}

function cleanDigits(s: string): string {
  return String(s || '').replace(/\D/g, '');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await gateBrowserRequest(req, res, { rateLimit: 15, windowMs: 60_000 }))) return;

  const body = req.body || {};
  const items: { id: string; qty: number }[] = Array.isArray(body.items) ? body.items : [];
  const couponCode: string = normaliseCode(body.couponCode);
  const paymentMethod: string = body.paymentMethod === 'emola' ? 'emola' : 'mpesa';
  const sessionId: string = String(body.sessionId || '');
  const userId: string = String(body.userId || '');
  const customer = body.customer || {};
  const lat = body.lat ?? null;
  const lng = body.lng ?? null;

  // ---- Validation ----
  if (items.length === 0) return res.status(400).json({ error: 'Carrinho vazio.' });
  if (items.length > 50) return res.status(400).json({ error: 'Demasiados itens.' });
  if (!sessionId || sessionId.length < 8) return res.status(400).json({ error: 'sessionId inválido.' });
  if (!userId) return res.status(400).json({ error: 'Sessão de autenticação não pronta. Recarrega a página.' });
  const name = String(customer.name || '').trim();
  const phone = cleanDigits(customer.phone);
  if (!name) return res.status(400).json({ error: 'Nome do cliente em falta.' });
  if (!/^\d{9,15}$/.test(phone)) return res.status(400).json({ error: 'Número de telefone inválido.' });

  // Dedup + sanitise item IDs
  const wantQty = new Map<string, number>();
  for (const it of items) {
    const id = String(it?.id || '');
    if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) continue;
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    wantQty.set(id, (wantQty.get(id) || 0) + Math.min(qty, 99));
  }
  if (wantQty.size === 0) return res.status(400).json({ error: 'Nenhum item válido no carrinho.' });

  try {
    const db = adminDb();

    // ---- Load real products ----
    const ids = [...wantQty.keys()];
    const refs = ids.map((id) => db.collection('products').doc(id));
    const snaps = await db.getAll(...refs);
    const products: Record<string, ProductRecord> = {};
    for (const s of snaps) {
      if (!s.exists) continue;
      const d = s.data() as any;
      products[s.id] = { id: s.id, price: Number(d.price) || 0, discount: Number(d.discount) || 0, stockQty: typeof d.stockQty === 'number' ? d.stockQty : undefined, name: d.name };
    }
    const normItems = ids.map((id) => ({ id, qty: wantQty.get(id)! }));

    // ---- Shipping ----
    // With coords we recompute authoritatively (same haversine the client used,
    // so displayed == charged). Without coords (the client's text-zone estimate)
    // we accept the client value but CLAMP it, bounding any tampering to a small,
    // capped delivery fee — the financially material number (the item subtotal)
    // is always server-derived.
    const MAX_SHIPPING = 2500;
    const shipSnap = await db.collection('admin_settings').doc('shipping').get();
    const shipSettings = (shipSnap.exists ? shipSnap.data() : {}) as ShippingSettings;
    const clientShipping = Number(body.shippingCost);
    const shipping = (lat != null && lng != null)
      ? computeShippingCost(lat, lng, shipSettings)
      : Math.min(MAX_SHIPPING, Math.max(0, Math.round(Number.isFinite(clientShipping) ? clientShipping : 0)));

    const orderId = genOrderId();
    const checkoutRef = db.collection('checkouts').doc(orderId);
    const now = Date.now();

    let responseTotals: ReturnType<typeof computeOrderTotal> | null = null;

    await db.runTransaction(async (tx) => {
      // Re-read coupon inside the tx so maxUses/maxPerUser are race-safe.
      let coupon: CouponRecord | null = null;
      let couponRef: FirebaseFirestore.DocumentReference | null = null;
      if (couponCode) {
        couponRef = db.collection('coupons').doc(couponCode);
        const cs = await tx.get(couponRef);
        if (cs.exists) {
          const d = cs.data() as any;
          coupon = {
            code: d.code || couponCode,
            discountPercent: Number(d.discountPercent) || 0,
            maxUses: Number(d.maxUses) || 0,
            usedCount: Number(d.usedCount) || 0,
            usedBy: Array.isArray(d.usedBy) ? d.usedBy : [],
            maxPerUser: Number(d.maxPerUser) || 0,
            validFrom: d.validFrom?.toMillis ? d.validFrom.toMillis() : d.validFrom,
            validUntil: d.validUntil?.toMillis ? d.validUntil.toMillis() : d.validUntil,
            minOrderValue: Number(d.minOrderValue) || 0,
            active: d.active !== false,
          };
        }
      }

      const totals = computeOrderTotal({ items: normItems, products, coupon, shipping, now, userKey: userId });
      if (totals.lines.length === 0) throw new Error('NO_VALID_ITEMS');

      // Stock guard (only for products that track stock)
      for (const line of totals.lines) {
        const p = products[line.id];
        if (p && typeof p.stockQty === 'number' && p.stockQty < line.qty) {
          throw new Error(`OUT_OF_STOCK:${p.name || line.id}`);
        }
      }

      tx.set(checkoutRef, {
        userId,
        sessionId,
        customerName: name,
        customerPhone: phone,
        address: String(customer.address || '').slice(0, 500),
        zipCode: String(customer.zipCode || 'N/A').slice(0, 40),
        paymentMethod,
        items: totals.lines,
        subtotal: totals.subtotal,
        couponCode: totals.couponApplied ? couponCode : null,
        couponDiscount: totals.couponDiscount,
        shippingCost: totals.shipping,
        total: totals.total,
        status: 'pendente',
        paymentStatus: 'awaiting_push',
        statusHistory: [{ status: 'pendente', at: now }],
        createdAt: FieldValue.serverTimestamp(),
      });

      if (totals.couponApplied && couponRef) {
        tx.update(couponRef, { usedCount: FieldValue.increment(1), usedBy: FieldValue.arrayUnion(userId) });
      }

      responseTotals = totals;
    });

    const t = responseTotals!;
    return res.status(200).json({
      orderId,
      total: t.total,
      subtotal: t.subtotal,
      shipping: t.shipping,
      couponDiscount: t.couponDiscount,
      couponApplied: t.couponApplied,
      couponError: t.couponError,
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg === 'NO_VALID_ITEMS') return res.status(400).json({ error: 'Os produtos do carrinho já não estão disponíveis.' });
    if (msg.startsWith('OUT_OF_STOCK:')) return res.status(409).json({ error: `Sem stock: ${msg.slice('OUT_OF_STOCK:'.length)}` });
    console.error('create-order error:', msg);
    return res.status(500).json({ error: 'Não foi possível criar a encomenda. Tenta novamente.' });
  }
}
