import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  EventConfigData, 
  EventItem,
  handleFirestoreError, 
  OperationType 
} from '../lib/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { EVENT_INFO } from '../constants';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Save, AlertCircle, CheckCircle, ArrowLeft, Plus, Trash2, Edit2, Calendar, Settings } from 'lucide-react';

const ADMIN_EMAILS = ["hiroto.mizutani@gmail.com", "taku448@gmail.com"];

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [globalSettings, setGlobalSettings] = useState({
    instagram: EVENT_INFO.instagram,
    facebook: EVENT_INFO.facebook,
    contactEmail: EVENT_INFO.contactEmail
  });
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      const email = u?.email?.toLowerCase();
      if (email && ADMIN_EMAILS.includes(email)) {
        fetchData();
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setStatus({ type: 'error', message: 'ログインに失敗しました。' });
    }
  };

  const handleLogout = () => signOut(auth);

  const fetchData = async () => {
    try {
      // Fetch events
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const eventsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventItem));
      setEvents(eventsList);

      // Fetch global settings
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        setGlobalSettings(settingsSnap.data() as any);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), globalSettings);
      setStatus({ type: 'success', message: 'グローバル設定が保存されました。' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const data = {
        ...editingEvent,
        updatedAt: serverTimestamp()
      };
      delete (data as any).id;

      if (editingEvent.id) {
        await setDoc(doc(db, 'events', editingEvent.id), data);
      } else {
        await addDoc(collection(db, 'events'), data);
      }
      
      setStatus({ type: 'success', message: 'イベントが保存されました！' });
      setEditingEvent(null);
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'events');
      setStatus({ type: 'error', message: '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('このイベントを削除してもよろしいですか？')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `events/${id}`);
    }
  };

  const startNewEvent = () => {
    setEditingEvent({
      date: '',
      time: '13:00〜',
      locationName: EVENT_INFO.locationName,
      address: EVENT_INFO.address,
      access: EVENT_INFO.access,
      fee: EVENT_INFO.fee,
      googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl
    });
  };

  if (loading) return <div className="p-10 text-center font-bold">読み込み中...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-artistic-bg flex items-center justify-center p-6">
        <div className="bg-white border-4 border-artistic-text p-8 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] text-center max-w-md w-full">
          <h1 className="text-3xl font-black mb-6">管理者ログイン</h1>
          <button 
            onClick={handleLogin}
            className="flex items-center justify-center gap-3 w-full bg-artistic-primary text-white font-black py-4 rounded-xl hover:scale-105 transition-transform"
          >
            <LogIn size={24} />
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  if (user.email?.toLowerCase() && !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return (
      <div className="min-h-screen bg-artistic-bg flex items-center justify-center p-6">
        <div className="bg-white border-4 border-artistic-text p-8 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] text-center">
          <AlertCircle className="mx-auto text-artistic-pink mb-4" size={48} />
          <h1 className="text-2xl font-black mb-4">アクセス権限がありません</h1>
          <p className="font-bold mb-6">{user.email} は管理者ではありません。</p>
          <button onClick={handleLogout} className="text-artistic-primary font-black underline">ログアウト</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-artistic-bg p-4 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 border-2 border-artistic-text rounded-full hover:bg-artistic-blue transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-4xl font-black">Dashboard</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 font-bold text-artistic-text/60 hover:text-artistic-pink">
            <LogOut size={20} /> Logout
          </button>
        </div>

        {/* Global Settings Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
            <Settings size={24} className="text-artistic-primary" /> Global Settings
          </h2>
          <form onSubmit={handleSaveGlobal} className="bg-white border-4 border-artistic-text p-6 md:p-10 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-60">Instagram URL</label>
                <input 
                  type="text" 
                  value={globalSettings.instagram || ''} 
                  onChange={e => setGlobalSettings({...globalSettings, instagram: e.target.value})}
                  className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-60">Facebook URL</label>
                <input 
                  type="text" 
                  value={globalSettings.facebook || ''} 
                  onChange={e => setGlobalSettings({...globalSettings, facebook: e.target.value})}
                  className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">Contact Email</label>
              <input 
                type="email" 
                value={globalSettings.contactEmail || ''} 
                onChange={e => setGlobalSettings({...globalSettings, contactEmail: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={saving}
              className="px-8 py-3 bg-artistic-text text-white font-black rounded-xl flex items-center gap-2 hover:bg-neutral-800 disabled:opacity-50"
            >
              <Save size={18} /> 全般設定を保存
            </button>
          </form>
        </div>

        {/* Events Management List */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Calendar size={24} className="text-artistic-pink" /> Scheduled Events
            </h2>
            <button 
              onClick={startNewEvent}
              className="bg-artistic-primary text-white h-12 w-12 rounded-full flex items-center justify-center border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:scale-105 transition-transform"
            >
              <Plus size={24} />
            </button>
          </div>

          <div className="space-y-4">
            {events.length === 0 && (
              <div className="bg-white border-2 border-dashed border-artistic-text p-12 text-center rounded-[2rem] opacity-60 font-black">
                予定されているイベントはありません
              </div>
            )}
            {events.map(event => (
              <div key={event.id} className="bg-white border-4 border-artistic-text p-6 rounded-[1.5rem] shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-black">{event.date}</span>
                    <span className="bg-artistic-accent px-2 py-0.5 rounded-lg text-xs font-black uppercase">{event.time}</span>
                  </div>
                  <p className="font-bold opacity-70">{event.locationName}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingEvent(event)}
                    className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-blue transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => event.id && handleDeleteEvent(event.id)}
                    className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-pink hover:text-white transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit/Add Event Form */}
        {editingEvent && (
          <div className="fixed inset-0 bg-artistic-text/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-artistic-text w-full max-w-2xl rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b-4 border-artistic-text flex justify-between items-center bg-artistic-blue/20">
                <h3 className="text-2xl font-black">{editingEvent.id ? 'イベントを編集' : '新規イベント作成'}</h3>
                <button onClick={() => setEditingEvent(null)} className="font-black text-2xl">×</button>
              </div>
              
              <form onSubmit={handleSaveEvent} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase opacity-60">開催日 (例: 05.05)</label>
                    <input 
                      type="text" 
                      required
                      value={editingEvent.date} 
                      onChange={e => setEditingEvent({...editingEvent, date: e.target.value})}
                      className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase opacity-60">開催時間 (例: 13:00〜)</label>
                    <input 
                      type="text" 
                      required
                      value={editingEvent.time} 
                      onChange={e => setEditingEvent({...editingEvent, time: e.target.value})}
                      className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase opacity-60">場所名</label>
                    <input 
                      type="text" 
                      required
                      value={editingEvent.locationName} 
                      onChange={e => setEditingEvent({...editingEvent, locationName: e.target.value})}
                      className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase opacity-60">参加費</label>
                    <input 
                      type="text" 
                      required
                      value={editingEvent.fee} 
                      onChange={e => setEditingEvent({...editingEvent, fee: e.target.value})}
                      className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase opacity-60">住所</label>
                  <input 
                    type="text" 
                    required
                    value={editingEvent.address} 
                    onChange={e => setEditingEvent({...editingEvent, address: e.target.value})}
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase opacity-60">アクセス情報</label>
                  <input 
                    type="text" 
                    required
                    value={editingEvent.access} 
                    onChange={e => setEditingEvent({...editingEvent, access: e.target.value})}
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase opacity-60">Google Maps Embed URL</label>
                  <textarea 
                    rows={3}
                    required
                    value={editingEvent.googleMapEmbedUrl} 
                    onChange={e => setEditingEvent({...editingEvent, googleMapEmbedUrl: e.target.value})}
                    className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none text-xs font-mono"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="flex-1 bg-artistic-text text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <Save size={20} />
                    {saving ? '保存中...' : '保存する'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingEvent(null)}
                    className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
