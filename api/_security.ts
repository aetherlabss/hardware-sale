// Lightweight request gate for Vercel serverless endpoints.
//
// Goals:
//  1. Reject browser requests from unknown origins (basic CSRF protection)
//  2. Apply a coarse in-memory rate limit per IP (defence in depth — not a
//     replacement for a real WAF/CDN rate limiter)
//
// Configure allowed origins via env var ALLOWED_ORIGINS (comma-separated).
// If unset, allows the production domain and localhost dev.

const DEFAULT_ORIGINS = [
  'https://hardwaresale.co.mz',
  'https://www.hardwaresale.co.mz',
  'https://hardware-sale.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function allowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return DEFAULT_ORIGINS;
  return env.split(',').map(s => s.trim()).filter(Boolean);
}

export function originAllowed(req: any): boolean {
  const allowed = allowedOrigins();
  const origin = req.headers?.origin;
  const referer = req.headers?.referer;

  if (origin && allowed.some(a => origin === a || origin.startsWith(a))) return true;
  if (referer && allowed.some(a => referer.startsWith(a))) return true;

  // Server-to-server callbacks (MPesa/eMola → /api/payment-callback) have
  // neither Origin nor Referer. Those endpoints validate via a shared secret
  // instead — see verifySecret in payment-callback.ts.
  return false;
}

// Per-IP in-memory rate limiter. Sliding-window count of requests in `windowMs`.
// Note: in-memory only — resets when the lambda cold-starts; not adequate for
// real rate limiting at scale, but stops casual abuse.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: any, limit = 30, windowMs = 60_000): { ok: boolean; retryAfter?: number } {
  const ip = (req.headers?.['x-forwarded-for']?.split(',')[0].trim())
          || req.headers?.['x-real-ip']
          || req.socket?.remoteAddress
          || 'unknown';
  const now = Date.now();
  const key = `${ip}:${limit}:${windowMs}`;
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true };
}

// Convenience helper for browser-initiated endpoints.
// Returns true if the handler should proceed; otherwise writes the response and returns false.
export function gateBrowserRequest(req: any, res: any, opts: { rateLimit?: number; windowMs?: number } = {}): boolean {
  if (!originAllowed(req)) {
    res.status(403).json({ error: 'Forbidden: origin not allowed.' });
    return false;
  }
  const rl = rateLimit(req, opts.rateLimit ?? 30, opts.windowMs ?? 60_000);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter || 30));
    res.status(429).json({ error: 'Too many requests. Slow down and try again.' });
    return false;
  }
  return true;
}
