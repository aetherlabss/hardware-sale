import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;          // 0 = unlimited
  usedCount: number;
  usedBy: string[];         // session IDs or phone numbers
  maxPerUser: number;       // max times a single user can use it
  validFrom: any;           // Firestore Timestamp
  validUntil: any;          // Firestore Timestamp
  minOrderValue: number;    // minimum cart subtotal in MT
  active: boolean;
  createdAt: any;
}

interface CouponValidation {
  valid: boolean;
  coupon: Coupon | null;
  error: string | null;
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Coupon[];
      setCoupons(data);
      setLoading(false);
    }, (err) => {
      console.error('Coupons sync error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const validateCoupon = (code: string, sessionId: string, cartTotal: number): CouponValidation => {
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) {
      return { valid: false, coupon: null, error: 'Cupão não encontrado. Verifique o código.' };
    }

    if (!coupon.active) {
      return { valid: false, coupon: null, error: 'Este cupão está desativado.' };
    }

    // Check date validity
    const now = Date.now();
    if (coupon.validFrom) {
      const from = coupon.validFrom.toMillis ? coupon.validFrom.toMillis() : coupon.validFrom;
      if (now < from) {
        return { valid: false, coupon: null, error: 'Este cupão ainda não está activo.' };
      }
    }
    if (coupon.validUntil) {
      const until = coupon.validUntil.toMillis ? coupon.validUntil.toMillis() : coupon.validUntil;
      if (now > until) {
        return { valid: false, coupon: null, error: 'Este cupão já expirou.' };
      }
    }

    // Check max total uses
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, coupon: null, error: 'Este cupão já atingiu o limite de utilizações.' };
    }

    // Check per-user limit
    if (coupon.maxPerUser > 0) {
      const userUseCount = coupon.usedBy?.filter(id => id === sessionId).length || 0;
      if (userUseCount >= coupon.maxPerUser) {
        return { valid: false, coupon: null, error: 'Já usou este cupão o número máximo de vezes permitido.' };
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue > 0 && cartTotal < coupon.minOrderValue) {
      return { valid: false, coupon: null, error: `Valor mínimo de ${coupon.minOrderValue.toLocaleString()} MT necessário para activar este cupão.` };
    }

    return { valid: true, coupon, error: null };
  };

  const applyCoupon = async (couponId: string, sessionId: string) => {
    try {
      const ref = doc(db, 'coupons', couponId);
      await updateDoc(ref, {
        usedCount: increment(1),
        usedBy: arrayUnion(sessionId)
      });
    } catch (err) {
      console.error('Failed to apply coupon:', err);
    }
  };

  return { coupons, loading, validateCoupon, applyCoupon };
}
