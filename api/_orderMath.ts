// Pure, server-authoritative order arithmetic. No I/O — fully unit-tested in
// _orderMath.test.ts. The whole point is that prices and discounts come from
// trusted product/coupon records (read server-side), NEVER from the client.
//
// Mirrors the client cart pricing in src/store/useCart.ts and the checkout
// summary in src/pages/Checkout.tsx so the displayed total matches the charged
// total — but here it cannot be tampered with.

export interface OrderItemInput {
  id: string;
  qty: number;
}

export interface ProductRecord {
  id: string;
  price: number;
  discount?: number;   // percentage, 0–100
  stockQty?: number;
  name?: string;
}

export interface CouponRecord {
  code: string;
  discountPercent: number;
  maxUses: number;          // 0 = unlimited
  usedCount: number;
  usedBy?: string[];        // user keys (anonymous UID) that already used it
  maxPerUser: number;       // 0 = unlimited per user
  validFrom?: number;       // epoch ms
  validUntil?: number;      // epoch ms
  minOrderValue?: number;
  active: boolean;
}

export interface OrderLine {
  id: string;
  name?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

const MAX_QTY_PER_LINE = 99;

export function effectiveUnitPrice(p: ProductRecord): number {
  const price = Number(p.price);
  if (!Number.isFinite(price) || price < 0) return 0;
  const disc = Number(p.discount);
  if (Number.isFinite(disc) && disc > 0) {
    return Math.max(0, price - (price * disc) / 100);
  }
  return price;
}

function clampQty(qty: number): number {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_QTY_PER_LINE);
}

export function computeSubtotal(
  items: OrderItemInput[],
  products: Record<string, ProductRecord>,
): { lines: OrderLine[]; subtotal: number } {
  const lines: OrderLine[] = [];
  let subtotal = 0;
  for (const item of items || []) {
    const product = products[item?.id];
    if (!product) continue;
    const qty = clampQty(item.qty);
    if (qty <= 0) continue;
    const unitPrice = effectiveUnitPrice(product);
    const lineTotal = unitPrice * qty;
    lines.push({ id: product.id, name: product.name, qty, unitPrice, lineTotal });
    subtotal += lineTotal;
  }
  return { lines, subtotal: Math.round(subtotal) };
}

export interface CouponValidation {
  valid: boolean;
  error: string | null;
}

export function validateCouponServer(
  coupon: CouponRecord | null | undefined,
  ctx: { now: number; userKey: string; subtotal: number },
): CouponValidation {
  if (!coupon) return { valid: false, error: 'Cupão não encontrado.' };
  if (!coupon.active) return { valid: false, error: 'Cupão desativado.' };

  if (coupon.validFrom && ctx.now < coupon.validFrom) {
    return { valid: false, error: 'Cupão ainda não está activo.' };
  }
  if (coupon.validUntil && ctx.now > coupon.validUntil) {
    return { valid: false, error: 'Cupão expirado.' };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'Limite de utilizações atingido.' };
  }
  if (coupon.maxPerUser > 0) {
    const mine = (coupon.usedBy || []).filter((k) => k === ctx.userKey).length;
    if (mine >= coupon.maxPerUser) {
      return { valid: false, error: 'Já usaste este cupão o número máximo de vezes.' };
    }
  }
  if (coupon.minOrderValue && coupon.minOrderValue > 0 && ctx.subtotal < coupon.minOrderValue) {
    return { valid: false, error: `Valor mínimo de ${coupon.minOrderValue} MT.` };
  }
  return { valid: true, error: null };
}

export interface OrderTotal {
  lines: OrderLine[];
  subtotal: number;
  couponDiscount: number;
  couponApplied: boolean;
  couponError: string | null;
  shipping: number;
  total: number;
}

export function computeOrderTotal(params: {
  items: OrderItemInput[];
  products: Record<string, ProductRecord>;
  coupon?: CouponRecord | null;
  shipping?: number;
  now: number;
  userKey: string;
}): OrderTotal {
  const { lines, subtotal } = computeSubtotal(params.items, params.products);

  let couponDiscount = 0;
  let couponApplied = false;
  let couponError: string | null = null;

  if (params.coupon) {
    const check = validateCouponServer(params.coupon, {
      now: params.now,
      userKey: params.userKey,
      subtotal,
    });
    if (check.valid) {
      couponDiscount = Math.round((subtotal * params.coupon.discountPercent) / 100);
      couponApplied = true;
    } else {
      couponError = check.error;
    }
  }

  const shipping = Math.max(0, Math.round(Number(params.shipping) || 0));
  const total = Math.max(0, subtotal - couponDiscount + shipping);

  return { lines, subtotal, couponDiscount, couponApplied, couponError, shipping, total };
}
