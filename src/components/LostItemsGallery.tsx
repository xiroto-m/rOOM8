import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Search, HelpCircle, Mail, MessageSquare, Sparkles, Check, Bookmark, Calendar, ArrowUpRight, Award, Trash2, Share2, MessageCircle, X, Plus } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, updateDoc, doc, increment, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { LostItem, LostComment } from '../types';

interface LostItemsGalleryProps {
  userIP?: string | null;
  deviceId?: string | null;
}

export default function LostItemsGallery({ userIP = null, deviceId = null }: LostItemsGalleryProps) {
  const [lostItems, setLostItems] = useState<LostItem[]>(() => {
    const cached = localStorage.getItem('room8_cached_lost_items');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.warn("Failed to parse cached lost items:", e);
      }
    }
    return [];
  });
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [selectedClaimItem, setSelectedClaimItem] = useState<LostItem | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimNotes, setClaimNotes] = useState('');
  const [claimContact, setClaimContact] = useState('');
  const [claimName, setClaimName] = useState('');
  const [filter, setFilter] = useState<'all' | 'exhibiting' | 'claimed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Comments & Recommendations State
  const [comments, setComments] = useState<LostComment[]>([]);
  const [expandedItemComments, setExpandedItemComments] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedCommentItem, setSelectedCommentItem] = useState<LostItem | null>(null);
  const [commenterName, setCommenterName] = useState('');
  const [commenterContact, setCommenterContact] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<LostComment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isAdmin] = useState(localStorage.getItem('room8_is_admin') === 'true' || !!auth.currentUser);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleComments = (itemId: string) => {
    setExpandedItemComments(prev => prev === itemId ? null : itemId);
  };

  // Fetch comments from firestore
  useEffect(() => {
    const q = query(collection(db, 'lost_comments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LostComment[];
      // Sort comments by newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (Number(a.createdAt) || 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (Number(b.createdAt) || 0);
        return timeB - timeA;
      });
      setComments(list);
    }, (error) => {
      console.error("Firestore comments fetch error: ", error);
    });

    return () => unsubscribe();
  }, []);

  // Load liked comments from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('room8_liked_lost_comments');
    if (stored) {
      try {
        setLikedCommentIds(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLikeComment = async (commentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedCommentIds.includes(commentId)) {
      const updated = likedCommentIds.filter(id => id !== commentId);
      setLikedCommentIds(updated);
      localStorage.setItem('room8_liked_lost_comments', JSON.stringify(updated));
      
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likesCount: Math.max(0, (c.likesCount || 0) - 1) } : c));
      
      try {
        await updateDoc(doc(db, 'lost_comments', commentId), {
          likesCount: increment(-1)
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      const updated = [...likedCommentIds, commentId];
      setLikedCommentIds(updated);
      localStorage.setItem('room8_liked_lost_comments', JSON.stringify(updated));

      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likesCount: (c.likesCount || 0) + 1 } : c));
      
      try {
        await updateDoc(doc(db, 'lost_comments', commentId), {
          likesCount: increment(1)
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleDeleteComment = async (comment: LostComment, e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentToDelete(comment);
  };

  const executeDeleteComment = async () => {
    if (!commentToDelete || !commentToDelete.id) return;
    try {
      await deleteDoc(doc(db, 'lost_comments', commentToDelete.id));
      showToast("愛あるコメントを撤去しました！🧹");
    } catch (error) {
      console.error(error);
      showToast("削除に失敗しました。");
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommentItem || !selectedCommentItem.id) return;
    if (!commenterName.trim() || !commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const newCommentData = {
        itemId: selectedCommentItem.id,
        commenterName: commenterName.trim(),
        commenterContact: commenterContact.trim() || "",
        commentText: commentText.trim(),
        likesCount: 0,
        authorDeviceId: deviceId || "anon",
        authorIP: userIP || "unknown",
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'lost_comments'), newCommentData);
      
      setShowCommentModal(false);
      setCommenterName("");
      setCommenterContact("");
      setCommentText("");
      showToast("愛あるコメントをポストしました！💌");
    } catch (error) {
      console.error("Failed to add comment: ", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast(`投稿に失敗しました: ${errorMsg}`);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'lost_comments');
      } catch (e) {
        // Log handled
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Parse direct targeting link parameters
  useEffect(() => {
    const getParam = (name: string) => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has(name)) return searchParams.get(name);
      
      const hashParts = window.location.hash.split('?');
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        if (hashParams.has(name)) return hashParams.get(name);
      }
      return null;
    };

    const itemId = getParam('item') || getParam('lost-item');
    if (itemId) {
      setHighlightedItemId(itemId);
    }
  }, []);

  // Load liked lost items from local storage
  useEffect(() => {
    const stored = localStorage.getItem('room8_liked_lost_items');
    if (stored) {
      try {
        setLikedIds(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Fetch lost items from firestore
  useEffect(() => {
    const q = query(collection(db, 'lost_items'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LostItem[];
      // Sort by createdAt desc
      items.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (Number(a.createdAt) || 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (Number(b.createdAt) || 0);
        return timeB - timeA;
      });
      setLostItems(items);
      localStorage.setItem('room8_cached_lost_items', JSON.stringify(items));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lost_items');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (likedIds.includes(itemId)) {
      // Toggle off
      const updated = likedIds.filter(id => id !== itemId);
      setLikedIds(updated);
      localStorage.setItem('room8_liked_lost_items', JSON.stringify(updated));
      
      // Optimistic UI update
      setLostItems(prev => prev.map(item => item.id === itemId ? { ...item, likesCount: Math.max(0, (item.likesCount || 0) - 1) } : item));
      
      try {
        await updateDoc(doc(db, 'lost_items', itemId), {
          likesCount: increment(-1)
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      // Toggle on
      const updated = [...likedIds, itemId];
      setLikedIds(updated);
      localStorage.setItem('room8_liked_lost_items', JSON.stringify(updated));

      // Optimistic UI update
      setLostItems(prev => prev.map(item => item.id === itemId ? { ...item, likesCount: (item.likesCount || 0) + 1 } : item));
      
      try {
        await updateDoc(doc(db, 'lost_items', itemId), {
          likesCount: increment(1)
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleCopyLink = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?item=${itemId}#lost-items`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedItemId(itemId);
      setTimeout(() => setCopiedItemId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimName || !claimContact || !selectedClaimItem || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const claimData = {
        itemId: selectedClaimItem.id || '',
        itemTitle: selectedClaimItem.title || '',
        claimName: claimName,
        claimContact: claimContact,
        claimNotes: claimNotes || '',
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'lost_claims'), claimData);
      setClaimSuccess(true);
      
      setTimeout(() => {
        setSelectedClaimItem(null);
        setClaimSuccess(false);
        setClaimName('');
        setClaimContact('');
        setClaimNotes('');
        setIsSubmitting(false);
      }, 2500);
    } catch (error) {
      setIsSubmitting(false);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast(`申請に失敗しました: ${errorMsg}`);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'lost_claims');
      } catch (e) {
        // Log handled
      }
    }
  };

  const filteredItems = lostItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.artist.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return item.status === filter && matchesSearch;
  });

  // Render customizable picture frame around the artwork
  const renderFrame = (style: string, children: React.ReactNode, isClaimed: boolean) => {
    switch (style) {
      case 'gold':
        return (
          <div className="relative p-6 bg-stone-900 border-[16px] border-amber-500 rounded-lg shadow-[inset_0_0_15px_rgba(0,0,0,0.8),12px_12px_24px_rgba(0,0,0,0.4)] transition-all flex flex-col items-center">
            {/* Elegant Gilded Plate */}
            <div className="absolute top-2 w-11/12 h-1 bg-amber-400 opacity-50 blur-[1px]"></div>
            <div className="bg-[#FFF8DC] p-4 pb-6 w-full border-2 border-amber-600/30 rounded shadow-[inset_0_3px_6px_rgba(0,0,0,0.1)] flex flex-col items-center">
              {children}
            </div>
            {/* Gilded Inner Liner detail */}
            <div className="absolute bottom-1 right-1 left-1 h-2 border-t border-amber-400/20"></div>
          </div>
        );
      case 'wood':
        return (
          <div className="relative p-5 bg-[#D2B48C] border-[14px] border-[#8B5A2B] rounded-xl shadow-[inset_0_0_10px_rgba(0,0,0,0.7),8px_8px_16px_rgba(0,0,0,0.3)] transition-all flex flex-col items-center">
            <div className="bg-[#FAF9F6] p-4 pb-6 w-full border border-[#8B5A2B]/20 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] flex flex-col items-center">
              {children}
            </div>
          </div>
        );
      case 'neon':
        return (
          <div className="relative p-5 bg-stone-950 border-4 border-[#FF007F] rounded-[2rem] shadow-[0_0_20px_rgba(255,0,127,0.6),inset_0_0_20px_rgba(0,240,255,0.4),8px_8px_0px_#00F0FF] transition-all flex flex-col items-center">
            {/* Futuristic cyber bracket labels */}
            <span className="absolute top-2 left-4 text-[10px] font-mono text-[#00F0FF] opacity-80 tracking-widest uppercase">System: EXHIBIT_X</span>
            <span className="absolute top-2 right-4 text-[10px] font-mono text-[#FF007F] opacity-80">rOOM8_v5_A</span>
            <div className="bg-stone-900 p-4 pb-6 w-full rounded-2xl border-2 border-[#00F0FF]/30 flex flex-col items-center mt-2">
              {children}
            </div>
          </div>
        );
      case 'brutalist':
        return (
          <div className="relative p-6 bg-white border-8 border-black rounded-lg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col items-center">
            <div className="bg-[#FAFBFD] p-4 pb-6 w-full border-4 border-dashed border-black/10 rounded flex flex-col items-center">
              {children}
            </div>
          </div>
        );
      case 'none':
      default:
        return (
          <div className="relative p-6 bg-stone-50 border border-stone-200 rounded-[2rem] shadow-[4px_4px_16px_rgba(0,0,0,0.06)] transition-all flex flex-col items-center">
            <div className="bg-white p-3 pb-5 w-full rounded-[1.5rem] flex flex-col items-center">
              {children}
            </div>
          </div>
        );
    }
  };

  return (
    <Section id="lost-items" className="py-24 bg-artistic-bg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div>
          <span className="bg-artistic-accent text-artistic-text font-black px-4 py-1.5 rounded-full text-xs uppercase tracking-widest border-2 border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] inline-block mb-4">
            PERMANENT ARCHIVE
          </span>
          <h2 className="text-4xl md:text-6xl font-black flex items-center gap-4 tracking-tighter">
            <Award className="text-artistic-primary animate-bounce" size={44} strokeWidth={3} />
            忘れもの常設展
          </h2>
          <p className="text-artistic-text/70 font-bold max-w-2xl mt-4 text-base md:text-lg">
            rOOM8のイベントや展示会の後、いつもぽつんと佇む忘れ物。
            それらは持ち主の個性を映す「唯一無二の現代アート作品」として
            額縁を掲げ、キュレーションされました。
          </p>
        </div>

        {/* Filter and Search controls */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-black text-sm border-2 border-artistic-text transition-all ${filter === 'all' ? 'bg-artistic-text text-white shadow-none' : 'bg-white text-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('exhibiting')}
            className={`px-4 py-2 rounded-xl font-black text-sm border-2 border-artistic-text transition-all ${filter === 'exhibiting' ? 'bg-artistic-text text-white shadow-none' : 'bg-white text-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
          >
            展示中
          </button>
          <button
            onClick={() => setFilter('claimed')}
            className={`px-4 py-2 rounded-xl font-black text-sm border-2 border-artistic-text transition-all ${filter === 'claimed' ? 'bg-artistic-text text-white shadow-none' : 'bg-white text-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
          >
            返却完了 🔴
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-12 relative max-w-md border-4 border-artistic-text rounded-[1.5rem] bg-white overflow-hidden shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex items-center">
        <Search className="ml-4 opacity-40 text-artistic-text shrink-0" size={24} />
        <input
          type="text"
          placeholder="展示品名、解説、発見日..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 pl-3 font-bold border-none outline-none text-artistic-text"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="mr-4 font-bold text-artistic-text tracking-tighter opacity-70">
            クリア
          </button>
        )}
      </div>

      {isLoading && filteredItems.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {[1, 2, 3].map((index) => {
            const frameStyle = index === 1 ? 'gold' : index === 2 ? 'wood' : 'brutalist';
            return (
              <div key={`skeleton-${index}`} className="flex flex-col animate-pulse rounded-[2.5rem] p-1.5">
                {renderFrame(
                  frameStyle,
                  <div className="w-full flex flex-col gap-4">
                    {/* Artwork image loader */}
                    <div className="relative aspect-[4/3] w-full rounded-lg bg-stone-100 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full border-2 border-stone-300 border-t-stone-500 animate-spin" />
                    </div>
                    {/* Caption / Title loader */}
                    <div className="w-full space-y-2 py-2">
                      <div className="h-6 bg-stone-200 rounded-md w-2/3" />
                      <div className="h-4 bg-stone-200 rounded-md w-full" />
                      <div className="h-4 bg-stone-200 rounded-md w-5/6" />
                    </div>
                  </div>,
                  false
                )}
                {/* Actions loader */}
                <div className="mt-4 flex gap-3 w-full px-2">
                  <div className="h-11 bg-stone-200 rounded-xl flex-1" />
                  <div className="h-11 bg-stone-200 rounded-xl flex-1" />
                </div>
              </div>
            );
          })}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {filteredItems.map((item) => {
            const isClaimed = item.status === 'claimed';
            const isLiked = likedIds.includes(item.id || '');
            const isHighlighted = highlightedItemId === item.id;
            const itemComments = comments.filter(c => c.itemId === item.id);
            
            return (
              <motion.div
                key={item.id}
                id={`lost-item-${item.id}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: isHighlighted ? 1.03 : 1,
                  boxShadow: isHighlighted ? "0px 0px 30px rgba(255,107,107,0.35)" : "none"
                }}
                className={`flex flex-col group transition-all duration-700 rounded-[2.5rem] p-1.5 ${isHighlighted ? 'ring-4 ring-artistic-primary bg-artistic-primary/5' : ''}`}
              >
                {/* Frame Container */}
                {renderFrame(
                  item.frameStyle || 'gold',
                  <div className="w-full flex flex-col">
                    {/* Artwork image with optional Claimed Ribbon */}
                    <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center">
                      <img
                        src={item.imageUrl || "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop"}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* RED DOT (Classical Gallery indicator for sold style!) */}
                      {isClaimed && (
                        <div className="absolute top-3 right-3 bg-red-600 w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center" title="返却完了 (Returned / Collected)">
                          <span className="text-[10px] font-black text-white">🔴</span>
                        </div>
                      )}

                      {/* Returned overlay ribbon */}
                      {isClaimed && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                          <div className="bg-red-600 border-2 border-white text-white font-black px-6 py-2 rounded-lg text-sm rotate-[-12deg] tracking-widest shadow-xl animate-pulse">
                            COLLECTED / 返却完了
                          </div>
                   
                        </div>
                      )}
                    </div>

                    {/* Gallery Label (Placed right below the painting just like a real museum) */}
                    <div className="mt-6 pt-5 border-t border-dashed border-stone-300 w-full text-stone-800 family-serif">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <label className="text-xs uppercase font-mono tracking-wider text-stone-500">EXHIBITION LABEL</label>
                        <span className="text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
                          #{item.id?.substring(0, 5) || 'EXHB'}
                        </span>
                      </div>
                      
                      <h4 className="text-xl font-black tracking-tight text-neutral-900 leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-sm font-semibold italic text-neutral-600 mt-1">
                        Artist: {item.artist || 'Unknown'}
                      </p>
                      
                      {/* Curatorial Text */}
                      <p className="text-xs text-neutral-700/90 mt-4 leading-relaxed font-bold bg-white/50 p-3 rounded-lg border border-neutral-100 space-y-1 block max-h-36 overflow-y-auto">
                        {item.description}
                      </p>

                      <div className="flex justify-between items-center text-[11px] font-bold text-stone-500 mt-4 border-t border-neutral-100 pt-3">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} /> {item.foundDate}
                        </span>
                        
                        <span className="capitalize text-stone-600 font-mono tracking-wider">
                          Frame: {item.frameStyle}
                        </span>
                      </div>

                      {/* Recommendations / Introduction comments */}
                      <div className="mt-4 pt-3 border-t border-dashed border-stone-200">
                        {/* Collapsible toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComments(item.id || '');
                          }}
                          className="flex items-center justify-between w-full text-xs font-black text-stone-600 hover:text-stone-800 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <MessageCircle size={14} className="text-artistic-primary animate-pulse" />
                            届いた愛あるコメント ({itemComments.length}件)
                          </span>
                          <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded border border-stone-200 uppercase tracking-widest font-mono shrink-0">
                            {expandedItemComments === item.id ? '閉じる ▲' : '見る ▼'}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {expandedItemComments === item.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-3 space-y-3"
                            >
                              {itemComments.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto pr-1 space-y-3 no-scrollbar">
                                  {itemComments.map((c) => {
                                    const isAuthor = (deviceId && c.authorDeviceId === deviceId) || (userIP && c.authorIP === userIP);
                                    const isCanDelete = isAuthor || isAdmin;
                                    const isCommentLiked = likedCommentIds.includes(c.id || '');
                                    
                                    return (
                                      <div
                                        key={c.id}
                                        className="bg-[#FFFDF9] p-3.5 rounded-2xl border-2 border-artistic-text/20 text-left text-xs relative space-y-2 hover:border-artistic-text/40 transition-colors shadow-sm"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="min-w-0">
                                            <span className="font-extrabold text-[11px] text-artistic-text block leading-none truncate">
                                              👤 {c.commenterName} 氏の愛あるコメント
                                            </span>
                                            {c.commenterContact && (
                                              <span className="text-[9px] text-stone-400 font-bold block truncate mt-1">
                                                {c.commenterContact}
                                              </span>
                                            )}
                                          </div>
                                          {isCanDelete && (
                                            <button
                                              type="button"
                                              onClick={(e) => handleDeleteComment(c, e)}
                                              className="text-stone-300 hover:text-red-500 transition-colors p-0.5 shrink-0"
                                              title="削除"
                                            >
                                              <Trash2 size={12} className="stroke-[2.5]" />
                                            </button>
                                          )}
                                        </div>
                                        <p className="text-stone-700 font-bold leading-relaxed italic pl-2.5 border-l-2 border-artistic-primary whitespace-pre-wrap">
                                          「{c.commentText}」
                                        </p>
                                        <div className="flex justify-between items-center bg-white border border-stone-150 px-2 py-1 rounded-lg">
                                          <button
                                            type="button"
                                            onClick={(e) => handleLikeComment(c.id || '', e)}
                                            className={`flex items-center gap-1 text-[9px] font-black transition-all hover:scale-105 active:scale-95 ${
                                              isCommentLiked ? "text-artistic-pink" : "text-stone-500 hover:text-stone-700"
                                            }`}
                                          >
                                            <Heart
                                              size={10}
                                              className="stroke-[2.5]"
                                              fill={isCommentLiked ? "#FF5A5F" : "none"}
                                            />
                                            <span>いいかも！ {c.likesCount || 0}</span>
                                          </button>
                                          {c.createdAt && (
                                            <span className="text-[8px] text-stone-400 font-mono shrink-0">
                                              {c.createdAt.seconds ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : '本日'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[11px] text-stone-400 font-bold italic py-2 text-center select-none">
                                  この忘れ物にはまだコメントがありません。最初の「愛あるコメント」を書いてみませんか？
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCommentItem(item);
                                  setShowCommentModal(true);
                                }}
                                className="w-full h-9 bg-[#FFF5F5] hover:bg-artistic-pink/10 text-artistic-primary border-2 border-dashed border-artistic-pink/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Plus size={12} strokeWidth={3} />
                                愛あるコメントを贈る ✍️
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>,
                  isClaimed
                )}

                {/* Frame Bottom Actions (Likes, Copy URL and Claim buttons) */}
                <div className="mt-4 flex gap-3 w-full px-2">
                  <button
                    onClick={(e) => handleLike(item.id || '', e)}
                    className={`h-11 px-4 rounded-xl border-2 border-artistic-text flex items-center justify-center gap-2 font-black transition-all ${isLiked ? 'bg-artistic-pink text-white shadow-none' : 'bg-white text-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'}`}
                  >
                    <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'scale-110' : ''} />
                    <span>{item.likesCount || 0}</span>
                  </button>

                  <button
                    onClick={(e) => handleCopyLink(item.id || '', e)}
                    className={`h-11 px-3.5 rounded-xl border-2 border-artistic-text flex items-center justify-center gap-1.5 font-black transition-all ${
                      copiedItemId === item.id 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-none' 
                        : 'bg-white text-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                    }`}
                    title="共有リンクをコピー"
                  >
                    {copiedItemId === item.id ? (
                      <>
                        <Check size={16} />
                        <span className="text-xs">コピー済!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        <span className="text-xs hidden sm:inline">共有</span>
                      </>
                    )}
                  </button>

                  {!isClaimed ? (
                    <button
                      onClick={() => setSelectedClaimItem(item)}
                      className="flex-1 h-11 bg-artistic-primary text-white border-2 border-artistic-text rounded-xl font-black text-sm flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all hover:scale-102"
                    >
                      <Sparkles size={16} />
                      私のものです！
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 h-11 bg-stone-100 text-stone-400 border-2 border-stone-200 rounded-xl font-black text-sm cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Check size={16} />
                      持ち主に返却済み
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-4 border-dashed border-artistic-text/20 p-20 rounded-[2.5rem] text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm">
          <Bookmark size={48} className="text-stone-300 animate-pulse mb-6" />
          <h3 className="text-2xl font-black text-stone-500 mb-2">該当する展示品はありません</h3>
          <p className="text-stone-400/80 font-bold text-sm">
            フィルターを設定し直すか、別のキーワードで検索してみてください。
          </p>
          <button
            onClick={() => { setFilter('all'); setSearchTerm(''); }}
            className="mt-6 bg-artistic-text text-white px-6 py-2.5 rounded-xl font-black border-2 border-artistic-text hover:bg-white hover:text-artistic-text transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]"
          >
            検索リセット
          </button>
        </div>
      )}

      {/* Whimsical Claim Modal */}
      <AnimatePresence>
        {selectedClaimItem && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border-4 border-artistic-text w-full max-w-lg rounded-[2.5rem] shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-accent">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-artistic-text flex items-center gap-2">
                      <Sparkles className="text-artistic-primary shrink-0" size={26} />
                      忘れものの返却申請
                    </h3>
                    <p className="text-xs font-bold opacity-70 mt-1">
                      アートピース ID: #{selectedClaimItem.id}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSelectedClaimItem(null); setClaimSuccess(false); }}
                    className="bg-white border-2 border-artistic-text p-1.5 rounded-xl hover:scale-105 transition-transform shrink-0"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Dynamic Claim Body */}
              <div className="p-8">
                {claimSuccess ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 border-2 border-emerald-500 shadow-sm">
                      <Check size={36} strokeWidth={3} />
                    </div>
                    <h4 className="text-xl font-black text-emerald-800">申請をお承りいたしました！</h4>
                    <p className="font-bold text-sm text-neutral-600 max-w-sm">
                      あなたの忘れものが登録されました。確認用として、rOOM8の担当者が記載された連絡先にご対応いたします。しばらくお待ちください。
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleClaimSubmit} className="space-y-5">
                    {/* Compact Item Card */}
                    <div className="flex gap-4 p-4 bg-stone-50 border-2 border-neutral-200 rounded-2xl items-center">
                      <img
                        src={selectedClaimItem.imageUrl}
                        alt={selectedClaimItem.title}
                        className="w-20 h-16 object-cover rounded-lg border border-neutral-300"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="font-black text-base text-neutral-900 leading-tight">
                          {selectedClaimItem.title}
                        </h4>
                        <p className="text-xs font-bold text-stone-500 mt-1">
                          発見日: {selectedClaimItem.foundDate}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase opacity-60">お名前 *</label>
                        <input
                          type="text"
                          required
                          value={claimName}
                          onChange={(e) => setClaimName(e.target.value)}
                          className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary"
                          placeholder="例: 代々木太郎"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase opacity-60">ご連絡先 (LINE、SNS ID、またはメールアドレス) *</label>
                        <input
                          type="text"
                          required
                          value={claimContact}
                          onChange={(e) => setClaimContact(e.target.value)}
                          className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary"
                          placeholder="例: @instagram_id or user@example.com"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase opacity-60">忘れものの特徴・備考（任意）</label>
                        <textarea
                          value={claimNotes}
                          onChange={(e) => setClaimNotes(e.target.value)}
                          className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary h-20 resize-none resize-none-none"
                          placeholder="例: 持ち手の先端部分に傷があります。"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] font-bold text-stone-400 leading-relaxed pt-2">
                      ※この情報はrOOM8の管理者のみに安全に送信されます。<br />
                      また、Instagram（
                      <a href="https://www.instagram.com/room8_a_home_gallery_tokyo?igsh=MWdoc28wNXRlczRlbQ%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-artistic-primary underline">
                        @room8_a_home_gallery_tokyo
                      </a>
                      ）のDMから直接お問い合わせいただくことも可能です。
                    </p>

                    <div className="flex gap-3 pt-4 border-t border-dashed border-stone-200">
                      <button
                        type="button"
                        onClick={() => setSelectedClaimItem(null)}
                        disabled={isSubmitting}
                        className="flex-1 py-3 px-4 border-2 border-artistic-text rounded-xl font-black text-sm hover:bg-neutral-50 disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-artistic-primary text-white border-2 border-artistic-text rounded-xl font-black text-sm py-3 px-4 hover:scale-102 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? '送信中...' : '返却を申請する'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Write Comment/Intro Modal */}
      <AnimatePresence>
        {showCommentModal && selectedCommentItem && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border-4 border-artistic-text w-full max-w-lg rounded-[2.5rem] shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-accent">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-artistic-text flex items-center gap-2">
                      <Sparkles className="text-artistic-primary shrink-0 animate-bounce" size={26} />
                      愛あるコメントを贈る
                    </h3>
                    <p className="text-xs font-bold opacity-70 mt-1">
                      対象物: 「{selectedCommentItem.title}」への愛あるコメント
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCommentModal(false);
                      setCommenterName('');
                      setCommenterContact('');
                      setCommentText('');
                    }}
                    className="bg-white border-2 border-artistic-text p-1.5 rounded-xl hover:scale-105 transition-transform shrink-0 font-black cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                <form onSubmit={handleCommentSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase opacity-60">あなたのお名前 (ニックネーム可) *</label>
                      <input
                        type="text"
                        required
                        maxLength={50}
                        value={commenterName}
                        onChange={(e) => setCommenterName(e.target.value)}
                        className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary animate-none"
                        placeholder="例: たかはし"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase opacity-60">ご連絡先 (SNS IDなど・任意)</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={commenterContact}
                        onChange={(e) => setCommenterContact(e.target.value)}
                        className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary"
                        placeholder="例: @takahashi_room8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase opacity-60 font-sans">ここがエモい！愛あるコメント (落とし物の魅力や勝手な思い出など) *</label>
                      <textarea
                        required
                        maxLength={1000}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none focus:border-artistic-primary h-24 resize-none"
                        placeholder="例: 展示物の片隅でひときわ輝いてました。持ち主のセンスの良さがこの1ミリグラムからも伝わってきます。早く再会できますように！"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-dashed border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCommentModal(false);
                        setCommenterName('');
                        setCommenterContact('');
                        setCommentText('');
                      }}
                      disabled={isSubmittingComment}
                      className="flex-1 py-3 px-4 border-2 border-artistic-text rounded-xl font-black text-sm hover:bg-neutral-50 disabled:opacity-50 cursor-pointer"
                    >
                      やめとく
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingComment}
                      className="flex-1 bg-artistic-primary text-white border-2 border-artistic-text rounded-xl font-black text-sm py-3 px-4 hover:scale-102 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] transition-transform PioneerBtn disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmittingComment ? '届けています...' : '愛あるコメントを贈る'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Comment Confirmation Modal */}
      <AnimatePresence>
        {commentToDelete && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-4 border-artistic-text w-full max-w-sm rounded-[2.5rem] shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] overflow-hidden p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-xl font-black mb-3">愛あるコメントの削除</h4>
              <p className="text-sm font-bold text-neutral-600 mb-6 leading-relaxed">
                この愛あるコメントを削除します。持ち主が読めなくなってしまいますが、よろしいですか？
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setCommentToDelete(null)}
                  className="px-4 py-2 border-2 border-artistic-text rounded-xl font-black text-xs hover:bg-neutral-50 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={executeDeleteComment}
                  className="px-4 py-2 bg-red-500 text-white border-2 border-artistic-text rounded-xl font-black text-xs shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  削除する
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Floating Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%" }}
            className="fixed top-6 left-1/2 z-[300] bg-white border-4 border-artistic-text px-6 py-3 rounded-2xl shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] font-black text-sm flex items-center gap-2"
          >
            <Sparkles className="text-artistic-primary shrink-0 animate-spin" size={18} />
            <span className="text-neutral-900">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

// Inner Helper component for Section bounding
function Section({ children, className = "", id = "" }: { children: React.ReactNode, className?: string, id?: string }) {
  return (
    <section id={id} className={className}>
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        {children}
      </div>
    </section>
  );
}
