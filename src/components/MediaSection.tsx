import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  MessageSquare, 
  Heart, 
  Coins, 
  Info, 
  X, 
  Sparkles, 
  DollarSign, 
  User, 
  Check, 
  Share2,
  Tv,
  ExternalLink,
  Crown,
  Edit2,
  Trash2
} from "lucide-react";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { MediaContent, TipTransaction } from "../types";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  increment, 
  serverTimestamp, 
  query,
  orderBy,
  limit,
  deleteDoc
} from "firebase/firestore";

interface FallingCoin {
  id: number;
  x: number;
  delay: number;
  rotation: number;
  size: number;
}

export default function MediaSection({ userIP, deviceId }: { userIP: string | null; deviceId: string | null }) {
  const [mediaList, setMediaList] = useState<MediaContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaContent | null>(null);
  
  // Tip and messages state
  const [activeTipMedia, setActiveTipMedia] = useState<MediaContent | null>(null);
  const [selectedTipAmount, setSelectedTipAmount] = useState<number>(500); // Default 500 yen
  const [backerName, setBackerName] = useState("");
  const [cheerMessage, setCheerMessage] = useState("");
  const [submittingTip, setSubmittingTip] = useState(false);
  const [showConfettiCoins, setShowConfettiCoins] = useState<FallingCoin[]>([]);
  const [tipsHistories, setTipsHistories] = useState<{ [mediaId: string]: TipTransaction[] }>({});
  
  // Likes set to prevent duplicate clicks per session
  const [likedMediaIds, setLikedMediaIds] = useState<Set<string>>(new Set());
  const [likedTipIds, setLikedTipIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [myPostedTips, setMyPostedTips] = useState<Set<string>>(new Set());
  const [editingTip, setEditingTip] = useState<{ mediaId: string; tip: TipTransaction } | null>(null);

  // Custom dialogs
  const [confirmDeleteTip, setConfirmDeleteTip] = useState<{ mediaId: string; tip: TipTransaction } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  // Subscribe to Media collections
  useEffect(() => {
    const unsubMedia = onSnapshot(collection(db, "media"), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaContent));
      setMediaList(list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)));
      setLoading(false);
      
      // Subscribe to individual sub-collections for tips
      snapshot.docs.forEach((docSnap) => {
        const mId = docSnap.id;
        const qTips = query(
          collection(db, "media", mId, "tips"), 
          orderBy("createdAt", "desc"),
          limit(20)
        );
        onSnapshot(qTips, (tipSnap) => {
          const tips = tipSnap.docs.map(td => ({ id: td.id, ...td.data() } as TipTransaction));
          setTipsHistories(prev => ({ ...prev, [mId]: tips }));
        });
      });

    }, (err) => console.error("Media listen error:", err));

    const savedLikes = localStorage.getItem("rOOM8_liked_media");
    if (savedLikes) {
      try {
        setLikedMediaIds(new Set(JSON.parse(savedLikes)));
      } catch (e) {}
    }

    // Load liked tips list
    const savedLikedTips = localStorage.getItem("rOOM8_liked_tips");
    if (savedLikedTips) {
      try {
        setLikedTipIds(new Set(JSON.parse(savedLikedTips)));
      } catch (e) {}
    }

    // Load posted tips list
    const savedPostedTips = localStorage.getItem("rOOM8_posted_tips");
    if (savedPostedTips) {
      try {
        setMyPostedTips(new Set(JSON.parse(savedPostedTips)));
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
      unsubMedia();
      unsubAuth();
    };
  }, []);

  const handleLikeMedia = async (mediaId: string) => {
    if (likedMediaIds.has(mediaId)) return;

    try {
      const mediaRef = doc(db, "media", mediaId);
      await updateDoc(mediaRef, {
        likesCount: increment(1)
      });

      const updated = new Set(likedMediaIds);
      updated.add(mediaId);
      setLikedMediaIds(updated);
      localStorage.setItem("rOOM8_liked_media", JSON.stringify(Array.from(updated)));

      showToast("メディア作品を応援しました！❤️");

      // Subtle click audio
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {}

    } catch (e) {
      console.error("Failed to like media:", e);
      showToast("応援に失敗しました。");
    }
  };

  const handleLikeTip = async (mediaId: string, tipId: string) => {
    if (likedTipIds.has(tipId)) return;

    try {
      const tipRef = doc(db, "media", mediaId, "tips", tipId);
      await updateDoc(tipRef, {
        likesCount: increment(1)
      });

      const updated = new Set(likedTipIds);
      updated.add(tipId);
      setLikedTipIds(updated);
      localStorage.setItem("rOOM8_liked_tips", JSON.stringify(Array.from(updated)));

      showToast("応援コメントを「いいね！」しました！❤️");

      // Subtle click audio
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(650, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(850, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {}

    } catch (e) {
      console.error("Failed to like tip:", e);
      showToast("いいね！に失敗しました。");
    }
  };

  const handleDeployTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTipMedia || !backerName.trim()) return;

    setSubmittingTip(true);
    const mediaId = activeTipMedia.id!;
    const tipAmount = selectedTipAmount;

    try {
      // 1. Write Tip document under `/media/{mediaId}/tips/{tipId}`
      const tipsCol = collection(db, "media", mediaId, "tips");
      const docRef = await addDoc(tipsCol, {
        contentId: mediaId,
        amount: tipAmount,
        backerName: backerName.trim(),
        cheerMessage: cheerMessage.trim() || "",
        authorDeviceId: deviceId || "",
        authorIP: userIP || "",
        createdAt: serverTimestamp()
      });

      // Add to myPostedTips locally
      const updatedPosted = new Set(myPostedTips);
      updatedPosted.add(docRef.id);
      setMyPostedTips(updatedPosted);
      localStorage.setItem("rOOM8_posted_tips", JSON.stringify(Array.from(updatedPosted)));

      // 2. Increment parent counts
      const mediaRef = doc(db, "media", mediaId);
      await updateDoc(mediaRef, {
        tipsCount: increment(1),
        tipsTotalYen: increment(tipAmount)
      });

      // 3. Trigger Coin Explosion Animation
      const animationCoins = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 80 + 10, // Percent width
        delay: Math.random() * 0.8,
        rotation: Math.random() * 360,
        size: Math.random() * 20 + 20
      }));
      setShowConfettiCoins(animationCoins);

      // Auditory Feedback (Coin Ding Cascade)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playCoinSnd = (freq: number, timeOffset: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeOffset);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime + timeOffset);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + timeOffset + 0.4);
          
          osc.start(audioCtx.currentTime + timeOffset);
          osc.stop(audioCtx.currentTime + timeOffset + 0.4);
        };
        // Simulated coin drop cascade
        playCoinSnd(987.77, 0); // B5 coin
        playCoinSnd(1318.51, 0.15); // E6 coin
        playCoinSnd(1567.98, 0.3); // G6 coin
      } catch (ae) {}

      // Reset
      setBackerName("");
      setCheerMessage("");
      setTimeout(() => {
        setActiveTipMedia(null);
        setSubmittingTip(false);
        setShowConfettiCoins([]);
      }, 1500);

    } catch (err) {
      console.error("Tip transfer failed: ", err);
      setSubmittingTip(false);
    }
  };

  const handleDeleteTip = async (mediaId: string, tip: TipTransaction) => {
    setConfirmDeleteTip({ mediaId, tip });
  };

  const executeDeleteTip = async () => {
    if (!confirmDeleteTip) return;
    const { mediaId, tip } = confirmDeleteTip;
    try {
      await deleteDoc(doc(db, "media", mediaId, "tips", tip.id!));
      
      // Remove from local list
      const updated = new Set(myPostedTips);
      updated.delete(tip.id!);
      setMyPostedTips(updated);
      localStorage.setItem("rOOM8_posted_tips", JSON.stringify(Array.from(updated)));

      // Decrement parent counts
      const mediaRef = doc(db, "media", mediaId);
      await updateDoc(mediaRef, {
        tipsCount: increment(-1),
        tipsTotalYen: increment(-tip.amount)
      });
      showToast("応援コメントを削除しました。");
    } catch (err) {
      console.error("Failed to delete tip:", err);
      showToast("応援コメントの削除に失敗しました。");
    } finally {
      setConfirmDeleteTip(null);
    }
  };

  const handleEditTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTip || !editingTip.tip.backerName.trim()) return;

    const { mediaId, tip } = editingTip;
    try {
      await updateDoc(doc(db, "media", mediaId, "tips", tip.id!), {
        backerName: tip.backerName.trim(),
        cheerMessage: tip.cheerMessage?.trim() || ""
      });

      // Clear edit state
      setEditingTip(null);
      showToast("応援コメントを更新しました！✨");
    } catch (err) {
      console.error("Failed to edit tip:", err);
      showToast("編集の保存に失敗しました。");
    }
  };

  // Convert typical watch URL to YouTube Embed endpoint
  const getEmbedUrl = (url: string) => {
    try {
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url);
        const v = urlObj.searchParams.get("v");
        return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
      } else if (url.includes("youtu.be/")) {
        const segments = url.split("/");
        const last = segments[segments.length - 1];
        return `https://www.youtube.com/embed/${last}?autoplay=1&rel=0`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  return (
    <div className="space-y-16">
      {/* 1. Header block */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="bg-artistic-blue text-white text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] inline-block">
          Content & Direct Cheer (投げ銭)
        </span>
        <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-artistic-text">
          アート解説＆投げ銭シアター 🎥🪙
        </h2>
        <p className="font-bold text-stone-600 leading-relaxed text-sm md:text-base">
          作品制作のこだわりを動画で楽しんだり、パーティーのダイジェストを視聴しましょう！<br className="hidden md:block" />
          気に入った映像に「いいね」したり、ワンコイン（500円など）で応援コメントを落とすバーチャル投げ銭ができます。
        </p>
      </div>

      {/* 2. Media items grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-8">
          {[1, 2].map(i => (
            <div key={i} className="h-72 bg-stone-100 animate-pulse rounded-[2.5rem] border-2 border-stone-200" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {mediaList.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -4 }}
              className="bg-white border-2 border-artistic-text rounded-[2.5rem] overflow-hidden p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between"
            >
              <div>
                {/* Simulated/Real YouTube Thumbnail cover display */}
                <div className="relative aspect-video bg-cool-charcoal rounded-[1.8rem] overflow-hidden border-2 border-artistic-text flex items-center justify-center shadow-inner group">
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-stone-900/30 opacity-70" />
                  
                  {/* Custom display art element */}
                  <img 
                    src={`https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80`} 
                    alt={item.title} 
                    className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply transition-transform group-hover:scale-105" 
                  />

                  <div className="absolute top-4 left-4 bg-artistic-text text-white px-3 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                    <Tv size={12} /> Live stream / Clip
                  </div>

                  <button
                    onClick={() => setSelectedMedia(item)}
                    className="absolute z-10 w-16 h-16 bg-artistic-accent hover:bg-artistic-accent/90 border-2 border-artistic-text rounded-full flex items-center justify-center p-0 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] drop-shadow transition-transform active:scale-95 group-hover:scale-110"
                    title="再生する"
                  >
                    <Play size={24} className="text-artistic-text fill-artistic-text ml-1" />
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <h4 className="text-xl font-black text-artistic-text leading-snug line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs font-bold text-stone-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Counts and tip launcher bar */}
              <div className="mt-8 pt-6 border-t border-dashed border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLikeMedia(item.id!)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all ${likedMediaIds.has(item.id!) ? 'bg-artistic-pink/10 text-artistic-pink border-artistic-pink' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-artistic-pink hover:border-artistic-pink'}`}
                  >
                    <Heart size={14} className="stroke-[3]" fill={likedMediaIds.has(item.id!) ? 'currentColor' : 'none'} />
                    <span>{item.likesCount || 0}</span>
                  </button>

                  <div className="flex items-center gap-1 text-stone-500 text-xs font-black">
                    <Coins size={14} className="text-artistic-accent" />
                    <span className="font-mono">¥{(item.tipsTotalYen || 0).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTipMedia(item)}
                  className="bg-artistic-accent hover:bg-artistic-accent/90 border-2 border-artistic-text text-artistic-text px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] transition-transform active:scale-95"
                >
                  <Coins size={14} /> 投げ銭で応援 🪙
                </button>
              </div>

              {/* Expanded Backer cheer stream */}
              {tipsHistories[item.id!] && tipsHistories[item.id!].length > 0 && (
                <div className="mt-6 pt-4 border-t border-dashed border-stone-100 space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-wider">最近の応援メッセージ:</p>
                  <div className="space-y-2">
                    {tipsHistories[item.id!].map((tip) => {
                      const isMyPost = (tip.id && myPostedTips.has(tip.id)) || 
                                      (deviceId && tip.authorDeviceId === deviceId) || 
                                      (userIP && tip.authorIP === userIP);
                      const showControls = isMyPost || isAdmin;

                      return (
                        <div key={tip.id} className="bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(42,42,42,0.05)]">
                          <div className="flex items-start gap-2.5">
                            <div className="bg-artistic-pink/10 w-7 h-7 rounded-xl text-artistic-pink flex items-center justify-center shrink-0 border border-artistic-pink/20 text-xs font-bold shadow-sm">
                              🪙
                            </div>
                            <div className="text-xs leading-relaxed">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-stone-700">
                                  {tip.backerName}
                                </span>
                                <span className="text-artistic-pink font-black text-[11px] bg-artistic-pink/10 px-1.5 py-0.5 rounded-lg border border-artistic-pink/10">
                                  ¥{tip.amount.toLocaleString()} 投下!
                                </span>
                                {isMyPost && (
                                  <span className="text-[9px] bg-artistic-primary/10 text-artistic-primary px-1.5 py-0.5 rounded font-extrabold border border-artistic-primary/10">
                                    あなたの投稿
                                  </span>
                                )}
                                {isAdmin && (
                                  <span className="text-[9px] bg-artistic-text text-white px-1.5 py-0.5 rounded font-extrabold flex items-center gap-0.5">
                                    👑 管理者
                                  </span>
                                )}
                              </div>
                              {tip.cheerMessage && (
                                <p className="text-stone-600 font-bold italic mt-1 leading-normal">「{tip.cheerMessage}」</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto pt-1 sm:pt-0 shrink-0">
                            {/* Comment Like Button */}
                            <button
                              onClick={() => handleLikeTip(item.id!, tip.id!)}
                              className={`border-2 px-3 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] transition-transform active:scale-95 h-8 min-w-[3.5rem] ${likedTipIds.has(tip.id!) ? 'bg-artistic-pink/10 text-artistic-pink border-artistic-pink shadow-none translate-y-[2px]' : 'bg-white text-stone-500 border-artistic-text hover:text-artistic-pink hover:bg-stone-50'}`}
                              title="コメントにいいね！"
                            >
                              <Heart size={11} className="stroke-[2.5]" fill={likedTipIds.has(tip.id!) ? "currentColor" : "none"} />
                              <span>{tip.likesCount || 0}</span>
                            </button>

                            {showControls && (
                              <>
                                <button
                                  onClick={() => setEditingTip({ mediaId: item.id!, tip })}
                                  className="bg-stone-50 border border-stone-200 text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                                  title="編集する"
                                >
                                  <Edit2 size={11} className="stroke-[2.5]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTip(item.id!, tip)}
                                  className="bg-stone-50 border border-red-200 text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="削除する"
                                >
                                  <Trash2 size={11} className="stroke-[2.5]" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Embedded Video Overlay Player */}
      <AnimatePresence>
        {selectedMedia && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedMedia(null)}
              className="absolute inset-0 bg-artistic-text/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-2xl overflow-hidden relative z-50 shadow-[18px_18px_0px_0px_rgba(42,42,42,1)] flex flex-col"
            >
              <div className="p-4 md:p-6 border-b-2 border-artistic-text flex justify-between items-center bg-artistic-accent/20">
                <h4 className="font-black text-lg text-artistic-text max-w-[85%]">{selectedMedia.title}</h4>
                <button 
                  onClick={() => setSelectedMedia(null)}
                  className="p-1 rounded-full border border-stone-300 hover:bg-stone-50 text-stone-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-video w-full bg-black relative">
                <iframe
                  title="YouTube player"
                  src={getEmbedUrl(selectedMedia.youtubeUrl)}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs font-bold text-stone-500 leading-relaxed">
                  {selectedMedia.description}
                </p>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setSelectedMedia(null);
                      setActiveTipMedia(selectedMedia);
                    }}
                    className="bg-artistic-accent border-2 border-artistic-text text-artistic-text px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]"
                  >
                    <Coins size={14} /> この動画を投げ銭で応援する
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tipping Dialog (Simulated & Local Coin drop triggers) */}
      <AnimatePresence>
        {activeTipMedia && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => {
                if (!submittingTip) setActiveTipMedia(null);
              }}
              className="absolute inset-0 bg-artistic-text/75 backdrop-blur-md"
            />
            
            {/* Live Coin-falling particle background overlay on submit */}
            {submittingTip && showConfettiCoins.length > 0 && (
              <div className="absolute inset-0 pointer-events-none z-[300] overflow-hidden">
                {showConfettiCoins.map((coin) => (
                  <motion.div
                    key={coin.id}
                    initial={{ y: -50, x: `${coin.x}%`, rotate: 0 }}
                    animate={{ 
                      y: "110vh", 
                      rotate: coin.rotation + 720,
                    }}
                    transition={{ 
                      duration: 1.5, 
                      delay: coin.delay,
                      ease: "easeIn"
                    }}
                    className="absolute font-bold drop-shadow-md select-none"
                    style={{ fontSize: coin.size }}
                  >
                    🪙
                  </motion.div>
                ))}
              </div>
            )}

            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-sm p-6 md:p-8 relative z-50 shadow-[24px_24px_0px_0px_rgba(42,42,42,1)] overflow-hidden"
            >
              {/* Decorative Stamp for Success Animation */}
              <AnimatePresence>
                {submittingTip && (
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: -10 }}
                    className="absolute inset-0 z-40 bg-white/95 flex flex-col items-center justify-center text-center space-y-4"
                  >
                    <div className="bg-artistic-accent w-20 h-20 rounded-full border-4 border-artistic-text flex items-center justify-center animate-bounce">
                      <Crown size={36} className="text-artistic-text" />
                    </div>
                    <h5 className="text-2xl font-black italic text-artistic-text">応援されました！</h5>
                    <p className="text-xs text-stone-500 font-bold max-w-[80%]">
                      ポコポコ！と金貨が投下され、{activeTipMedia.title.split("-")[0]} に応援コメントが届きました！🪙✨
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-lg italic flex items-center gap-1.5">
                  🪙 応援投げ銭を投下する
                </h4>
                <button 
                  onClick={() => setActiveTipMedia(null)}
                  className="p-1 rounded-full border border-stone-200 hover:bg-stone-50"
                  disabled={submittingTip}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-[#FFF1E6] p-4 rounded-2xl border-2 border-artistic-text mb-6">
                <span className="text-[9px] font-black opacity-45 uppercase block tracking-wider mb-1">TARGET ITEM</span>
                <p className="text-xs font-black line-clamp-2 leading-snug">{activeTipMedia.title}</p>
              </div>

              <form onSubmit={handleDeployTip} className="space-y-4">
                {/* Fixed tip buttons pre-defined */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase opacity-60">チップ金額を選択</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[100, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setSelectedTipAmount(amount)}
                        className={`py-2 rounded-xl text-xs font-black border transition-all ${selectedTipAmount === amount ? 'bg-artistic-accent text-artistic-text border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' : 'bg-stone-50 text-stone-600 border-stone-200'}`}
                      >
                        ¥{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">ニックネーム *</label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={backerName}
                    onChange={(e) => setBackerName(e.target.value)}
                    placeholder="例: たかはる / 匿名ゲスト"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-extrabold text-xs outline-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">Cheering Message (任意)</label>
                  <textarea
                    rows={2}
                    maxLength={100}
                    value={cheerMessage}
                    onChange={(e) => setCheerMessage(e.target.value)}
                    placeholder="例: 制作プロセスの裏側が見えて非常に面白かったです！これからも頑張ってください！🎉"
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold text-xs outline-none resize-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingTip}
                  className="w-full bg-artistic-primary text-white border-2 border-artistic-text py-3 rounded-xl font-black text-xs shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] hover:bg-artistic-primary/95 transition-all"
                >
                  応援コインをコップに落とす ¥{selectedTipAmount.toLocaleString()} 🪙
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Tip Dialog */}
      <AnimatePresence>
        {editingTip && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setEditingTip(null)}
              className="absolute inset-0 bg-artistic-text/75 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-white border-4 border-artistic-text rounded-[2.5rem] w-full max-w-sm p-6 md:p-8 relative z-50 shadow-[24px_24px_0px_0px_rgba(42,42,42,1)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-black text-lg italic flex items-center gap-1.5">
                  ✍️ 応援コメントを編集する
                </h4>
                <button 
                  onClick={() => setEditingTip(null)}
                  className="p-1 rounded-full border border-stone-200 hover:bg-stone-50"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleEditTip} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">ニックネーム *</label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={editingTip.tip.backerName}
                    onChange={(e) => setEditingTip({
                      ...editingTip,
                      tip: { ...editingTip.tip, backerName: e.target.value }
                    })}
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-extrabold text-xs outline-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase opacity-60">応援メッセージ (任意)</label>
                  <textarea
                    rows={4}
                    maxLength={100}
                    value={editingTip.tip.cheerMessage || ""}
                    onChange={(e) => setEditingTip({
                      ...editingTip,
                      tip: { ...editingTip.tip, cheerMessage: e.target.value }
                    })}
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold text-xs outline-none resize-none bg-stone-50 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-artistic-primary text-white border-2 border-artistic-text py-3 rounded-xl font-black text-xs shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] hover:bg-artistic-primary/95 transition-all"
                >
                  変更を保存する✨
                </button>
              </form>
            </motion.div>
          </div>
        )}
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
        {confirmDeleteTip && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteTip(null)}
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
                  この操作を実行すると、応援コメントが削除されます。（投下された仮想コインは減少しません）
                </p>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setConfirmDeleteTip(null)}
                    className="flex-1 bg-[#F5F5F5] hover:bg-stone-200 border-2 border-artistic-text py-3 rounded-xl text-xs font-black transition-all active:scale-95 text-stone-700"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeDeleteTip}
                    className="flex-1 bg-red-400 hover:bg-red-500 text-white border-2 border-artistic-text py-3 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:scale-95"
                  >
                    削除する
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
