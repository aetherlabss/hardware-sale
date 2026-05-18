import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const db = getFirestore(app);

async function run() {
  const s = await getDocs(collection(db, 'products'));
  console.log(s.docs.map(d => ({id: d.id, name: d.data().name, cat: d.data().category, tags: d.data().tags})));
  process.exit(0);
}
run();
