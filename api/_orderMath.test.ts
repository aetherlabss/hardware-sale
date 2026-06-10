import { describe, it, expect } from 'vitest';
import {
  effectiveUnitPrice,
  computeSubtotal,
  validateCouponServer,
  computeOrderTotal,
  computeShippingCost,
  type ProductRecord,
  type CouponRecord,
} from './_orderMath';

const prods = (list: ProductRecord[]) => {
  const m: Record<string, ProductRecord> = {};
  for (const p of list) m[p.id] = p;
  return m;
};

describe('effectiveUnitPrice', () => {
  it('returns price when no discount', () => {
    expect(effectiveUnitPrice({ id: 'a', price: 1000 })).toBe(1000);
  });
  it('applies a percentage discount', () => {
    expect(effectiveUnitPrice({ id: 'a', price: 1000, discount: 25 })).toBe(750);
  });
  it('treats invalid numbers as 0', () => {
    expect(effectiveUnitPrice({ id: 'a', price: NaN as any })).toBe(0);
  });
});

describe('computeSubtotal', () => {
  it('uses REAL product prices, never any client-supplied price', () => {
    const products = prods([{ id: 'a', price: 1000 }, { id: 'b', price: 500, discount: 10 }]);
    // client could claim price:1 — but we only pass id+qty, so it cannot influence the math
    const r = computeSubtotal([{ id: 'a', qty: 2 }, { id: 'b', qty: 1 }], products);
    expect(r.subtotal).toBe(2000 + 450);
    expect(r.lines).toHaveLength(2);
  });
  it('skips unknown products and non-positive quantities', () => {
    const products = prods([{ id: 'a', price: 1000 }]);
    const r = computeSubtotal([{ id: 'a', qty: 0 }, { id: 'ghost', qty: 3 }], products);
    expect(r.subtotal).toBe(0);
    expect(r.lines).toHaveLength(0);
  });
  it('clamps quantity to a sane maximum', () => {
    const products = prods([{ id: 'a', price: 100 }]);
    const r = computeSubtotal([{ id: 'a', qty: 9999 }], products);
    expect(r.lines[0].qty).toBe(99);
    expect(r.subtotal).toBe(9900);
  });
});

describe('validateCouponServer', () => {
  const base: CouponRecord = {
    code: 'SAVE10', discountPercent: 10, maxUses: 0, usedCount: 0,
    usedBy: [], maxPerUser: 1, minOrderValue: 0, active: true,
  };
  const now = 1_000_000_000_000;

  it('accepts a valid coupon', () => {
    expect(validateCouponServer(base, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(true);
  });
  it('rejects an inactive coupon', () => {
    expect(validateCouponServer({ ...base, active: false }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
  });
  it('rejects before validFrom and after validUntil', () => {
    expect(validateCouponServer({ ...base, validFrom: now + 1000 }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
    expect(validateCouponServer({ ...base, validUntil: now - 1000 }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
  });
  it('rejects when global maxUses reached', () => {
    expect(validateCouponServer({ ...base, maxUses: 5, usedCount: 5 }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
  });
  it('rejects when this user hit maxPerUser', () => {
    expect(validateCouponServer({ ...base, maxPerUser: 1, usedBy: ['u1'] }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
  });
  it('rejects when subtotal below minOrderValue', () => {
    expect(validateCouponServer({ ...base, minOrderValue: 10000 }, { now, userKey: 'u1', subtotal: 5000 }).valid).toBe(false);
  });
});

describe('computeOrderTotal', () => {
  const products = prods([{ id: 'a', price: 10000 }]);
  const coupon: CouponRecord = {
    code: 'SAVE10', discountPercent: 10, maxUses: 0, usedCount: 0,
    usedBy: [], maxPerUser: 1, minOrderValue: 0, active: true,
  };
  const now = 1_000_000_000_000;

  it('applies a valid coupon and adds shipping', () => {
    const r = computeOrderTotal({ items: [{ id: 'a', qty: 1 }], products, coupon, shipping: 800, now, userKey: 'u1' });
    expect(r.subtotal).toBe(10000);
    expect(r.couponDiscount).toBe(1000);
    expect(r.shipping).toBe(800);
    expect(r.total).toBe(9800);
    expect(r.couponApplied).toBe(true);
  });
  it('ignores an invalid coupon (no discount, flagged)', () => {
    const r = computeOrderTotal({ items: [{ id: 'a', qty: 1 }], products, coupon: { ...coupon, active: false }, shipping: 0, now, userKey: 'u1' });
    expect(r.couponDiscount).toBe(0);
    expect(r.total).toBe(10000);
    expect(r.couponApplied).toBe(false);
  });
  it('never returns a negative total', () => {
    const big: CouponRecord = { ...coupon, discountPercent: 100 };
    const r = computeOrderTotal({ items: [{ id: 'a', qty: 1 }], products, coupon: big, shipping: 0, now, userKey: 'u1' });
    expect(r.total).toBe(0);
  });
  it('refuses to honour a client trying to underpay (price comes from products only)', () => {
    // Even if a malicious item carries a fake price field, it is ignored.
    const r = computeOrderTotal({ items: [{ id: 'a', qty: 1, price: 1 } as any], products, shipping: 0, now, userKey: 'u1' });
    expect(r.total).toBe(10000);
  });
});

describe('computeShippingCost', () => {
  const settings = { baseLat: -25.9692, baseLng: 32.5732, freeRadiusKm: 15, costPerKmExtra: 60, fallbackFlatRate: 800 };

  it('is free at the base location', () => {
    expect(computeShippingCost(-25.9692, 32.5732, settings)).toBe(0);
  });
  it('uses the fallback flat rate when coords are missing', () => {
    expect(computeShippingCost(null, null, settings)).toBe(800);
    expect(computeShippingCost(undefined, undefined, settings)).toBe(800);
  });
  it('charges for distance beyond the free radius', () => {
    // ~1 degree of latitude ≈ 111 km → well outside the 15 km free radius
    const cost = computeShippingCost(-24.9692, 32.5732, settings);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThanOrEqual(2500); // interprovincial cap
  });
});
