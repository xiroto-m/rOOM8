import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const embedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.055375323984!2d139.7126154!3d35.6756209!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188c83a54d5d3d%3A0xa1ea0db4bce81119!2zTUlZQVNISVRBIFBBUksgKOWuruS4i-ODkeODvOOCr-OAkQ!5e0!3m2!1sja!2sjp!4v1709405000000!5m2!1sja!2sjp";

const app = initializeApp(config);
const db = getFirestore(app);

const futureEvents = [
  { 
    title: "あの高島くん厳選！ボードゲームをギャラリーで遊び尽くす 🔥",
    date: "2026.05.15 (金)", 
    time: "19:30〜", 
    locationName: "代々木台マンション 4階8号室", 
    address: "東京都渋谷区代々木 4-28-8 代々木台マンション 408", 
    access: "京王新線 初台駅 徒歩7分 / 小田急 参宮橋駅 徒歩10分", 
    fee: "1,000円 (19歳以下・お子様無料)", 
    googleMapEmbedUrl: embedUrl, 
    order: 1,
    likesCount: 1
  },
  { 
    title: "晴れろ！！☀️ ルーフトップでスカイバー 🏔 持ち寄りギャラリー rOOM8",
    date: "2026.05.31 (日)", 
    time: "13:00〜", 
    locationName: "代々木台マンション 屋上", 
    address: "東京都渋谷区代々木 4-28-8 代々木台マンション 屋上", 
    access: "京王新線 初台駅 徒歩7分 / 小田急 参宮橋駅 徒歩10分", 
    fee: "1,000円 (19歳以下・お子様無料)", 
    googleMapEmbedUrl: embedUrl, 
    order: 2,
    likesCount: 1
  },
];
const pastEvents: any[] = [];

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
