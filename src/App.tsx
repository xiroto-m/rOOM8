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
import { EVENT_INFO, SECTIONS } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import { db, EventItem, auth } from "./lib/firebase";
import { formatEventDate } from "./lib/dateUtils";
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
  getDoc
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

const Section = ({ children, className = "", id = "" }: { children: ReactNode, className?: string, id?: string }) => (
  <section id={id} className={`py-16 px-6 md:px-12 max-w-7xl mx-auto ${className}`}>
    {children}
  </section>
);

const Card = ({ children, className = "" }: { children: ReactNode, className?: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`bg-white p-8 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text ${className}`}
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
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [globalSettings, setGlobalSettings] = useState({
    instagram: EVENT_INFO.instagram,
    facebook: EVENT_INFO.facebook,
    contactEmail: EVENT_INFO.contactEmail
  });

  useEffect(() => {
    // Fetch IP address
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIP(data.ip))
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
          setGlobalSettings(snapshot.data() as any);
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
    if (!userIP || !eventId || likedEvents.has(eventId)) return;

    const pathForLike = `events/${eventId}/likes/${userIP}`;
    const pathForEvent = `events/${eventId}`;

    try {
      const likeDocRef = doc(db, 'events', eventId, 'likes', userIP);
      const eventDocRef = doc(db, 'events', eventId);

      // Check if already liked in Firestore to be sure
      let likeSnap;
      try {
        likeSnap = await getDoc(likeDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, pathForLike);
        return;
      }

      if (likeSnap.exists()) {
        const newLiked = new Set(likedEvents);
        newLiked.add(eventId);
        setLikedEvents(newLiked);
        localStorage.setItem('rOOM8_liked_events', JSON.stringify(Array.from(newLiked)));
        return;
      }

      const batch = writeBatch(db);
      batch.set(likeDocRef, {
        ip: userIP,
        eventId: eventId,
        createdAt: serverTimestamp()
      });
      batch.update(eventDocRef, {
        likesCount: increment(1)
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `batch:${pathForLike}+${pathForEvent}`);
      }

      const newLiked = new Set(likedEvents);
      newLiked.add(eventId);
      setLikedEvents(newLiked);
      localStorage.setItem('rOOM8_liked_events', JSON.stringify(Array.from(newLiked)));
    } catch (err) {
      console.error("Failed to like event:", err);
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
        disabled={isLiked || !userIP}
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-artistic-text transition-all font-black group
          ${isLiked 
            ? 'bg-artistic-pink text-white border-artistic-pink' 
            : 'bg-white text-artistic-text hover:bg-artistic-pink/10'
          } ${compact ? 'text-xs px-3 py-1.5' : 'text-sm'}
        `}
      >
        <Heart 
          size={compact ? 14 : 18} 
          fill={isLiked ? "currentColor" : "none"} 
          className={isLiked ? "" : "group-hover:scale-110 transition-transform"}
        />
        <span>{count || 0}</span>
        {isLiked && <span className="ml-1 opacity-80 text-[10px]">Liked!</span>}
      </button>
    );
  };

  const heroEvent = events[0] || (loading ? null : {
    date: EVENT_INFO.nextDate,
    time: EVENT_INFO.nextTime,
    locationName: EVENT_INFO.locationName,
    address: EVENT_INFO.address,
    access: EVENT_INFO.access,
    fee: EVENT_INFO.fee,
    googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl
  });

  const upcomingEvents = events.slice(1);

  return (
    <div className="min-h-screen bg-artistic-bg text-artistic-text font-sans selection:bg-artistic-accent/40">
      {/* Top Header Navigation */}
      <nav className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-artistic-text max-w-7xl mx-auto w-full">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.3em] font-black uppercase opacity-40 mb-3 ml-1">Shibuya / Yoyogi Community Gallery</span>
          <h1 className="text-6xl md:text-7xl font-black tracking-[-0.06em] leading-none">
            rOOM<span className="text-artistic-primary underline decoration-artistic-accent decoration-8 underline-offset-[12px]">8</span>
          </h1>
        </div>
        <div className="flex flex-col md:items-end gap-3 mt-8 md:mt-0">
          <div className="text-left md:text-right">
            <p className="text-xl md:text-2xl font-black leading-tight tracking-tight">
              みんなの「好き」を持ち寄って<br />
              <span className="bg-artistic-accent px-2 py-0.5 inline-block mt-1">飾る！語る！繋がる！</span>
            </p>
          </div>
          <Link to="/admin" className="text-[10px] font-black uppercase opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 border border-artistic-text/10 rounded-md">
            <SettingsIcon size={10} /> Admin Control
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <Section className="grid lg:grid-cols-12 gap-6 pt-8 md:pt-16 pb-16 md:pb-24">
        {loading ? (
          <div className="lg:col-span-4 bg-gray-200 animate-pulse h-[400px] md:h-[600px] rounded-[2rem] md:rounded-[2.5rem] border-2 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]" />
        ) : heroEvent ? (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-artistic-primary text-white p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[16px_16px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text"
          >
            <div>
              <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] opacity-70">Next Event / 開催予定</span>
              <div className="mt-6 md:mt-10">
                {(() => {
                  const { year, monthDay, dayOfWeek } = formatEventDate(heroEvent.date);
                  return (
                    <>
                      {heroEvent.title && (
                        <span className="bg-white text-artistic-primary text-sm md:text-base px-3 py-1 rounded-xl font-black mb-4 inline-block shadow-sm">
                          {heroEvent.title}
                        </span>
                      )}
                      {year && (
                        <span className="text-xl md:text-2xl font-black block mb-1 opacity-70 tracking-tighter">
                          {year}
                        </span>
                      )}
                      <h2 className="text-7xl md:text-8xl lg:text-9xl font-black leading-[0.75] tracking-[-0.08em]">
                        {monthDay}
                      </h2>
                      <span className="text-2xl md:text-3xl lg:text-4xl font-black block mt-6 md:mt-8 tracking-tighter decoration-artistic-accent underline underline-offset-8">
                        {dayOfWeek && dayOfWeek !== '' ? `${dayOfWeek} ` : ''}{heroEvent.time}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="mt-12 md:mt-20 space-y-4 md:space-y-6">
              <p className="text-2xl md:text-4xl font-black leading-[1.1] tracking-tight">{heroEvent.locationName}</p>
              <p className="text-sm md:text-base font-bold opacity-80 leading-relaxed max-w-[90%]">{heroEvent.access}</p>
              
              {heroEvent.description && (
                <div className="bg-white/10 p-5 md:p-6 rounded-2xl border border-white/20 whitespace-pre-wrap text-sm md:text-base font-medium leading-relaxed italic">
                  {heroEvent.description}
                </div>
              )}
              
              <div className="bg-white/20 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-6 mt-8">
                <p className="text-lg md:text-xl font-black italic tracking-tight">💰 {heroEvent.fee}</p>
                <div className="flex gap-3">
                  {heroEvent.id && <LikeButton eventId={heroEvent.id} count={heroEvent.likesCount} />}
                  {heroEvent.facebookEventUrl && (
                    <a 
                      href={heroEvent.facebookEventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1877F2] text-white px-6 py-3 rounded-2xl text-xs md:text-sm font-black border-2 border-white/40 hover:scale-105 transition-transform"
                    >
                      FB EVENT
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="lg:col-span-5 bg-stone-200 p-12 rounded-[2.5rem] flex items-center justify-center text-center">
            <p className="font-black text-stone-400">イベントデータが<br/>見つかりませんでした</p>
          </div>
        )}

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-white border-2 border-artistic-text p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden flex-1 shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
            <h3 className="text-2xl md:text-4xl font-black mb-8 md:mb-12 flex items-center gap-3 tracking-tighter">🏠 Concept</h3>
            <div className="text-lg md:text-2xl leading-relaxed md:leading-[1.4] mb-10 md:mb-16 font-bold text-artistic-text/90">
              既存の枠（フォローやタイムライン）から抜け出し、<br className="hidden md:block" />
              <span className="font-black italic underline decoration-artistic-primary decoration-8 underline-offset-4">50:50の関係</span>で交流する場所。<br />
              「事前連絡なし・飛び入り参加・知り合いの同伴OK」😋<br />
              初めての人でもワクワクできる空間です。
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <span className="bg-artistic-pink text-white text-xs md:text-sm font-black px-5 py-2.5 md:px-6 md:py-3 rounded-2xl border-2 border-artistic-text hover:bg-white hover:text-artistic-pink transition-colors">作品販売手数料 0円</span>
              <span className="bg-artistic-green text-artistic-text text-xs md:text-sm font-black px-5 py-2.5 md:px-6 md:py-3 rounded-2xl border-2 border-artistic-text hover:bg-white transition-colors">楽器演奏歓迎 🎹</span>
            </div>
          </div>
          
          <div className="bg-artistic-blue p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
            <h3 className="text-2xl md:text-4xl font-black mb-8 md:mb-12 flex items-center gap-3 tracking-tighter">🍱 持ち寄りのルール</h3>
            <ul className="text-lg md:text-2xl space-y-8 font-black">
              <li className="flex items-start gap-5">
                <span className="text-artistic-primary text-4xl md:text-5xl font-black leading-none italic">- 01</span>
                <div>
                  <span className="text-blue-700 decoration-artistic-accent underline decoration-4 underline-offset-4">美味しいもアート！</span>
                  <p className="text-xs md:text-sm opacity-60 font-medium mt-3 leading-relaxed">自分の分量を持ち寄って、完食・完飲を目指そう🙏<br/>お惣菜も、得意料理も、全部OK。</p>
                </div>
              </li>
              <li className="flex items-start gap-5">
                <span className="text-artistic-primary text-4xl md:text-5xl font-black leading-none italic">- 02</span>
                <div>
                  <span className="text-blue-700 decoration-artistic-accent underline decoration-4 underline-offset-4">ジャンル完全不問！</span>
                  <p className="text-xs md:text-sm opacity-60 font-medium mt-3 leading-relaxed">テクノロジー、エッセイ、漫画、歌、DIY...<br/>「これ、見てみて！」という好奇心が主役です。</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
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
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-gray-500">💰 {ev.fee}</p>
                    <LikeButton eventId={ev.id!} count={ev.likesCount} compact />
                  </div>
                  {ev.facebookEventUrl && (
                    <a 
                      href={ev.facebookEventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1877F2] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:opacity-90 transition-opacity"
                    >
                      FBイベント
                    </a>
                  )}
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
      <Section id="about" className="bg-white border-y-2 border-artistic-text py-24 md:py-32">
        <div className="grid lg:grid-cols-2 gap-16 md:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black mb-12 flex items-center gap-4 tracking-tighter">
              rOOM<span className="text-artistic-primary underline decoration-artistic-accent">8</span>とは？
            </h2>
            <div className="text-xl md:text-3xl leading-[1.3] text-artistic-text mb-12 font-black tracking-tight">
              {SECTIONS.about.description}
            </div>
            <div className="space-y-6">
              {SECTIONS.about.points.map((point, i) => (
                <div key={i} className="flex font-black items-start gap-4 text-artistic-text bg-artistic-blue/30 p-5 md:p-6 rounded-[2rem] border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:scale-[1.02] transition-transform">
                  <div className="bg-artistic-pink p-3 rounded-xl text-white shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] shrink-0">
                    <Heart size={24} fill="currentColor" />
                  </div>
                  <span className="text-lg md:text-xl leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-8 p-4">
            <div className="space-y-8 pt-16">
              <div className="aspect-square bg-artistic-accent border-2 border-artistic-text rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Users size={80} className="text-artistic-text/20" />
              </div>
              <div className="aspect-video bg-artistic-pink border-2 border-artistic-text rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Palette size={64} className="text-white/20" />
              </div>
            </div>
            <div className="space-y-8">
              <div className="aspect-video bg-artistic-green border-2 border-artistic-text rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Music size={64} className="text-artistic-text/20" />
              </div>
              <div className="aspect-square bg-artistic-blue border-2 border-artistic-text rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <BookOpen size={80} className="text-artistic-text/20" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Details Section */}
      {!loading && heroEvent && (
        <Section id="details" className="bg-stone-100 rounded-[3rem] my-12 border-2 border-artistic-text p-8 md:p-12">
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

      {/* Facilities */}
      <Section className="py-32">
        <h2 className="text-4xl md:text-6xl font-black mb-20 text-left flex flex-col md:flex-row md:items-end gap-3 tracking-tighter">
          WHAT YOU CAN DO <span className="text-lg md:text-xl font-black text-artistic-primary mb-1 md:mb-2 uppercase opacity-40">/ Facilities at rOOM8</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SECTIONS.facilities.map((fac, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-12 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-artistic-text shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex flex-col items-center text-center hover:scale-105 transition-transform cursor-default overflow-hidden
                ${i === 0 ? 'bg-[#FDE2E4]' : ''} 
                ${i === 1 ? 'bg-[#FFF1E6]' : ''} 
                ${i === 2 ? 'bg-[#E6F0FF]' : ''} 
                ${i === 3 ? 'bg-[#f0f9ff]' : ''}`}
            >
              <div className="mb-8 p-6 bg-white border-2 border-artistic-text rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] relative z-10">
                {i === 0 && <ShoppingBag className="text-artistic-pink" size={40} />}
                {i === 1 && <Music className="text-artistic-primary" size={40} />}
                {i === 2 && <BookOpen className="text-blue-500" size={40} />}
                {i === 3 && <Monitor className="text-artistic-green" size={40} />}
              </div>
              <h3 className="font-black text-2xl md:text-3xl mb-6 tracking-tighter leading-none">{fac.title}</h3>
              <p className="text-artistic-text/80 text-sm md:text-base font-bold leading-relaxed">{fac.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Potluck Rules */}
      <Section className="bg-artistic-accent/20 rounded-[3rem] py-24 mb-24 px-12">
        <h2 className="text-4xl font-black mb-16 text-center italic">Everyone is a Creator 🙏</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <Card className="hover:-rotate-1 transition-transform">
            <h3 className="text-3xl font-black mb-6 text-artistic-primary">飲食の持ち寄り 😋</h3>
            <div className="text-lg font-bold leading-relaxed text-artistic-text/80">
              {SECTIONS.potluck.food}
            </div>
          </Card>
          <Card className="hover:rotate-1 transition-transform bg-artistic-pink/5">
            <h3 className="text-3xl font-black mb-6 text-artistic-pink">作品の持ち寄り 🎨</h3>
            <div className="text-lg font-bold leading-relaxed text-artistic-text/80">
              {SECTIONS.potluck.works}
            </div>
          </Card>
        </div>
      </Section>

      {/* Footer */}
      <footer className="bg-artistic-text text-white py-12 border-t-4 border-artistic-primary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tighter mb-2">rOOM<span className="text-artistic-primary">8</span></h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Open your passion / Shibuya Gallery</p>
          </div>
          
          <div className="flex gap-8 text-sm font-black uppercase tracking-[0.1em]">
            <a href={globalSettings.instagram || EVENT_INFO.instagram} className="hover:text-artistic-accent">Instagram</a>
            <a href={globalSettings.facebook || EVENT_INFO.facebook} className="hover:text-artistic-accent">Facebook</a>
            <a href={`mailto:${globalSettings.contactEmail || EVENT_INFO.contactEmail}`} className="hover:text-artistic-accent">Contact</a>
          </div>

          <div className="text-[10px] font-bold opacity-30 text-center md:text-right">
            &copy; {new Date().getFullYear()} rOOM8 SHIBUYA. <br className="md:hidden" /> ALL RIGHTS RESERVED.
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
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}
