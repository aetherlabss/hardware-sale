// Aggregate affiliate stats for a referral code.
//
// client_profiles can no longer be listed by non-admins (that would leak every
// customer's PII). This endpoint runs the aggregation server-side via the Admin
// SDK and returns ONLY counts/commission — never names, phones, or per-customer
// data — so the Hub's affiliate panel keeps working without exposing anyone.

import { adminDb } from './_firebaseAdmin';
import { gateBrowserRequest } from './_security';

const COMMISSION_RATE = 0.05; // 5%

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await gateBrowserRequest(req, res, { rateLimit: 30, windowMs: 60_000 }))) return;

  const code = String(req.body?.referralCode || '').toUpperCase().trim();
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) {
    return res.status(400).json({ error: 'Invalid referral code.' });
  }

  try {
    const snap = await adminDb().collection('client_profiles').where('referredBy', '==', code).get();
    let totalReferrals = 0;
    let conversions = 0;
    let commission = 0;
    snap.forEach((d) => {
      totalReferrals++;
      const data = d.data() as any;
      if ((Number(data.purchaseCount) || 0) > 0) {
        conversions++;
        commission += (Number(data.totalSpent) || 0) * COMMISSION_RATE;
      }
    });
    return res.status(200).json({ totalReferrals, conversions, commission: Math.round(commission) });
  } catch (err: any) {
    console.error('affiliate-stats error:', err?.message || err);
    return res.status(500).json({ error: 'Could not compute affiliate stats.' });
  }
}
