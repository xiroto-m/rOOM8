import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  QrCode, 
  MessageSquare, 
  Sparkles, 
  Flame, 
  Share2, 
  Plus, 
  Check, 
  Award, 
  ExternalLink,
  Instagram,
  Twitter,
  Heart,
  UserCheck,
  X,
  Lock,
  MessageCircle,
  Clock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { db, auth } from "../lib/firebase";
import { CreatorCard, Referral } from "../types";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp, 
  writeBatch,
  getDoc
} from "firebase/firestore";

export default function ReferralSection({ userIP, deviceId }: { userIP: string | null; deviceId: string | null }) {
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & form state
  const [selectedCreator, setSelectedCreator] = useState<CreatorCard | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [activeReferralQR, setActiveReferralQR] = useState<Referral | null>(null);
  const [targetReferralScan, setTargetReferralScan] = useState<Referral | null>(null);
  const [isScanningSim, setIsScanningSim] = useState(false);
  
  // Form fields
  const [introducerName, setIntroducerName] = useState("");
  const [introducerContact, setIntroducerContact] = useState("");
  const [reason, setReason] = useState("");
  const [builtInIcebreaker, setBuiltInIcebreaker] = useState<string[]>([]);
  const [customIcebreaker, setCustomIcebreaker] = useState("");
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [talkedList, setTalkedList] = useState<Set<string>>(new Set());

  // Subscribe to Creators and Referrals
  useEffect(() => {
    const unsubCreators = onSnapshot(collection(db, "creators"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreatorCard));
      setCreators(list);
      setLoading(false);
    }, (err) => console.error("Creators listen error:", err));

    const unsubReferrals = onSnapshot(collection(db, "referrals"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
      // Sort by newest
      setReferrals(list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      }));
    }, (err) => console.error("Referrals listen error:", err));

    // Load talked list from localStorage
    const savedTalked = localStorage.getItem("rOOM8_talked_referrals");
    if (savedTalked) {
      try {
        setTalkedList(new Set(JSON.parse(savedTalked)));
      } catch (e) {}
    }

    return () => {
      unsubCreators();
      unsubReferrals();
    };
  }, []);

  // Check URL Hash for simulated or organic scanning (e.g. #/referral/{id} or dynamic hash detection)
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("referral_")) {
        // Extract referral_ID
        const match = hash.match(/referral_([a-zA-Z0-9_\-]+)/);
        if (match && match[1]) {
          const referralId = match[1];
          try {
            const docSnap = await getDoc(doc(db, "referrals", referralId));
            if (docSnap.exists()) {
              const referralData = { id: docSnap.id, ...docSnap.data() } as Referral;
              setTargetReferralScan(referralData);
              // Clean hash so it doesn't pop up on every refresh
              window.location.hash = "#/";
            }
          } catch (e) {
            console.error("Failed to load scanned referral", e);
          }
        }
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const handleLikeCreator = async (creatorId: string, currentLikes: number) => {
    try {
      const crRef = doc(db, "creators", creatorId);
      await updateDoc(crRef, {
        likesCount: increment(1)
      });
    } catch (e) {
      console.error("Failed to like creator:", e);
    }
  };

  const icebreakerOptions = [
    "作品づくりの一番のこだわりは？",
    "影響を受けたアーティストや作品は？",
    "普段はどんな場所で制作・活動していますか？",
    "今回のrOOM8のコンセプトについてどう思う？",
    "最近一番『好き』で熱中していることは？"
  ];

  const handleToggleIcebreakerOption = (opt: string) => {
    if (builtInIcebreaker.includes(opt)) {
      setBuiltInIcebreaker(builtInIcebreaker.filter(x => x !== opt));
    } else {
      if (builtInIcebreaker.length < 3) {
        setBuiltInIcebreaker([...builtInIcebreaker, opt]);
      }
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreator || !introducerName || !reason) return;

    setSubmittingReferral(true);
    try {
      const payloadIcebreakers = [...builtInIcebreaker];
      if (customIcebreaker.trim()) {
        payloadIcebreakers.push(customIcebreaker.trim());
      }

      await addDoc(collection(db, "referrals"), {
        creatorId: selectedCreator.id,
        introducerName,
        introducerContact,
        reason,
        icebreakers: payloadIcebreakers.slice(0, 3), // Max 3
        conversationCount: 0,
        createdAt: serverTimestamp()
      });

      // Reset
      setIntroducerName("");
      setIntroducerContact("");
      setReason("");
      setBuiltInIcebreaker([]);
      setCustomIcebreaker("");
      setShowWriteModal(false);
      setSelectedCreator(null);
    } catch (err) {
      console.error("Error writing referral: ", err);
    } finally {
      setSubmittingReferral(false);
    }
  };

  const handleSparkConversation = async (referral: Referral) => {
    if (talkedList.has(referral.id!)) return;

    try {
      const refDoc = doc(db, "referrals", referral.id!);
      await updateDoc(refDoc, {
        conversationCount: increment(1)
      });

      const updated = new Set(talkedList);
      updated.add(referral.id!);
      setTalkedList(updated);
      localStorage.setItem("rOOM8_talked_referrals", JSON.stringify(Array.from(updated)));

      // Trigger standard audio click
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitched congrats ding
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (ax) {}

    } catch (e) {
      console.error("Failed to spark conversation:", e);
    }
  };

  const getCreatorData = (id: string) => {
    return creators.find(c => c.id === id);
  };

  const getRecommendationShareUrl = (referral: Referral) => {
    // Dynamic URL detection
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}/#referral_${referral.id}`;
  };

  return (
    <div className="space-y-16">
      {/* 1. Header / Intro Block */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="bg-artistic-pink text-white text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] inline-block">
          Other-Introduction Matching (他己紹介)
        </span>
        <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-artistic-text">
          他己紹介＆おしゃべりボード 🤝
        </h2>
        <p className="font-bold text-stone-600 leading-relaxed text-sm md:text-base">
          「あのクリエイターの作品がめちゃくちゃ良かった！」「ぜひ他の人にも紹介したい！」<br className="hidden md:block" />
          そんな熱い想いをスマホから『紹介状』にしてシェアしましょう。QRをスキャンして、会話を始めるきっかけ（アイスブレイク）が爆誕します！
        </p>
      </div>

      {/* 2. Primary Creators Grid */}
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 border-b-2 border-artistic-text pb-2">
          <Sparkles className="text-artistic-accent" /> 1. 紹介したいクリエイターを選ぶ
        </h3>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-stone-100 animate-pulse rounded-[2rem] border-2 border-dashed border-stone-200" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {creators.map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ y: -6 }}
                className="bg-white border-2 border-artistic-text rounded-[2.2rem] p-6 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-artistic-text shrink-0 bg-stone-100 flex items-center justify-center">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="text-stone-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-lg text-artistic-text">{c.name}</h4>
                      <span className="text-[11px] font-black text-artistic-pink bg-artistic-pink/10 px-2.5 py-1 rounded-lg border border-artistic-pink/20 uppercase tracking-widest">
                        {c.specialty}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 font-bold leading-relaxed line-clamp-3 italic mb-4">
                    「{c.bio}」
                  </p>
                </div>

                <div className="pt-4 border-t border-dashed border-stone-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCreator(c);
                      setShowWriteModal(true);
                    }}
                    className="flex-1 bg-artistic-accent text-artistic-text hover:bg-artistic-accent/90 border border-artistic-text px-3 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] transition-all active:scale-95"
                  >
                    <Plus size={14} className="stroke-[3]" /> 紹介状を書く
                  </button>
                  <button
                    onClick={() => handleLikeCreator(c.id!, c.likesCount || 0)}
                    className="bg-stone-50 hover:bg-artistic-pink/10 hover:text-artistic-pink text-stone-400 border border-artistic-text w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]"
                    title="応援いいね！"
                  >
                    <Heart size={16} fill="none" className="stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Global Referral Feed */}
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 border-b-2 border-artistic-text pb-2">
          <Users className="text-artistic-primary" /> 2. みんなの紹介状ボード 📢
        </h3>
        
        {referrals.length === 0 ? (
          <div className="bg-stone-50 border-2 border-dashed border-stone-200 p-12 text-center rounded-[2.5rem]">
            <p className="font-bold text-stone-400">紹介状はまだ投稿されていません。</p>
            <p className="text-xs text-stone-400 mt-2">↑のクリエイターカードから最初の紹介を書いてみましょう！</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-8">
            {referrals.map((r) => {
              const cr = getCreatorData(r.creatorId);
              const alreadyTalked = talkedList.has(r.id!);

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border-2 border-artistic-text p-6 md:p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] relative flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Badge header */}
                    <div className="flex justify-between items-start gap-4 mb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-artistic-blue/20 w-8 h-8 rounded-lg flex items-center justify-center border border-artistic-text shrink-0">
                          <UserCheck size={16} className="text-artistic-primary" />
                        </div>
                        <p className="text-xs font-black">
                          <span className="text-artistic-pink font-extrabold">{r.introducerName}</span> さんの他己紹介
                        </p>
                      </div>
                      
                      <button
                        onClick={() => setActiveReferralQR(r)}
                        className="bg-white border border-artistic-text px-3 py-1.5 rounded-xl text-[10px] font-black hover:bg-stone-50 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] transition-transform active:scale-95"
                        title="QRコードを共有"
                      >
                        <QrCode size={12} /> QR共有
                      </button>
                    </div>

                    {/* Introducing who? */}
                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex items-center gap-3.5 mb-6">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-artistic-text bg-white">
                        {cr?.imageUrl && <img src={cr.imageUrl} alt={cr.name} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black opacity-40 uppercase block leading-none mb-1">RECOMMENDED CREATOR</span>
                        <h5 className="font-extrabold text-sm">{cr?.name || "ゲスト作家"}</h5>
                      </div>
                    </div>

                    {/* Recommendation body */}
                    <p className="text-sm font-bold text-stone-700 leading-relaxed italic mb-6">
                      「{r.reason}」
                    </p>

                    {/* Catalyst Questions */}
                    <div className="space-y-2 mb-6 bg-artistic-accent/20 p-4 rounded-2xl border-2 border-dashed border-artistic-text/10">
                      <h6 className="text-[11px] font-black uppercase tracking-wider text-stone-600 flex items-center gap-1">
                        <Flame size={12} className="text-artistic-pink" /> 盛り上がるアイスブレイクの種:
                      </h6>
                      <ul className="space-y-1 pl-1">
                        {r.icebreakers?.map((ice, index) => (
                          <li key={index} className="text-xs font-bold text-stone-700 flex items-start gap-1">
                            <span className="text-artistic-primary">💬</span> {ice}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Talking match button */}
                  <div className="pt-4 border-t border-dashed border-stone-100 flex items-center justify-between gap-4 mt-auto">
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-stone-400 animate-pulse" />
                      <span className="text-xs font-black font-mono">
                        会話爆誕: <span className="text-artistic-pink font-black text-sm">{r.conversationCount}</span> 回
                      </span>
                    </div>

                    <button
                      onClick={() => handleSparkConversation(r)}
                      disabled={alreadyTalked}
                      className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] transition-all ${alreadyTalked ? 'bg-[#D8E2DC] text-stone-400 border-none shadow-none translate-y-[2px] cursor-not-allowed' : 'bg-artistic-primary text-white hover:bg-artistic-primary/90 border-artistic-text active:scale-95'}`}
                    >
                      {alreadyTalked ? (
                        <>
                          <Check size={14} /> 話したよ！
                        </>
                      ) : (
                        <>
                          🤝 私たち今、お喋り中！
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Write Referral Modal */}
      <AnimatePresence>
        {showWriteModal && selectedCreator && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowWriteModal(false)}
              className="absolute inset-0 bg-artistic-text/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 relative z-50 shadow-[18px_18px_0px_0px_rgba(42,42,42,1)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-xl italic flex items-center gap-1.5">
                  ✍️ {selectedCreator.name} の紹介状を書く
                </h4>
                <button 
                  onClick={() => setShowWriteModal(false)}
                  className="p-1 rounded-full border border-stone-200 hover:bg-stone-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitReferral} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">あなたの名前 (紹介者) *</label>
                  <input
                    type="text"
                    required
                    value={introducerName}
                    onChange={(e) => setIntroducerName(e.target.value)}
                    placeholder="例: たかはる / タケ"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-extrabold text-sm outline-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">あなたのSNS IDなど (任意)</label>
                  <input
                    type="text"
                    value={introducerContact}
                    onChange={(e) => setIntroducerContact(e.target.value)}
                    placeholder="例: IG: @take_yoyogi"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-extrabold text-sm outline-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">この人の作品・どこが良いですか？ *</label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例: 温かい木のランプに一目惚れしました！端材の使い方のセンスが抜群。何気なく話しかけたらめちゃくちゃマニアックな木の話をしてくれて楽しすぎました。"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold text-sm outline-none resize-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase opacity-60 block">アイスブレイク質問の種 (最大3つ)</label>
                  <div className="flex flex-wrap gap-2">
                    {icebreakerOptions.map((opt) => {
                      const selected = builtInIcebreaker.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleToggleIcebreakerOption(opt)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${selected ? 'bg-artistic-pink text-white border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' : 'bg-stone-50 text-stone-600 border-stone-200'}`}
                        >
                          {selected ? '✓ ' : ''}{opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">独自のカスタム質問 (あれば)</label>
                  <input
                    type="text"
                    value={customIcebreaker}
                    onChange={(e) => setCustomIcebreaker(e.target.value)}
                    placeholder="例: 一番おすすめの木材はなんですか？"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold text-sm outline-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReferral}
                  className="w-full bg-artistic-primary text-white border-2 border-artistic-text py-3.5 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:bg-artistic-primary/95 transition-all"
                >
                  {submittingReferral ? "送信中..." : "紹介状を投稿して会話を生み出す！✨"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR overlay modal */}
      <AnimatePresence>
        {activeReferralQR && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setActiveReferralQR(null)}
              className="absolute inset-0 bg-artistic-text/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-sm p-6 text-center relative z-50 shadow-[18px_18px_0px_0px_rgba(42,42,42,1)]"
            >
              <button 
                onClick={() => setActiveReferralQR(null)}
                className="absolute top-4 right-4 p-1 rounded-full border border-stone-200 hover:bg-stone-50"
              >
                <X size={18} />
              </button>

              <h4 className="font-black text-lg mb-2 italic">他己紹介をシェア！📱</h4>
              <p className="text-xs text-stone-500 font-bold mb-6">
                会場にいる別のゲストがスマホカメラでスキャンすると、紹介内容とお喋りトリップ（アイスブレイク）がスタートします。
              </p>

              <div className="bg-stone-50 p-6 rounded-[2rem] border-2 border-artistic-text flex justify-center mb-6 shadow-inner">
                <QRCodeSVG 
                  value={getRecommendationShareUrl(activeReferralQR)}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="flex items-center justify-center gap-1 opacity-50 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:opacity-100"
                   onClick={() => {
                     navigator.clipboard.writeText(getRecommendationShareUrl(activeReferralQR));
                     alert("リンクをクリップボードにコピーしました！");
                   }}>
                <Share2 size={12} /> Click path: copy shareable link
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanned/Referral scan details display */}
      <AnimatePresence>
        {targetReferralScan && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setTargetReferralScan(null)}
              className="absolute inset-0 bg-artistic-text/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-[#FFF1E6] border-4 border-artistic-text rounded-[2.5rem] w-full max-w-md p-6 md:p-8 relative z-50 shadow-[24px_24px_0px_0px_rgba(42,42,42,1)]"
            >
              {/* Decorative stamp clip */}
              <div className="absolute -top-4 -left-4 bg-artistic-pink text-white border-2 border-artistic-text font-black px-4 py-1.5 rounded-xl uppercase text-[10px] tracking-widest rotate-[-12deg] shadow-md flex items-center gap-1">
                <Sparkles size={12} /> Match Catalyst Detected
              </div>

              <div className="text-right mt-2 mb-6">
                <button 
                  onClick={() => setTargetReferralScan(null)}
                  className="bg-white hover:scale-105 border-2 border-artistic-text p-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-center space-y-4 mb-6">
                <h4 className="text-2xl font-black italic text-artistic-text leading-snug">
                  <span className="text-artistic-primary underline decoration-artistic-accent">{targetReferralScan.introducerName}</span> さん推薦！
                </h4>
                <p className="text-xs text-stone-500 font-bold mb-4">
                  他己紹介状をスキャンし、新しいリアル対話のロックが解除されました。🔓
                </p>
                
                {/* Creator card inside */}
                {(() => {
                  const cr = getCreatorData(targetReferralScan.creatorId);
                  return (
                    <div className="bg-white p-4 rounded-3xl border-2 border-artistic-text flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-xl border border-artistic-text overflow-hidden shrink-0 bg-stone-50">
                        {cr?.imageUrl && <img src={cr.imageUrl} alt={cr.name} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-widest leading-none mb-1 block">YOYOGI CREATOR</span>
                        <h5 className="font-extrabold text-base leading-none">{cr?.name}</h5>
                        <p className="text-[10px] text-artistic-pink font-extrabold mt-1">{cr?.specialty}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="bg-white border-2 border-artistic-text p-5 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] mb-6 space-y-4">
                <p className="text-xs font-black text-stone-500 uppercase tracking-wider">🌟 推薦の理由:</p>
                <p className="text-sm font-bold text-stone-700 leading-relaxed italic border-l-4 border-artistic-accent pl-3">
                  「{targetReferralScan.reason}」
                </p>

                <div className="space-y-2.5 pt-4 border-t border-dashed border-stone-100">
                  <p className="text-xs font-black text-stone-600 flex items-center gap-1">
                    <Flame size={12} className="text-artistic-pink" /> 盛り上がるアイスブレイクの種:
                  </p>
                  <ul className="space-y-1.5">
                    {targetReferralScan.icebreakers?.map((ice, index) => (
                      <li key={index} className="text-xs font-bold text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        💬 <span className="text-artistic-primary font-black">質問:</span> &quot;{ice}&quot;
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Spark interactive button */}
              <div className="space-y-4 text-center">
                {talkedList.has(targetReferralScan.id!) ? (
                  <div className="bg-[#D8E2DC] text-[#2D6A4F] p-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-[#2D6A4F]/20">
                    <Check size={16} className="stroke-[3]" /> 話したよ！カウントがアップされました 🎉
                  </div>
                ) : (
                  <button
                    onClick={() => handleSparkConversation(targetReferralScan)}
                    className="w-full bg-artistic-primary text-white border-2 border-artistic-text py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:bg-artistic-primary/95 transition-all animate-bounce"
                  >
                    🤝 私たち今、実際に話したよ！
                  </button>
                )}
                <p className="text-[11px] font-extrabold opacity-40 italic">
                  ※ボタンを押すと、この他己紹介の『会話爆誕数』がリアルタイムで増加して盛り上がります！
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
