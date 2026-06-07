import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, Calendar, MapPin, ArrowUpRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { isPastEvent, formatEventDate } from '../lib/dateUtils';
import { FALLBACK_EVENTS } from '../constants';

interface EventItem {
  id?: string;
  title?: string;
  date: string;
  time: string;
  locationName: string;
  address: string;
  access: string;
  fee: string;
  imageUrl?: string;
  isPublished?: boolean;
}

export default function PastEventsGallery() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Fetch all events from Firestore
  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'events'), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as EventItem[];
        setEvents(items);
      },
      (error) => {
        console.error("Firestore Events Error:", error);
      }
    );
    return () => unsubEvents();
  }, []);

  // Filter for past events (falls back to FALLBACK_EVENTS if no past events are in Firestore)
  const pastEvents = useMemo(() => {
    const localPast = events.filter(ev => isPastEvent(ev.date) && ev.isPublished !== false);
    return localPast.length > 0 ? localPast : FALLBACK_EVENTS;
  }, [events]);

  // Set initial selected event if none is selected
  useEffect(() => {
    if (pastEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(pastEvents[0].id || '');
    }
  }, [pastEvents, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return pastEvents.find(e => e.id === selectedEventId) || pastEvents[0] || null;
  }, [pastEvents, selectedEventId]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title block */}
      <div className="text-center mb-8">
        <span className="text-xs font-black uppercase tracking-[0.4em] text-artistic-accent">Memories & Snapshots</span>
        <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter flex items-center justify-center gap-3 mt-2 text-artistic-text">
          <ImageIcon className="text-artistic-pink" size={36} /> 過去のイベント写真
        </h2>
        <p className="text-stone-500 font-bold mt-3 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          rOOM8で開催された楽しいイベントの思い出の写真は、すべて Google Drive の共有フォルダで公開しています！
        </p>
      </div>

      {/* Main Call To Action Panel - ALWAYS VISIBLE */}
      <div className="bg-white border-4 border-artistic-text rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] p-6 md:p-10 mb-8 flex flex-col items-center text-center gap-6 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-artistic-accent/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-artistic-pink/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <span className="inline-block bg-artistic-pink text-white text-xs font-black px-4 py-1.5 rounded-full border-2 border-artistic-text uppercase tracking-widest">
            OFFICIAL ALBUM LINK
          </span>
          <h3 className="text-xl md:text-3xl font-black text-artistic-text leading-tight max-w-lg">
            Google Drive 共有アルバム
          </h3>
          <p className="text-stone-600 font-bold text-xs md:text-sm max-w-xl leading-relaxed">
            高画質な集合写真や、当日の賑やかな様子を収めたスナップ写真をチェック・保存できます！下記のリンクボタンより公式バケットへ直接アクセスしてください。
          </p>
        </div>

        <div className="w-full max-w-md relative z-10 pt-2">
          <a
            href="https://drive.google.com/drive/folders/1f0MbW0K8oi9A-JDgvfVvFezOPcQcfxrk?usp=drive_link"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center py-4 px-8 bg-artistic-primary text-white font-black text-base md:text-lg rounded-2xl border-2 border-artistic-text hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] animate-bounce"
          >
            Google Drive で写真を見る
            <ArrowUpRight size={22} strokeWidth={3} />
          </a>
        </div>
      </div>

      {/* Selector and detail of selected past event */}
      {pastEvents.length > 0 && (
        <div className="bg-stone-100/60 border-2 border-artistic-text rounded-[2rem] p-6 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block ml-1">開催履歴</span>
            <div className="flex flex-wrap gap-2">
              {pastEvents.map((ev) => {
                const isSelected = ev.id === selectedEventId;
                const { monthDay } = formatEventDate(ev.date);
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id || '')}
                    className={`px-4 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                      isSelected 
                        ? 'border-artistic-text bg-artistic-accent text-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' 
                        : 'border-artistic-text/10 bg-white hover:border-artistic-text text-stone-700'
                    }`}
                  >
                    {monthDay || ev.date}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedEvent && (
            <div className="md:col-span-7 border-l-0 md:border-l-2 border-dashed border-stone-300 md:pl-6 space-y-1">
              <h4 className="font-black text-sm text-artistic-primary leading-tight">
                {selectedEvent.title || selectedEvent.locationName}
              </h4>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-stone-500">
                <span className="flex items-center gap-1"><Calendar size={13} /> {selectedEvent.date}</span>
                <span className="flex items-center gap-1"><MapPin size={13} /> {selectedEvent.locationName}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
