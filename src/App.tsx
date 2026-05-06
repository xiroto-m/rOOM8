import { type ReactNode, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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
  Calendar
} from "lucide-react";
import { EVENT_INFO, SECTIONS } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import { db, EventItem } from "./lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDocFromServer } from "firebase/firestore";

// Test connectionstrictly mandated by instructions
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
// testConnection(); // Removed top-level call to prevent potential startup issues

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

function MainSite() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    instagram: EVENT_INFO.instagram,
    facebook: EVENT_INFO.facebook,
    contactEmail: EVENT_INFO.contactEmail
  });

  useEffect(() => {
    // Listen to events collection
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('updatedAt', 'desc'));
    const unsubEvents = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventItem));
      // In a real app we'd sort by date properly, but for now we'll just show what's there
      setEvents(items);
    });

    // Listen to global settings
    const unsubGlobal = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setGlobalSettings(snapshot.data() as any);
      }
    });

    return () => {
      unsubEvents();
      unsubGlobal();
    };
  }, []);

  const heroEvent = events[0] || {
    date: EVENT_INFO.nextDate,
    time: EVENT_INFO.nextTime,
    locationName: EVENT_INFO.locationName,
    address: EVENT_INFO.address,
    access: EVENT_INFO.access,
    fee: EVENT_INFO.fee,
    googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl
  };

  const upcomingEvents = events.slice(1);

  return (
    <div className="min-h-screen bg-artistic-bg text-artistic-text font-sans selection:bg-artistic-accent/40">
      {/* Top Header Navigation */}
      <nav className="p-6 flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-artistic-text max-w-7xl mx-auto w-full">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.2em] font-black uppercase opacity-60 mb-2">Shibuya / Yoyogi Community Gallery</span>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none">
            rOOM<span className="text-artistic-primary underline decoration-artistic-accent">8</span>
          </h1>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <div className="text-left md:text-right mt-4 md:mt-0">
            <p className="text-lg font-bold leading-tight">
              みんなの「好き」を持ち寄って<br />
              <span className="bg-artistic-accent px-1">飾る！語る！繋がる！</span>
            </p>
          </div>
          <Link to="/admin" className="text-[10px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity flex items-center gap-1">
            <SettingsIcon size={10} /> Admin
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <Section className="grid lg:grid-cols-12 gap-6 pt-6 md:pt-12 pb-16 md:pb-24">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-artistic-primary text-white p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] md:shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]"
        >
          <div>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-80">Next Event / 開催予定</span>
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-black mt-4 md:mt-6 leading-[0.8] tracking-tighter">
              {heroEvent.date.includes('(') ? heroEvent.date.split(' (')[0] : heroEvent.date}<br />
              <span className="text-2xl md:text-3xl lg:text-4xl block mt-2">
                {heroEvent.date.includes('(') ? heroEvent.date.split(' (')[1].replace(')', '') : ''} {heroEvent.time}
              </span>
            </h2>
          </div>
          <div className="mt-8 md:mt-12 space-y-3 md:space-y-4">
            <p className="text-xl md:text-2xl font-black leading-tight">{heroEvent.locationName}</p>
            <p className="text-[12px] md:text-sm font-medium opacity-90">{heroEvent.access}</p>
            <div className="bg-white/20 p-4 rounded-xl md:rounded-2xl border border-white/30 backdrop-blur-sm">
              <p className="text-sm md:text-base font-bold italic">💰 {heroEvent.fee} <br />※19歳以下・お子様無料 🌟</p>
            </div>
          </div>
        </motion.div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white border-2 border-artistic-text p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden flex-1 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] md:shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]">
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 flex items-center gap-2 tracking-tight">🏠 Concept</h3>
            <div className="text-base md:text-lg leading-relaxed mb-6 md:mb-8 font-medium">
              既存の枠（フォローやタイムライン）から抜け出し、<br />
              <span className="font-black italic underline decoration-artistic-primary decoration-4 underline-offset-4">50:50の関係</span>で交流する場所。<br className="hidden md:block" />
              「事前連絡なし・飛び入り参加・知り合いの同伴OK」😋<br />
              初めての人でもワクワクできる空間です。
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              <span className="bg-artistic-pink text-white text-[10px] md:text-xs font-black px-3 py-1.5 md:px-4 md:py-2 rounded-full uppercase">作品販売手数料 0円</span>
              <span className="bg-artistic-green text-artistic-text text-[10px] md:text-xs font-black px-3 py-1.5 md:px-4 md:py-2 rounded-full uppercase">楽器演奏歓迎 🎹</span>
            </div>
          </div>
          
          <div className="bg-artistic-blue p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] md:shadow-[8px_8px_0px_0px_rgba(42,42,42,1)]">
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 flex items-center gap-2">🍱 持ち寄りのルール</h3>
            <ul className="text-base md:text-lg space-y-4 font-bold">
              <li className="flex items-start gap-3">
                <span className="text-artistic-primary text-xl md:text-2xl mt-0.5">01</span>
                <div>
                  <span className="text-blue-600">美味しいもアート！</span>
                  <p className="text-[12px] md:text-sm opacity-70 font-medium">自分の分量を持ち寄って、完食・完飲を目指そう🙏</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-artistic-primary text-xl md:text-2xl mt-0.5">02</span>
                <div>
                  <span className="text-blue-600">ジャンル完全不問！</span>
                  <p className="text-[12px] md:text-sm opacity-70 font-medium">テクノロジー、エッセイ、歌、何でもOK。</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Upcoming Schedules */}
      {upcomingEvents.length > 0 && (
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
                className="bg-white border-2 border-artistic-text p-6 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]"
              >
                <div className="flex justify-between items-start mb-4">
                   <div className="text-2xl font-black italic text-artistic-primary underline decoration-artistic-accent">
                     {ev.date}
                   </div>
                   <div className="text-xs font-black uppercase opacity-40">{ev.time}</div>
                </div>
                <p className="font-bold mb-2">{ev.locationName}</p>
                <p className="text-xs opacity-60 font-medium leading-relaxed">{ev.access}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}
      <Section id="about" className="bg-white border-y-2 border-artistic-text">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-black mb-8 flex items-center gap-3">
              rOOM<span className="text-artistic-primary">8</span>とは？
            </h2>
            <div className="text-xl leading-relaxed text-artistic-text/80 mb-8 font-bold">
              {SECTIONS.about.description}
            </div>
            <div className="space-y-6">
              {SECTIONS.about.points.map((point, i) => (
                <div key={i} className="flex font-black items-start gap-4 text-artistic-text bg-artistic-blue/30 p-4 rounded-2xl border border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                  <div className="bg-artistic-pink p-2 rounded-lg text-white">
                    <Heart size={20} fill="currentColor" />
                  </div>
                  {point}
                </div>
              ))}
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-6 p-4">
            <div className="space-y-6 pt-12">
              <div className="aspect-square bg-artistic-accent border-2 border-artistic-text rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Users size={64} className="text-artistic-text/30" />
              </div>
              <div className="aspect-video bg-artistic-pink border-2 border-artistic-text rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Palette size={48} className="text-white/30" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="aspect-video bg-artistic-green border-2 border-artistic-text rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <Music size={48} className="text-artistic-text/30" />
              </div>
              <div className="aspect-square bg-artistic-blue border-2 border-artistic-text rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex items-center justify-center">
                <BookOpen size={64} className="text-artistic-text/30" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Details Section */}
      <Section id="details" className="bg-stone-100 rounded-[3rem] my-12 border-2 border-artistic-text p-8 md:p-12">
        <h2 className="text-4xl font-black mb-16 text-center underline decoration-artistic-accent">開催概要 🌟</h2>
        
        <div className="rounded-[2.5rem] overflow-hidden border-2 border-artistic-text shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] h-[400px] md:h-[500px] mb-16">
          <iframe 
            src={heroEvent.googleMapEmbedUrl}
            width="100%" 
            height="100%" 
            title="Google Maps"
            style={{ border: 0, filter: 'grayscale(1) contrast(1.2)' }} 
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
          <div className="bg-[#D8E2DC] border-2 border-artistic-text p-10 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-center">
            <h3 className="text-xl font-black mb-6 underline decoration-artistic-primary">📧 Contact</h3>
            <p className="text-stone-600 font-bold mb-8">
              ご質問や飛び入り参加の不安など、お気軽にDMまたはメールでお送りください。
            </p>
            <a 
              href={`mailto:${globalSettings.contactEmail || EVENT_INFO.contactEmail}`}
              className="text-2xl font-black text-artistic-primary hover:underline underline-offset-8 transition-all"
            >
              {globalSettings.contactEmail || EVENT_INFO.contactEmail}
            </a>
          </div>
        </div>
      </Section>

      {/* Facilities */}
      <Section className="py-24">
        <h2 className="text-4xl font-black mb-16 text-left flex items-end gap-2">
          WHAT YOU CAN DO <span className="text-base font-bold text-artistic-primary mb-2">rOOM8の設備・できること🏠</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS.facilities.map((fac, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-10 rounded-[2rem] border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] flex flex-col items-center text-center 
                ${i === 0 ? 'bg-[#FDE2E4]' : ''} 
                ${i === 1 ? 'bg-[#FFF1E6]' : ''} 
                ${i === 2 ? 'bg-[#E6F0FF]' : ''} 
                ${i === 3 ? 'bg-[#f0f9ff]' : ''}`}
            >
              <div className="mb-6 p-4 bg-white border-2 border-artistic-text rounded-2xl shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                {i === 0 && <ShoppingBag className="text-artistic-pink" size={32} />}
                {i === 1 && <Music className="text-artistic-primary" size={32} />}
                {i === 2 && <BookOpen className="text-blue-500" size={32} />}
                {i === 3 && <Monitor className="text-artistic-green" size={32} />}
              </div>
              <h3 className="font-black text-xl mb-4 tracking-tighter">{fac.title}</h3>
              <p className="text-artistic-text/70 text-sm font-bold leading-relaxed">{fac.desc}</p>
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
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
