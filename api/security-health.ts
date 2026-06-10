// Admin-only backend configuration health check.
//
// Returns booleans only — never the secret values themselves — so an admin can
// see at a glance whether the deployment is wired correctly (the #1 cause of
// "payments don't confirm" being a missing service account). Gated by a verified
// Firebase ID token with the admin custom claim.

import { requireAdmin } from './_firebaseAdmin';
import { gateBrowserRequest } from './_security';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await gateBrowserRequest(req, res, { rateLimit: 20, windowMs: 60_000 }))) return;

  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Admin token required.' });

  const has = (v?: string) => !!(v && String(v).trim());

  return res.status(200).json({
    serviceAccount: has(process.env.FIREBASE_SERVICE_ACCOUNT) || has(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    paymentCallbackSecret: has(process.env.PAYMENT_CALLBACK_SECRET),
    upstashRateLimit: has(process.env.UPSTASH_REDIS_REST_URL) && has(process.env.UPSTASH_REDIS_REST_TOKEN),
    aiKey: has(process.env.VERTEX_API_KEY),
    mpesa: has(process.env.MPESA_API_HOST) && has(process.env.MPESA_SERVICE_PROVIDER_CODE),
    emola: has(process.env.EMOLA_API_URL) && has(process.env.EMOLA_MERCHANT_CODE),
    allowedOrigins: has(process.env.ALLOWED_ORIGINS),
    checkedBy: admin.email || admin.uid,
  });
}
