import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  QrCode, 
  MessageSquare, 
  Sparkles, 
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
  Clock,
  Edit2,
  Trash2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
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
  getDoc,
  deleteDoc
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
  const [manualCode, setManualCode] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Account-free guest collections state
  const [metReferralIds, setMetReferralIds] = useState<Set<string>>(() => {
    const savedMet = localStorage.getItem("rOOM8_met_referrals");
    if (savedMet) {
      try {
        return new Set(JSON.parse(savedMet));
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  const handleAddToMetList = (referralId: string) => {
    setMetReferralIds((prev) => {
      const updated = new Set(prev);
      if (!updated.has(referralId)) {
        updated.add(referralId);
        localStorage.setItem("rOOM8_met_referrals", JSON.stringify(Array.from(updated)));
      }
      return updated;
    });
  };

  const playScanSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Beep 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain1.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.08);

      // Beep 2 (delayed slightly)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime); // E6
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.15);
      }, 80);
    } catch (e) {}
  };

  const selectRandomReferralForSim = () => {
    if (referrals.length === 0) {
      showToast("紹介状がまだ1件もありません！まずは自分で紹介状を書いてみましょう。✍️");
      return;
    }
    
    setIsScanningSim(true);
    
    setTimeout(() => {
      // Choose from all referrals
      const randomIndex = Math.floor(Math.random() * referrals.length);
      const selected = referrals[randomIndex];
      
      setTargetReferralScan(selected);
      if (selected.id) {
        handleAddToMetList(selected.id);
      }
      playScanSuccessSound();
      setIsScanningSim(false);
      showToast(`「${selected.introducerName}」さんの紹介をピピッ！と読み込み完了！🎨`);
    }, 1500); // 1.5s visual scanner animation
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    
    let cleanedId = manualCode.trim();
    // Ex: https://tackyosya955.run.app/#referral_XYZ -> XYZ, or referral_XYZ -> XYZ
    if (cleanedId.includes("referral_")) {
      const match = cleanedId.match(/referral_([a-zA-Z0-9_\-]+)/);
      if (match && match[1]) {
        cleanedId = match[1];
      }
    }
    
    const found = referrals.find(r => r.id === cleanedId);
    if (found) {
      playScanSuccessSound();
      setTargetReferralScan(found);
      if (found.id) {
        handleAddToMetList(found.id);
      }
      setManualCode("");
      showToast(`紹介コード「${found.id}」のスキャンに成功しました！🎉`);
    } else {
      showToast("指定された紹介コードが見つかりません。コードを確認してください。⚠️");
    }
  };
  
  // Form fields
  const [introducerName, setIntroducerName] = useState("");
  const [introducerContact, setIntroducerContact] = useState("");
  const [reason, setReason] = useState("");
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [myPostedReferrals, setMyPostedReferrals] = useState<Set<string>>(new Set());
  const [likedReferrals, setLikedReferrals] = useState<Set<string>>(new Set());
  const [expandedCreatorIds, setExpandedCreatorIds] = useState<Set<string>>(new Set());
  const [editingReferralId, setEditingReferralId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Custom dialogs
  const [referralToDelete, setReferralToDelete] = useState<Referral | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  const toggleExpandCreator = (id: string) => {
    const updated = new Set(expandedCreatorIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setExpandedCreatorIds(updated);
  };

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

    // Load posted referrals list
    const savedPosted = localStorage.getItem("rOOM8_posted_referrals");
    if (savedPosted) {
      try {
        setMyPostedReferrals(new Set(JSON.parse(savedPosted)));
      } catch (e) {}
    }

    // Load liked referrals list
    const savedLiked = localStorage.getItem("rOOM8_liked_referrals");
    if (savedLiked) {
      try {
        setLikedReferrals(new Set(JSON.parse(savedLiked)));
      } catch (e) {}
    }

    // Hydrate met list (safe setup)
    const savedMet = localStorage.getItem("rOOM8_met_referrals");
    if (savedMet) {
      try {
        setMetReferralIds(new Set(JSON.parse(savedMet)));
      } catch (e) {}
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        const emails = ["hiroto.mizutani@gmail.com", "taku448@gmail.com"];
        setIsAdmin(emails.includes(user.email.toLowerCase()));
      } else {
        const localIsAdmin = localStorage.getItem("room8_is_admin") === "true";
        setIsAdmin(localIsAdmin);
      }
    });

    return () => {
      unsubCreators();
      unsubReferrals();
      unsubAuth();
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
              handleAddToMetList(docSnap.id);
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

  const handleStartConversation = async (referralId: string) => {
    try {
      const refDoc = doc(db, "referrals", referralId);
      await updateDoc(refDoc, {
        conversationCount: increment(1)
      });
      showToast("対話を記録しました！会話カウンター +1 🔥");

      // Play start sound (happy high-pitched synth)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.15); // C6
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (ax) {}
    } catch (e) {
      console.error("Failed to start conversation:", e);
      showToast("接続エラーが発生しました。");
    }
  };

  const handleLikeCreator = async (creatorId: string, currentLikes: number) => {
    try {
      const crRef = doc(db, "creators", creatorId);
      await updateDoc(crRef, {
        likesCount: increment(1)
      });
      showToast("クリエイターを「いいね！」で応援しました！❤️");
    } catch (e) {
      console.error("Failed to like creator:", e);
      showToast("応援に失敗しました。");
    }
  };

  const handleLikeReferral = async (referralId: string) => {
    if (likedReferrals.has(referralId)) {
      showToast("この紹介状はすでに「いいね！」しています。");
      return;
    }
    try {
      const refDoc = doc(db, "referrals", referralId);
      await updateDoc(refDoc, {
        likesCount: increment(1)
      });
      const updated = new Set(likedReferrals);
      updated.add(referralId);
      setLikedReferrals(updated);
      localStorage.setItem("rOOM8_liked_referrals", JSON.stringify(Array.from(updated)));
      showToast("紹介状に「いいね！」しました！❤️");

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } catch (ax) {}
    } catch (e) {
      console.error("Failed to like referral:", e);
      showToast("いいねに失敗しました。");
    }
  };

  const handleEditReferral = (r: Referral) => {
    const cr = getCreatorData(r.creatorId) || {
      id: r.creatorId,
      name: "ゲスト作家",
      specialty: "クリエイター",
      bio: "",
      createdAt: null
    } as CreatorCard;

    setSelectedCreator(cr);
    setEditingReferralId(r.id!);
    setIntroducerName(r.introducerName);
    setIntroducerContact(r.introducerContact || "");
    setReason(r.reason);
    setShowWriteModal(true);
  };

  const handleDeleteReferral = async (r: Referral) => {
    setReferralToDelete(r);
  };

  const executeDeleteReferral = async () => {
    if (!referralToDelete) return;
    try {
      await deleteDoc(doc(db, "referrals", referralToDelete.id!));
      const updatedPosted = new Set(myPostedReferrals);
      updatedPosted.delete(referralToDelete.id!);
      setMyPostedReferrals(updatedPosted);
      localStorage.setItem("rOOM8_posted_referrals", JSON.stringify(Array.from(updatedPosted)));
      showToast("作家紹介を削除しました。");
    } catch (err) {
      console.error("Failed to delete referral:", err);
      showToast("作家紹介の削除に失敗しました。");
    } finally {
      setReferralToDelete(null);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCreator || !introducerName || !reason) return;

    setSubmittingReferral(true);
    try {
      if (editingReferralId) {
        // Update existing referral
        await updateDoc(doc(db, "referrals", editingReferralId), {
          introducerName,
          introducerContact,
          reason
        });
        showToast("紹介状を更新しました！✨");
      } else {
        // Create new referral
        const docRef = await addDoc(collection(db, "referrals"), {
          creatorId: selectedCreator.id,
          introducerName,
          introducerContact,
          reason,
          conversationCount: 0,
          authorDeviceId: deviceId || "",
          authorIP: userIP || "",
          createdAt: serverTimestamp()
        });

        // Add to myPostedReferrals locally
        const updatedPosted = new Set(myPostedReferrals);
        updatedPosted.add(docRef.id);
        setMyPostedReferrals(updatedPosted);
        localStorage.setItem("rOOM8_posted_referrals", JSON.stringify(Array.from(updatedPosted)));
        showToast("作家紹介の紹介状が爆誕しました！🎉");
      }

      // Expand comments for this creator automatically so the user can see their review post!
      if (selectedCreator.id) {
        const updatedExpanded = new Set(expandedCreatorIds);
        updatedExpanded.add(selectedCreator.id);
        setExpandedCreatorIds(updatedExpanded);
      }

      // Reset
      setIntroducerName("");
      setIntroducerContact("");
      setReason("");
      setEditingReferralId(null);
      setShowWriteModal(false);
      setSelectedCreator(null);
    } catch (err) {
      console.error("Error writing referral: ", err);
      showToast("送信に失敗しました。");
    } finally {
      setSubmittingReferral(false);
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
          Artist Matching & Introduction (作家紹介)
        </span>
        <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-artistic-text">
          作家紹介ボード 🤝
        </h2>
        <p className="font-bold text-stone-600 leading-relaxed text-sm md:text-base">
          「あのクリエイターの作品がめちゃくちゃ良かった！」「ぜひ他の人にも紹介したい！」<br className="hidden md:block" />
          そんな熱い想いをスマホから『紹介状』にしてシェアしましょう。QRをスキャンして、会話を始めるきっかけとしてスムーズに共有できます！
        </p>
      </div>

      {/* 1.5. QR Exchange & Simulation Hub */}
      <div className="bg-gradient-to-r from-artistic-accent/20 to-artistic-primary/10 border-4 border-artistic-text rounded-[2.5rem] p-6 md:p-8 shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black italic flex items-center gap-2 text-artistic-text">
              <QrCode size={24} className="text-artistic-primary stroke-[3]" /> 紹介状スキャン＆おしゃべり接続 📱⚡️
            </h3>
            <p className="text-xs font-bold text-stone-600 max-w-xl leading-relaxed">
              会場ではお互いのスマホ画面の<strong>【QRコードマーク】</strong>を表示してスキャン！<br />
              1台のスマホのみでテストしたい場合は、下の<strong>「スキャン擬似体験」</strong>、または各紹介カードのコードを<strong>「手動入力」</strong>して、ピッ！と体験できます。
            </p>
          </div>
          
          <div className="w-full md:w-auto shrink-0">
            <button
              onClick={selectRandomReferralForSim}
              disabled={isScanningSim}
              className={`w-full md:w-auto flex items-center justify-center gap-2 bg-artistic-primary text-white border-2 border-artistic-text px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-tight transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] ${
                isScanningSim 
                  ? "opacity-50 cursor-wait shadow-none translate-x-[2px] translate-y-[2px]" 
                  : "hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 cursor-pointer"
              }`}
            >
              <Sparkles size={16} className={isScanningSim ? "animate-spin text-artistic-accent" : "animate-pulse text-white"} />
              {isScanningSim ? "スキャン解析中..." : "スキャン擬似体験 (SE音付き) ⚡️"}
            </button>
          </div>
        </div>

        {/* Manual code search bar with Neo-Brutalist elements */}
        <form onSubmit={handleManualCodeSubmit} className="pt-4 border-t-2 border-dashed border-artistic-text/10 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-[10px] font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <span>紹介状コードの入力 (直接コピーしたコードを貼り付けてスキャン)</span>
              <span className="bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded text-[8px] font-mono leading-none">例: referralsのQRモーダルからコピー</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="招待コード（例: CLfU9a2p...）または共有用URLを貼り付け"
                className="w-full border-2 border-artistic-text py-3 pl-4 pr-12 rounded-xl font-extrabold text-xs md:text-sm outline-none bg-white placeholder-stone-400 focus:ring-2 focus:ring-artistic-accent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base opacity-40">🔑</span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-white hover:bg-stone-50 text-artistic-text border-2 border-artistic-text px-6 py-3.5 rounded-xl font-black text-xs md:text-sm transition-all shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[1.5px] hover:translate-y-[1.5px] cursor-pointer"
          >
            スキャン実行 🔓
          </button>
        </form>
      </div>

      {/* 1.7. Account-free Met Authors history panel */}
      {(() => {
        const metList = referrals.filter(r => r.id && metReferralIds.has(r.id));
        return (
          <div className="bg-white border-4 border-artistic-text rounded-[2.5rem] p-6 md:p-8 shadow-[10px_10px_0px_0px_rgba(120,113,108,1)] space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-stone-200 pb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2 text-stone-800">
                  🤝 あなたが出会ったクリエイター名鑑 ({metList.length}名)
                </h3>
                <p className="text-xs font-bold text-stone-500">
                  QRスキャンやコード入力で出会った紹介状が、あなたのスマホに「名鑑」として自動ストックされます！💾
                </p>
              </div>
              {!showClearConfirm ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(true);
                  }}
                  className="text-[10px] font-black text-stone-400 hover:text-red-500 border border-stone-200 hover:border-red-200 px-3 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer bg-stone-50 hover:bg-stone-100"
                >
                  🗑️ 履歴をクリア
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMetReferralIds(new Set());
                      setLikedReferrals(new Set());
                      setMyPostedReferrals(new Set());
                      localStorage.removeItem("rOOM8_met_referrals");
                      localStorage.removeItem("rOOM8_liked_referrals");
                      localStorage.removeItem("rOOM8_posted_referrals");
                      setShowClearConfirm(false);
                      showToast("すべての体験履歴（あしあと・いいね・投稿キャッシュ）をリセットしました！✨");
                    }}
                    className="text-[10px] font-black text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-xl transition-all cursor-pointer animate-pulse border border-red-800"
                  >
                    💥 本当に全てリセットする
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="text-[10px] font-black text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-2 rounded-xl border border-stone-200 cursor-pointer"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>

            {metList.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="text-4xl animate-bounce">🗺️</div>
                <p className="text-xs font-black text-stone-400 max-w-md mx-auto leading-relaxed">
                  まだ出会ったクリエイターがいません。<br />
                  別のスマホのQRを読み取るか、上の<strong>「スキャン擬似体験 ⚡️」</strong>ボタンをタップしてお喋りをスタートしてみましょう！
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {metList.map((r) => {
                  const cr = getCreatorData(r.creatorId);
                  return (
                    <motion.div
                      key={r.id}
                      whileHover={{ y: -3, scale: 1.02 }}
                      onClick={() => setTargetReferralScan(r)}
                      className="bg-stone-50 hover:bg-artistic-accent/10 border-2 border-artistic-text p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] cursor-pointer text-left flex flex-col justify-between space-y-3 relative group"
                    >
                      <div className="space-y-2">
                        {/* Polaroid effect thumbnail */}
                        <div className="w-12 h-12 rounded-xl border border-artistic-text overflow-hidden bg-white mx-auto shadow-inner flex items-center justify-center">
                          {cr?.imageUrl ? (
                            <img src={cr.imageUrl} alt={cr?.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="text-stone-300" />
                          )}
                        </div>
                        <div className="text-center">
                          <h4 className="font-extrabold text-xs text-stone-800 truncate leading-tight group-hover:text-artistic-primary">
                            {cr?.name || "ゲスト作家"}
                          </h4>
                          <span className="text-[8px] font-black text-artistic-pink bg-artistic-pink/5 px-1.5 py-0.2 rounded border border-artistic-pink/10 uppercase tracking-wider block mt-1 truncate">
                            {cr?.specialty || "クリエイター"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-stone-200 text-[9px] font-bold text-stone-500 text-center">
                        推薦: <span className="font-black text-stone-700">{r.introducerName}さん</span>
                      </div>
                      
                      {/* Interactive re-view hover overlay hint */}
                      <span className="absolute top-1 right-2 text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded-sm opacity-90">
                        スキャン済 🤝
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. Primary Creators Grid & Interactive Referrals */}
      <div className="space-y-6">
        <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 border-b-2 border-artistic-text pb-2">
          <Sparkles className="text-artistic-accent" /> 1. 作家紹介の一覧 ✨
        </h3>
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-stone-100 animate-pulse rounded-[2rem] border-2 border-dashed border-stone-200" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {creators.map((c) => {
              const creatorReferrals = referrals.filter(r => r.creatorId === c.id);
              const isExpanded = expandedCreatorIds.has(c.id!);

              return (
                <motion.div
                  key={c.id}
                  whileHover={{ y: isExpanded ? 0 : -4 }}
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
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <h4 className="font-black text-lg text-artistic-text leading-none">{c.name}</h4>
                          {c.isExhibitingToday && (
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              🟢 本日出展中
                            </span>
                          )}
                          {c.isPastExhibitor && (
                            <span className="text-[9px] font-black text-stone-600 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200">
                              📅 過去に出展
                            </span>
                          )}
                        </div>
                        <span className="inline-block text-[10px] font-black text-artistic-pink bg-artistic-pink/10 px-2 py-0.5 rounded border border-artistic-pink/20 uppercase tracking-widest mt-1">
                          {c.specialty}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-stone-500 font-bold leading-relaxed italic mb-4">
                      「{c.bio}」
                    </p>

                    {/* SNS Links */}
                    {(c.instagram || c.twitter) && (
                      <div className="flex flex-wrap gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
                        {c.instagram && (
                          <a
                            href={c.instagram.startsWith("http") ? c.instagram : `https://instagram.com/${c.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E1306C]/10 text-[#E1306C] hover:bg-[#E1306C]/20 border border-[#E1306C]/20 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95"
                          >
                            <Instagram size={12} className="stroke-[2.5]" />
                            <span>Instagram</span>
                            <ExternalLink size={9} className="opacity-60" />
                          </a>
                        )}
                        {c.twitter && (
                          <a
                            href={c.twitter.startsWith("http") ? c.twitter : `https://x.com/${c.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95"
                          >
                            <Twitter size={12} className="stroke-[2.5]" />
                            <span>Twitter/X</span>
                            <ExternalLink size={9} className="opacity-60" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-dashed border-stone-100 space-y-4">
                    <div className="flex items-center justify-between gap-2">
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
                        className="bg-stone-50 hover:bg-artistic-pink/10 hover:text-artistic-pink text-stone-700 border border-artistic-text px-3 h-11 rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] active:scale-95 transition-transform"
                        title="応援いいね！"
                      >
                        <Heart size={16} fill={c.likesCount ? "#FF5A5F" : "none"} className={c.likesCount ? "text-artistic-pink stroke-artistic-pink" : "text-stone-400 stroke-[2.5]"} />
                        <span className="text-xs font-black font-mono text-stone-600">{c.likesCount || 0}</span>
                      </button>
                    </div>

                    {/* Collapsible comments section */}
                    <div className="pt-1 select-none">
                      <button
                        onClick={() => toggleExpandCreator(c.id!)}
                        className={`w-full flex items-center justify-between border-2 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                          isExpanded 
                            ? "bg-stone-100 border-artistic-text text-stone-800 shadow-none"
                            : "bg-stone-50 border-stone-200 text-stone-500 hover:border-artistic-text hover:text-artistic-text shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <MessageCircle size={13} className="text-artistic-primary stroke-[2.5]" />
                          届いた紹介状 ({creatorReferrals.length}件)
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="text-[9px] font-bold"
                        >
                          ▼
                        </motion.span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden mt-3"
                          >
                            <div className="max-h-64 overflow-y-auto space-y-3 pr-1 py-1 scrollbar-thin scroll-smooth text-stone-700">
                              {creatorReferrals.length === 0 ? (
                                <div className="p-4 bg-stone-50/50 rounded-2xl border-2 border-dashed border-stone-200 text-center text-[10px] font-bold text-stone-400 leading-relaxed">
                                  紹介状はまだありません。✍️<br />
                                  作品の魅力や出会ったエピソードを教えてください！
                                </div>
                              ) : (
                                creatorReferrals.map((r) => (
                                  <div 
                                    key={r.id} 
                                    className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200 text-left relative text-xs shadow-sm space-y-2 hover:bg-stone-50 transition-colors"
                                  >
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="min-w-0">
                                        <span className="font-extrabold text-[11px] text-artistic-text block leading-none truncate">
                                          👤 {r.introducerName} さん
                                        </span>
                                        {r.introducerContact && (
                                          <span className="text-[9px] text-stone-400 font-bold block truncate mt-1">
                                            {r.introducerContact}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {((r.id && myPostedReferrals.has(r.id)) || 
                                          (deviceId && r.authorDeviceId === deviceId) || 
                                          (userIP && r.authorIP === userIP) || 
                                          isAdmin) && (
                                          <div className="flex items-center gap-0.5 bg-white border border-stone-200 rounded-lg p-0.5 shadow-sm">
                                            <button
                                              onClick={() => handleEditReferral(r)}
                                              className="hover:bg-stone-100 text-stone-500 p-1 rounded transition-colors"
                                              title="編集"
                                            >
                                              <Edit2 size={10} className="stroke-[2.5]" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteReferral(r)}
                                              className="hover:bg-red-50 text-red-500 p-1 rounded transition-colors"
                                              title="削除"
                                            >
                                              <Trash2 size={10} className="stroke-[2.5]" />
                                            </button>
                                          </div>
                                        )}
                                        <button
                                          onClick={() => setActiveReferralQR(r)}
                                          className="bg-white hover:bg-stone-100 p-1 rounded border border-stone-200 transition-colors text-stone-600 shadow-sm"
                                          title="QRコードを共有"
                                        >
                                          <QrCode size={10} className="stroke-[2]" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-stone-700 font-medium leading-relaxed italic pl-2.5 border-l-2 border-artistic-primary">
                                      「{r.reason}」
                                    </p>
                                    <div className="flex justify-between items-center bg-white border border-stone-150 px-2 py-1 rounded-lg">
                                      <button
                                        onClick={() => r.id && handleLikeReferral(r.id)}
                                        className={`flex items-center gap-1 text-[9px] font-black transition-all hover:scale-105 active:scale-95 ${
                                          r.id && likedReferrals.has(r.id) ? "text-artistic-pink" : "text-stone-500 hover:text-stone-700"
                                        }`}
                                      >
                                        <Heart
                                          size={10}
                                          className="stroke-[2.5]"
                                          fill={r.id && likedReferrals.has(r.id) ? "#FF5A5F" : "none"}
                                        />
                                        <span>応援 {r.likesCount || 0}</span>
                                      </button>
                                      {r.createdAt && (
                                        <span className="text-[8px] text-stone-400 font-mono">
                                          {new Date(r.createdAt.seconds * 1000).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

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
              onClick={() => {
                setShowWriteModal(false);
                setEditingReferralId(null);
                setIntroducerName("");
                setIntroducerContact("");
                setReason("");
              }}
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
                  ✍️ {selectedCreator.name} の紹介状を{editingReferralId ? "編集する" : "書く"}
                </h4>
                <button 
                  onClick={() => {
                    setShowWriteModal(false);
                    setEditingReferralId(null);
                    setIntroducerName("");
                    setIntroducerContact("");
                    setReason("");
                  }}
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

                <button
                  type="submit"
                  disabled={submittingReferral}
                  className="w-full bg-artistic-primary text-white border-2 border-artistic-text py-3.5 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:bg-artistic-primary/95 transition-all"
                >
                  {submittingReferral ? "送信中..." : (editingReferralId ? "変更を保存する" : "紹介状を投稿して会話を生み出す！✨")}
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

              <h4 className="font-black text-lg mb-2 italic">作家紹介をシェア！📱</h4>
              <p className="text-xs text-stone-500 font-bold mb-6">
                会場にいる別のゲストがスマホカメラでスキャンすると、紹介内容とお喋りトリップ（アイスブレイク）がスタートします。
              </p>

              <div className="bg-stone-50 p-6 rounded-[2rem] border-2 border-artistic-text flex justify-center mb-4 shadow-inner">
                <QRCodeSVG 
                  value={getRecommendationShareUrl(activeReferralQR)}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Manual Connection Code Container */}
              <div className="mb-6 bg-[#FAFAF9] border-2 border-stone-200 p-3 rounded-2xl text-left space-y-1">
                <span className="text-[9px] font-black tracking-widest uppercase text-stone-400">体験用・共有コード</span>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono font-black text-stone-700 bg-stone-100 px-2 py-1 rounded border border-stone-200 select-all break-all overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                    {activeReferralQR.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeReferralQR.id || "");
                      showToast("紹介コードをコピーしました！📋");
                    }}
                    className="text-[9.5px] font-black text-white bg-artistic-primary border border-artistic-text px-2.5 py-1.5 rounded-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    コピー
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 opacity-50 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:opacity-100"
                   onClick={() => {
                     navigator.clipboard.writeText(getRecommendationShareUrl(activeReferralQR));
                     showToast("シェア用リンクをコピーしました！🔗");
                   }}>
                <Share2 size={12} /> 全体URLをコピーする
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scanned/Referral scan details display */}
      <AnimatePresence>
        {targetReferralScan && (() => {
          const activeReferral = referrals.find(r => r.id === targetReferralScan.id) || targetReferralScan;
          return (
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
              className="bg-[#FFFDF9] border-4 border-artistic-text rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 relative z-50 shadow-[24px_24px_0px_0px_rgba(42,42,42,1)] max-h-[85vh] overflow-y-auto"
            >
              {/* Decorative stamp clip */}
              <div className="absolute -top-4 -left-4 bg-artistic-pink text-white border-2 border-artistic-text font-black px-4 py-1.5 rounded-xl uppercase text-[10px] tracking-widest rotate-[-6deg] shadow-lg flex items-center gap-1.5 z-10">
                <Sparkles size={11} className="animate-spin text-white" /> コネクト成功 🤝 Connect Catalyst
              </div>

              <div className="text-right mt-2 mb-4">
                <button 
                  onClick={() => setTargetReferralScan(null)}
                  className="bg-white hover:scale-105 border-2 border-artistic-text p-2 rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {(() => {
                const cr = getCreatorData(activeReferral.creatorId);
                const hasIcebreakers = activeReferral.icebreakers && activeReferral.icebreakers.length > 0;
                // Standard default icebreakers
                const defaultIcebreakers = [
                  `「${cr?.name || "作家"}」さんの作品の、第一印象やビビッと惹きつけられた部分はどこ？👀`,
                  `紹介状に書かれている推薦理由「${activeReferral.reason.slice(0, 35)}...」について、あなたはどう感じる？納得する箇所はある？💡`,
                  `あなたの好きなアート表現や、普段つい目で追ってしまうジャンル（モノづくり・デザイン）についてお互いに熱くシェアしてみよう！🎨`
                ];
                const displayIcebreakers = hasIcebreakers ? activeReferral.icebreakers : defaultIcebreakers;

                return (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <span className="bg-artistic-pink/10 text-artistic-pink border border-artistic-pink/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                        Introducer Connect Panel
                      </span>
                      <h4 className="text-2xl md:text-3xl font-black italic text-artistic-text leading-tight mt-1">
                        <span className="text-artistic-primary underline decoration-artistic-accent decoration-wavy">{activeReferral.introducerName}</span> さんの紹介状 ⭐️
                      </h4>
                      <p className="text-[11px] text-stone-500 font-bold">
                        別の参加者のQRをスキャンして、会話を始めるきっかけを受信しました！
                      </p>
                    </div>

                    {/* Creator block card */}
                    <div className="bg-white p-4 rounded-3xl border-2 border-artistic-text flex items-center gap-4 text-left shadow-[3px_3px_0px_0px_rgba(42,42,42,1)]">
                      <div className="w-14 h-14 rounded-2xl border-2 border-artistic-text overflow-hidden shrink-0 bg-stone-50 flex items-center justify-center">
                        {cr?.imageUrl ? (
                          <img src={cr.imageUrl} alt={cr.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="text-stone-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-mono font-black opacity-40 uppercase tracking-widest mb-0.5 block">推薦クリエイター</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h5 className="font-black text-base leading-none truncate">{cr?.name || "ゲスト作家"}</h5>
                          {cr?.isExhibitingToday && (
                            <span className="text-[9px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              本日出展
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-artistic-pink font-black uppercase tracking-widest mt-1 block truncate">
                          🎨 {cr?.specialty || "クリエイター"}
                        </p>
                      </div>
                    </div>

                    {/* The recommendation text block */}
                    <div className="bg-stone-50 border-2 border-artistic-text p-4 md:p-5 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-stone-500 uppercase tracking-wider">
                        <MessageSquare size={13} className="text-artistic-accent" /> 紹介者の熱い一押し理由:
                      </div>
                      <p className="text-xs md:text-sm font-bold text-stone-700 leading-relaxed italic border-l-4 border-artistic-primary pl-3">
                        「{activeReferral.reason}」
                      </p>
                    </div>

                    {/* Dynamic Icebreakers engine */}
                    <div className="bg-gradient-to-r from-artistic-accent/20 to-artistic-primary/15 border-2 border-artistic-text p-5 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] space-y-3 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-white text-artistic-text border border-artistic-text px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          Icebreakers 🗯️
                        </span>
                        <span className="text-xs font-black italic text-stone-800">スマホを見せ合って話してみよう！</span>
                      </div>
                      <div className="space-y-2.5">
                        {displayIcebreakers.map((topic, idx) => (
                          <div key={idx} className="bg-white/80 p-3 rounded-2xl border border-stone-200 text-xs font-bold text-stone-700 flex items-start gap-2.5 leading-relaxed shadow-sm">
                            <span className="bg-artistic-primary text-white w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <p className="flex-1">{topic}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Active conversation starter */}
                    <div className="bg-[#EBFDF5] border-2 border-emerald-950 p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] flex flex-col md:flex-row justify-between items-center gap-4 text-left">
                      <div className="space-y-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-1 text-emerald-900 font-black text-xs uppercase tracking-wide">
                          <Users size={12} className="stroke-[2.5]" /> 会話の接続実績
                        </div>
                        <p className="text-stone-800 font-bold text-xs leading-relaxed">
                          お喋りが始まったらボタンをタップ！<br />
                          現在 <strong className="text-emerald-700 font-mono font-black text-sm bg-emerald-100 hover:scale-105 active:scale-95 transition-transform px-2 py-0.5 rounded border border-emerald-250 inline-block">{activeReferral.conversationCount || 0}回</strong> のお喋りが生まれています。
                        </p>
                      </div>
                      <button
                        onClick={() => activeReferral.id && handleStartConversation(activeReferral.id)}
                        className="w-full md:w-auto shrink-0 bg-[#064E3B] hover:bg-emerald-900 hover:scale-105 text-white border-2 border-emerald-950 px-5 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] flex items-center justify-center gap-1.5"
                      >
                        🗣️ お喋りスタート！
                      </button>
                    </div>

                    {/* Scan detail - Referral like button & metadata */}
                    <div className="flex justify-between items-center bg-white border-2 border-artistic-text p-3 rounded-2xl shadow-[3px_3px_0px_0px_rgba(42,42,42,1)]">
                      <span className="text-xs font-black text-stone-700">紹介状に「いいね」を送る？❤️</span>
                      <button
                        onClick={() => activeReferral.id && handleLikeReferral(activeReferral.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-xs font-black transition-all hover:scale-105 active:scale-95 ${
                          activeReferral.id && likedReferrals.has(activeReferral.id)
                            ? "bg-artistic-pink/10 border-artistic-pink text-artistic-pink shadow-none"
                            : "bg-white border-artistic-text text-stone-700 hover:bg-stone-50 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]"
                        }`}
                      >
                        <Heart
                          size={13}
                          className="stroke-[2.5]"
                          fill={activeReferral.id && likedReferrals.has(activeReferral.id) ? "#FF5A5F" : "none"}
                        />
                        <span>いいね！ {activeReferral.likesCount || 0}</span>
                      </button>
                    </div>

                  </div>
                );
              })()}

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Neo-Brutalist Custom Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[300] bg-white border-4 border-artistic-text px-6 py-4 rounded-2xl shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex items-center gap-3 max-w-sm"
          >
            <span className="text-xl">✨</span>
            <p className="text-xs font-black text-stone-800">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Neo-Brutalist Custom Delete Confirmation Dialog Modal */}
      <AnimatePresence>
        {referralToDelete && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setReferralToDelete(null)}
              className="absolute inset-0 bg-artistic-text/75 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-md p-6 relative z-50 shadow-[18px_18px_0px_0px_rgba(42,42,42,1)]"
            >
              <div className="text-center space-y-4">
                <div className="bg-red-50 text-red-500 w-12 h-12 rounded-2xl border-2 border-red-500 flex items-center justify-center mx-auto text-xl font-black">
                  ⚠️
                </div>
                <h4 className="font-black text-xl text-stone-800">
                  本当に削除しますか？
                </h4>
                <p className="text-xs text-stone-500 font-bold leading-relaxed">
                  この操作を実行すると、この作家紹介の紹介状データは完全に削除され、復元することはできません。
                </p>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setReferralToDelete(null)}
                    className="flex-1 bg-[#F5F5F5] hover:bg-stone-200 border-2 border-artistic-text py-3 rounded-xl text-xs font-black transition-all active:scale-95 text-stone-700"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeDeleteReferral}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white border-2 border-artistic-text py-3 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:scale-95"
                  >
                    削除する
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulation Scanner Overlay with amazing radar visuals */}
      <AnimatePresence>
        {isScanningSim && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative z-50 text-center text-white max-w-sm p-8"
            >
              {/* Retro Neo-Brutalist alignment bracket mock */}
              <div className="relative w-64 h-64 mx-auto mb-8 border-4 border-dashed border-white/20 rounded-3xl flex items-center justify-center overflow-hidden bg-stone-900/40 shadow-inner">
                {/* Scanner laser sweeping animation */}
                <motion.div
                  animate={{ y: [-110, 110, -110] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-artistic-pink to-transparent shadow-[0_0_15px_#FF5A5F]"
                />
                
                {/* L corners */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-artistic-pink rounded-tl" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-artistic-pink rounded-tr" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-artistic-pink rounded-bl" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-artistic-pink rounded-br" />

                <QrCode size={90} className="opacity-20 animate-pulse text-white" />
              </div>

              <h4 className="text-xl font-black italic tracking-wider uppercase inline-block bg-artistic-pink text-white px-5 py-1.5 border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                QRスキャン中...
              </h4>
              <p className="text-xs font-bold text-stone-300 mt-4 animate-pulse">
                別の参加者のQRをロックオンしています 📱⚡️<br />
                アイスブレイクのきっかけを生成中...
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
