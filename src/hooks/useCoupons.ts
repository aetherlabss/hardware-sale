import { useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;          // 0 = unlimited
  usedCount: number;
  usedBy: string[];         // session IDs or phone numbers
  maxPerUser: number;       // max times a single user can use it
  validFrom: any;           // Firestore Timestamp or number
  validUntil: any;          // Firestore Timestamp or number
  minOrderValue: number;
  active: boolean;
  createdAt: any;
}

interface CouponValidation {
  valid: boolean;
  coupon: Coupon | null;
  error: string | null;
}

function normaliseCode(code: string): string {
  return code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
}

export function useCoupons() {
  const validateCoupon = useCallback(async (code: string, sessionId: string, cartTotal: number): Promise<CouponValidation> => {
    const normalised = normaliseCode(code);
    if (!normalised) {
      return { valid: false, coupon: null, error: 'Insere um código de cupão.' };
    }

    let coupon: Coupon | null = null;
    try {
      const snap = await getDoc(doc(db, 'coupons', normalised));
      if (snap.exists()) {
        coupon = { id: snap.id, ...(snap.data() as Omit<Coupon, 'id'>) };
      }
    } catch (err) {
      console.error('Coupon lookup failed:', err);
      return { valid: false, coupon: null, error: 'Não foi possível validar o cupão. Tenta novamente.' };
    }

    if (!coupon) {
      return { valid: false, coupon: null, error: 'Cupão não encontrado. Verifica o código.' };
    }

    if (!coupon.active) {
      return { valid: false, coupon: null, error: 'Este cupão está desativado.' };
    }

    const now = Date.now();
    if (coupon.validFrom) {
      const from = coupon.validFrom.toMillis ? coupon.validFrom.toMillis() : coupon.validFrom;
      if (now < from) return { valid: false, coupon: null, error: 'Este cupão ainda não está activo.' };
    }
    if (coupon.validUntil) {
      const until = coupon.validUntil.toMillis ? coupon.validUntil.toMillis() : coupon.validUntil;
      if (now > until) return { valid: false, coupon: null, error: 'Este cupão já expirou.' };
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, coupon: null, error: 'Este cupão já atingiu o limite de utilizações.' };
    }

    if (coupon.maxPerUser > 0) {
      const userUseCount = coupon.usedBy?.filter(id => id === sessionId).length || 0;
      if (userUseCount >= coupon.maxPerUser) {
        return { valid: false, coupon: null, error: 'Já usaste este cupão o número máximo de vezes permitido.' };
      }
    }

    if (coupon.minOrderValue > 0 && cartTotal < coupon.minOrderValue) {
      return { valid: false, coupon: null, error: `Valor mínimo de ${coupon.minOrderValue.toLocaleString()} MT para activar este cupão.` };
    }

    return { valid: true, coupon, error: null };
  }, []);

  const applyCoupon = useCallback(async (couponId: string, sessionId: string) => {
    try {
      await updateDoc(doc(db, 'coupons', couponId), {
        usedCount: increment(1),
        usedBy: arrayUnion(sessionId),
      });
    } catch (err) {
      console.error('Failed to apply coupon:', err);
    }
  }, []);

  return { validateCoupon, applyCoupon };
}
