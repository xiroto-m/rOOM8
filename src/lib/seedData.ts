import { db } from "./firebase";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";

export async function ensureSeedData() {
  // 1. Seed Creators if empty
  try {
    const creatorsRef = collection(db, "creators");
    const creatorsSnapshot = await getDocs(creatorsRef);
    
    if (creatorsSnapshot.empty) {
      console.log("Seeding initial creators...");
      const batch = writeBatch(db);
      
      const seedCreators = [
        {
          id: "seed_masa",
          name: "マサ (Masa)",
          specialty: "Wood Crafter 🪚",
          bio: "代々木の裏路地で端材を集めて、遊び心あふれるランプシェードや小さなスツールを作っています。手触りの良い無垢の香り、ぜひブースに持ち帰って体験してください！",
          imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80",
          instagram: "wood_masa_yoyogi",
          twitter: "masa_wood",
          likesCount: 12,
          createdAt: new Date()
        },
        {
          id: "seed_yuka",
          name: "ユカ (Yuka)",
          specialty: "Illustrator & Painter 🎨",
          bio: "普段はほのぼのしたイラストを描いています。今回のrOOM8では、旅先の夕暮れの空気をオイルパステルでポストカードに閉じ込めました。色々とお話ししましょう！",
          imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80",
          instagram: "yuka_pastel_art",
          twitter: "yuka_liveart",
          likesCount: 19,
          createdAt: new Date()
        },
        {
          id: "seed_kenji",
          name: "ケンジ (Kenji)",
          specialty: "Ambient Vinyl DJ 🎧",
          bio: "70〜80年代の国産アンビエントやチルレコードを中心に回しています。部屋全体の空間を優しく、角を丸くするサウンドジャーニーを。気軽にリクエストしてください。",
          imageUrl: "https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=600&auto=format&fit=crop&q=80",
          instagram: "kenji_ambient_vinyl",
          likesCount: 8,
          createdAt: new Date()
        }
      ];

      for (const creator of seedCreators) {
        batch.set(doc(db, "creators", creator.id), {
          name: creator.name,
          specialty: creator.specialty,
          bio: creator.bio,
          imageUrl: creator.imageUrl,
          instagram: creator.instagram,
          twitter: creator.twitter || "",
          likesCount: creator.likesCount,
          createdAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      console.log("Seeding creators completed!");
    }
  } catch (error) {
    console.warn("Seeding creators failed (likely lacks permission if not logged in as Admin):", error);
  }

  // 2. Seed Media files if empty
  try {
    const mediaRef = collection(db, "media");
    const mediaSnapshot = await getDocs(mediaRef);
    
    if (mediaSnapshot.empty) {
      console.log("Seeding initial media content...");
      const batch = writeBatch(db);
      
      const seedMedia = [
        {
          id: "media_live_gig",
          title: "rOOM8 Vol.4 Live Highlights - 即興オープニングセッション 🎵",
          description: "前回のイベントでの飛び入りアコースティックセッション！DJケンジのスペーシーなビートに、飛び込みのサックスが乗った即興のグルーヴ。会場が一気に温まりました！",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Standard placeholder to build a real embedded stream
          likesCount: 15,
          tipsCount: 2,
          tipsTotalYen: 1000,
          createdAt: new Date()
        },
        {
          id: "media_wood_talk",
          title: "「木を削って、繋がる」マサのウッドワーク解説 🪚",
          description: "木工作家マサさんが語る、作品のこだわりミニインタビュー、手作りのあたたかさと素材に込められた想い。作品を作る背景には、どんなストーリーがあるのかお聞きください。",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          likesCount: 9,
          tipsCount: 4,
          tipsTotalYen: 2000,
          createdAt: new Date()
        },
        {
          id: "media_gallery_walk",
          title: "「みんなの『好き』が集まる場所」rOOM8 ギャラリーツアー 🎥",
          description: "みんなが本やアートを持ち寄り、代々木の408号室をギャラリーに変えていく瞬間をダイジェスト映像でお届け。初参加の人もスッと馴染める空気を感じてください！",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          likesCount: 24,
          tipsCount: 5,
          tipsTotalYen: 2500,
          createdAt: new Date()
        }
      ];

      for (const item of seedMedia) {
        batch.set(doc(db, "media", item.id), {
          title: item.title,
          description: item.description,
          youtubeUrl: item.youtubeUrl,
          likesCount: item.likesCount,
          tipsCount: item.tipsCount,
          tipsTotalYen: item.tipsTotalYen,
          createdAt: serverTimestamp()
        });
        
        // Add a demo tip
        const tipsCollection = collection(doc(db, "media", item.id), "tips");
        const demoTipId = "demo_tip_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        batch.set(doc(tipsCollection, demoTipId), {
          contentId: item.id,
          amount: 500,
          backerName: "代々木フェロー",
          cheerMessage: "いつも素敵な体験をありがとうございます！次のセッションも楽しみです！！🌸",
          createdAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      console.log("Seeding media completed!");
    }
  } catch (error) {
    console.warn("Seeding media failed (likely lacks permission if not logged in as Admin):", error);
  }

  // 3. Seed Events if empty
  try {
    const eventsRef = collection(db, "events");
    const eventsSnapshot = await getDocs(eventsRef);
    if (eventsSnapshot.empty) {
      console.log("Seeding initial events...");
      const batch = writeBatch(db);
      const seedEvents = [
        {
          id: "seed_event_1",
          title: "あの高島くん厳選！ボードゲームをギャラリーで遊び尽くす 🔥",
          date: "2026.05.15 (金)",
          time: "19:30〜",
          locationName: "代々木台マンション 4階8号室",
          address: "〒151-0053 東京都渋谷区代々木４丁目３４−５ 代々木台マンション 408",
          access: "京王新線 初台駅 徒歩5分 / 小田急線 参宮橋駅 徒歩7分",
          fee: "1,000円 (19歳以下・お子様無料)",
          googleMapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.1347648356193!2d139.6914561!3d35.6737525!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cb7e4e16d41%3A0x67db233eaca5144b!2z5Luj44CF5pyo5Y-w44Oe44Oz44K344On44Oz!5e0!3m2!1sja!2sjp!4v1714900000000!5m2!1sja!2sjp",
          order: 1,
          likesCount: 1,
          isPublished: true,
          description: "みんなお馴染みの傑作ボードゲームから、ちょっとマニアックなインディーズ作品まで、持ち寄って日が暮れるまで遊び倒しましょう！初心者大歓迎です。",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        {
          id: "seed_event_2",
          title: "晴れろ！！☀️ ルーフトップでスカイバー 🏔 持ち寄りギャラリー rOOM8",
          date: "2026.05.31 (日)",
          time: "13:00〜",
          locationName: "代々木台マンション 屋上",
          address: "〒151-0053 東京都渋谷区代々木４丁目３４−５ 代々木台マンション 屋上",
          access: "京王新線 初台駅 徒歩5分 / 小田急線 参宮橋駅 徒歩7分",
          fee: "1,000円 (19歳以下・お子様無料)",
          googleMapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.1347648356193!2d139.6914561!3d35.6737525!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cb7e4e16d41%3A0x67db233eaca5144b!2z5Luj44CF5pyo5Y-w44Oe44Oz44K344On44Oz!5e0!3m2!1sja!2sjp!4v1714900000000!5m2!1sja!2sjp",
          order: 2,
          likesCount: 1,
          isPublished: true,
          description: "初夏の風を浴びながら、代々木台マンションのルーフトップで最高に気持ち良いチルアウト。ドリンクや軽食は各自ちょっとずつ持ち寄ってシェアしましょう！",
          youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      ];

      for (const event of seedEvents) {
        batch.set(doc(db, "events", event.id), {
          title: event.title,
          date: event.date,
          time: event.time,
          locationName: event.locationName,
          address: event.address,
          access: event.access,
          fee: event.fee,
          googleMapEmbedUrl: event.googleMapEmbedUrl,
          order: event.order,
          likesCount: event.likesCount,
          isPublished: event.isPublished,
          description: event.description,
          youtubeUrl: event.youtubeUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      console.log("Seeding events completed!");
    }
  } catch (error) {
    console.warn("Seeding events failed (likely lacks permission if not logged in as Admin):", error);
  }

  // 4. Seed Products if empty
  try {
    const productsRef = collection(db, "products");
    const productsSnapshot = await getDocs(productsRef);
    if (productsSnapshot.empty) {
      console.log("Seeding initial products...");
      const batch = writeBatch(db);
      const seedProducts = [
        {
          id: "seed_product_1",
          name: "rOOM8 Official T-Shirt",
          description: "High-quality heavy cotton tee with the official rOOM8 'passion' design. Limited edition.",
          price: 4500,
          currency: "JPY",
          imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop",
          status: "active",
          order: 1
        },
        {
          id: "seed_product_2",
          name: "Original Art Print #001",
          description: "A3 size premium print of the main gallery visual. Signed by the artists.",
          price: 8000,
          currency: "JPY",
          imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop",
          status: "active",
          order: 2
        }
      ];

      for (const product of seedProducts) {
        batch.set(doc(db, "products", product.id), {
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          imageUrl: product.imageUrl,
          status: product.status,
          order: product.order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      console.log("Seeding products completed!");
    }
  } catch (error) {
    console.warn("Seeding products failed (likely lacks permission if not logged in as Admin):", error);
  }
}
