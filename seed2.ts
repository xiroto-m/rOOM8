import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const embedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.055375323984!2d139.7126154!3d35.6756209!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c83a54d5d3d%3A0xa1ea0db4bce81119!2zTUlZQVNISVRBIFBBUksgKOWuruS4i-ODkeODvOOCr-OAkQ!5e0!3m2!1sja!2sjp!4v1709405000000!5m2!1sja!2sjp";

const app = initializeApp(config);
const db = getFirestore(app);

const futureEvents = [
  { date: "2024.06.15 (土)", time: "14:00〜", locationName: "東京ミッドタウン", address: "東京都港区赤坂9-7-1", access: "六本木駅直結", fee: "1,500円", googleMapEmbedUrl: embedUrl, order: 2 },
  { date: "2024.07.20 (土)", time: "10:00〜", locationName: "代々木公園", address: "東京都渋谷区代々木神園町2-1", access: "原宿駅徒歩3分", fee: "無料", googleMapEmbedUrl: embedUrl, order: 3 },
  { date: "2024.08.05 (日)", time: "18:00〜", locationName: "豊洲PIT", address: "東京都江東区豊洲6-1-23", access: "新豊洲駅徒歩3分", fee: "3,000円", googleMapEmbedUrl: embedUrl, order: 4 },
];
const pastEvents = [
  { date: "2024.04.15 (月)", time: "13:00〜", locationName: "渋谷ヒカリエ", address: "東京都渋谷区渋谷2-21-1", access: "渋谷駅直結", fee: "1,000円", googleMapEmbedUrl: embedUrl, order: 5 },
  { date: "2024.03.10 (日)", time: "11:00〜", locationName: "新宿御苑", address: "東京都新宿区内藤町11", access: "新宿御苑前駅徒歩5分", fee: "500円", googleMapEmbedUrl: embedUrl, order: 6 },
  { date: "2024.02.01 (木)", time: "15:00〜", locationName: "池袋サンシャインシティ", address: "東京都豊島区東池袋3-1", access: "東池袋駅徒歩3分", fee: "1,000円", googleMapEmbedUrl: embedUrl, order: 7 },
];

async function seed() {
  try {
    for (const e of [...futureEvents, ...pastEvents]) {
      await addDoc(collection(db, "events"), {
        ...e,
        updatedAt: serverTimestamp()
      });
    }
    console.log("Seeding complete.");
  } catch (err) {
    console.error(err);
  }
  setTimeout(() => process.exit(0), 1000);
}
seed();
