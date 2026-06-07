import React, { ReactNode, useState, useEffect, useMemo } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Music, 
  BookOpen, 
  Palette, 
  ShoppingBag, 
  Monitor, 
  Heart,
  Settings as SettingsIcon,
  Calendar,
  Copy,
  ExternalLink,
  Youtube,
  Share2,
  Twitter,
  Facebook,
  X,
  MapPin,
  CalendarPlus,
  Download,
  Check,
  Sparkles,
  Tv,
  Award,
  Image as ImageIcon,
  Menu,
  Smartphone
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { EVENT_INFO, SECTIONS, FALLBACK_EVENTS } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import PrivacyGallery from "./components/PrivacyGallery";
import PastEventsGallery from "./components/PastEventsGallery";
import LostItemsGallery from "./components/LostItemsGallery";
import Shop from "./components/Shop";
import ReferralSection from "./components/ReferralSection";
import QuickNavMenu from "./components/QuickNavMenu";
import { ensureSeedData } from "./lib/seedData";
import { db, EventItem, auth } from "./lib/firebase";
import { formatEventDate, isPastEvent } from "./lib/dateUtils";
import { generateGoogleCalendarUrl, downloadICS } from "./lib/calendarUtils";
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  getDocFromServer,
  writeBatch,
  increment,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection strictly mandated by instructions
async function testConnection() {
  try {
    const testDoc = doc(db, 'settings', 'connection_test');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

const Section = ({ children, className = "", id = "", innerClassName = "" }: { children: ReactNode, className?: string, id?: string, innerClassName?: string }) => (
  <section id={id} className={className}>
    <div className={`px-6 md:px-12 max-w-7xl mx-auto ${innerClassName}`}>
      {children}
    </div>
  </section>
);

const Card = ({ children, className = "" }: { children: ReactNode, className?: string }) => (
  <motion.div 
    whileHover={{ y: -8, x: -4, shadow: "12px 12px 0px 0px rgba(42,42,42,1)" }}
    className={`bg-white p-8 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text transition-shadow duration-200 ${className}`}
  >
    {children}
  </motion.div>
);

// Error Boundary to prevent total site disappearance
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  public state = { hasError: false, error: null as Error | null };
  public props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-artistic-bg flex items-center justify-center p-12 text-center">
          <div className="bg-white border-4 border-artistic-text p-10 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] max-w-xl">
            <h1 className="text-3xl font-black text-artistic-pink mb-4">Something went wrong</h1>
            <p className="font-bold mb-6">アプリケーションの表示中にエラーが発生しました。</p>
            <pre className="p-4 bg-stone-100 rounded-xl text-left text-xs overflow-auto max-h-40 mb-6 font-mono border-2 border-artistic-text">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="bg-artistic-primary text-white px-8 py-3 rounded-xl font-black hover:scale-105 transition-transform"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

const LogoElement = ({ isScrolled }: { isScrolled: boolean }) => {
  const [imgError, setImgError] = useState(false);
  const logoSrc = "https://lh3.googleusercontent.com/d/13uUJp8IusBZmEpYpJlamALpv6vFwJ2lh"; // Use direct Google Drive URL for production reliability

  if (!imgError) {
    return (
      <img
        src={logoSrc}
        alt="rOOM8 Logo"
        onError={() => setImgError(true)}
        className="h-full w-auto object-contain drop-shadow-md group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 origin-center"
      />
    );
  }

  return (
    <h1 className={`font-black tracking-[-0.06em] leading-none transition-all inline-block hover:scale-105 transform origin-left h-full flex items-center ${
      isScrolled ? 'text-2xl md:text-3xl' : 'text-5xl md:text-7xl'
    }`}>
      rOOM<span className="text-artistic-primary underline decoration-artistic-accent decoration-4 md:decoration-8 underline-offset-[4px] md:underline-offset-[12px]">8</span>
    </h1>
  );
};

function MainSite() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("データを取得中...");
  const [error, setError] = useState<string | null>(null);
  const [userIP, setUserIP] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [youtubeSubCount, setYoutubeSubCount] = useState<number>(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Seed initial creators and media records if Firestore is blank
  useEffect(() => {
    if (isAdmin) {
      ensureSeedData();
    }
  }, [isAdmin]);

  // Fetch YouTube subscriber count
  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        // Extract handle from constants.ts
        const youtubeUrl = EVENT_INFO.youtube;
        let handle = "@tackyosya955"; // Default fallback
        if (youtubeUrl) {
          const match = youtubeUrl.match(/@([a-zA-Z0-9._-]+)/);
          if (match && match[1]) {
            handle = `@${match[1]}`;
          }
        }

        // Try internal API first (works in AI Studio / custom server)
        const response = await fetch(`/api/youtube-subscribers?handle=${encodeURIComponent(handle)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.subscriberCount !== undefined) {
            setYoutubeSubCount(data.subscriberCount);
            return;
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn("Backend YouTube API failed:", response.status, errorData);
        }
        
        // Fallback or Direct fetch for GitHub Pages / Deployed build if backend fails
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || 
                        (import.meta.env as any).VITE_YOUTUBE_API_KE || 
                        (import.meta.env as any).VITE_YOUTUBE_API_K;
        if (apiKey) {
          console.log(`Attempting direct client-side YouTube fetch fallback for handle: ${handle}`);
          const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${handle}&key=${apiKey}`;
          const directRes = await fetch(url);
          
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData.items && directData.items.length > 0) {
              const count = parseInt(directData.items[0].statistics.subscriberCount);
              setYoutubeSubCount(count);
              return;
            }
          }

          // Further fallback: Search API if forHandle fails on client side
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${handle}&type=channel&maxResults=1&key=${apiKey}`;
          const searchRes = await fetch(searchUrl);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.items && searchData.items.length > 0) {
              const channelId = searchData.items[0].snippet.channelId;
              const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`;
              const statsRes = await fetch(statsUrl);
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                if (statsData.items && statsData.items.length > 0) {
                  setYoutubeSubCount(parseInt(statsData.items[0].statistics.subscriberCount));
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch YouTube subscribers:", error);
      }
    };
    fetchSubscribers();
  }, []);

  const loadingMessages = [
    "スピーカーを設置中...",
    "会場を掃除中...",
    "ビールの在庫を確認中...",
    "ピザのトッピングを選び中...",
    "レコードの針を落とし中...",
    "ネオンサインを点灯中...",
    "誰かの「好き」を読み込み中...",
    "50:50の関係性を計算中...",
    "代々木の空気をサンプリング中..."
  ];

  // Simulated progress during initial load
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          // Slowly increase to 95% until data actually arrives
          const step = Math.random() * 8;
          return Math.min(95, prev + step);
        });
        
        // Randomly change messages
        if (Math.random() > 0.7) {
          setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        }
      }, 150);
      return () => clearInterval(interval);
    } else {
      // Fast finish when loaded
      setLoadingProgress(100);
    }
  }, [loading]);

  const trackAction = async (actionType: string, metadata: any = {}) => {
    // Skip tracking for admin devices/users to avoid bias
    // Also skip if accessing from AI Studio editor
    if (localStorage.getItem('room8_is_admin') === 'true' || auth.currentUser || document.referrer.includes('aistudio.google.com')) {
      return;
    }
    try {
      const jstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
      const today = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}`;
      const actionId = `${today}_${deviceId || 'anon'}_${Date.now()}`;
      await setDoc(doc(db, 'analytics_actions', actionId), {
        actionType,
        deviceId: deviceId || 'anon',
        date: today,
        timestamp: serverTimestamp(),
        ...metadata
      });
    } catch (err) {
      console.error("Tracking Error:", err);
    }
  };
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [likingEvents, setLikingEvents] = useState<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = isScrolled ? 60 : 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (e) {
        console.warn("Unable to set scrollRestoration to manual:", e);
      }
    }
    // Handle initial hash in URL (e.g. on direct load or back from Admin)
    const hash = window.location.hash;
    if (hash && hash !== '#/' && hash !== '#') {
      // Small delay to ensure items are rendered
      const timeout = setTimeout(() => {
        const id = hash.replace(/^#\/?/, '').split('?')[0]; // Handle #about or #/about
        const element = document.getElementById(id);
        if (element) {
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, []);

  const [globalSettings, setGlobalSettings] = useState({
    instagram: EVENT_INFO.instagram,
    youtube: EVENT_INFO.youtube,
    contactEmail: EVENT_INFO.contactEmail
  });

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const analyticsCleanupRef = React.useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkAdmin = (user: any) => {
      const isStudio = document.referrer.includes('aistudio.google.com') || 
                      window.location.hostname.includes('run.app') ||
                      window.location.hostname.includes('localhost');
      
      const adminSecret = localStorage.getItem('room8_is_admin') === 'true';
      setIsAdmin(!!user || adminSecret || isStudio);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      checkAdmin(user);
    });
    
    // Initial check
    checkAdmin(auth.currentUser);

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Generate or retrieve persistent device ID
    let currentDeviceId = deviceId;
    if (!currentDeviceId) {
      currentDeviceId = localStorage.getItem('rOOM8_device_id');
      if (!currentDeviceId) {
        currentDeviceId = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('rOOM8_device_id', currentDeviceId);
      }
      setDeviceId(currentDeviceId);
    }

    if (!isAdmin) {
      const recordVisitSession = async (ipAddr: string | null) => {
        try {
          const jstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
          const today = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}`;
          
          const ua = navigator.userAgent;
          const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
          const deviceType = isMobile ? 'mobile' : 'desktop';
          
          const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const visitId = `${today}_${currentDeviceId}_${sessionId}`;
          const visitRef = doc(db, 'analytics_visits', visitId);
          const referrer = document.referrer || 'direct';
          
          let lastInteractionTime = Date.now();
          const idleThreshold = 60000; // 60 seconds idle timeout
          
          let activeStartTime = Date.now();
          let totalActiveDuration = 0;
          let maxScroll = 0;
          const reachedSections = new Set<string>(['home']);

          const updateActivity = () => {
            const isLoading = document.querySelector('.animate-pulse') !== null;
            if (isLoading) return; // Skip calculation while page is in skeleton loading state

            const scrollPos = window.scrollY + window.innerHeight;
            const totalHeight = document.documentElement.scrollHeight;
            
            // Only calculate if page has content and height is realistic
            if (totalHeight > 1000) {
              const scrollPercent = Math.round((scrollPos / totalHeight) * 100);
              if (scrollPercent > maxScroll) maxScroll = Math.min(100, scrollPercent);
            }
            lastInteractionTime = Date.now();
          };

          // Interaction listeners to reset idle timer
          const resetIdle = () => { lastInteractionTime = Date.now(); };
          window.addEventListener('mousemove', resetIdle);
          window.addEventListener('keydown', resetIdle);
          window.addEventListener('click', resetIdle);
          window.addEventListener('touchstart', resetIdle);

          // Initial calculation for users who don't scroll - Wait longer for layout stability
          setTimeout(updateActivity, 3000);

          // Initial record with enhanced mobile specs
          await setDoc(visitRef, {
            deviceId: currentDeviceId,
            ip: ipAddr || 'unknown',
            date: today,
            referrer: referrer,
            deviceType: deviceType,
            userAgent: ua,
            language: navigator.language,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            pixelRatio: window.devicePixelRatio,
            orientation: window.screen.orientation?.type || 'unknown',
            connectionType: (navigator as any).connection?.effectiveType || 'unknown',
            timestamp: serverTimestamp(),
            duration: 0,
            maxScrollDepth: 0,
            sectionsReached: ['home']
          });

          // Run one update quickly after initial set to capture landing state
          setTimeout(async () => {
            updateActivity();
            try {
              await setDoc(visitRef, {
                maxScrollDepth: maxScroll,
                lastActive: serverTimestamp()
              }, { merge: true });
            } catch (e) {}
          }, 3000);

          window.addEventListener('scroll', updateActivity);

          const sendTrackingUpdate = async () => {
            const now = Date.now();
            const isIdle = (now - lastInteractionTime) > idleThreshold;
            
            // Only update duration if tab is visible AND user is not idle
            if (document.visibilityState === 'visible' && !isIdle) {
              const sessionStep = Math.round((now - activeStartTime) / 1000);
              if (sessionStep > 0 && sessionStep < 65) { // Sanity check for large jumps
                totalActiveDuration += sessionStep;
              }
              activeStartTime = now;
            } else if (document.visibilityState === 'visible' && isIdle) {
              // If idle but visible, don't increment duration, but keep activeStartTime fresh
              activeStartTime = now;
            }
            
            // Limit duration to something reasonable (e.g. 1 hour) to avoid runaway numbers from open tabs
            const cappedDuration = Math.min(totalActiveDuration, 3600);

            try {
              await setDoc(visitRef, {
                duration: cappedDuration,
                maxScrollDepth: maxScroll,
                sectionsReached: Array.from(reachedSections),
                lastActive: serverTimestamp()
              }, { merge: true });
            } catch (e) {}
          };

          // Section reach observer - lower threshold to 0.1 to be more sensitive
          const observer = new IntersectionObserver((entries) => {
            let changed = false;
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                if (sectionId && !reachedSections.has(sectionId)) {
                  reachedSections.add(sectionId);
                  changed = true;
                }
              }
            });
            if (changed) {
              sendTrackingUpdate();
            }
          }, { threshold: 0.1 });

          // Start observing sections - periodically check for new elements (e.g. after data load)
          const observeSections = () => {
             ['home', 'about', 'event-info', 'location', 'youtube-registration', 'party-connect', 'gallery', 'feedback', 'products', 'contact'].forEach(id => {
              const el = document.getElementById(id);
              if (el) observer.observe(el);
            });
          };
          
          observeSections();
          const observeInterval = setInterval(observeSections, 3000); // Check every 3s for new sections

          const sendFinalActivity = sendTrackingUpdate;

          // Use multiple events for better reliability on mobile
          window.addEventListener('beforeunload', sendFinalActivity);
          window.addEventListener('pagehide', sendFinalActivity);
          
          const handleVisibilityChange = () => {
            const now = Date.now();
            const isIdle = (now - lastInteractionTime) > idleThreshold;

            if (document.visibilityState === 'hidden') {
              if (!isIdle) {
                const sessionStep = Math.round((now - activeStartTime) / 1000);
                if (sessionStep > 0 && sessionStep < 3600) {
                  totalActiveDuration += sessionStep;
                }
              }
              sendFinalActivity();
            } else {
              activeStartTime = now;
              lastInteractionTime = now; // Reactivated
            }
          };
          window.addEventListener('visibilitychange', handleVisibilityChange);

          // Heartbeat or Periodic update to save duration/scroll
          const activityInterval = setInterval(sendFinalActivity, 10000);

          // Store cleanup function in ref
          analyticsCleanupRef.current = () => {
            clearInterval(activityInterval);
            clearInterval(observeInterval);
            observer.disconnect();
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('keydown', resetIdle);
            window.removeEventListener('click', resetIdle);
            window.removeEventListener('touchstart', resetIdle);
            window.removeEventListener('beforeunload', sendFinalActivity);
            window.removeEventListener('pagehide', sendFinalActivity);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
          };
        } catch (err) {
          console.error("Failed to record visit:", err);
        }
      };

      // Try to fetch IP, but proceed even if it fails
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          const ip = data.ip;
          setUserIP(ip);
          recordVisitSession(ip);
        })
        .catch(err => {
          console.warn("Failed to fetch IP (will record visit as unknown):", err);
          recordVisitSession(null);
        });
    } else {
      setLoading(false);
    }

    // Load liked events from localStorage
    const saved = localStorage.getItem('rOOM8_liked_events');
    if (saved) {
      try {
        setLikedEvents(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse liked events");
      }
    }
    // Listen to events collection
    const eventsRef = collection(db, 'events');
    const unsubEvents = onSnapshot(eventsRef, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id,
            date: '',
            time: '',
            locationName: '',
            address: '',
            access: '',
            fee: '',
            googleMapEmbedUrl: '',
            order: 0,
            youtubeUrl: data.youtubeUrl || data.facebookEventUrl || '', // Fallback to old field
            ...data 
          } as EventItem;
        }).filter(ev => ev.isPublished !== false);
        const sortedEvents = items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        setEvents(sortedEvents);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Events Error:", err);
        setError("イベント情報の取得に失敗しました。");
        setLoading(false);
      }
    );

    const applyFavicon = (url: string) => {
      const links = document.querySelectorAll(
        "link[rel*='icon'], link[rel*='apple-touch-icon'], link[rel='shortcut icon']"
      );
      
      const isDataUrl = url.startsWith("data:");
      const base = import.meta.env.BASE_URL || "/";
      const cleanBase = base.endsWith("/") ? base : base + "/";

      links.forEach((link: any) => {
        if (isDataUrl) {
          // If Firestore contains raw base64, set it directly on everything
          link.href = url;
          if (url.startsWith("data:image/svg+xml")) {
            link.type = "image/svg+xml";
          } else if (url.startsWith("data:image/x-icon")) {
            link.type = "image/x-icon";
          } else {
            link.type = "image/png";
          }
        } else {
          // If it's a static path or timestamp refresh, keep each link's exact file and add timestamp
          const hrefAttr = link.getAttribute("href") || "";
          
          // Extract original filename, e.g. "apple-touch-icon.png" or "favicon-32x32.png"
          const cleanFileName = hrefAttr.split("?")[0].split("/").pop() || "favicon.png";
          
          // Compose complete base url
          const resolvedAssetUrl = cleanBase + cleanFileName;
          
          // Extract timestamp if exists
          const timestampMatch = url.match(/t=\d+/);
          const tQuery = timestampMatch ? `?${timestampMatch[0]}` : "";
          
          link.href = resolvedAssetUrl + tQuery;
        }
      });
    };

    // Listen to global settings
    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setGlobalSettings(prev => ({
            ...prev,
            ...data,
            youtube: data.youtube || data.facebook || prev.youtube // Fallback
          }));

          // Apply static timestamped favicon with subfolder path support
          if (data.faviconTimestamp) {
            applyFavicon(`/favicon.png?t=${data.faviconTimestamp}`);
          }
        }
      },
      (err) => {
        console.error("Firestore Settings Error:", err);
      }
    );

    // Listen to dedicated favicon document for live Base64 updates (supports serverless / GitHub Pages)
    const unsubFavicon = onSnapshot(doc(db, 'settings', 'favicon'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.customFavicon) {
            applyFavicon(data.customFavicon);
          }
        }
      },
      (err) => {
        console.error("Firestore Favicon Listen Error:", err);
      }
    );

    return () => {
      unsubEvents();
      unsubGlobal();
      unsubFavicon();
      if (analyticsCleanupRef.current) {
        analyticsCleanupRef.current();
      }
    };
  }, [isAdmin]);

  const handleLike = async (eventId: string) => {
    const ident = userIP || deviceId;
    if (!ident || !eventId) return;

    // Prevent multiple concurrent requests for the same event
    if (likingEvents.has(eventId)) return;

    setLikingEvents(prev => {
      const next = new Set(prev);
      next.add(eventId);
      return next;
    });

    const isLiked = likedEvents.has(eventId);
    const pathForLike = `events/${eventId}/likes/${ident}`;
    const pathForEvent = `events/${eventId}`;

    const likeDocRef = doc(db, 'events', eventId, 'likes', ident);
    const eventDocRef = doc(db, 'events', eventId);
    const batch = writeBatch(db);
    
    if (isLiked) {
      batch.delete(likeDocRef);
      batch.update(eventDocRef, {
        likesCount: increment(-1)
      });
    } else {
      batch.set(likeDocRef, {
        ip: userIP || 'unknown',
        deviceId: deviceId || 'unknown',
        eventId: eventId,
        createdAt: serverTimestamp()
      });
      batch.update(eventDocRef, {
        likesCount: increment(1)
      });
    }

    // 1. Optimistic Updates for instant UX feedback
    const originalEvents = [...events];
    const originalLiked = new Set(likedEvents);

    // Live update UI count
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        return {
          ...ev,
          likesCount: Math.max(0, (ev.likesCount || 0) + (isLiked ? -1 : 1))
        };
      }
      return ev;
    }));

    // Toggle liked status
    setLikedEvents(prev => {
      const next = new Set(prev);
      if (isLiked) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });

    try {
      await batch.commit();

      // Update LocalStorage on success
      const newLiked = new Set(likedEvents);
      if (isLiked) {
        newLiked.delete(eventId);
      } else {
        newLiked.add(eventId);
      }
      localStorage.setItem('rOOM8_liked_events', JSON.stringify(Array.from(newLiked)));
    } catch (err) {
      // Rollback memory states if Firestore request fails
      setEvents(originalEvents);
      setLikedEvents(originalLiked);
      handleFirestoreError(err, OperationType.WRITE, `batch:${pathForLike}+${pathForEvent}`);
    } finally {
      // Remove loading state
      setLikingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const LikeButton = ({ eventId, count, compact = false }: { eventId: string, count?: number, compact?: boolean }) => {
    const isLiked = likedEvents.has(eventId);
    const isLiking = likingEvents.has(eventId);
    const height = compact ? "h-11" : "h-12";
    const ident = userIP || deviceId;
    
    // Customize button interactive behavior when loading
    const buttonBase = `flex items-center justify-center gap-2 px-4 rounded-xl border-2 transition-all font-black group/btn shrink-0 ${height} ${
      isLiking || !ident
        ? 'opacity-70 cursor-wait border-artistic-text/40 bg-gray-100 shadow-none translate-x-[2px] translate-y-[2px]' 
        : 'shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95'
    }`;
    
    return (
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLiking && ident) {
            handleLike(eventId);
          }
        }}
        aria-disabled={!ident || isLiking}
        className={`${buttonBase} min-w-[120px]
          ${isLiked 
            ? 'bg-artistic-pink text-white border-artistic-text' 
            : 'bg-white text-artistic-text border-artistic-text hover:bg-artistic-accent'
          }
        `}
      >
        <motion.div
          animate={isLiking ? { scale: [1, 1.15, 1], rotate: [0, 10, -10, 0] } : isLiked ? { scale: [1, 1.3, 1] } : {}}
          transition={isLiking ? { repeat: Infinity, duration: 1.2 } : { duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <Heart 
            size={compact ? 16 : 18} 
            fill={isLiked ? "currentColor" : "none"} 
            strokeWidth={3}
            className={`${isLiking ? 'text-gray-400' : 'transition-colors'}`}
          />
        </motion.div>
        <span className={`${compact ? 'text-[11px]' : 'text-sm'} tracking-tighter`}>
          {isLiking ? '...' : isLiked ? 'LIKED' : 'LIKE'}
        </span>
        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] min-w-[1.2rem] text-center font-mono transition-colors ${
          isLiked 
            ? 'bg-white/20 text-white font-bold' 
            : 'bg-black/5 text-artistic-text group-hover/btn:bg-black/10'
        }`}>
          {count || 0}
        </span>
      </button>
    );
  };

  const AddToCalendar = ({ event, compact = false }: { event: EventItem, compact?: boolean }) => {
    const calendarEvent = {
      title: event.title || event.locationName,
      description: event.description || '',
      location: event.locationName + (event.address ? `, ${event.address}` : ''),
      startDate: event.date,
      startTime: event.time,
      endTime: event.endTime,
    };

    const googleUrl = generateGoogleCalendarUrl(calendarEvent);
    const height = compact ? "h-11" : "h-12";
    const buttonBase = `flex items-center justify-center gap-2 px-4 rounded-xl border-2 border-artistic-text font-black transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 ${height} min-w-[90px] group/btn`;

    if (compact) {
      return (
        <div className="flex items-center gap-2">
          <a 
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${buttonBase} bg-white text-artistic-text hover:bg-artistic-accent`}
            title="Google Calendar"
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarPlus size={16} strokeWidth={3} className="transition-colors" />
            <span className="text-[11px] tracking-tighter">CAL</span>
          </a>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              downloadICS(calendarEvent);
            }}
            className={`${buttonBase} bg-white text-artistic-text hover:bg-artistic-primary hover:text-white`}
            title="Apple / Outlook / .ics"
          >
            <Download size={16} strokeWidth={3} className="transition-colors" />
            <span className="text-[11px] tracking-tighter transition-colors">ICS</span>
          </button>
        </div>
      );
    }

    const largeButtonClass = "flex-1 bg-white border-2 border-artistic-text px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95";

    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <a 
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${largeButtonClass} hover:bg-artistic-accent text-artistic-text`}
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarPlus size={20} strokeWidth={3} /> Google
        </a>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            downloadICS(calendarEvent);
          }}
          className={`${largeButtonClass} hover:bg-artistic-primary hover:text-white group`}
        >
          <Download size={20} strokeWidth={3} className="group-hover:text-white transition-colors" /> 
          <span className="group-hover:text-white transition-colors">Apple / .ics</span>
        </button>
      </div>
    );
  };


  const CopyEventInfo = ({ event, compact = false }: { event: EventItem, compact?: boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const { monthDay, dayOfWeek } = formatEventDate(event.date);
      const daySuffix = dayOfWeek ? (dayOfWeek.includes('(') ? dayOfWeek : `(${dayOfWeek})`) : '' ;
      
      const text = `${event.title || event.locationName}\n` +
                   `📅 ${monthDay}${daySuffix} ${event.time}\n` +
                   `📍 ${event.locationName}${event.address ? ` (${event.address})` : ''}\n` +
                   `🔗 https://xiroto-m.github.io/rOOM8\n` +
                   `#rOOM8`;
                   
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        trackAction('copy_event_info', { eventId: event.id, title: event.title });
        setTimeout(() => setCopied(false), 2000);
      });
    };

    const height = compact ? "h-11" : "h-12";
    const buttonBase = `flex items-center justify-center gap-2 px-4 rounded-xl border-2 border-artistic-text font-black transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 ${height} min-w-[120px] group/btn bg-white text-artistic-text hover:bg-artistic-blue/10`;

    return (
      <button onClick={handleCopy} className={buttonBase} title="イベント情報をコピー">
        {copied ? (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-artistic-primary">
            <Check size={compact ? 16 : 18} strokeWidth={3} />
            <span className={compact ? "text-[10px]" : "text-sm tracking-tighter"}>COPIED!</span>
          </motion.div>
        ) : (
          <>
            <Copy size={compact ? 16 : 18} strokeWidth={3} className="transition-colors" />
            <span className={compact ? "text-[10px]" : "text-sm tracking-tighter"}>COPY INFO</span>
          </>
        )}
      </button>
    );
  };

  const FeedbackForm = () => {
    const [rating, setRating] = useState<number>(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (rating === 0) return;
      
      setIsSubmitting(true);
      try {
        const feedbackId = `fb_${Date.now()}_${deviceId || 'anon'}`;
        const isAdmin = localStorage.getItem('room8_is_admin') === 'true' || auth.currentUser;
        
        await setDoc(doc(db, 'feedback', feedbackId), {
          rating,
          comment,
          deviceId: deviceId || 'anon',
          ip: userIP,
          timestamp: serverTimestamp(),
          userAgent: navigator.userAgent,
          testData: isAdmin ? true : false
        });
        setSubmitted(true);
        trackAction('submit_feedback', { rating });
      } catch (err) {
        console.error("Feedback submission error:", err);
      } finally {
        setIsSubmitting(false);
      }
    };

    if (submitted) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="bg-artistic-accent border-4 border-artistic-text p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] text-center shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]"
        >
          <div className="text-6xl mb-6 text-artistic-primary">🙌</div>
          <h3 className="text-2xl md:text-3xl font-black mb-4 italic">フィードバックありがとうございます！</h3>
          <p className="font-bold opacity-70 text-lg">今後の運営の参考にさせていただきます。</p>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-artistic-accent border-4 border-artistic-text p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] md:shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2rem] flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text rotate-[4deg]">
            <Share2 size={60} className="text-artistic-primary" strokeWidth={2.5} />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h3 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-none italic">
              運営へのメッセージ 📣
            </h3>
            <p className="text-lg md:text-xl font-bold leading-relaxed mb-10 text-artistic-text/90">
              rOOM8をもっと良くするために、あなたの声を聞かせてください。<br className="hidden md:block" />
              匿名で送信できます。お気軽にどうぞ！✨
            </p>

            <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto md:mx-0">
              <div className="flex flex-col gap-4">
                 <span className="text-xs font-black uppercase tracking-widest opacity-40">どのくらい満足していますか？</span>
                 <div className="flex justify-center md:justify-start gap-3">
                   {[1, 2, 3, 4, 5].map((star) => (
                     <button
                       key={star}
                       type="button"
                       onClick={() => setRating(star)}
                       className={`p-3 md:p-4 rounded-2xl border-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${rating >= star ? 'bg-artistic-pink text-white border-artistic-text shadow-artistic-text/20' : 'bg-white text-stone-200 border-artistic-text/20 hover:border-artistic-pink/30'}`}
                     >
                       <Heart size={32} fill={rating >= star ? "currentColor" : "none"} strokeWidth={3} />
                     </button>
                   ))}
                 </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <span className="text-xs font-black uppercase tracking-widest opacity-40">詳しいお話を聞かせてください（自由記述）</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="開催してほしいイベントや、サイトの使い勝手、改善してほしい点など..."
                  className="w-full h-40 p-6 bg-white border-4 border-artistic-text rounded-[2rem] font-bold text-lg focus:outline-none focus:ring-8 focus:ring-artistic-primary/10 transition-all resize-none shadow-inner"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className={`w-full sm:w-auto px-12 py-5 rounded-[1.5rem] font-black text-xl transition-all shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] border-2 border-artistic-text ${rating === 0 || isSubmitting ? 'bg-stone-100 text-stone-400 border-stone-200' : 'bg-artistic-primary text-white hover:bg-artistic-primary/90'}`}
                >
                  {isSubmitting ? '送信中...' : 'フィードバックを送信する'}
                </button>
                {rating === 0 && (
                  <p className="text-xs font-bold opacity-40 italic">※まずは満足度を選択してください</p>
                )}
              </div>
            </form>
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -bottom-10 -right-10 opacity-10 rotate-[-15deg] pointer-events-none">
          <Share2 size={300} />
        </div>
      </motion.div>
    );
  };

  const getMapEmbedUrl = (event: EventItem) => {
    // 1. googleMapEmbedUrlがデーターベースに設定されている場合は最優先で使用（iframeタグからのsrc抽出にも対応）
    if (event.googleMapEmbedUrl && event.googleMapEmbedUrl.trim() !== '') {
      let url = event.googleMapEmbedUrl.trim();
      if (url.startsWith('<iframe') || url.includes('src=')) {
        const match = url.match(/src=["']([^"']+)["']/);
        if (match && match[1]) {
          url = match[1];
        }
      }
      if (url.startsWith('http') && (url.includes('maps/embed') || url.includes('pb='))) {
        return url;
      }
    }

    const address = event.address || '';
    const location = event.locationName || '';
    let queryText = address || location;
    
    // 2. 代々木、初台、参宮橋、rOOM8等のキーワードを含む場合は、赤いピン（赤マーカー）が確実に立つ本拠地の公式埋め込み地図を返却
    if (
      !queryText ||
      queryText.includes("代々木") ||
      queryText.includes("初台") ||
      queryText.includes("参宮橋") ||
      queryText.includes("rOOM8") ||
      queryText.includes("room8") ||
      queryText.includes("4-34-5") ||
      queryText.includes("４丁目３４−５")
    ) {
      // 代々木台マンション（赤ピン付き）の確実な公式なマップ埋め込みコード
      return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.1347648356193!2d139.6914561!3d35.6737525!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cb7e4e16d41%3A0x67db233eaca5144b!2z5Luj44CF5pyo5Y-w44Oe44Oz44K344On44Oz!5e0!3m2!1sja!2sjp!4v1714900000000!5m2!1sja!2sjp";
    }

    // 3. その他の住所の場合は、ピンマークを確約するためのフォールバック埋め込みパラメータ
    const query = encodeURIComponent(queryText);
    return `https://maps.google.com/maps?q=${query}&z=16&iwloc=near&output=embed`;
  };

  const getMapSearchUrl = (event: EventItem) => {
    const address = event.address || '';
    const location = event.locationName || '';
    const queryText = address || location;

    if (
      !queryText ||
      queryText.includes("代々木台マンション") ||
      queryText.includes("代々木４丁目３４−５") ||
      queryText.includes("代々木4-34-5") ||
      queryText.includes("rOOM8") ||
      queryText.includes("room8")
    ) {
      return "https://maps.app.goo.gl/d9uhX6Uwi2XTULiy9?g_st=ic";
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryText)}`;
  };

  const EventModal = ({ event, onClose }: { event: EventItem, onClose: () => void }) => {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6"
      >
        <div 
          className="absolute inset-0 bg-artistic-text/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          className="bg-white border-4 border-artistic-text rounded-[2.5rem] md:rounded-[3.5rem] shadow-[24px_24px_0px_0px_rgba(42,42,42,1)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative z-50"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b-2 border-artistic-text flex justify-between items-center bg-artistic-accent">
            <div className="flex items-center gap-4">
              <Calendar className="text-artistic-primary" size={32} />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 leading-none mb-1">Event Detail</span>
                <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">
                  {(() => {
                    const { year, monthDay, dayOfWeek } = formatEventDate(event.date);
                    return `${year}.${monthDay} ${dayOfWeek ? (dayOfWeek.includes('(') ? dayOfWeek : `(${dayOfWeek})`) : ''}`;
                  })()}
                </h2>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white border-2 border-artistic-text rounded-2xl hover:scale-110 transition-transform shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
            {event.imageUrl && (
              <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-4 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] mb-8">
                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 block mb-2">Event Title</span>
                  <h3 className="text-2xl md:text-4xl font-black leading-tight tracking-tight text-artistic-primary">
                    {event.title || event.locationName}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 border-2 border-artistic-text p-5 rounded-2xl flex flex-col gap-1 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                    <span className="text-[10px] font-black uppercase opacity-40 tracking-wider">Time</span>
                    <div className="flex items-center gap-2">
                       <Music size={16} className="text-artistic-primary" strokeWidth={3} />
                       <p className="font-black italic text-lg leading-none">{event.time}{event.endTime ? ` 〜 ${event.endTime}` : (event.time.includes('〜') || event.time.includes('~') ? '' : ' 〜')}</p>
                    </div>
                  </div>
                  <div className="bg-stone-50 border-2 border-artistic-text p-5 rounded-2xl flex flex-col gap-1 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                    <span className="text-[10px] font-black uppercase opacity-40 tracking-wider">ENTRY FEE</span>
                    <p className="font-black italic text-lg leading-snug truncate">💰 {event.fee.split(' ')[0]}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 block mb-3">Location</span>
                  <div className="bg-artistic-blue/10 border-2 border-artistic-text p-6 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <MapPin className="text-artistic-pink" size={20} />
                      <p className="font-black text-lg">{event.locationName}</p>
                    </div>
                    <p className="text-sm font-bold opacity-80 pl-8">{event.address}</p>
                    <p className="text-xs font-bold opacity-60 pl-8 italic">{event.access}</p>
                  </div>
                </div>

                {event.description && (
                  <div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 block mb-3">Description</span>
                    <div className="bg-stone-50 border-2 border-artistic-text p-6 rounded-2xl whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed italic">
                      {event.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 block">Map</span>
                <div className="aspect-square bg-stone-100 border-2 border-artistic-text rounded-[2rem] overflow-hidden shadow-inner relative">
                  {event.address || event.locationName || event.googleMapEmbedUrl ? (
                    <iframe 
                      src={getMapEmbedUrl(event)}
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      allowFullScreen={true} 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-stone-400 font-black">地図なし</div>
                  )}
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-[0.3em] opacity-40 block">Calendar</span>
                  <AddToCalendar event={event} />
                </div>

                <div className="flex flex-wrap gap-4">
                  <LikeButton eventId={event.id!} count={event.likesCount} />
                  <CopyEventInfo event={event} />
                </div>

                {event.youtubeUrl && (
                  <a 
                    href={event.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#FF0000] text-white p-5 rounded-2xl font-black text-center flex items-center justify-center gap-3 border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:scale-[1.02] transition-transform"
                  >
                    <Youtube size={24} /> 動画を見る
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-stone-50 border-t-2 border-artistic-text text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
            rOOM8 Yoyogi Community Gallery
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const effectiveEvents = useMemo(() => 
    events.length > 0 ? events : (loading ? [] : FALLBACK_EVENTS),
    [events, loading]
  );
  
  const activeEvents = useMemo(() => 
    effectiveEvents.filter(ev => !isPastEvent(ev.date) && ev.isPublished !== false),
    [effectiveEvents]
  );
  
  const upcomingEvents = useMemo(() => 
    activeEvents.slice(1),
    [activeEvents]
  );
  
  const archivedEvents = useMemo(() => 
    effectiveEvents.filter(ev => isPastEvent(ev.date)).sort((a, b) => b.date.localeCompare(a.date)),
    [effectiveEvents]
  );
  
  const heroEvent = useMemo(() => activeEvents[0] || null, [activeEvents]);

  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  // Transition from progress to content with safety timeout
  useEffect(() => {
    if (loadingProgress === 100) {
      const timer = setTimeout(() => setShowLoadingScreen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress]);

  // Handle direct scroll to a section or specific lost item once loading screen is removed
  useEffect(() => {
    if (!showLoadingScreen) {
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

      const lostItemId = getParam('item') || getParam('lost-item');
      const hash = window.location.hash;
      const isLostItemsHash = hash.includes('lost-items');

      let targetId = null;
      if (lostItemId) {
        targetId = `lost-item-${lostItemId}`;
      } else if (isLostItemsHash) {
        targetId = 'lost-items';
      } else if (hash && hash !== '#/' && hash !== '#') {
        targetId = hash.replace(/^#\/?/, '').split('?')[0];
      }

      if (targetId) {
        let attempts = 0;
        const maxAttempts = 40; // Poll for up to 6 seconds (150ms * 40) for database documents to settle in DOM
        
        const pollInterval = setInterval(() => {
          attempts++;
          const element = document.getElementById(targetId);
          
          if (element) {
            clearInterval(pollInterval);
            
            // Give 100ms for dynamic styles and other elements to paint so offsetHeight stabilizes
            setTimeout(() => {
              const headerOffset = 100;
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              
              window.scrollTo({ top: offsetPosition, behavior: "smooth" });
              
              // Force resize dispatch so any lazy components, images, or layout observers refresh dynamically
              window.dispatchEvent(new Event('resize'));
            }, 100);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            
            // Fallback to gallery main container if specific ID wasn't rendered under current filters/limits
            const galleryElement = document.getElementById('lost-items');
            if (galleryElement) {
              const headerOffset = 100;
              const elementPosition = galleryElement.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({ top: offsetPosition, behavior: "smooth" });
              window.dispatchEvent(new Event('resize'));
            }
          }
        }, 150);
        
        return () => clearInterval(pollInterval);
      }
    }
  }, [showLoadingScreen]);

  // Safety timeout: if loading takes too long, force it to finish
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        if (loading) {
          console.warn("Loading reached safety timeout - forcing load state to false");
          setLoading(false);
          setLoadingMessage("時間を要しているため、仮データで表示します。");
        }
      }, 8000); // 8 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <div className="relative min-h-screen bg-artistic-bg text-artistic-text font-sans">
      {/* Dynamic Animated Loading Screen Overlay */}
      <AnimatePresence>
        {showLoadingScreen && (
          <motion.div 
            key="room8-loading-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-artistic-bg flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            {/* Animated Background Grids */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-full max-w-lg px-4"
            >
              <div className="bg-white border-4 border-artistic-text p-8 md:p-12 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(42,42,42,1)] md:shadow-[24px_24px_0px_0px_rgba(42,42,42,1)] relative overflow-hidden">
                <div className="w-full flex justify-center mb-8 h-24 md:h-32 lg:h-40 relative">
                  <img
                    src="https://lh3.googleusercontent.com/d/13uUJp8IusBZmEpYpJlamALpv6vFwJ2lh"
                    alt="rOOM8 Logo"
                    className="h-full w-auto object-contain transition-opacity duration-700 opacity-0"
                    onLoad={(e) => {
                      e.currentTarget.classList.remove('opacity-0');
                      const fallback = document.getElementById('loading-logo-fallback');
                      if (fallback) fallback.classList.add('hidden');
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.getElementById('loading-logo-fallback');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <h1 id="loading-logo-fallback" className="text-6xl font-black tracking-[-0.06em] leading-none flex items-center justify-center absolute inset-0">
                    rOOM<span className="text-artistic-primary underline decoration-artistic-accent decoration-8 underline-offset-[8px]">8</span>
                  </h1>
                </div>
                
                <div className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-4 block text-center">System Initializing...</div>
                
                <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-center mb-8">
                  {Math.floor(loadingProgress)}<span className="text-artistic-primary">%</span>
                </h1>
                
                <div className="h-10 w-full bg-stone-100 border-2 border-artistic-text rounded-2xl overflow-hidden mb-6 relative">
                  <motion.div 
                    className="h-full bg-artistic-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-full h-full flex items-center justify-center opacity-10 font-black text-[8px] overflow-hidden whitespace-nowrap">
                       LOADING rOOM8 LOADING rOOM8 LOADING rOOM8 LOADING rOOM8 LOADING rOOM8
                     </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 justify-center mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="text-artistic-pink"
                  >
                    <SettingsIcon size={20} />
                  </motion.div>
                  <p className="font-black text-sm md:text-base animate-pulse">{loadingMessage}</p>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-center">
                    <p className="text-red-500 font-black text-xs">{error}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-2 text-[10px] font-black underline opacity-50 hover:opacity-100"
                    >
                      再読み込み
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-12 flex justify-center gap-4 opacity-20">
                <Music size={24} />
                <Palette size={24} />
                <Monitor size={24} />
                <Heart size={24} />
              </div>
            </motion.div>
            
            {/* Abstract shapes floating around */}
            <motion.div 
               animate={{ 
                 y: [0, -20, 0], 
                 rotate: [0, 10, -10, 0],
                 scale: [1, 1.1, 1]
               }} 
               transition={{ duration: 5, repeat: Infinity }}
               className="absolute top-20 left-[10%] w-32 h-32 bg-artistic-primary/20 rounded-full blur-3xl" 
            />
            <motion.div 
               animate={{ 
                 y: [0, 20, 0], 
                 rotate: [0, -15, 15, 0],
                 scale: [1, 1.2, 1]
               }} 
               transition={{ duration: 7, repeat: Infinity }}
               className="absolute bottom-20 right-[15%] w-48 h-48 bg-artistic-accent/20 rounded-full blur-3xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core Site (Rendered in background, prevents interaction during loading) */}
      <div className={showLoadingScreen ? "fixed inset-0 overflow-hidden pointer-events-none opacity-0 invisible" : "opacity-100 transition-opacity duration-700 relative overflow-x-hidden"}>
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0 overflow-hidden">
        <motion.div 
          animate={{ rotate: 360, x: [0, 100, 0], y: [0, -50, 0] }} 
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20"
        >
          <Palette size={400} />
        </motion.div>
        <motion.div 
          animate={{ rotate: -360, x: [0, -100, 0], y: [0, 50, 0] }} 
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -right-20"
        >
          <Music size={400} />
        </motion.div>
      </div>

      {/* Top Header Navigation */}
      <header className={`sticky top-0 z-50 transition-all duration-300 border-artistic-text ${
        isScrolled 
          ? 'bg-white/90 backdrop-blur-md border-b shadow-sm' 
          : 'bg-transparent border-b-2'
      }`}>
        {/* Highlight Announcement Strip */}
        <div className="bg-artistic-accent text-artistic-text font-black text-[10px] md:text-xs py-2 px-4 border-b-2 border-artistic-text flex items-center justify-center gap-2">
          <span className="bg-artistic-pink text-white px-2 py-0.5 rounded-[4px] text-[8px] font-black animate-pulse flex items-center gap-1">
            NEW
          </span>
          <span>📸 過去のイベント写真アルバム（Google Drive）が公開されました！</span>
          <a
            href="#past-events"
            onClick={(e) => scrollToSection(e, 'past-events')}
            className="underline decoration-wavy decoration-artistic-primary hover:text-artistic-primary transition-all ml-1 text-artistic-primary"
          >
            今すぐ見る →
          </a>
        </div>

        <nav className={`px-6 md:px-12 max-w-7xl mx-auto flex justify-between items-center w-full transition-all duration-300 ${
          isScrolled ? 'py-2.5' : 'py-4 md:py-6'
        }`}>
          <div className="flex flex-col">
            {!isScrolled && (
              <span className="text-[8px] md:text-[10px] tracking-[0.3em] font-black uppercase opacity-40 mb-2 md:mb-3 ml-1 block animate-fade-in">Yoyogi Community Gallery</span>
            )}
            <div className={`transition-all flex items-center group ${
              isScrolled ? 'h-10 md:h-12' : 'h-16 md:h-24 lg:h-30'
            }`}>
              <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="h-full block">
                <LogoElement isScrolled={isScrolled} />
              </a>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile, shown on md and larger */}
          <div className="hidden md:flex flex-col md:items-end gap-1.5">
            {!isScrolled && (
              <div className="text-right hidden lg:block">
                <p className="text-sm md:text-base font-black leading-tight tracking-tight">
                  「好き」を持ち寄って<span className="bg-artistic-accent px-1">飾る！語る！繋がる！</span>
                </p>
              </div>
            )}
            <div className="flex items-center gap-4">
              <a 
                href="#about" 
                onClick={(e) => scrollToSection(e, 'about')}
                className="text-[10px] font-black uppercase tracking-widest hover:text-artistic-primary transition-colors cursor-pointer"
              >
                About
              </a>
              <a 
                href="#party-connect" 
                onClick={(e) => scrollToSection(e, 'party-connect')}
                className="text-[10px] font-black uppercase tracking-widest hover:text-artistic-primary transition-colors cursor-pointer"
              >
                作家紹介
              </a>

              <a 
                href="#lost-items" 
                onClick={(e) => scrollToSection(e, 'lost-items')}
                className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:text-artistic-primary transition-colors cursor-pointer flex items-center gap-1"
              >
                <Award size={12} /> 忘れ物
              </a>

              <a 
                href="#past-events" 
                onClick={(e) => scrollToSection(e, 'past-events')}
                className="text-[10px] font-black uppercase tracking-widest text-artistic-primary hover:text-artistic-pink transition-colors cursor-pointer flex items-center gap-1"
              >
                <ImageIcon size={12} /> イベント写真
              </a>

              <a 
                href="#products" 
                onClick={(e) => scrollToSection(e, 'products')}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-artistic-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Smartphone size={12} /> TapTack
              </a>

              <Link
                to="/shop"
                onClick={() => trackAction('click_header_shop')}
                className="text-[10px] font-black uppercase tracking-widest text-artistic-pink hover:text-artistic-primary transition-colors flex items-center gap-1"
              >
                <ShoppingBag size={12} /> ストア
              </Link>
              <div className="flex flex-col items-end">
                <a 
                  href="#youtube-registration"
                  onClick={(e) => {
                    scrollToSection(e, 'youtube-registration');
                    trackAction('click_header_youtube');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#FF0000] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]"
                >
                  <Youtube size={12} /> YouTube
                </a>
              </div>
              <Link to="/admin" className="text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 border border-artistic-text/10 rounded-md">
                <SettingsIcon size={10} /> Admin
              </Link>
            </div>
          </div>

          {/* Hamburger Icon Trigger for Mobile/Tablet */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 bg-white border-2 border-artistic-text rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center text-artistic-text z-50 relative"
              aria-label="Toggle Menu"
            >
              {/* Pulsing indicator dot highlighting new item in the menu */}
              {!isMobileMenuOpen && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 z-50">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-artistic-pink opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-artistic-pink border border-white" />
                </span>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isMobileMenuOpen ? "close" : "menu"}
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isMobileMenuOpen ? <X size={20} strokeWidth={3} /> : <Menu size={20} strokeWidth={3} />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Slide-Out Drawer overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-artistic-text/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 w-[80%] max-w-xs h-full bg-white border-l-4 border-artistic-text shadow-[-6px_0px_0px_0px_rgba(42,42,42,1)] p-6 pt-24 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-1">Menu Navigation</span>
                
                <div className="flex flex-col gap-2">
                  <a 
                    href="#about" 
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'about');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-artistic-accent hover:text-artistic-text transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Heart size={16} /> About Us</span>
                    <span className="text-[9px] font-medium opacity-50">概要</span>
                  </a>

                  <a 
                    href="#party-connect" 
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'party-connect');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-artistic-accent hover:text-artistic-text transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Users size={16} /> 作家紹介</span>
                    <span className="text-[9px] font-medium opacity-50">Artists</span>
                  </a>

                  <a 
                    href="#lost-items" 
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'lost-items');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-white hover:text-artistic-text text-[#D4AF37] transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Award size={16} /> 忘れ物</span>
                    <span className="text-[9px] font-medium opacity-50">Lost & Found</span>
                  </a>

                  <a 
                    href="#past-events" 
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'past-events');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-white hover:text-artistic-text text-artistic-primary transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><ImageIcon size={16} /> イベント写真</span>
                    <span className="text-[9px] font-medium opacity-50">Gallery</span>
                  </a>

                   <a
                    href="#products"
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'products');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-white text-emerald-600 transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><Smartphone size={16} /> TapTack</span>
                    <span className="text-[9px] font-medium opacity-50">App</span>
                  </a>

                  <Link
                    to="/shop"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      trackAction('click_header_shop');
                    }}
                    className="w-full text-left py-3 px-4 rounded-xl border-2 border-transparent hover:border-artistic-text hover:bg-white text-artistic-pink transition-all font-black text-sm flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2"><ShoppingBag size={16} /> ストア</span>
                    <span className="text-[9px] font-medium opacity-50">Shop</span>
                  </Link>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <a 
                    href="#youtube-registration"
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      scrollToSection(e, 'youtube-registration');
                      trackAction('click_header_youtube_mobile');
                    }}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF0000] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-100 transition-all shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text"
                  >
                    <Youtube size={16} /> YouTube チャンネル登録
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <Link 
                  to="/admin" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[10px] font-black uppercase text-stone-400 hover:text-artistic-text transition-colors flex items-center justify-center gap-1.5 py-2.5 bg-stone-50 hover:bg-stone-100 border rounded-lg w-full"
                >
                  <SettingsIcon size={12} /> 管理者用設定 (Admin)
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <Section id="home" className="relative" innerClassName="grid lg:grid-cols-12 gap-6 pt-8 md:pt-16 pb-16 md:pb-24">
        {loading ? (
          <div className="lg:col-span-12 bg-gray-200 animate-pulse h-[400px] md:h-[600px] rounded-[2rem] md:rounded-[2.5rem] border-2 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]" />
        ) : heroEvent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedEvent(heroEvent)}
            className="lg:col-span-12 bg-artistic-primary text-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col lg:flex-row gap-12 shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] md:shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text relative z-10 cursor-pointer hover:scale-[1.005] transition-transform"
          >
            <div className="lg:w-1/2 flex flex-col justify-between relative">
              <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-80 bg-white/20 px-3 py-1 rounded-full">Next Event</span>
                <div className="flex-1 h-px bg-white/30" />
              </div>
              <div className="mt-4">
                  {(() => {
                    const { year, monthDay, dayOfWeek } = formatEventDate(heroEvent.date);
                    const displayTitle = heroEvent.title || SECTIONS.hero.title;
                    return (
                      <>
                        <h2 className="text-xl md:text-3xl font-black mb-6 leading-tight tracking-tight">
                          {displayTitle}
                        </h2>
                        
                        <div className="flex items-center gap-4 mb-4">
                          <h2 className="text-8xl md:text-9xl font-black leading-none tracking-[-0.08em]">
                            {monthDay || heroEvent.date}
                          </h2>
                          <div className="flex flex-col justify-center gap-1">
                             {year && <span className="text-lg md:text-2xl font-black opacity-60 tracking-wider leading-none">{year}</span>}
                             <span className="text-lg md:text-2xl font-black tracking-tight text-artistic-accent drop-shadow-sm leading-none">
                               {dayOfWeek && dayOfWeek !== '' ? (dayOfWeek.includes('(') ? dayOfWeek : `(${dayOfWeek})`) : ''}
                             </span>
                          </div>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 bg-white text-artistic-text border-2 border-artistic-text px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] mt-4">
                          <Music size={18} className="text-artistic-primary" strokeWidth={3} />
                          <span className="text-xl md:text-2xl font-black tracking-tight leading-none">
                            {heroEvent.time}{heroEvent.endTime ? ` 〜 ${heroEvent.endTime}` : (heroEvent.time.includes('〜') || heroEvent.time.includes('~') ? '' : ' 〜')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="mt-12 md:mt-20 space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Location</p>
                  <p className="text-2xl md:text-3xl font-black leading-[1.1] tracking-tight mb-2 underline decoration-artistic-accent decoration-2 underline-offset-4">{heroEvent.locationName}</p>
                  <p className="text-sm font-bold opacity-90 leading-tight mb-2">{heroEvent.address}</p>
                  <p className="text-xs md:text-sm font-bold opacity-70 leading-relaxed max-w-[90%]">{heroEvent.access}</p>
                </div>
                
                {heroEvent.description && (
                  <div className="bg-black/10 p-5 md:p-6 rounded-2xl border border-white/10 whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed italic relative">
                    <div className="absolute top-0 right-0 p-3 opacity-20">❝</div>
                    {heroEvent.description}
                  </div>
                )}
                
                <div className="bg-white/20 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-white/30 backdrop-blur-md flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">ENTRY FEE</span>
                    <p className="text-xl md:text-2xl font-black italic tracking-tight leading-snug break-words">💰 {heroEvent.fee}</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-8 pt-4">
                    <div className="flex flex-wrap items-center gap-4">
                      {heroEvent.id && <LikeButton eventId={heroEvent.id} count={heroEvent.likesCount} compact />}
                      <AddToCalendar event={heroEvent} compact />
                      <CopyEventInfo event={heroEvent} compact />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      {heroEvent.facebookEventUrl && (
                        <a 
                          href={heroEvent.facebookEventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            trackAction('click_facebook', { eventId: heroEvent.id, title: heroEvent.title });
                          }}
                          className="bg-[#1877F2] text-white px-8 h-11 rounded-xl text-xs md:text-sm font-black border-2 border-artistic-text hover:bg-[#1877F2]/80 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                        >
                          Facebookイベント
                        </a>
                      )}
                      {heroEvent.youtubeUrl && (
                        <a 
                          href={heroEvent.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            trackAction('click_youtube', { eventId: heroEvent.id, title: heroEvent.title });
                          }}
                          className="bg-[#FF0000] text-white px-8 h-11 rounded-xl text-xs md:text-sm font-black border-2 border-artistic-text hover:bg-[#FF0000]/80 transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                        >
                          動画を見る
                        </a>
                      )}
                    </div>
                  </div>
                </div>
            </div>
            </div>
            
                  <div className="lg:w-1/2 flex flex-col gap-6">
                    {heroEvent.imageUrl && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full aspect-video rounded-[3.5rem] overflow-hidden border-4 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]"
                      >
                        <img src={heroEvent.imageUrl} alt={heroEvent.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </motion.div>
                    )}
                    <div className="bg-[#FFFCEB] border-2 border-artistic-text p-8 md:p-14 lg:p-20 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden flex-1 shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-center text-artistic-text group/concept">
                {/* Decorative background text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] lg:text-[20rem] font-black opacity-[0.03] rotate-[-15deg] pointer-events-none select-none whitespace-nowrap">
                  PHILOSOPHY
                </div>

                <div className="absolute -top-4 -right-4 w-24 h-24 bg-artistic-accent border-2 border-artistic-text rounded-full flex items-center justify-center rotate-12 shadow-sm z-10 hidden sm:flex group-hover/concept:rotate-[25deg] transition-transform duration-500">
                  <span className="text-[10px] font-black tracking-tighter text-center leading-none">JOIN<br/>OUR<br/>VIBE</span>
                </div>
                <h3 className="text-2xl md:text-5xl font-black mb-8 md:mb-12 flex items-center gap-4 tracking-tighter">
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-3xl flex items-center justify-center p-3 shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] -rotate-3 hover:rotate-6 transition-transform group-hover/concept:scale-110 duration-500">
                    <img src="https://lh3.googleusercontent.com/d/13uUJp8IusBZmEpYpJlamALpv6vFwJ2lh" alt="rOOM8" className="w-full h-full object-contain" />
                  </div>
                  Concept
                </h3>
                <div className="text-xl md:text-2xl lg:text-3xl leading-relaxed md:leading-[1.5] lg:leading-[1.6] mb-10 md:mb-14 font-bold italic text-artistic-text/90 relative z-10">
                  「クリエイターとファン」という垣根を超えて、<br className="hidden lg:block" />
                  誰もが<span className="font-black not-italic underline decoration-artistic-primary md:decoration-[12px] underline-offset-8 bg-white/50 px-2">50:50の関係</span>で交流できる場所。<br />
                  「事前連絡なし・飛び入り参加・知り合いの同伴OK」😋<br />
                  初めての人でもワクワクできる空間です。
                </div>
                <div className="grid sm:grid-cols-2 gap-6 md:gap-10 pt-10 md:pt-14 border-t-2 border-dashed border-artistic-text/10 relative z-10">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-black text-artistic-primary flex items-center gap-2 text-base md:text-lg">🍱 飲食の持ち寄り</h4>
                    <p className="text-xs md:text-sm font-bold text-artistic-text/70 leading-relaxed">{SECTIONS.potluck.food}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <h4 className="font-black text-artistic-pink flex items-center gap-2 text-base md:text-lg">🎨 作品の持ち寄り</h4>
                    <p className="text-xs md:text-sm font-bold text-artistic-text/70 leading-relaxed">{SECTIONS.potluck.works}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="lg:col-span-12 bg-stone-200 p-12 rounded-[2.5rem] flex items-center justify-center text-center shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text">
            <p className="font-black text-stone-400">イベントデータが<br/>見つかりませんでした</p>
          </div>
        )}
      </Section>

      {/* Upcoming Schedules */}
      {!loading && upcomingEvents.length > 0 && (
        <Section id="event-info" className="py-12 md:py-24">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-black mb-16 flex items-center gap-4 tracking-tighter"
          >
            <Calendar className="text-artistic-pink" size={40} /> その先の開催予定
          </motion.h2>
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10"
          >
            {upcomingEvents.map((ev, i) => (
              <motion.div
                key={ev.id || i}
                variants={{
                  hidden: { opacity: 0, y: 30, rotateZ: i % 2 === 0 ? -1 : 1 },
                  show: { opacity: 1, y: 0, rotateZ: 0 }
                }}
                whileHover={{ 
                  y: -12, 
                  rotateZ: i % 2 === 0 ? 1 : -1,
                  transition: { type: "spring", stiffness: 300 }
                }}
                onClick={() => setSelectedEvent(ev)}
                className="group relative bg-white border-2 border-artistic-text rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] hover:shadow-[12px_12px_0px_0px_rgba(255,107,107,0.3)] transition-all cursor-pointer flex flex-col h-full overflow-hidden"
              >
                {ev.imageUrl && (
                  <div className="w-full h-48 border-b-2 border-artistic-text overflow-hidden">
                    <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-artistic-accent/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-artistic-accent/20 transition-colors" />
                
                <div className="p-6 md:p-8 relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       {(() => {
                         const { year: evYear, monthDay: evMonthDay, dayOfWeek: evDay } = formatEventDate(ev.date);
                         return (
                           <>
                             <div className="flex flex-col">
                               <div className="text-4xl font-black tracking-tighter text-artistic-primary leading-none group-hover:text-artistic-pink transition-colors">
                                 {evMonthDay}
                               </div>
                             </div>
                             <div className="flex flex-col justify-center gap-0.5">
                               {evYear && <span className="text-[11px] font-black opacity-40 leading-none">{evYear}</span>}
                               <div className="text-[11px] font-black text-artistic-accent leading-none">
                                 {evDay ? (evDay.includes('(') ? evDay : `(${evDay})`) : ''}
                               </div>
                             </div>
                           </>
                         );
                       })()}
                    </div>
                    <div className="bg-white border-2 border-artistic-text px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]">
                      <Music size={12} className="text-artistic-primary" strokeWidth={3} /> {ev.time}{ev.endTime ? ` 〜 ${ev.endTime}` : (ev.time.includes('〜') || ev.time.includes('~') ? '' : ' 〜')}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {ev.title && (
                      <h3 className="font-black text-2xl md:text-3xl leading-snug tracking-tight group-hover:underline decoration-artistic-accent decoration-4 underline-offset-4 transition-all">
                        {ev.title}
                      </h3>
                    )}
                    
                    <div className="space-y-3">
                      <p className="font-black text-sm flex items-center gap-2">
                        <MapPin size={14} className="text-artistic-pink" />
                        {ev.locationName}
                      </p>
                      <p className="text-[11px] font-bold opacity-60 leading-relaxed pl-5 italic">
                        {ev.access}
                      </p>
                    </div>

                    {ev.description && (
                      <p className="text-xs font-medium leading-relaxed italic opacity-80 line-clamp-3 p-4 bg-stone-50 rounded-2xl border-l-4 border-artistic-accent">
                        {ev.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-8">
                    <div className="w-full h-px bg-artistic-text/10 border-t border-dashed mb-6" />
                    
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-[0.2em]">ENTRY FEE</span>
                        <p className="text-sm md:text-base font-black italic text-artistic-text leading-snug whitespace-nowrap overflow-hidden text-ellipsis">
                          💰 {ev.fee}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-y-6 gap-x-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <LikeButton eventId={ev.id!} count={ev.likesCount} compact />
                          <AddToCalendar event={ev} compact />
                          <CopyEventInfo event={ev} compact />
                        </div>
                        
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl border-2 border-artistic-text group-hover:bg-artistic-text group-hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] group-hover:shadow-none group-hover:translate-x-[2px] group-hover:translate-y-[2px]">
                          <ExternalLink size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </Section>
      )}

      {loading && (
        <Section className="py-12">
          <div className="h-10 w-48 bg-gray-200 animate-pulse mb-12 rounded-lg" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-[2rem] border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]" />
            ))}
          </div>
        </Section>
      )}
      {/* Consolidated About & Action Section */}
      <Section id="about" className="bg-white border-y-2 border-artistic-text overflow-hidden" innerClassName="py-24 md:py-32">
        <div className="grid lg:grid-cols-12 gap-16 md:gap-24 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-12 flex items-center gap-4 tracking-tighter">
              rOOM<span className="text-artistic-primary underline decoration-artistic-accent">8</span>とは？
            </h2>
            <div className="text-xl md:text-2xl leading-[1.4] text-artistic-text mb-12 font-black tracking-tight">
              {SECTIONS.about.description}
            </div>
            <div className="space-y-4">
              {SECTIONS.about.points.map((point, i) => (
                <div key={i} className="flex font-black items-start gap-4 text-artistic-text bg-artistic-blue/20 p-4 md:p-5 rounded-2xl border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                  <div className="bg-artistic-pink p-2 rounded-lg text-white shrink-0">
                    <Heart size={18} fill="currentColor" />
                  </div>
                  <span className="text-base md:text-lg leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="lg:col-span-1 hidden lg:flex justify-center h-full pt-16">
            <div className="w-0.5 h-full bg-artistic-text/10" />
          </div>

          <div className="lg:col-span-6">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-6 block">What you can do</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SECTIONS.facilities.map((fac, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`p-8 rounded-[2rem] border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex flex-col items-start hover:scale-[1.03] transition-transform cursor-default
                    ${i === 0 ? 'bg-[#FDE2E4]' : ''} 
                    ${i === 1 ? 'bg-[#FFF1E6]' : ''} 
                    ${i === 2 ? 'bg-[#E6F0FF]' : ''} 
                    ${i === 3 ? 'bg-[#f0f9ff]' : ''}`}
                >
                  <div className="mb-4 p-3 bg-white border-2 border-artistic-text rounded-xl shadow-[3px_3px_0px_0px_rgba(42,42,42,1)]">
                    {i === 0 && <ShoppingBag className="text-artistic-pink" size={24} />}
                    {i === 1 && <Music className="text-artistic-primary" size={24} />}
                    {i === 2 && <BookOpen className="text-blue-500" size={24} />}
                    {i === 3 && <Monitor className="text-artistic-green" size={24} />}
                  </div>
                  <h3 className="font-black text-xl mb-3 tracking-tighter leading-none">{fac.title}</h3>
                  <p className="text-artistic-text/80 text-xs md:text-sm font-bold leading-relaxed">{fac.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Details Section */}
      {!loading && heroEvent && (
        <Section id="location" className="bg-stone-100 rounded-[3rem] my-12 border-2 border-artistic-text" innerClassName="p-8 md:p-12">
          <h2 className="text-4xl font-black mb-16 text-center underline decoration-artistic-accent">会場へのアクセス 📍</h2>
          
          <div 
            className="rounded-[2.5rem] overflow-hidden border-2 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] h-[350px] md:h-[500px] mb-8 bg-stone-200 relative group"
            style={{ isolation: 'isolate', transform: 'translate3d(0, 0, 0)' }}
          >
            {(heroEvent.address || heroEvent.locationName || heroEvent.googleMapEmbedUrl) ? (
              <iframe 
                src={getMapEmbedUrl(heroEvent)}
                width="100%" 
                height="100%" 
                title="Google Maps"
                className="w-full h-full relative z-10"
                style={{ border: 0, minHeight: '350px', display: 'block', borderRadius: '2.5rem' }} 
                allowFullScreen={true} 
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-gray-400 p-8 text-center px-12">
                地図データが設定されていません
              </div>
            )}
            
            {/* Mobile Fallback Prompt */}
            <div className="absolute bottom-4 right-4 md:hidden">
              <a 
                href={getMapSearchUrl(heroEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur-sm border-2 border-artistic-text px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-lg"
              >
                地図が開かない場合はこちら
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-16">
             <a 
              href={getMapSearchUrl(heroEvent)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto bg-white border-2 border-artistic-text px-6 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-artistic-accent transition-colors shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]"
            >
              Google Mapsで開く
            </a>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-[#FFF1E6] border-2 border-artistic-text p-10 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]">
              <h3 className="text-xl font-black mb-6 underline decoration-artistic-primary">📍 Access</h3>
              <div className="space-y-4">
                 <div>
                   <p className="text-xs font-black uppercase opacity-50 mb-1">Address</p>
                   <p className="text-lg font-bold">{heroEvent.address}</p>
                   <p className="text-base text-stone-500 font-medium italic">{heroEvent.locationName}</p>
                 </div>
                 <div>
                   <p className="text-xs font-black uppercase opacity-50 mb-1">Station</p>
                   <p className="text-lg font-bold">{heroEvent.access}</p>
                 </div>
              </div>
              <div className="mt-8 pt-6 border-t border-artistic-text/10 relative">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(heroEvent.address);
                    const toast = document.getElementById('copy-toast-address');
                    if (toast) {
                      toast.classList.remove('opacity-0');
                      setTimeout(() => toast.classList.add('opacity-0'), 2000);
                    }
                  }}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-artistic-primary hover:text-artistic-text transition-all cursor-pointer group/copy"
                >
                  <Copy size={14} className="group-hover/copy:scale-110 transition-transform" /> Copy Address
                </button>
                <div id="copy-toast-address" className="absolute top-0 right-0 bg-artistic-text text-white px-4 py-2 rounded-xl text-xs font-black opacity-0 transition-opacity pointer-events-none">
                  Copied!
                </div>
              </div>
            </div>
            <div className="bg-[#D8E2DC] border-2 border-artistic-text p-10 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-center relative group">
              <h3 className="text-xl font-black mb-6 underline decoration-artistic-primary">📧 Contact</h3>
              <p className="text-stone-600 font-bold mb-8">
                ご質問や飛び入り参加の不安など、お気軽にDMまたはメールでお送りください。
              </p>
              <div className="flex flex-col gap-2">
                <a 
                  href={`mailto:${globalSettings.contactEmail || EVENT_INFO.contactEmail}`}
                  className="text-2xl lg:text-3xl font-black text-artistic-primary hover:underline underline-offset-8 transition-all break-all"
                >
                  {globalSettings.contactEmail || EVENT_INFO.contactEmail}
                </a>
                <div className="mt-8 pt-6 border-t border-artistic-text/10 relative">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(globalSettings.contactEmail || EVENT_INFO.contactEmail);
                      const btn = document.getElementById('copy-toast');
                      if (btn) {
                        btn.classList.remove('opacity-0');
                        setTimeout(() => btn.classList.add('opacity-0'), 2000);
                      }
                    }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-artistic-primary hover:text-artistic-text transition-all cursor-pointer group/copy"
                  >
                    <Copy size={14} className="group-hover/copy:scale-110 transition-transform" /> Copy Email
                  </button>
                </div>
              </div>
              <div id="copy-toast" className="absolute top-4 right-4 bg-artistic-text text-white px-4 py-2 rounded-xl text-xs font-black opacity-0 transition-opacity pointer-events-none">
                Copied!
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* YouTube Promotion Section */}
      <Section className="py-12">
        <motion.div
          id="youtube-registration"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-artistic-accent border-4 border-artistic-text p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] md:shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] relative overflow-hidden"
        >
          {/* ... existing content ... */}
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-[#FF0000] rounded-[2rem] flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text rotate-[-6deg]">
              <Youtube size={60} className="text-white" strokeWidth={2.5} />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-none">
                皆様にちょっとお願い 📢
              </h2>
              <p className="text-lg md:text-xl font-bold leading-relaxed mb-8 text-artistic-text/90">
                YouTubeのチャンネル登録をお願いします！<br className="hidden md:block" />
                登録者が<span className="bg-white px-2 py-0.5 rounded-lg text-artistic-primary underline decoration-artistic-text">50人に到達</span>すると、スマホでのライブ配信ができるようになります。<br />
                rOOM8をもっと便利に、もっと楽しく。応援よろしくお願いします！✨
              </p>
              
              <div className="mb-8 overflow-hidden">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-sm font-black uppercase tracking-widest opacity-40">
                    Progress to 50
                  </div>
                  <div className="text-xl font-black text-artistic-primary">
                    あと {Math.max(0, 50 - youtubeSubCount)} 人
                  </div>
                </div>
                <div className="h-4 w-full bg-white/30 border-2 border-artistic-text rounded-full overflow-hidden shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (youtubeSubCount / 50) * 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-white border-r-2 border-artistic-text relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-pulse" />
                  </motion.div>
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-30 text-right">
                  Goal: 50 Subscribers (Current: {youtubeSubCount})
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a 
                  href="https://youtube.com/@tackyosya955?si=QuhqmU78v3Xqtqly"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackAction('click_youtube_promotion')}
                  className="w-full sm:w-auto bg-[#FF0000] text-white px-8 py-4 rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text"
                >
                  YouTubeでチャンネル登録する
                  <ExternalLink size={20} />
                </a>
                <div className="text-sm font-black opacity-40 uppercase tracking-widest hidden sm:block">
                  Goal: 50 Subscribers
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Conversation Catalysts (Creator Referral Card Scan) */}
      <Section id="party-connect" className="py-24 bg-[#FFFDF9] border-y-4 border-artistic-text relative overflow-hidden">
        {/* Abstract background decorative spark */}
        <div className="absolute top-10 right-10 opacity-10 animate-pulse text-artistic-pink">
          <Sparkles size={120} />
        </div>
        
        <div className="max-w-5xl mx-auto z-10 relative">
          <ReferralSection userIP={userIP} deviceId={deviceId} />
        </div>
      </Section>

      {/* Collage Gallery Section */}
      <Section className="py-12" id="gallery">
        <PrivacyGallery />
      </Section>

      {/* Past Events Gallery Section */}
      <Section className="py-12 bg-stone-50 border-t-2 border-artistic-text" id="past-events">
        <PastEventsGallery />
      </Section>

      {/* Lost Items Gallery Section */}
      <LostItemsGallery userIP={userIP} deviceId={deviceId} />

      {/* Feedback Section */}
      <Section id="feedback" className="py-12">
        <FeedbackForm />
      </Section>

      {loading && (
        <Section className="my-12">
          <div className="h-[600px] bg-gray-100 animate-pulse rounded-[3rem] border-2 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]" />
        </Section>
      )}

      {/* Apps from rOOM8 */}
      {EVENT_INFO.apps && EVENT_INFO.apps.length > 0 && (
        <Section id="products" className="py-24">
          <div className="bg-artistic-text text-white p-8 md:p-16 rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(255,107,107,1)] border-2 border-artistic-text overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-artistic-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-3xl flex items-center justify-center p-3 shadow-[8px_8px_0px_0px_rgba(255,107,107,1)] rotate-3 hover:-rotate-6 transition-transform group-hover:scale-110 duration-500">
                    <img src="https://lh3.googleusercontent.com/d/13uUJp8IusBZmEpYpJlamALpv6vFwJ2lh" alt="rOOM8" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] md:text-sm font-black tracking-[0.4em] text-artistic-accent">JOINT DEVELOPMENT APP</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-[-0.04em]">
                  TapTack
                </h2>
                
                <div className="space-y-8 mt-12">
                  {EVENT_INFO.apps.map((app, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-[2rem] hover:bg-white/15 transition-colors group"
                    >
                      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[2rem] shrink-0 shadow-[4px_4px_0px_0px_rgba(255,107,107,1)] flex items-center justify-center p-0 overflow-hidden">
                           {app.icon ? (
                             <img 
                               src={app.icon} 
                               alt={app.name} 
                               className="w-full h-full object-cover"
                               referrerPolicy="no-referrer"
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.style.display = 'none';
                                 target.parentElement?.insertAdjacentHTML('beforeend', '<div class="fallback-icon flex items-center justify-center w-full h-full bg-artistic-accent"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-bag text-artistic-text"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>');
                               }}
                             />
                           ) : (
                             <ShoppingBag size={48} className="text-artistic-text" strokeWidth={3} />
                           )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-black mb-3">{app.name}</h3>
                          <p className="text-white/70 font-medium text-lg leading-relaxed mb-6">
                            {app.description}
                          </p>
                          <a 
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackAction('click_app_store', { name: app.name })}
                            className="inline-flex items-center gap-2 bg-white text-artistic-text px-6 py-3 rounded-2xl font-black hover:bg-artistic-accent hover:scale-105 transition-all"
                          >
                            App Storeで見る <ExternalLink size={18} />
                          </a>
                        </div>
                        
                        {/* QR Code Container */}
                        <div className="bg-white p-4 rounded-3xl shadow-xl flex flex-col items-center gap-3 shrink-0 group-hover:scale-105 transition-transform">
                          <QRCodeSVG 
                            value={app.url}
                            size={100}
                            level="H"
                            includeMargin={false}
                          />
                          <span className="text-[10px] text-artistic-text font-black uppercase tracking-widest opacity-40">Scan to Download</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="lg:col-span-5 mt-8 lg:mt-0 flex justify-center">
                 <div className="relative w-full max-w-[280px] sm:max-w-[320px] lg:max-w-none">
                   <div className="absolute inset-0 bg-gradient-to-tr from-artistic-primary to-artistic-accent opacity-20 blur-[60px]" />
                   <div className="bg-stone-900 border-8 border-stone-800 rounded-[3.5rem] p-3 shadow-2xl relative">
                     <div className="aspect-[9/19.5] bg-stone-950 rounded-[2.8rem] overflow-hidden relative border-2 border-stone-800">
                        {/* Dynamic Screenshot Gallery */}
                        <div className="absolute inset-0 overflow-y-auto no-scrollbar snap-y snap-mandatory bg-black">
                           {EVENT_INFO.apps[0].screenshots?.map((screenshot, idx) => (
                             <div key={idx} className="w-full h-full snap-start shrink-0">
                               <img 
                                 src={screenshot} 
                                 alt={`Screenshot ${idx + 1}`}
                                 className="w-full h-full object-cover"
                                 referrerPolicy="no-referrer"
                               />
                             </div>
                           ))}
                           {!EVENT_INFO.apps[0].screenshots && (
                              <div className="absolute inset-0 bg-artistic-bg flex items-center justify-center p-12 overflow-hidden">
                                 <div className="w-full h-full border-4 border-artistic-text rounded-[2rem] flex flex-col p-6 items-start gap-4">
                                    <div className="w-12 h-12 bg-artistic-primary rounded-xl" />
                                    <div className="w-full h-2 bg-artistic-text/10 rounded-full" />
                                    <div className="w-3/4 h-2 bg-artistic-text/10 rounded-full" />
                                    <div className="w-full h-32 bg-artistic-blue rounded-2xl mt-4" />
                                    <div className="mt-auto w-full h-12 bg-artistic-pink rounded-xl" />
                                 </div>
                              </div>
                           )}
                        </div>
                        {/* Dynamic Overlay Elements */}
                        <div className="absolute top-0 w-full h-10 flex justify-center py-3 bg-gradient-to-b from-black/20 to-transparent">
                          <div className="w-28 h-6 bg-stone-950 rounded-full border border-white/5" />
                        </div>
                        
                        {/* Scroll hint indicator */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                          {EVENT_INFO.apps[0].screenshots?.slice(0, 5).map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-artistic-accent' : 'bg-white/20'}`} />
                          ))}
                        </div>
                     </div>
                   </div>
                   
                   {/* Decorative floating labels */}
                   <motion.div 
                     animate={{ y: [0, -10, 0] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -top-6 -right-6 bg-artistic-accent text-artistic-text px-4 py-2 rounded-xl font-black text-xs shadow-xl rotate-12 border-2 border-artistic-text"
                   >
                     NOW ON STORE!
                   </motion.div>
                 </div>
              </div>
            </div>
          </div>
        </Section>
      )}


      {/* Footer */}
      <footer id="contact" className="bg-artistic-text text-white py-12 border-t-4 border-artistic-primary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="h-16 md:h-24 mb-3 flex items-center justify-center md:justify-start">
              <img
                src="https://lh3.googleusercontent.com/d/13uUJp8IusBZmEpYpJlamALpv6vFwJ2lh"
                alt="rOOM8 Logo"
                className="h-full w-auto object-contain brightness-0 invert opacity-90 hover:scale-110 hover:-rotate-3 transition-all duration-300"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.getElementById('footer-logo-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <h2 id="footer-logo-fallback" className="text-3xl font-black tracking-tighter hidden">
                rOOM<span className="text-artistic-primary">8</span>
              </h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Open your passion / Yoyogi Gallery</p>
          </div>
          
          <div className="flex gap-8 text-sm font-black uppercase tracking-[0.1em]">
            <a 
              href={globalSettings.instagram || EVENT_INFO.instagram} 
              target="_blank"
              onClick={() => trackAction('click_footer_instagram')}
              className="hover:text-artistic-accent"
            >
              Instagram
            </a>
            <a 
              href={globalSettings.youtube || EVENT_INFO.youtube} 
              target="_blank"
              onClick={() => trackAction('click_footer_youtube')}
              className="hover:text-artistic-accent"
            >
              YouTube
            </a>
            <a 
              href={`mailto:${globalSettings.contactEmail || EVENT_INFO.contactEmail}`} 
              onClick={() => trackAction('click_footer_contact')}
              className="hover:text-artistic-accent"
            >
              Contact
            </a>
          </div>

          <div className="text-[10px] font-bold opacity-30 text-center md:text-right">
            &copy; {new Date().getFullYear()} rOOM8 YOYOGI. <br className="md:hidden" /> ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

      {/* Modal Overlay */}
      {selectedEvent && (
        <EventModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
        />
      )}

      {/* Quick Access Section Navigation Guide */}
      <QuickNavMenu onTrackAction={trackAction} />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainSite />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<MainSite />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
