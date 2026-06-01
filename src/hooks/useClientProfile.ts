import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';

export interface ClientProfile {
  id: string;
  sessionId: string;
  phone?: string;
  name?: string;
  xp: number;
  level: number;
  levelName: string;
  referralCode: string;
  referredBy?: string;
  totalSpent: number;
  purchaseCount: number;
  joinedAt: any;
  badges: string[];
  lastCheckIn?: number;
  checkInStreak?: number;
}

export interface LevelInfo {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  color: string;
  benefit: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, name: 'Recruit', minXP: 0, maxXP: 999, color: 'text-gray-400', benefit: 'Acesso básico ao Hub' },
  { level: 2, name: 'Operator', minXP: 1000, maxXP: 2999, color: 'text-blue-400', benefit: 'Badge exclusivo + acesso antecipado a promos' },
  { level: 3, name: 'Specialist', minXP: 3000, maxXP: 5999, color: 'text-brand-neon', benefit: 'Cupão 5% automático a cada 3 compras' },
  { level: 4, name: 'Commander', minXP: 6000, maxXP: 9999, color: 'text-brand-magenta', benefit: 'Frete grátis permanente + prioridade de stock' },
  { level: 5, name: 'Legend', minXP: 10000, maxXP: Infinity, color: 'text-yellow-400', benefit: 'Descontos VIP exclusivos + suporte directo' },
];

export const XP_REWARDS = {
  purchase: { amount: 500, label: 'Compra realizada' },
  tradeIn: { amount: 200, label: 'Trade-in submetido' },
  referral: { amount: 300, label: 'Referral convertido' },
  buildShare: { amount: 100, label: 'Build partilhada' },
};

function getSessionId(): string {
  let id = localStorage.getItem('hs_session_id');
  if (!id) {
    id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('hs_session_id', id);
  }
  return id;
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HWS-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getLevelFromXP(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function useClientProfile() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = getSessionId();

  const loadProfile = useCallback(async () => {
    try {
      const ref = doc(db, 'client_profiles', sessionId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as ClientProfile;
        const levelInfo = getLevelFromXP(data.xp || 0);
        setProfile({
          ...data,
          id: snap.id,
          level: levelInfo.level,
          levelName: levelInfo.name
        });
      } else {
        // Create new profile
        const refCode = generateReferralCode();
        const newProfile: any = {
          sessionId,
          xp: 0,
          level: 1,
          levelName: 'Recruit',
          referralCode: refCode,
          totalSpent: 0,
          purchaseCount: 0,
          joinedAt: Date.now(),
          badges: ['early_adopter'],
        };

        // Check if referred
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam) {
          newProfile.referredBy = refParam;
        }

        await setDoc(ref, newProfile);
        setProfile({ ...newProfile, id: sessionId });
      }
    } catch (err) {
      console.error('Failed to load client profile:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const addXP = async (amount: number, _reason?: string) => {
    if (!profile) return;
    try {
      const ref = doc(db, 'client_profiles', sessionId);
      await updateDoc(ref, { xp: increment(amount) });
      const newXP = (profile.xp || 0) + amount;
      const levelInfo = getLevelFromXP(newXP);
      setProfile(prev => prev ? { ...prev, xp: newXP, level: levelInfo.level, levelName: levelInfo.name } : null);
    } catch (err) {
      console.error('Failed to add XP:', err);
    }
  };

  const recordPurchase = async (total: number) => {
    if (!profile) return;
    try {
      const ref = doc(db, 'client_profiles', sessionId);
      await updateDoc(ref, {
        xp: increment(XP_REWARDS.purchase.amount),
        totalSpent: increment(total),
        purchaseCount: increment(1),
      });
    } catch (err) {
      console.error('Failed to record purchase:', err);
    }
  };

  const updateProfile = async (name: string, phone: string) => {
    if (!profile) return;
    try {
      const ref = doc(db, 'client_profiles', sessionId);
      await updateDoc(ref, { name, phone });
      setProfile(prev => prev ? { ...prev, name, phone } : null);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const dailyCheckIn = async () => {
    if (!profile) return false;

    const msInDay = 24 * 60 * 60 * 1000;
    let xpAwarded: number | false = false;
    let updatedFields: { xp: number; level: number; levelName: string; lastCheckIn: number; checkInStreak: number } | null = null;

    try {
      const ref = doc(db, 'client_profiles', sessionId);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;

        const data = snap.data() as ClientProfile;
        const now = Date.now();
        const last = data.lastCheckIn || 0;

        if (now - last < msInDay) {
          xpAwarded = false;
          return; // already checked in today — abort without throwing
        }

        // streak: last check-in was between 24h and 48h ago
        const isStreak = last > 0 && now - last >= msInDay && now - last < 2 * msInDay;
        const newStreak = isStreak ? (data.checkInStreak || 0) + 1 : 1;
        const xpBonus = Math.min(25 + (newStreak - 1) * 5, 75);
        const newXP = (data.xp || 0) + xpBonus;
        const levelInfo = getLevelFromXP(newXP);

        tx.update(ref, { xp: newXP, lastCheckIn: now, checkInStreak: newStreak });

        xpAwarded = xpBonus;
        updatedFields = { xp: newXP, level: levelInfo.level, levelName: levelInfo.name, lastCheckIn: now, checkInStreak: newStreak };
      });

      if (updatedFields) {
        setProfile(prev => prev ? { ...prev, ...updatedFields } : null);
      }
      return xpAwarded;
    } catch (err) {
      console.error('Failed to check in:', err);
      return false;
    }
  };

  const getAffiliateStats = async () => {
    if (!profile) return { totalReferrals: 0, conversions: 0, commission: 0 };
    try {
      const q = query(collection(db, 'client_profiles'), where('referredBy', '==', profile.referralCode));
      const snap = await getDocs(q);
      let totalReferrals = snap.size;
      let conversions = 0;
      let commission = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.purchaseCount > 0) {
          conversions++;
          commission += (data.totalSpent || 0) * 0.05; // 5% commission
        }
      });
      return { totalReferrals, conversions, commission: Math.round(commission) };
    } catch (err) {
      console.error('Failed to get affiliate stats:', err);
      return { totalReferrals: 0, conversions: 0, commission: 0 };
    }
  };

  return {
    profile,
    loading,
    sessionId,
    addXP,
    recordPurchase,
    updateProfile,
    dailyCheckIn,
    getAffiliateStats,
    reload: loadProfile
  };
}
