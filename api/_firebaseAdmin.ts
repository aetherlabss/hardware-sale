// Shared Firebase Admin SDK initialisation for serverless endpoints.
//
// The Admin SDK runs with a service account and BYPASSES Firestore security
// rules — that is exactly what privileged server-side writes need (confirming
// payments, granting rewards, decrementing stock). The client SDK + REST API
// are subject to rules and therefore cannot perform these writes.
//
// Credential resolution (first match wins):
//   1. FIREBASE_SERVICE_ACCOUNT  — the service-account JSON, base64-encoded
//      (recommended for Vercel: one env var, no file on disk)
//   2. FIREBASE_SERVICE_ACCOUNT  — the service-account JSON as raw text
//   3. GOOGLE_APPLICATION_CREDENTIALS — path to a JSON file (local dev)
//
// Generate the key: Firebase Console → Project Settings → Service accounts →
// Generate new private key. Then on Vercel:
//   base64 -w0 serviceAccount.json   # copy output into FIREBASE_SERVICE_ACCOUNT

import { initializeApp, getApps, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | null = null;

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim()) {
    let jsonText = raw.trim();
    // Accept base64 or raw JSON
    if (!jsonText.startsWith('{')) {
      try {
        jsonText = Buffer.from(jsonText, 'base64').toString('utf8');
      } catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is set but is neither valid JSON nor base64.');
      }
    }
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT could not be parsed as JSON.');
    }
    // Private keys often arrive with literal "\n" sequences when pasted raw.
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return cert(parsed);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return applicationDefault();
  }

  throw new Error(
    'No Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT (base64 of the ' +
    'service-account JSON) or GOOGLE_APPLICATION_CREDENTIALS.',
  );
}

/** Returns the singleton Admin app, initialising it on first use. */
function adminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }
  cachedApp = initializeApp({
    credential: resolveCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID || 'hardware-sale',
  });
  return cachedApp;
}

/** Firestore handle backed by the Admin SDK (rules-bypassing). */
export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

/** Auth handle backed by the Admin SDK (for verifying ID tokens). */
export function adminAuth(): Auth {
  return getAuth(adminApp());
}

/**
 * Verifies a Bearer ID token from the Authorization header and returns the
 * decoded token only if the caller has the `admin` custom claim. Returns null
 * otherwise. Used to gate admin-only serverless endpoints.
 */
export async function requireAdmin(req: any): Promise<{ uid: string; email?: string } | null> {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer (.+)$/.exec(String(header));
  if (!m) return null;
  try {
    const decoded = await adminAuth().verifyIdToken(m[1]);
    if (decoded.admin !== true) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export { FieldValue, Timestamp };
