import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function test() {
  const eventId = '1aqR44wcrOoqaSpaUhAe';
  const docRef = db.collection('events').doc(eventId);
  const docSnap = await docRef.get();
  console.log("Event Data:");
  console.dir(docSnap.data(), { depth: null });
}

test().catch(console.error);
