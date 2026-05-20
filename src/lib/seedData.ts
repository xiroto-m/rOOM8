import { db } from "./firebase";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";

export async function ensureSeedData() {
  try {
    // 1. Seed Creators if empty
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

    // 2. Seed Media files if empty
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
    console.error("Seeding failed: ", error);
  }
}
