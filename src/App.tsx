import React, { ReactNode, useState, useEffect } from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import { motion } from "motion/react";
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
  ExternalLink
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { EVENT_INFO, SECTIONS, FALLBACK_EVENTS } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import { db, EventItem, auth } from "./lib/firebase";
import { formatEventDate, isPastEvent } from "./lib/dateUtils";
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

function MainSite() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIP, setUserIP] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const trackAction = async (actionType: string, metadata: any = {}) => {
    try {
      const today = new Date().toISOString().split('T')[0];
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Generate or retrieve persistent device ID
    let deviceId = localStorage.getItem('rOOM8_device_id');
    if (!deviceId) {
      deviceId = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rOOM8_device_id', deviceId);
    }
    setDeviceId(deviceId);

    // Fetch IP for metadata
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        const ip = data.ip;
        setUserIP(ip);
        
        // Tracking visit by device ID + Date
        const today = new Date().toISOString().split('T')[0];
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const deviceType = isMobile ? 'mobile' : 'desktop';
        const visitId = `${today}_${deviceId}`;
        const visitRef = doc(db, 'analytics_visits', visitId);
        
        // Even if we use localStorage session check, 
        // the visitId (Date_DeviceID) in Firestore guarantees uniqueness server-side
        const visitKey = `visit_${today}`;
        const hasVisitedToday = localStorage.getItem(visitKey);
        
        if (!hasVisitedToday) {
          const batch = writeBatch(db);
          batch.set(visitRef, {
            deviceId: deviceId,
            ip: ip,
            date: today,
            deviceType: deviceType,
            userAgent: navigator.userAgent,
            timestamp: serverTimestamp()
          });
          
          batch.commit().then(() => {
            localStorage.setItem(visitKey, 'true');
          }).catch(err => {
            console.warn("Analytics: Visit already recorded or error", err);
          });
        }
      })
      .catch(err => console.error("Failed to fetch IP:", err));

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
        }
      },
      (err) => {
        console.error("Firestore Settings Error:", err);
      }
    );

    return () => {
      unsubEvents();
      unsubGlobal();
    };
  }, []);

  const handleLike = async (eventId: string) => {
    if (!userIP || !eventId) return;

    const isLiked = likedEvents.has(eventId);
    const pathForLike = `events/${eventId}/likes/${userIP}`;
    const pathForEvent = `events/${eventId}`;

    try {
      const likeDocRef = doc(db, 'events', eventId, 'likes', userIP);
      const eventDocRef = doc(db, 'events', eventId);

      const batch = writeBatch(db);
      
      if (isLiked) {
        batch.delete(likeDocRef);
        batch.update(eventDocRef, {
          likesCount: increment(-1)
        });
      } else {
        batch.set(likeDocRef, {
          ip: userIP,
          eventId: eventId,
          createdAt: serverTimestamp()
        });
        batch.update(eventDocRef, {
          likesCount: increment(1)
        });
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `batch:${pathForLike}+${pathForEvent}`);
        return;
      }

      const newLiked = new Set(likedEvents);
      if (isLiked) {
        newLiked.delete(eventId);
      } else {
        newLiked.add(eventId);
      }
      setLikedEvents(newLiked);
      localStorage.setItem('rOOM8_liked_events', JSON.stringify(Array.from(newLiked)));
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const LikeButton = ({ eventId, count, compact = false }: { eventId: string, count?: number, compact?: boolean }) => {
    const isLiked = likedEvents.has(eventId);
    return (
      <button 
        onClick={(e) => {
          e.preventDefault();
          handleLike(eventId);
        }}
        disabled={!userIP}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-2 transition-all font-black group relative overflow-hidden
          ${isLiked 
            ? 'bg-artistic-pink text-white border-artistic-text' 
            : 'bg-white text-artistic-text border-artistic-text hover:bg-artistic-accent/20'
          } ${compact ? 'text-[10px] px-2.5 py-1.5' : 'text-xs'}
        `}
      >
        <motion.div
          animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <Heart 
            size={compact ? 12 : 16} 
            fill={isLiked ? "currentColor" : "none"} 
            className={isLiked ? "" : "group-hover:scale-110 transition-transform"}
          />
        </motion.div>
        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] min-w-[1.2rem] text-center font-mono ${isLiked ? 'bg-white/20 text-white' : 'bg-black/5 text-artistic-text'}`}>
          {count || 0}
        </span>
      </button>
    );
  };

  const effectiveEvents = events.length > 0 ? events : (loading ? [] : FALLBACK_EVENTS);
  const activeEvents = effectiveEvents.filter(ev => !isPastEvent(ev.date));
  const upcomingEvents = activeEvents.slice(1);
  const archivedEvents = effectiveEvents.filter(ev => isPastEvent(ev.date)).sort((a, b) => b.date.localeCompare(a.date));
  
  const heroEvent = activeEvents[0] || null;

  return (
    <div className="min-h-screen bg-artistic-bg text-artistic-text font-sans relative overflow-x-hidden">
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
          ? 'bg-white/80 backdrop-blur-md py-3 border-b shadow-sm' 
          : 'bg-transparent py-6 md:py-8 border-b-2'
      }`}>
        <nav className="px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center w-full">
          <div className="flex flex-col">
            {!isScrolled && (
              <span className="text-[8px] md:text-[10px] tracking-[0.3em] font-black uppercase opacity-40 mb-2 md:mb-3 ml-1 block">Yoyogi Community Gallery</span>
            )}
            <h1 className={`font-black tracking-[-0.06em] leading-none transition-all ${
              isScrolled ? 'text-2xl md:text-3xl' : 'text-5xl md:text-7xl'
            }`}>
              rOOM<span className="text-artistic-primary underline decoration-artistic-accent decoration-4 md:decoration-8 underline-offset-[4px] md:underline-offset-[12px]">8</span>
            </h1>
          </div>
          <div className="flex flex-col md:items-end gap-1 mt-4 md:mt-0">
            {!isScrolled && (
              <div className="text-left md:text-right hidden sm:block">
                <p className="text-base md:text-lg font-black leading-tight tracking-tight">
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
                href="#location" 
                onClick={(e) => scrollToSection(e, 'location')}
                className="text-[10px] font-black uppercase tracking-widest hover:text-artistic-primary transition-colors cursor-pointer"
              >
                Location
              </a>
              <Link to="/admin" className="text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 border border-artistic-text/10 rounded-md">
                <SettingsIcon size={10} /> Admin
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <Section id="home" className="relative" innerClassName="grid lg:grid-cols-12 gap-6 pt-8 md:pt-16 pb-16 md:pb-24">
        {loading ? (
          <div className="lg:col-span-12 bg-gray-200 animate-pulse h-[400px] md:h-[600px] rounded-[2rem] md:rounded-[2.5rem] border-2 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]" />
        ) : heroEvent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-12 bg-artistic-primary text-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col lg:flex-row gap-12 shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] md:shadow-[20px_20px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text relative z-10"
          >
            <div className="lg:w-1/2 flex flex-col justify-between">
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
                        
                        <div className="flex items-baseline gap-4 mb-4">
                          <h2 className="text-8xl md:text-9xl font-black leading-none tracking-[-0.08em]">
                            {monthDay || heroEvent.date}
                          </h2>
                          <div className="flex flex-col">
                             {year && <span className="text-xl font-black opacity-60 tracking-tighter">{year}</span>}
                             <span className="text-3xl md:text-4xl font-black tracking-tighter text-artistic-accent">
                               {dayOfWeek && dayOfWeek !== '' ? dayOfWeek : ''}
                             </span>
                          </div>
                        </div>
                        
                        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/30 p-4 rounded-2xl mt-4">
                          <Calendar size={20} className="text-artistic-accent" />
                          <span className="text-xl md:text-2xl font-black tracking-tighter">
                            {heroEvent.time}
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
                
                <div className="bg-white/20 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase opacity-60 mb-0.5">参加費</span>
                    <p className="text-lg md:text-xl font-black italic tracking-tight">💰 {heroEvent.fee}</p>
                  </div>
                  <div className="flex gap-3">
                    {heroEvent.id && <LikeButton eventId={heroEvent.id} count={heroEvent.likesCount} />}
                    {heroEvent.facebookEventUrl && (
                      <a 
                        href={heroEvent.facebookEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAction('click_facebook', { eventId: heroEvent.id, title: heroEvent.title })}
                        className="bg-[#1877F2] text-white px-6 py-3 rounded-2xl text-xs md:text-sm font-black border-2 border-white/40 hover:scale-105 transition-transform flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                      >
                        Facebookイベント
                      </a>
                    )}
                    {heroEvent.youtubeUrl && (
                      <a 
                        href={heroEvent.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAction('click_youtube', { eventId: heroEvent.id, title: heroEvent.title })}
                        className="bg-[#FF0000] text-white px-6 py-3 rounded-2xl text-xs md:text-sm font-black border-2 border-white/40 hover:scale-105 transition-transform flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                      >
                        動画を見る
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:w-1/2 flex flex-col gap-6">
              <div className="bg-[#FFFCEB] border-2 border-artistic-text p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden flex-1 shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-center text-artistic-text">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-artistic-accent border-2 border-artistic-text rounded-full flex items-center justify-center rotate-12 shadow-sm z-10 hidden sm:flex">
                  <span className="text-[10px] font-black tracking-tighter text-center leading-none">JOIN<br/>OUR<br/>VIBE</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 flex items-center gap-3 tracking-tighter">🏠 Concept</h3>
                <div className="text-lg md:text-xl leading-relaxed md:leading-[1.4] mb-8 md:mb-10 font-bold italic text-artistic-text/90">
                  既存の枠（フォローやタイムライン）から抜け出し、<br className="hidden md:block" />
                  <span className="font-black not-italic underline decoration-artistic-primary decoration-8 underline-offset-4 bg-white/50 px-1">50:50の関係</span>で交流する場所。<br />
                  「事前連絡なし・飛び入り参加・知り合いの同伴OK」😋<br />
                  初めての人でもワクワクできる空間です。
                </div>
                <div className="grid sm:grid-cols-2 gap-6 md:gap-8 pt-8 border-t-2 border-dashed border-artistic-text/10">
                  <div className="flex flex-col gap-2">
                    <h4 className="font-black text-artistic-primary flex items-center gap-2 text-sm">🍱 飲食の持ち寄り</h4>
                    <p className="text-[11px] md:text-xs font-bold text-artistic-text/70 leading-relaxed">{SECTIONS.potluck.food}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h4 className="font-black text-artistic-pink flex items-center gap-2 text-sm">🎨 作品の持ち寄り</h4>
                    <p className="text-[11px] md:text-xs font-bold text-artistic-text/70 leading-relaxed">{SECTIONS.potluck.works}</p>
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
        <Section className="py-12">
          <h2 className="text-3xl font-black mb-12 flex items-center gap-3">
            <Calendar className="text-artistic-pink" /> その先の開催予定
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((ev, i) => (
              <motion.div
                key={ev.id || i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white border-2 border-artistic-text p-6 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                   <div className="text-2xl font-black italic text-artistic-primary underline decoration-artistic-accent">
                     {ev.date}
                   </div>
                   <div className="text-xs font-black uppercase opacity-40">{ev.time}</div>
                </div>
                {ev.title && (
                  <p className="font-black text-lg mb-2">{ev.title}</p>
                )}
                <p className="font-bold mb-2">{ev.locationName}</p>
                <p className="text-xs opacity-60 font-medium leading-relaxed mb-4">{ev.access}</p>
                {ev.description && (
                  <p className="text-xs mb-4 p-3 bg-stone-100 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {ev.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t-2 border-dashed border-gray-200">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase opacity-60">参加費</span>
                      <p className="text-[11px] font-black text-gray-700 whitespace-nowrap">💰 {ev.fee}</p>
                    </div>
                    <LikeButton eventId={ev.id!} count={ev.likesCount} compact />
                  </div>
                  {ev.youtubeUrl && (
                    <a 
                      href={ev.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#FF0000] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      動画を見る
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}
      
      {/* Archived / Past Events */}
      {!loading && archivedEvents.length > 0 && (
        <Section className="py-12 bg-stone-100/50">
          <h2 className="text-2xl font-black mb-10 flex items-center gap-3 opacity-60">
            <Calendar className="text-gray-400" size={20} /> 過去イベント (アーカイブ)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {archivedEvents.map((ev, i) => (
              <motion.div
                key={ev.id || i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-white/60 border border-artistic-text/20 p-4 rounded-2xl grayscale hover:grayscale-0 transition-all cursor-default"
              >
                <div className="text-[10px] font-black opacity-40 mb-1">{ev.date}</div>
                <p className="font-black text-xs truncate mb-1">{ev.title || ev.locationName}</p>
                <div className="flex items-center gap-1 text-[10px] text-artistic-pink font-bold">
                  <Heart size={10} fill="currentColor" />
                  <span>{ev.likesCount || 0}</span>
                </div>
              </motion.div>
            ))}
          </div>
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
          <h2 className="text-4xl font-black mb-16 text-center underline decoration-artistic-accent">開催概要 🌟</h2>
          
          <div className="rounded-[2.5rem] overflow-hidden border-2 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] h-[400px] md:h-[500px] mb-16">
            <iframe 
              src={heroEvent.googleMapEmbedUrl}
              width="100%" 
              height="100%" 
              title="Google Maps"
              style={{ border: 0 }} 
              allowFullScreen={false} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-[#FFF1E6] border-2 border-artistic-text p-10 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]">
              <h3 className="text-xl font-black mb-6 underline decoration-artistic-primary">📍 Access & Location</h3>
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
              <div className="mt-8 pt-6 border-t border-artistic-text/10">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(heroEvent.locationName + ' ' + (heroEvent.address || ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-artistic-primary font-black hover:underline"
                >
                  Google Mapsで開く <ExternalLink size={14} />
                </a>
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
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(globalSettings.contactEmail || EVENT_INFO.contactEmail);
                    const btn = document.getElementById('copy-toast');
                    if (btn) {
                      btn.classList.remove('opacity-0');
                      setTimeout(() => btn.classList.add('opacity-0'), 2000);
                    }
                  }}
                  className="flex items-center gap-2 text-xs font-black uppercase opacity-40 hover:opacity-100 transition-opacity mt-4 cursor-pointer"
                >
                  <Copy size={14} /> Copy Address
                </button>
              </div>
              <div id="copy-toast" className="absolute top-4 right-4 bg-artistic-text text-white px-4 py-2 rounded-xl text-xs font-black opacity-0 transition-opacity pointer-events-none">
                Copied!
              </div>
            </div>
          </div>
        </Section>
      )}

      {loading && (
        <Section className="my-12">
          <div className="h-[600px] bg-gray-100 animate-pulse rounded-[3rem] border-2 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]" />
        </Section>
      )}

      {/* Apps from rOOM8 */}
      {EVENT_INFO.apps && EVENT_INFO.apps.length > 0 && (
        <Section className="py-24">
          <div className="bg-artistic-text text-white p-8 md:p-16 rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(255,107,107,1)] border-2 border-artistic-text overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-artistic-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="relative z-10 grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.4em] text-artistic-accent mb-4 block">Product from rOOM8</span>
                <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-[-0.04em]">
                  コミュニティから生まれた<br />
                  新しい体験。
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
      <footer className="bg-artistic-text text-white py-12 border-t-4 border-artistic-primary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tighter mb-2">rOOM<span className="text-artistic-primary">8</span></h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Open your passion / Yoyogi Gallery</p>
          </div>
          
          <div className="flex gap-8 text-sm font-black uppercase tracking-[0.1em]">
            <a href={globalSettings.instagram || EVENT_INFO.instagram} className="hover:text-artistic-accent">Instagram</a>
            <a href={globalSettings.youtube || EVENT_INFO.youtube} className="hover:text-artistic-accent">YouTube</a>
            <a href={`mailto:${globalSettings.contactEmail || EVENT_INFO.contactEmail}`} className="hover:text-artistic-accent">Contact</a>
          </div>

          <div className="text-[10px] font-bold opacity-30 text-center md:text-right">
            &copy; {new Date().getFullYear()} rOOM8 YOYOGI. <br className="md:hidden" /> ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
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
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<MainSite />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
