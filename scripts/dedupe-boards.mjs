// One-off reconciliation of the duplicated motherboard docs in `products`
// (they showed up twice in the admin Inventory but nowhere else, because
// docs with isBuilderExclusive && !isBuilderReady are invisible both in the
// Montra storefront and in the Smart Builder — leftovers of an old builder
// panel that wrote flags as strings inside `specs` and double-submitted).
//
// What it does (each step guarded: aborts if the doc changed since audit):
//   1. B550M — marks the rich Montra doc IloqkJm2YLndiC9hpTGl as
//      isBuilderReady + builder metadata, so ONE doc feeds Montra AND builder.
//   2. Deletes the thin builder twin wwm9GgrvfFnNlTGaE1Yx (now redundant).
//   3. Deletes orphan YvIPgaNxjgKYq8GY1fwm (B550M, invisible everywhere).
//   4. Deletes orphan gjF8jAlbOAwwiJSK2iDG (B860M double-submit; the live
//      twin Zf5PYwOWlC7jXQYMbByg stays).
// Every write is mirrored into `admin_audit`.
//
// USAGE
//   export GOOGLE_APPLICATION_CREDENTIALS=$PWD/serviceAccount.json
//   node scripts/dedupe-boards.mjs          # dry-run (default): only checks
//   node scripts/dedupe-boards.mjs apply    # performs the writes

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();
const APPLY = process.argv[2] === 'apply';

const audit = (action, targetId, data) => db.collection('admin_audit').add({
  action, targetId, data,
  actorUid: null, actorEmail: 'scripts/dedupe-boards.mjs',
  at: FieldValue.serverTimestamp(),
});

// Only act if the doc still matches what was audited on 2026-06-12.
async function expect(id, name, excl, ready) {
  const d = await db.collection('products').doc(id).get();
  if (!d.exists) throw new Error(`${id} já não existe — corre primeiro sem 'apply' para reauditar.`);
  const p = d.data();
  if (p.name !== name || (p.isBuilderExclusive === true) !== excl || (p.isBuilderReady === true) !== ready)
    throw new Error(`${id} mudou desde a auditoria: ${JSON.stringify({ name: p.name, excl: p.isBuilderExclusive, ready: p.isBuilderReady })}`);
  return p;
}

const B550M = 'ASUS TUF GAMING B550M-PLUS WIFI II';
const B860M = 'ASUS TUF Gaming B860M-PLUS WiFi';

// 1. B550M: the rich Montra doc starts feeding the Smart Builder too.
await expect('IloqkJm2YLndiC9hpTGl', B550M, false, false);
if (APPLY) {
  await db.collection('products').doc('IloqkJm2YLndiC9hpTGl').update({
    isBuilderReady: true,
    builderType: 'motherboard',
    builderSocket: 'AM4/DDR4',
    updatedAt: FieldValue.serverTimestamp(),
  });
  await audit('product.update', 'IloqkJm2YLndiC9hpTGl', { name: B550M, note: 'merge: doc Montra agora isBuilderReady (substitui peça builder duplicada)' });
}
console.log(`${APPLY ? 'OK' : 'DRY'} merge B550M → doc Montra`);

// 2–4. Delete the redundant/orphan docs.
const deletions = [
  ['wwm9GgrvfFnNlTGaE1Yx', B550M, true, true, 'duplicado builder fundido no doc Montra IloqkJm2YLndiC9hpTGl'],
  ['YvIPgaNxjgKYq8GY1fwm', B550M, true, false, 'órfão (exclusivo sem isBuilderReady, invisível em todo o lado)'],
  ['gjF8jAlbOAwwiJSK2iDG', B860M, true, false, 'órfão double-submit (gémeo activo: Zf5PYwOWlC7jXQYMbByg)'],
];
for (const [id, name, excl, ready, note] of deletions) {
  await expect(id, name, excl, ready);
  if (APPLY) {
    await db.collection('products').doc(id).delete();
    await audit('product.delete', id, { name, note });
  }
  console.log(`${APPLY ? 'OK' : 'DRY'} delete ${id} (${note})`);
}

// Final state of the two boards.
const snap = await db.collection('products').get();
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
for (const key of [norm(B550M), norm(B860M)]) {
  const hits = snap.docs.filter(d => norm(d.data().name) === key);
  console.log(`${key} → ${hits.length} doc(s):`, hits.map(d => `${d.id} excl=${d.data().isBuilderExclusive === true} ready=${d.data().isBuilderReady === true}`).join(' | '));
}
console.log(`TOTAL products: ${snap.size}${APPLY ? '' : '  (dry-run — nada foi alterado; corre com "apply" para aplicar)'}`);
