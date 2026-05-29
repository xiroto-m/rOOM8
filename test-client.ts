import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch, increment, serverTimestamp, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  const eventId = '1aqR44wcrOoqaSpaUhAe';
  const ip = '60.104.109.222';
  const likeDocRef = doc(db, 'events', eventId, 'likes', ip);
  const eventDocRef = doc(db, 'events', eventId);
  const batch = writeBatch(db);

  const docSnap = await getDoc(likeDocRef);
  console.log("Exists:", docSnap.exists());
  process.exit(0);
}

test().catch(console.error);