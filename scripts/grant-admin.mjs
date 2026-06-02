// One-off script to grant or revoke the `admin: true` custom claim on a
// Firebase Auth user. Once a user has the claim, Firestore rules treat them
// as an administrator — no hardcoded email list is required in the client.
//
// USAGE
//   1. Install firebase-admin once:
//        npm i -D firebase-admin
//   2. Download a service-account JSON from Firebase Console:
//        Project Settings → Service accounts → Generate new private key
//   3. Set GOOGLE_APPLICATION_CREDENTIALS to its absolute path, e.g.:
//        export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   4. Grant:   node scripts/grant-admin.mjs grant gabriel.vieira.jamal@gmail.com
//      Revoke:  node scripts/grant-admin.mjs revoke someone@example.com
//      List:    node scripts/grant-admin.mjs list
//
// After granting, the user must sign out and back in so the new ID token
// carries the claim. Firestore rules check request.auth.token.admin.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: applicationDefault() });
const auth = getAuth();

const [, , action, email] = process.argv;

async function grant(targetEmail) {
  const user = await auth.getUserByEmail(targetEmail);
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
  console.log(`✅ Granted admin to ${targetEmail} (uid ${user.uid})`);
  console.log('   The user must sign out and back in for the claim to take effect.');
}

async function revoke(targetEmail) {
  const user = await auth.getUserByEmail(targetEmail);
  const claims = { ...(user.customClaims || {}) };
  delete claims.admin;
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`✅ Revoked admin from ${targetEmail} (uid ${user.uid})`);
}

async function list() {
  let pageToken;
  const admins = [];
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.admin) admins.push({ email: u.email, uid: u.uid });
    }
    pageToken = page.pageToken;
  } while (pageToken);
  if (admins.length === 0) {
    console.log('(no admins set — grant one with: grant <email>)');
  } else {
    console.log('Admins:');
    for (const a of admins) console.log(`  - ${a.email}  (${a.uid})`);
  }
}

try {
  if (action === 'grant' && email) await grant(email);
  else if (action === 'revoke' && email) await revoke(email);
  else if (action === 'list') await list();
  else {
    console.error('Usage:');
    console.error('  node scripts/grant-admin.mjs grant   <email>');
    console.error('  node scripts/grant-admin.mjs revoke  <email>');
    console.error('  node scripts/grant-admin.mjs list');
    process.exit(1);
  }
} catch (err) {
  console.error('❌', err.message || err);
  process.exit(1);
}
