import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Home,
  Calendar,
  Heart,
  MapPin,
  Tv,
  Users,
  Camera,
  Award,
  ImageIcon,
  Smartphone,
  MessageSquare,
  ChevronUp,
  X,
  ChevronRight
} from "lucide-react";

interface SectionItem {
  id: string;
  label: string;
  englishLabel: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
}

interface QuickNavMenuProps {
  onTrackAction?: (actionType: string, metadata?: any) => void;
}

export default function QuickNavMenu({ onTrackAction }: QuickNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("home");
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);

  // Monitor total scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setHasScrolledPastHero(scrollY > 300);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, Math.round(progress))));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Monitor active section utilizing IntersectionObserver (Scroll-Spy)
  useEffect(() => {
    const sections = [
      "home",
      "event-info",
      "about",
      "location",
      "youtube-registration",
      "party-connect",
      "gallery",
      "past-events",
      "lost-items",
      "products",
      "feedback"
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px", // High-accuracy window for active reading area
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const sectionsList: SectionItem[] = [
    { id: "home", label: "トップ", englishLabel: "HOME", icon: Home, color: "bg-artistic-accent text-artistic-text" },
    { id: "event-info", label: "次回開催情報", englishLabel: "NEXT EVENT", icon: Calendar, color: "bg-artistic-primary text-white" },
    { id: "about", label: "コンセプト", englishLabel: "CONCEPT", icon: Heart, color: "bg-artistic-pink text-white" },
    { id: "location", label: "場所・アクセス", englishLabel: "MAP & ACCESS", icon: MapPin, color: "bg-[#E6F0FF] text-artistic-text border-2 border-artistic-text" },
    { id: "youtube-registration", label: "YouTube 登録・設備", englishLabel: "YOUTUBE", icon: Tv, color: "bg-stone-100 text-artistic-text" },
    { id: "party-connect", label: "作家紹介", englishLabel: "ARTISTS", icon: Users, color: "bg-[#FFFDF9] text-artistic-text" },
    { id: "gallery", label: "イベントの雰囲気", englishLabel: "rOOM8 MOOD", icon: Camera, color: "bg-artistic-pink/15 text-artistic-text" },
    { id: "past-events", label: "イベント写真", englishLabel: "PHOTOS", icon: ImageIcon, color: "bg-[#FFD166]/30 text-artistic-text" },
    { id: "lost-items", label: "忘れ物 / 落とし物", englishLabel: "LOST & FOUND", icon: Award, color: "bg-artistic-accent text-artistic-text" },
    { id: "products", label: "TapTack", englishLabel: "TAPTACK APP", icon: Smartphone, color: "bg-[#06D6A0]/20 text-artistic-text" },
    { id: "feedback", label: "応援・感想", englishLabel: "FEEDBACK", icon: MessageSquare, color: "bg-artistic-primary/15 text-artistic-text" }
  ];

  const handleScrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      if (onTrackAction) {
        onTrackAction("click_quick_nav_section", { targetSection: id });
      }
      setIsOpen(false);
      
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const handleScrollToTop = () => {
    if (onTrackAction) {
      onTrackAction("click_quick_nav_top");
    }
    setIsOpen(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // SVG parameters for scroll progress indicator circle
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div id="quick-nav-menu-container" className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 pointer-events-none">
      {/* Quick Menu Panel card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30, x: 10 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white border-4 border-artistic-text rounded-[2rem] p-6 shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] w-[320px] max-h-[80vh] flex flex-col pointer-events-auto mb-2 select-none"
          >
            {/* Panel Title Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-artistic-text mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Compass className="text-artistic-primary animate-spin-slow" size={20} />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-40 leading-none">rOOM8 GUIDE</span>
                  <h3 className="text-sm font-black text-artistic-text leading-tight">セクション目次 / 移動</h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 bg-[#FAF9F6] border-2 border-artistic-text rounded-lg hover:bg-artistic-accent active:scale-95 transition-all text-artistic-text cursor-pointer"
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Scroll Progress Indicator Bar inside Menu */}
            <div className="bg-stone-100 border-2 border-artistic-text rounded-full p-2.5 flex items-center justify-between mb-4 text-xs font-black select-none shrink-0">
              <span className="opacity-60 text-[10px]">スクロール進捗</span>
              <div className="flex items-center gap-2 flex-grow justify-end">
                <div className="w-24 h-3 bg-stone-200 border border-artistic-text/20 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-artistic-pink transition-all duration-300"
                    style={{ width: `${scrollProgress}%` }}
                  />
                </div>
                <span className="font-mono text-artistic-primary text-[11px]">{scrollProgress}%</span>
              </div>
            </div>

            {/* Section list container */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[40vh] custom-scrollbar scrollbar-thin">
              {sectionsList.map((sec) => {
                const isActive = activeSection === sec.id;
                const IconComponent = sec.icon;

                return (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left cursor-pointer group ${
                      isActive
                        ? "border-artistic-text bg-artistic-accent text-artistic-text shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] translate-x-[-2px] translate-y-[-2px]"
                        : "border-transparent hover:border-artistic-text hover:bg-stone-50 text-artistic-text/80 hover:text-artistic-text"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Section Icon Badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 border-artistic-text ${sec.color} shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] shrink-0 group-hover:scale-105 transition-transform`}>
                        <IconComponent size={14} strokeWidth={3} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black tracking-wider text-stone-400 font-mono leading-none mb-0.5">
                          {sec.englishLabel}
                        </span>
                        <span className="text-xs font-black tracking-tight">{sec.label}</span>
                      </div>
                    </div>
                    
                    {/* Active dynamic indicator dot/arrow */}
                    <div className="flex items-center">
                      {isActive ? (
                        <div className="px-2 py-0.5 bg-artistic-pink text-white rounded-md text-[9px] font-black tracking-tighter shadow-[1px_1px_0px_0px_rgba(42,42,42,1)] font-mono animate-pulse">
                          VIEWING
                        </div>
                      ) : (
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Back to top row */}
            <div className="pt-3 border-t-2 border-artistic-text mt-4 flex justify-between gap-2 shrink-0">
              <button
                onClick={handleScrollToTop}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-artistic-text bg-white text-artistic-text font-black text-xs shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:scale-95 transition-all cursor-pointer"
              >
                <ChevronUp size={14} strokeWidth={3} />
                <span>一番上に戻る</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button with Dynamic Progress Ring */}
      <AnimatePresence>
        {(!isOpen || !hasScrolledPastHero) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (onTrackAction) {
                onTrackAction("toggle_quick_nav", { toState: !isOpen });
              }
              setIsOpen(!isOpen);
            }}
            className={`pointer-events-auto w-14 h-14 rounded-full border-4 border-artistic-text flex items-center justify-center cursor-pointer transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:shadow-none active:translate-x-1 active:translate-y-1 relative group focus:outline-none bg-artistic-accent`}
            aria-label="セクション目次を開く"
            title="セクション目次"
          >
            {/* SVG Scroll Progress Circle */}
            <svg className="absolute -rotate-90 w-full h-full p-0 pointer-events-none select-none z-10" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={radius}
                className="fill-none stroke-transparent"
                strokeWidth="4"
              />
              <circle
                cx="30"
                cy="30"
                r={radius}
                className="fill-none stroke-artistic-pink transition-all duration-100"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Central Icon */}
            <div className="relative z-20 flex flex-col items-center justify-center text-artistic-text">
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={20} strokeWidth={3} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="compass"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col items-center"
                  >
                    <Compass size={20} strokeWidth={3} className="group-hover:animate-spin-slow" />
                    <span className="text-[8px] font-black -mt-0.5 leading-none tracking-tight">INDEX</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hover tooltip */}
            <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-artistic-text text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-tight border-2 border-artistic-text shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden sm:block">
              ガイド目次 & クイック移動 {scrollProgress > 0 && `(${scrollProgress}%)`}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
