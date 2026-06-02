// Request gate for Vercel serverless endpoints.
//
// Goals:
//  1. Reject browser requests from unknown origins (basic CSRF protection)
//  2. Apply a per-IP rate limit. Uses Upstash Redis when configured,
//     otherwise falls back to an in-memory limiter (per-lambda, resets on
//     cold start — fine for casual abuse, not for coordinated attacks).
//
// Configure via env vars (all optional):
//   ALLOWED_ORIGINS               comma-separated list of allowed origins
//   UPSTASH_REDIS_REST_URL        Upstash REST URL (sign up at upstash.com)
//   UPSTASH_REDIS_REST_TOKEN      Upstash REST token
//
// To enable Upstash:
//   1. Create a free Redis at https://console.upstash.com (HTTPS REST)
//   2. Set the URL and TOKEN in Vercel → Project → Settings → Environment Variables
//   3. Redeploy. The limiter automatically uses Upstash on the next request.

// ─── Origin allowlist ──────────────────────────────────────────────────────

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

// ─── Rate limiter ──────────────────────────────────────────────────────────

function clientIp(req: any): string {
  return (req.headers?.['x-forwarded-for']?.split(',')[0]?.trim())
      || req.headers?.['x-real-ip']
      || req.socket?.remoteAddress
      || 'unknown';
}

// In-memory bucket store. Per-lambda-instance only, but combined with
// Vercel's serverless concurrency it still slows down naive abuse.
const memBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(ip: string, limit: number, windowMs: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${ip}:${limit}:${windowMs}`;
  const bucket = memBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    memBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true };
}

// Upstash Redis REST limiter. Atomic INCR + EXPIRE on a per-window key.
// Works across all serverless instances and survives cold starts.
async function upstashRateLimit(ip: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter?: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.ceil(windowMs / 1000);
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const key = `hwsec:rl:${ip}:${limit}:${windowMs}:${windowStart}`;

  try {
    // Pipeline: INCR then EXPIRE (EXPIRE only sets TTL the first time)
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(windowSec), 'NX'],
      ]),
    });
    if (!res.ok) {
      console.warn('upstash rate-limit failed:', res.status);
      return null;
    }
    const data = await res.json();
    const count = Number(data?.[0]?.result || 0);
    if (count > limit) {
      const retryAfter = Math.ceil((windowStart + windowMs - Date.now()) / 1000);
      return { ok: false, retryAfter: Math.max(1, retryAfter) };
    }
    return { ok: true };
  } catch (err) {
    console.warn('upstash rate-limit error:', (err as Error).message);
    return null;
  }
}

export async function rateLimit(req: any, limit = 30, windowMs = 60_000): Promise<{ ok: boolean; retryAfter?: number }> {
  const ip = clientIp(req);
  const upstash = await upstashRateLimit(ip, limit, windowMs);
  if (upstash) return upstash;
  return memoryRateLimit(ip, limit, windowMs);
}

// ─── Combined helper for browser-facing endpoints ─────────────────────────

export async function gateBrowserRequest(
  req: any,
  res: any,
  opts: { rateLimit?: number; windowMs?: number } = {},
): Promise<boolean> {
  if (!originAllowed(req)) {
    res.status(403).json({ error: 'Forbidden: origin not allowed.' });
    return false;
  }
  const rl = await rateLimit(req, opts.rateLimit ?? 30, opts.windowMs ?? 60_000);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter || 30));
    res.status(429).json({ error: 'Too many requests. Slow down and try again.' });
    return false;
  }
  return true;
}
