import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); // CRITICAL: The app will break without this line
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Uploads a base64 data URL to Firebase Storage and returns the public download
 * URL. Falls back to the original data URL if Storage is not configured/allowed,
 * so product image upload never breaks — it just stays inline until Storage is
 * set up. Storing URLs (instead of base64) keeps product docs well under the
 * Firestore 1 MB document limit.
 */
export async function uploadImageWithFallback(dataUrl: string, folder = 'products'): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl; // already a URL
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
    const r = storageRef(storage, path);
    await uploadBytes(r, blob, { contentType: blob.type || 'image/jpeg' });
    return await getDownloadURL(r);
  } catch (err) {
    console.warn('Storage upload failed, keeping inline image:', (err as Error)?.message || err);
    return dataUrl;
  }
}

// Anonymous sign-in for all visitors so every request carries a stable UID.
// Lets Firestore rules gate per-user data (own checkouts, own profile writes)
// without requiring customers to manage a password. Admins sign in with email
// on top — anonymous auth is overridden by the email login at that point.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((err) => {
      console.warn('Anonymous auth failed:', err?.message || err);
    });
  }
});

// Resolves to the current UID once auth has bootstrapped (synchronous if
// already signed in, otherwise waits for the next auth state change).
export function getUidWhenReady(timeoutMs = 4000): Promise<string | null> {
  if (auth.currentUser?.uid) return Promise.resolve(auth.currentUser.uid);
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; unsub(); resolve(null); } }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.uid && !done) { done = true; clearTimeout(timer); unsub(); resolve(user.uid); }
    });
  });
}

// Validation check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}
