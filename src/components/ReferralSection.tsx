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
  Trash2,
  Camera,
  RefreshCw
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
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

// Highly detailed vector state-of-the-art smartphone illustration scanning QR code accurately
const SmartphoneScanIllustration = () => (
  <div className="absolute bottom-4 right-4 w-28 h-36 pointer-events-none opacity-90 hover:opacity-100 transition-opacity duration-300 transform -rotate-[15deg] z-10">
    <svg viewBox="0 0 120 150" className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]">
      <defs>
        {/* Dynamic metallic edge borders */}
        <linearGradient id="phoneBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="50%" stopColor="#d1d5db" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        {/* Screen backlighting glow */}
        <radialGradient id="phoneScreenGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        {/* Neon Laser Line Gradient */}
        <linearGradient id="miniLaser" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Smartphone Outer Shell Case */}
      <rect x="15" y="8" width="90" height="134" rx="13" fill="#0c101a" stroke="url(#phoneBodyGrad)" strokeWidth="2.5" />
      
      {/* Dynamic Island Front Punch-Hole */}
      <rect x="47" y="14" width="26" height="6" rx="3" fill="#000000" />
      <circle cx="50.5" cy="17" r="1.5" fill="#1e293b" />

      {/* Screen Display Frame */}
      <rect x="20" y="24" width="80" height="112" rx="8" fill="#070a12" stroke="#1f2937" strokeWidth="1" />
      {/* Screen background camera active overlay */}
      <rect x="20" y="24" width="80" height="112" rx="8" fill="url(#phoneScreenGlow)" />

      {/* HUD System Overlay Icons */}
      <text x="25" y="32" fill="#9ca3af" fontSize="4.2" fontFamily="monospace" fontWeight="950" opacity="0.8">LIVE</text>
      <circle cx="94" cy="30.5" r="1.3" fill="#10b981" />
      <rect x="83" y="28.5" width="6" height="3" rx="0.6" fill="none" stroke="#9ca3af" strokeWidth="0.5" />
      <rect x="84.2" y="29.4" width="3.5" height="1.4" fill="#10b981" />

      {/* Viewfinder Alignment Reticle Box */}
      <rect x="32" y="46" width="56" height="56" rx="5" fill="#030712" stroke="#10b981" strokeWidth="0.8" strokeDasharray="3,2" />
      
      {/* Reticle Corner Marks */}
      <path d="M 37 46 L 32 46 L 32 51" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 83 46 L 88 46 L 88 51" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 37 102 L 32 102 L 32 97" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 83 102 L 88 102 L 88 97" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

      {/* High-Contrast Precise QR Code inside viewport */}
      <g transform="translate(43, 57)">
        <rect x="0" y="0" width="34" height="34" rx="2" fill="#ffffff" />
        {/* Finder 1 */}
        <rect x="3" y="3" width="9" height="9" fill="#000000" />
        <rect x="5" y="5" width="5" height="5" fill="#ffffff" />
        <rect x="6" y="6" width="3" height="3" fill="#000000" />
        {/* Finder 2 */}
        <rect x="22" y="3" width="9" height="9" fill="#000000" />
        <rect x="24" y="5" width="5" height="5" fill="#ffffff" />
        <rect x="25" y="6" width="3" height="3" fill="#000000" />
        {/* Finder 3 */}
        <rect x="3" y="22" width="9" height="9" fill="#000000" />
        <rect x="5" y="24" width="5" height="5" fill="#ffffff" />
        <rect x="6" y="25" width="3" height="3" fill="#000000" />
        {/* Matrix Data Points */}
        <rect x="14" y="14" width="3" height="3" fill="#000000" />
        <rect x="18" y="14" width="3" height="3" fill="#000000" />
        <rect x="14" y="20" width="3" height="3" fill="#000000" />
        <rect x="24" y="14" width="3" height="3" fill="#000000" />
        <rect x="28" y="16" width="3" height="3" fill="#000000" />
        <rect x="20" y="20" width="3" height="3" fill="#000000" />
        <rect x="24" y="21" width="3" height="3" fill="#000000" />
        <rect x="14" y="25" width="4" height="4" fill="#000000" />
        <rect x="26" y="26" width="4" height="4" fill="#000000" />
        <rect x="20" y="27" width="4" height="3" fill="#000000" />
      </g>

      {/* Cybernetic Sweep Line on Mini Viewport */}
      <rect x="32" y="70" width="56" height="3.5" fill="url(#miniLaser)" opacity="0.9" />
      <line x1="29" y1="71.7" x2="91" y2="71.7" stroke="#10b981" strokeWidth="1" />

      {/* HUD Info Text inside display */}
      <text x="60" y="112" fill="#10b981" fontSize="4.2" fontFamily="monospace" fontWeight="950" textAnchor="middle" opacity="0.9">scanning...</text>
      <text x="60" y="119" fill="#9ca3af" fontSize="3.5" fontFamily="monospace" textAnchor="middle" opacity="0.6">MATCH 100%</text>

      {/* Decorative Circular Scan rings */}
      <circle cx="60" cy="74" r="32" fill="none" stroke="#10b981" strokeWidth="0.4" strokeDasharray="1,4" opacity="0.5" />
    </svg>
  </div>
);

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

  // REAL CAMERA QR SCANNER ENGINE
  const [isScanningReal, setIsScanningReal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeFacingMode, setActiveFacingMode] = useState<"environment" | "user" | "simulation">("environment");

  // Customized "My QR Code Pass" card
  const [myPassName, setMyPassName] = useState("Hiroto Mizutani");
  const [myPassHandle, setMyPassHandle] = useState("@hiroto_m");
  const [showPassEdit, setShowPassEdit] = useState(false);
  const [simulatedArtIndex, setSimulatedArtIndex] = useState(0);

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

  const handleScannedCode = async (scannedText: string) => {
    let cleanedId = scannedText.trim();
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
      setIsScanningReal(false);
      showToast(`「${found.introducerName}」さんの紹介をピピッ！と読み込み完了！🎨`);
    } else {
      // Direct Firestore fetching for production-grade reliability
      try {
        const docSnap = await getDoc(doc(db, "referrals", cleanedId));
        if (docSnap.exists()) {
          const referralData = { id: docSnap.id, ...docSnap.data() } as Referral;
          playScanSuccessSound();
          setTargetReferralScan(referralData);
          handleAddToMetList(docSnap.id);
          setIsScanningReal(false);
          showToast(`「${referralData.introducerName}」さんの紹介をピピッ！と読み込み完了！🎨`);
        } else {
          showToast("指定された紹介カード（QRコード）が見つかりません。⚠️");
        }
      } catch (err) {
        console.error("Firestore fetch error on scan", err);
        showToast("紹介コードの読み込み中にエラーが発生しました。⚠️");
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let activeScanner: Html5Qrcode | null = null;

    if (isScanningReal) {
      setCameraError(null);
      
      // If we are in simulation mode, DO NOT instantiate the actual webcam hardware!
      if (activeFacingMode === "simulation") {
        return;
      }

      // Wait slightly for modal transition & DOM mount
      const timer = setTimeout(() => {
        if (!isMounted) return;
        const container = document.getElementById("qr-reader-element");
        if (!container) {
          setCameraError("スキャン画面の準備が整いませんでした。");
          return;
        }

        try {
          const qrScanner = new Html5Qrcode("qr-reader-element");
          activeScanner = qrScanner;

          qrScanner.start(
            { facingMode: activeFacingMode },
            {
              fps: 12,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.72;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleScannedCode(decodedText);
            },
            () => {
              // Verbose frame scans - silent
            }
          ).catch(err => {
            console.error("Start camera scanner failed", err);
            setCameraError("カメラを起動できません。ブラウザのカメラ使用許可を確認し、もう一度お試しください。");
          });
        } catch (err) {
          console.error("Initiate scanner error", err);
          setCameraError("スキャナーの初期化に失敗しました。");
        }
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (activeScanner) {
          if (activeScanner.isScanning) {
            activeScanner.stop().catch(err => console.error("Scanner cleanup error", err));
          }
        }
      };
    }
  }, [isScanningReal, activeFacingMode]);

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

      {/* 1.5. QR Exchange Hub */}
      <div className="bg-gradient-to-r from-artistic-accent/20 to-artistic-primary/10 border-4 border-artistic-text rounded-[2.5rem] p-6 md:p-8 shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-black italic flex items-center gap-2 text-artistic-text">
              <QrCode size={24} className="text-artistic-primary stroke-[3]" /> 紹介状スキャン＆おしゃべり接続 📱⚡️
            </h3>
            <p className="text-xs font-bold text-stone-600 max-w-xl leading-relaxed">
              会場ではお互いのスマホ画面の<strong>【QRコードマーク】</strong>を表示してスキャン！<br />
              スマホのカメラを起動して、会場で見つけたお互いのパスQRコードにかざしてスキャンしてみましょう！
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            {/* Real Camera QR Scanner button */}
            <button
               type="button"
               onClick={() => setIsScanningReal(true)}
               className="flex items-center justify-center gap-2 bg-artistic-green hover:bg-emerald-500 text-white border-2 border-artistic-text px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-tight transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 cursor-pointer"
            >
              <Camera size={16} className="animate-pulse" />
              QRコードをスキャン 📸
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
                  「QRコードをスキャン」ボタンから読み取るか、または招待コードを入力してお喋りをスタートしてみましょう！
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

      {/* Real Camera Scanner Overlay (Ugraded to Immersive Smartphone Frame) */}
      <AnimatePresence>
        {isScanningReal && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-xl overflow-y-auto">
            {/* Dark outer backdrop to click out of modal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScanningReal(false)}
              className="absolute inset-0 cursor-zoom-out"
            />
            
            <div className="relative z-50 flex flex-col xl:flex-row items-center justify-center gap-6 max-w-5xl w-full pb-24 xl:pb-0">
              
              {/* LEFT SIDE: Immersive Mode Controller & Info Panel (Hidden on Mobile, elegant sidebar on desktop) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="hidden xl:flex text-white max-w-md w-full shrink-0 flex-col space-y-6"
              >
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 bg-artistic-primary text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-stone-800 shadow-md">
                    <Sparkles size={12} className="animate-spin text-white" />
                    rOOM8 High-Fidelity Scan Center
                  </span>
                  <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter leading-none">
                    QRコネクト・ハブ 📱✨
                  </h3>
                  <p className="text-xs font-bold text-stone-400 leading-relaxed">
                    スマホ画面上部にあなたのデジタル招待パス（マイQRコード）が輝き、カメラ画面はアニメーションが流れるスキャナーへと繋がっています。
                  </p>
                </div>

                <div className="bg-stone-900/60 border border-stone-850 p-5 rounded-3xl space-y-4">
                  <span className="text-[10px] uppercase font-black tracking-wider text-stone-500 block">モード切り替えコントローラー</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        setActiveFacingMode("environment");
                      }}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                        activeFacingMode === "environment"
                          ? "bg-artistic-green text-stone-950 border-white shadow-md font-black"
                          : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                      }`}
                    >
                      <Camera size={13} />
                      背面カメラ 📸
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        setActiveFacingMode("user");
                      }}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                        activeFacingMode === "user"
                          ? "bg-artistic-green text-stone-950 border-white shadow-md font-black"
                          : "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750"
                      }`}
                    >
                      <UserCheck size={13} />
                      インカメラ 🤳
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setActiveFacingMode("simulation");
                    }}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      activeFacingMode === "simulation"
                        ? "bg-artistic-primary text-white border-white shadow-md"
                        : "bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-750"
                    }`}
                  >
                    <Sparkles size={13} className="animate-pulse text-white" />
                    シミュレータに切り替え (カメラ不使用) ⚡
                  </button>

                  <p className="text-[10px] font-bold text-stone-500 leading-relaxed">
                    ※ iframe環境やカメラ不許可の場合は、<strong>「シミュレータ」</strong>をオンにするか、<strong>下部の作家アイコン</strong>をタップして一瞬で推薦スキャンをピピッ！と検証できます。
                  </p>
                </div>

                <div className="flex justify-start gap-4">
                  <button
                    onClick={() => setIsScanningReal(false)}
                    className="bg-white hover:bg-stone-100 text-stone-900 border-2 border-stone-800 px-6 py-2.5 rounded-xl font-black text-xs shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-[1px] hover:translate-y-[1px] active:scale-95 transition-all cursor-pointer"
                  >
                    閉じる 🚪
                  </button>
                </div>
              </motion.div>

              {/* RIGHT SIDE / CENTER: High-fidelity Responsive Virtual Smartphone Mockup */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-[310px] xs:w-[345px] h-[76vh] min-h-[560px] max-h-[690px] md:h-[690px] bg-stone-900 rounded-[2.5rem] xs:rounded-[3.2rem] border-[6px] xs:border-[8px] border-stone-800 shadow-[0_24px_50px_rgba(0,0,0,0.85),0_0_80px_rgba(255,82,27,0.12)] flex flex-col overflow-hidden select-none shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Device Hardware Details: Dynamic Speaker Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-stone-950 rounded-full flex items-center justify-around px-4 z-50">
                  <div className="w-12 h-1.5 bg-stone-800 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-stone-900 rounded-full border border-stone-800" />
                </div>

                {/* 2. Device Status Bar Indicators */}
                <div className="h-11 pt-4 px-6 flex justify-between items-center text-[10px] font-black text-stone-400 z-40 bg-zinc-950/20">
                  <span>18:53</span>
                  <div className="flex items-center gap-1.5 bg-black/10 py-0.5 px-2 rounded-full">
                    <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded-sm font-extrabold flex items-center leading-none">
                      ● 5G
                    </span>
                    <span>📶</span>
                    <span>🔋 94%</span>
                  </div>
                </div>

                {/* 3. Screen View Area */}
                <div className="flex-1 flex flex-col justify-between p-4 pt-1 pb-4 relative z-30">
                  
                  {/* DESIGN REQUISITE A: PHONE SCREEN TOP DISPLAYED OWN PASS ("スマホ画面上部にその人のQRコードが付いているデザイン") */}
                  <div className="bg-stone-950/90 border border-stone-850 rounded-2xl p-3 flex items-center gap-3 shadow-2xl relative mt-1 group/card transition-all hover:border-stone-700">
                    <div className="shrink-0 relative">
                      <QRCodeSVG 
                        value={JSON.stringify({ 
                          type: "room8_guest_pass", 
                          name: myPassName, 
                          handle: myPassHandle,
                          timestamp: Date.now() 
                        })} 
                        size={64} 
                        className="bg-white p-1 rounded-lg shadow-md border border-white"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-artistic-pink text-[7px] text-white px-1.2 py-0.2 rounded font-black border border-stone-950 animate-bounce">
                        PASS
                      </span>
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-artistic-green animate-ping" />
                        <span className="text-[8px] font-black text-artistic-green uppercase tracking-widest leading-none">
                          rOOM8 ACTIVE MEMBER
                        </span>
                      </div>
                      
                      <h5 className="font-black text-sm text-white truncate leading-tight mt-1">
                        {myPassName}
                      </h5>
                      <p className="text-[10px] font-black text-stone-400 font-mono tracking-tighter truncate leading-none mt-0.5">
                        {myPassHandle}
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowPassEdit(!showPassEdit)}
                        className="text-[9px] font-black text-artistic-accent hover:underline mt-2 flex items-center gap-0.5 cursor-pointer bg-transparent border-none"
                      >
                        <Edit2 size={8} />
                        パス情報を編集する ✍️
                      </button>
                    </div>
                  </div>

                  {/* Accordion sub-pane: Pass editing inputs */}
                  {showPassEdit && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="bg-stone-950 border border-stone-850 p-3 rounded-xl mt-1 space-y-2 text-left z-40 relative shadow-inner"
                    >
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-stone-500 block">表示名</span>
                        <input
                          type="text"
                          value={myPassName}
                          onChange={(e) => setMyPassName(e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 rounded px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-artistic-accent"
                          placeholder="Your Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-stone-500 block">SNSハンドル/メッセージ</span>
                        <input
                          type="text"
                          value={myPassHandle}
                          onChange={(e) => setMyPassHandle(e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 rounded px-2.5 py-1 text-xs font-bold text-white outline-none focus:border-artistic-accent"
                          placeholder="@handle"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* DESIGN REQUISITE B: ACTIVE SCANNER VIEWPORT */}
                  <div className="flex-1 relative my-3 border-4 border-stone-800 bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                    
                    {/* 🌟 UNIFIED ULTRA-COMPACT HUD BAR (Overlaid inside the phone screen, always fully visible and responsive!) */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between bg-stone-950/95 backdrop-blur-md border border-stone-800 p-1.2 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-1.5 pl-2 max-w-[55px]">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeFacingMode === "simulation" ? "bg-amber-400 animate-pulse" : "bg-emerald-400 animate-ping"}`} />
                        <span className="text-[7.5px] font-black tracking-widest text-[#D4AF37] uppercase font-mono truncate leading-none">
                          {activeFacingMode === "simulation" ? "模擬" : "実写"}
                        </span>
                      </div>

                      {/* Pill segmented controller tabs */}
                      <div className="flex gap-0.5 bg-stone-900/90 p-0.5 rounded-xl border border-stone-850">
                        {/* Environment Facing camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            setActiveFacingMode("environment");
                            showToast("背面カメラに切り替えました！📸");
                          }}
                          className={`px-1.5 xs:px-2 py-1 rounded-lg text-[8px] font-black tracking-tight transition-all flex items-center gap-0.5 cursor-pointer border-none ${
                            activeFacingMode === "environment"
                              ? "bg-emerald-400 text-stone-950 font-black shadow-sm"
                              : "text-stone-400 hover:text-white bg-transparent"
                          }`}
                        >
                          背面
                        </button>

                        {/* Front Facing camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setCameraError(null);
                            setActiveFacingMode("user");
                            showToast("インカメラに切り替えました！🤳");
                          }}
                          className={`px-1.5 xs:px-2 py-1 rounded-lg text-[8px] font-black tracking-tight transition-all flex items-center gap-0.5 cursor-pointer border-none ${
                            activeFacingMode === "user"
                              ? "bg-emerald-400 text-stone-950 font-black shadow-sm"
                              : "text-stone-400 hover:text-white bg-transparent"
                          }`}
                        >
                          内カメ
                        </button>

                        {/* Simulation trigger / toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            if (activeFacingMode === "simulation") {
                              setCameraError(null);
                              setActiveFacingMode("environment");
                              showToast("模擬を解除し、外カメラを起動しました！📸");
                            } else {
                              setCameraError(null);
                              setActiveFacingMode("simulation");
                              showToast("仮想スキャン模擬モードを開始しました 🧪");
                            }
                          }}
                          className={`px-1.5 xs:px-2 py-1 rounded-lg text-[8px] font-black tracking-tight transition-all flex items-center gap-1 cursor-pointer border-none ${
                            activeFacingMode === "simulation"
                              ? "bg-artistic-primary text-white border-white/20 animate-pulse font-black"
                              : "text-stone-400 hover:text-white bg-transparent"
                          }`}
                        >
                          {activeFacingMode === "simulation" ? "模擬ON 🧪" : "模擬 🧪"}
                        </button>
                      </div>

                      {/* Clean circular Close button */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsScanningReal(false);
                          showToast("スキャナーを閉じました 🚪");
                        }}
                        className="w-5 h-5 bg-white/10 hover:bg-stone-850 hover:text-rose-400 text-stone-300 rounded-lg flex items-center justify-center text-[8px] font-extrabold cursor-pointer transition-all border-none shrink-0"
                        title="閉じる"
                      >
                        ✕
                      </button>
                    </div>

                    {activeFacingMode === "simulation" || cameraError ? (
                      // SIMULATION VIEWPORT OR FALLBACK PREVIEW
                      <div className="absolute inset-0 flex flex-col justify-between p-4 pt-16 overflow-hidden">
                        {/* Simulation background representation */}
                        <div className="absolute inset-0 bg-stone-950/70" />
                        {creators.length > 0 ? (
                          <div className="absolute inset-0 z-0">
                            <motion.img 
                              key={simulatedArtIndex}
                              initial={{ opacity: 0, scale: 1.15 }}
                              animate={{ opacity: 0.6, scale: 1 }}
                              transition={{ duration: 1 }}
                              src={creators[simulatedArtIndex % creators.length].imageUrl || "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600"}
                              className="w-full h-full object-cover blur-xs scale-102"
                            />
                            {/* Rotating overlay representing artworks */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-stone-950/20 to-stone-900" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-stone-800 z-0 opacity-40" />
                        )}

                        {/* Middle Simulated scanner target info (Redefined to fit perfectly under the HUD) */}
                        <div className="relative z-10 text-center py-4 space-y-1 my-auto">
                          <span className="text-[8px] font-black text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/20 inline-block tracking-wider uppercase font-mono">
                            AI SCAN-LOCK F-08
                          </span>
                          <h6 className="text-[10px] xs:text-[11px] font-black text-white px-2 leading-tight">
                            {creators.length > 0 
                              ? `「${creators[simulatedArtIndex % creators.length].name}」さんのフライヤーを検出`
                              : "スキャナー準備中..."}
                          </h6>
                          <div className="flex flex-col items-center justify-center gap-1.5 mt-2 bg-stone-950/50 p-2 rounded-xl border border-stone-900 max-w-[210px] mx-auto">
                            <p className="text-[7.5px] font-bold text-stone-400 leading-normal">
                              メンバーアイコンタップ、または「見回す」でアートを切り替えてスキャン
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSimulatedArtIndex(prev => prev + 1);
                                playScanSuccessSound();
                              }}
                              className="bg-white/10 hover:bg-white/25 text-white rounded-full px-2 py-0.6 text-[8px] font-black cursor-pointer border border-white/5 active:scale-95 transition-all w-full text-center"
                            >
                              別のアートを見回す 🔄
                            </button>
                          </div>
                        </div>

                        {/* Success triggers block */}
                        {creators.length > 0 && (
                          <div className="relative z-10 mt-auto bg-stone-950/80 backdrop-blur-sm border border-stone-850 p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-xl">
                            <div className="text-left min-w-0">
                              <span className="text-[7.5px] font-black text-stone-500 uppercase tracking-widest block">作品タイトル</span>
                              <h5 className="font-extrabold text-[10px] text-white truncate leading-tight">
                                {creators[simulatedArtIndex % creators.length].bio || "作品展示中"}
                              </h5>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const matchedReferral = referrals.find(r => r.creatorId === creators[simulatedArtIndex % creators.length].id);
                                if (matchedReferral) {
                                  playScanSuccessSound();
                                  setTargetReferralScan(matchedReferral);
                                  if (matchedReferral.id) {
                                    handleAddToMetList(matchedReferral.id);
                                  }
                                  setIsScanningReal(false);
                                  showToast(`「${matchedReferral.introducerName}」さんの紹介を擬似スキャン！🎨`);
                                } else {
                                  showToast("この作家の紹介状がまだ書かれていません✍️");
                                }
                              }}
                              className="bg-artistic-accent text-artistic-text font-black text-[9px] px-2.5 py-1.5 rounded-lg shrink-0 border border-artistic-text shadow-sm cursor-pointer"
                            >
                              スキャン接続 ⚡️
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // REAL CAM VIEW MOUNT CONTAINER
                      <div className="absolute inset-0 w-full h-full bg-black">
                        <div id="qr-reader-element" className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
                      </div>
                    )}

                    {/* MOVEMENT LASER SCAN LINE (DESIGN REQUISITE C) */}
                    <motion.div
                      animate={{ translateY: [-110, 110, -110] }}
                      transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                      className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_15px_#10b981,0_0_5px_#10b981] pointer-events-none z-20"
                    />

                    {/* Cyberpunk corner tracking braces overlay */}
                    <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl pointer-events-none z-20" />
                    <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr pointer-events-none z-20" />
                    <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl pointer-events-none z-20" />
                    <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br pointer-events-none z-20" />

                    {/* DETAILED RECENT USER REQUIREMENT FEATURE: GLOWING SMARTPHONE ILLUSTRATION STYLED RE-DRAWN */}
                    <SmartphoneScanIllustration />
                  </div>

                  {/* Mode details or errors indicators inside phone */}
                  {cameraError && activeFacingMode !== "simulation" && (
                    <div className="bg-red-950/20 border border-red-900/50 p-2 rounded-xl text-left">
                      <span className="text-red-400 font-extrabold text-[8px] uppercase tracking-wider block">⚠️ CAMERA INACTIVE</span>
                      <p className="text-[9px] text-stone-300 font-bold leading-tight mt-0.5">
                        iframe制限やカメラ未対応のため、シミュレータが起動します。
                      </p>
                    </div>
                  )}

                  {/* DESIGN REQUISITE D: THE BOTTOM SMARTPHONE NAVIGATION BAR - Faithful duplication of layout */}
                  <div className="h-16 border-t border-stone-850 bg-stone-950 -mx-4 -mb-4 px-4.5 flex items-center justify-between z-40 bg-zinc-950/95 shadow-2xl">
                    
                    {/* Left portion: circular thumbnails of members (tapping executes mock scans!) */}
                    <div className="flex -space-x-1.5 items-center">
                      {creators.slice(0, 3).map((c, idx) => (
                        <button
                          key={c.id || idx}
                          type="button"
                          onClick={() => {
                            const matchedReferral = referrals.find(r => r.creatorId === c.id);
                            if (matchedReferral) {
                              playScanSuccessSound();
                              setTargetReferralScan(matchedReferral);
                              if (matchedReferral.id) {
                                handleAddToMetList(matchedReferral.id);
                              }
                              setIsScanningReal(false);
                              showToast(`「${matchedReferral.introducerName}」さんの紹介をピピッ！と読み込み完了！🎨`);
                            } else {
                              showToast(`作家「${c.name}」さんの推薦紹介状がまだありません✍️`);
                            }
                          }}
                          className="w-8 h-8 rounded-full border-1.5 border-stone-800 hover:border-artistic-accent bg-stone-800 overflow-hidden transform hover:scale-115 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer hover:z-20 relative group/icon"
                          title={`${c.name}さんの紹介を読み込む`}
                        >
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover group-hover/icon:brightness-110" />
                          ) : (
                            <span className="text-[10px]">👤</span>
                          )}
                        </button>
                      ))}

                      {/* Empty filler circle (as seen in image) */}
                      <div className="w-8 h-8 rounded-full border-1.5 border-stone-800 bg-stone-900 shadow-md shrink-0 flex items-center justify-center opacity-40">
                        <span className="text-[9px] text-stone-500 font-bold">●</span>
                      </div>
                    </div>

                    {/* Middle portion: the central glowing gold QR selector active tab (activates scan chime) */}
                    <button
                      type="button"
                      onClick={() => {
                        playScanSuccessSound();
                        showToast("スキャナー自動キャリブレーション実行！⚡️");
                      }}
                      className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 border-2 border-stone-950 flex items-center justify-center text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer z-25 shrink-0"
                      title="リフレッシュ・スキャナー"
                    >
                      <QrCode size={18} strokeWidth={2.5} />
                    </button>

                    {/* Right portion: User profile portrait circular placeholder (represented in user's image) */}
                    <button
                      type="button"
                      onClick={() => setShowPassEdit(!showPassEdit)}
                      className="w-9 h-9 rounded-full border-2 border-stone-800 overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-tr from-artistic-primary to-[#FF8C00] shadow-lg hover:scale-110 active:scale-95 transition-all relative group/profile cursor-pointer"
                      title="マイプロフィール"
                    >
                      {/* Beautiful abstract geometric pattern SVG */}
                      <svg viewBox="0 0 100 100" className="w-full h-full object-cover group-hover/profile:scale-110 group-hover/profile:rotate-45 transition-all duration-500">
                        <defs>
                          <linearGradient id="abstractGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ff521b" />
                            <stop offset="50%" stopColor="#ff7b00" />
                            <stop offset="100%" stopColor="#ff007b" />
                          </linearGradient>
                          <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                        <rect width="100" height="100" fill="url(#abstractGrad)" />
                        <circle cx="30" cy="30" r="22" fill="#ffffff" opacity="0.15" />
                        <polygon points="50,15 85,75 15,75" fill="#ffffff" opacity="0.2" />
                        <line x1="10" y1="90" x2="90" y2="10" stroke="#ffffff" strokeWidth="3.5" opacity="0.35" />
                        <circle cx="75" cy="35" r="14" fill="url(#glowGrad)" />
                      </svg>
                      {/* Active green status dot indicator */}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-zinc-950 rounded-full" />
                    </button>

                  </div>

                </div>

              </motion.div>

            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
