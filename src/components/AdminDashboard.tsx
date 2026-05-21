import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  storage,
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
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { useDropzone } from 'react-dropzone';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { EVENT_INFO } from '../constants';
import { formatEventDate, isPastEvent } from '../lib/dateUtils';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Save, AlertCircle, CheckCircle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Plus, Trash2, Edit2, Calendar, Settings, Copy, Heart, BarChart3, Download, Upload, Monitor, Clock, Users, ShoppingBag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import Papa from 'papaparse';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  status: "active" | "sold_out" | "hidden";
  stripePriceId?: string;
  order: number;
}

interface Creator {
  id?: string;
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  instagram: string;
  twitter?: string;
  likesCount?: number;
  order?: number;
  isExhibitingToday?: boolean;
  isPastExhibitor?: boolean;
  createdAt?: any;
}

const ADMIN_EMAILS = ["hiroto.mizutani@gmail.com", "taku448@gmail.com"];
const ANALYTICS_START_DATE = new Date('2026-05-13T00:00:00+09:00');

const EventEditModal = ({ event, onSave, onClose, saving }: { event: EventItem, onSave: (event: EventItem) => void, onClose: () => void, saving: boolean }) => {
  const [formData, setFormData] = useState<EventItem>(event);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-artistic-text/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-artistic-text w-full max-w-2xl rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b-4 border-artistic-text flex justify-between items-center bg-artistic-blue/20">
          <h3 className="text-2xl font-black">{formData.id ? 'イベントを編集' : '新規イベント作成'}</h3>
          <button onClick={onClose} className="font-black text-2xl">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">タイトル (任意)</label>
            <input 
              type="text" 
              value={formData.title || ''} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="イベントのタイトル"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">開催日 (例: 2026.05.25 (月))</label>
              <input 
                type="text" 
                required
                placeholder="YYYY.MM.DD (曜)"
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">開始時間 (例: 13:00)</label>
              <input 
                type="text" 
                required
                value={formData.time} 
                onChange={e => setFormData({...formData, time: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="13:00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">終了時間 (任意 - 例: 16:00)</label>
              <input 
                type="text" 
                value={formData.endTime || ''} 
                onChange={e => setFormData({...formData, endTime: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="16:00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">場所名</label>
              <input 
                type="text" 
                required
                value={formData.locationName} 
                onChange={e => setFormData({...formData, locationName: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">ENTRY FEE</label>
              <input 
                type="text" 
                required
                value={formData.fee} 
                onChange={e => setFormData({...formData, fee: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">住所</label>
            <input 
              type="text" 
              required
              value={formData.address} 
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">アクセス情報</label>
            <input 
              type="text" 
              required
              value={formData.access} 
              onChange={e => setFormData({...formData, access: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">Google Maps Embed URL</label>
            <textarea 
              rows={3}
              required
              value={formData.googleMapEmbedUrl} 
              onChange={e => setFormData({...formData, googleMapEmbedUrl: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none text-xs font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">YouTube動画 URL (任意)</label>
            <input 
              type="url" 
              value={formData.youtubeUrl || ''} 
              onChange={e => setFormData({...formData, youtubeUrl: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">Facebookイベント URL (任意)</label>
            <input 
              type="url" 
              value={formData.facebookEventUrl || ''} 
              onChange={e => setFormData({...formData, facebookEventUrl: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="https://facebook.com/events/..."
            />
          </div>

          <div className="space-y-4">
            <ImageUpload 
              currentUrl={formData.imageUrl || ''} 
              onUpload={(url) => setFormData({...formData, imageUrl: url})} 
              label="イベント画像 (任意)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">イベント概要 (任意)</label>
            <textarea 
              rows={4}
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="イベントの概要を入力してください"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">公開状態</label>
            <select 
              value={formData.isPublished !== false ? 'true' : 'false'} 
              onChange={e => setFormData({...formData, isPublished: e.target.value === 'true'})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none bg-white"
            >
              <option value="true">公開</option>
              <option value="false">非公開（下書き）</option>
            </select>
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
              onClick={onClose}
              className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ImageUpload = ({ onUpload, currentUrl, label = "画像" }: { onUpload: (url: string) => void, currentUrl: string, label?: string }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) {
      console.log("No file accepted");
      return;
    }

    console.log("Starting processing for:", file.name, file.type);
    setUploading(true);
    setError(null);
    try {
      // Create a function to convert and resize image to base64
      const processImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxDim = 800; // max width or height

              if (width > height) {
                if (width > maxDim) {
                  height *= maxDim / width;
                  width = maxDim;
                }
              } else {
                if (height > maxDim) {
                  width *= maxDim / height;
                  height = maxDim;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              // Compress with JPEG, adjust quality to 0.7
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
        });
      };

      const base64Url = await processImage(file);
      console.log("Image processed successfully (Base64)");
      
      setPreview(base64Url);
      onUpload(base64Url);
      
    } catch (err: any) {
      console.error("Upload/Processing error detail:", err);
      setError(`画像の処理に失敗しました。`);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({ 
    onDrop, 
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    multiple: false,
    onDropRejected: (rejections) => {
      console.log("Files rejected:", rejections);
      const reason = rejections[0]?.errors[0]?.message || "非対応のファイル形式です。";
      setError(`ファイルが拒否されました: ${reason}`);
    }
  } as any);

  useEffect(() => {
    if (fileRejections.length > 0) {
      const reason = fileRejections[0].errors[0].message;
      setError(`ファイルが拒否されました: ${reason}`);
    }
  }, [fileRejections]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase opacity-60">{label}</label>
      <div 
        {...getRootProps()} 
        className={`border-4 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragActive ? 'border-artistic-primary bg-artistic-primary/5 scale-102' : 'border-artistic-text/10 hover:border-artistic-text/30'} ${error ? 'border-red-400' : ''}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative group w-full aspect-video rounded-xl overflow-hidden border-2 border-artistic-text">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-artistic-text/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white font-black text-sm">クリックして画像を変更</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Upload className="mx-auto mb-2 opacity-40" size={32} />
            <p className="font-bold text-sm opacity-60">画像をドラッグ＆ドロップ<br/>またはクリックして選択</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-2xl z-10">
            <div className="w-8 h-8 border-4 border-artistic-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs font-black text-artistic-primary uppercase tracking-widest">Uploading...</p>
          </div>
        )}
      </div>
      {error && (
        <p className="text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>
      )}
      {preview && (
        <div className="flex gap-2 items-center">
          <input 
            type="url" 
            value={preview} 
            onChange={e => {
              setPreview(e.target.value);
              onUpload(e.target.value);
            }}
            className="flex-1 border-2 border-artistic-text/10 p-2 rounded-lg text-[10px] font-mono outline-none focus:border-artistic-primary"
            placeholder="または画像の直リンクを入力"
          />
        </div>
      )}
    </div>
  );
};

const ProductEditModal = ({ product, onSave, onClose, saving }: { product: Product, onSave: (product: Product) => void, onClose: () => void, saving: boolean }) => {
  const [formData, setFormData] = useState<Product>(product);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-artistic-text/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-artistic-text w-full max-w-2xl rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b-4 border-artistic-text flex justify-between items-center bg-artistic-pink/20">
          <h3 className="text-2xl font-black">{formData.id ? '商品を編集' : '新規商品登録'}</h3>
          <button onClick={onClose} className="font-black text-2xl">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">商品名</label>
            <input 
              type="text" 
              required
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="Tシャツ / アートプリント"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">価格 (税込 ¥)</label>
              <input 
                type="number" 
                required
                value={formData.price || ''} 
                onChange={e => setFormData({...formData, price: e.target.value === '' ? 0 : Number(e.target.value)})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="3000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">通貨</label>
              <input 
                type="text" 
                required
                value={formData.currency} 
                onChange={e => setFormData({...formData, currency: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="JPY"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">Stripe Price ID</label>
            <input 
              type="text" 
              value={formData.stripePriceId || ''} 
              onChange={e => setFormData({...formData, stripePriceId: e.target.value})}
              className={`w-full border-2 p-3 rounded-xl font-mono text-sm outline-none transition-colors ${
                formData.stripePriceId?.startsWith('prod_') 
                ? 'border-artistic-pink text-artistic-pink bg-artistic-pink/5' 
                : 'border-artistic-text focus:border-artistic-primary'
              }`}
              placeholder="price_H5n8..."
            />
            <p className="text-[10px] font-bold">
              {formData.stripePriceId && typeof formData.stripePriceId === 'string' && formData.stripePriceId.startsWith('prod_') ? (
                <span className="text-artistic-pink">⚠️ 注意: prod_ で始まるのは商品IDです。price_ で始まる「価格ID」をコピーしてください。</span>
              ) : formData.stripePriceId && typeof formData.stripePriceId === 'string' && formData.stripePriceId.startsWith('http') ? (
                <span className="text-green-600">✅ Stripe決済リンクが入力されています。直接リンクとして動作します。</span>
              ) : (
                <span className="opacity-40">Stripeの「価格ID(price_...)」または「決済リンク(https://buy.stripe.com/...)」を入力してください。</span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <ImageUpload 
              currentUrl={formData.imageUrl} 
              onUpload={(url) => setFormData({...formData, imageUrl: url})} 
              label="商品画像"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">商品説明</label>
            <textarea 
              rows={3}
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="商品の詳細説明を入力してください"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">ステータス</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value as any})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none bg-white"
            >
              <option value="active">販売中</option>
              <option value="sold_out">売り切れ</option>
              <option value="hidden">非公開</option>
            </select>
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
              onClick={onClose}
              className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreatorEditModal = ({ creator, onSave, onClose, saving }: { creator: Creator, onSave: (creator: Creator) => void, onClose: () => void, saving: boolean }) => {
  const [formData, setFormData] = useState<Creator>(creator);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-artistic-text/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-artistic-text w-full max-w-2xl rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b-4 border-artistic-text flex justify-between items-center bg-artistic-primary/20">
          <h3 className="text-2xl font-black">{formData.id ? 'クリエイターを編集' : '新規クリエイター登録'}</h3>
          <button onClick={onClose} className="font-black text-2xl">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">クリエイター名</label>
              <input 
                type="text" 
                required
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="マサ (Masa)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">肩書・専門分野 (specialty)</label>
              <input 
                type="text" 
                required
                value={formData.specialty} 
                onChange={e => setFormData({...formData, specialty: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="Wood Crafter 🪚"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">Instagram アカウント名 (任意)</label>
              <input 
                type="text" 
                value={formData.instagram || ''} 
                onChange={e => setFormData({...formData, instagram: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="wood_masa_yoyogi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase opacity-60">Twitter/X アカウント名 (任意)</label>
              <input 
                type="text" 
                value={formData.twitter || ''} 
                onChange={e => setFormData({...formData, twitter: e.target.value})}
                className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
                placeholder="masa_wood"
              />
            </div>
          </div>

          <div className="space-y-4">
            <ImageUpload 
              currentUrl={formData.imageUrl || ''} 
              onUpload={(url) => setFormData({...formData, imageUrl: url})} 
              label="クリエイター画像"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase opacity-60">プロフィール / 紹介文 (bio)</label>
            <textarea 
              rows={4}
              required
              value={formData.bio} 
              onChange={e => setFormData({...formData, bio: e.target.value})}
              className="w-full border-2 border-artistic-text p-3 rounded-xl font-bold outline-none"
              placeholder="紹介文を入力してください"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 bg-stone-50 border-2 border-dashed border-stone-200 p-4 rounded-2xl">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={!!formData.isExhibitingToday} 
                onChange={e => setFormData({...formData, isExhibitingToday: e.target.checked})}
                className="w-5 h-5 rounded border-2 border-artistic-text text-artistic-primary focus:ring-artistic-primary"
              />
              <span className="text-sm font-black text-stone-700">🟢 本日出展中</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={!!formData.isPastExhibitor} 
                onChange={e => setFormData({...formData, isPastExhibitor: e.target.checked})}
                className="w-5 h-5 rounded border-2 border-artistic-text text-artistic-primary focus:ring-artistic-primary"
              />
              <span className="text-sm font-black text-stone-600">📅 過去に出展</span>
            </label>
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
              onClick={onClose}
              className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{date: string, count: number}[]>([]);
  const [deviceData, setDeviceData] = useState<{name: string, value: number}[]>([]);
  const [referrerData, setReferrerData] = useState<{name: string, value: number}[]>([]);
  const [hourlyData, setHourlyData] = useState<{hour: string, count: number}[]>([]);
  const [actionStats, setActionStats] = useState<{name: string, value: number}[]>([]);
  const [visitorStats, setVisitorStats] = useState({ new: 0, returning: 0, repeatVisits: 0, anonymousSessions: 0 });
  const [totalPageViews, setTotalPageViews] = useState(0);
  const [rawVisits, setRawVisits] = useState<any[]>([]);
  const [sectionReachData, setSectionReachData] = useState<{id: string, name: string, count: number, percentage: number}[]>([]);
  const [engagementStats, setEngagementStats] = useState({ avgDuration: 0, medianDuration: 0, avgScroll: 0, medianScroll: 0, completionRate: 0, completionCount: 0 });
  const [feedback, setFeedback] = useState<any[]>([]);
  const [analysisPeriod, setAnalysisPeriod] = useState<number>(14);
  const [activeTab, setActiveTab] = useState<'events' | 'shop' | 'settings' | 'analytics' | 'feedback' | 'creators'>('events');
  const [globalSettings, setGlobalSettings] = useState({
    instagram: EVENT_INFO.instagram,
    youtube: EVENT_INFO.youtube,
    facebook: '', // Add fallback
    contactEmail: EVENT_INFO.contactEmail
  });
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingCreatorId, setDeletingCreatorId] = useState<string | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [saving, setSaving] = useState(false);
  const [fetchingAnalytics, setFetchingAnalytics] = useState(false);

  useEffect(() => {
    if ((activeTab === 'analytics' || activeTab === 'feedback') && user) {
      fetchAnalytics();
    }
  }, [activeTab, user, analysisPeriod]);

  const fetchAnalytics = async () => {
    setFetchingAnalytics(true);
    try {
      const analyticsRef = collection(db, 'analytics_visits');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - analysisPeriod);
      
      const aggregationStart = cutoff > ANALYTICS_START_DATE ? cutoff : ANALYTICS_START_DATE;
      
      const q = query(
        analyticsRef, 
        where('timestamp', '>=', aggregationStart)
      );
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleLocalFirestoreError(err, OperationType.GET, 'analytics_visits');
        return;
      }
      
      const counts: {[key: string]: number} = {};
      const deviceCounts: {[key: string]: number} = { mobile: 0, desktop: 0 };
      const referrerCounts: {[key: string]: number} = {};
      const sectionLabels: {[key: string]: string} = {
        'home': 'ヒーロー',
        'event-info': '開催予定',
        'archive': 'アーカイブ',
        'about': 'About',
        'location': '地図・アクセス',
        'youtube-registration': 'YouTube登録',
        'gallery': 'ギャラリー',
        'feedback': '評価用フォーム',
        'products': 'アプリ紹介',
        'contact': 'フッター/SNS'
      };
      
      const hasArchive = events.some(e => isPastEvent(e.date));
      const hasProducts = EVENT_INFO.apps && EVENT_INFO.apps.length > 0;
      
      const sectionReachCounts: {[key: string]: number} = {
        'home': 0,
        'event-info': 0,
        ...(hasArchive ? { 'archive': 0 } : {}),
        'about': 0,
        'location': 0,
        'youtube-registration': 0,
        'gallery': 0,
        'feedback': 0,
        ...(hasProducts ? { 'products': 0 } : {}),
        'contact': 0
      };
      const fourHourBlocks: {[key: string]: number} = {
        '00-04': 0,
        '04-08': 0,
        '08-12': 0,
        '12-16': 0,
        '16-20': 0,
        '20-24': 0
      };
      const deviceVisitCounts: {[key: string]: number} = {};
      let anonymousCount = 0;
      
      let totalValidVisits = 0;
      let totalDuration = 0;
      let totalScroll = 0;
      const durations: number[] = [];
      const scrolls: number[] = [];
      const visits: any[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Exclude access from AI Studio editor
        if (data.referrer && data.referrer.includes('aistudio.google.com')) {
          return;
        }

        totalValidVisits++;
        visits.push({ id: doc.id, ...data });
        // Use data.date if exists, otherwise fallback to date from timestamp as fallback
        const docDate = data.date || (data.timestamp ? new Date(data.timestamp.toDate().toLocaleString("en-US", {timeZone: "Asia/Tokyo"})).toISOString().split('T')[0] : null);
        
        if (docDate) {
          counts[docDate] = (counts[docDate] || 0) + 1;
        }

        if (data.deviceType) {
          deviceCounts[data.deviceType] = (deviceCounts[data.deviceType] || 0) + 1;
        }

        // Referrer analysis
        const ref = data.referrer ? (data.referrer.includes('facebook') ? 'Facebook' : 
                                   data.referrer.includes('instagram') ? 'Instagram' :
                                   data.referrer === 'direct' ? '直接入力' : 
                                   new URL(data.referrer).hostname) : '直接入力';
        referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;

        // Engagement metrics - Include all valid visits in the denominator to be logically consistent
        const duration = (typeof data.duration === 'number' && data.duration >= 0) ? data.duration : 0;
        totalDuration += duration;
        durations.push(duration);

        let scroll = (typeof data.maxScrollDepth === 'number' && data.maxScrollDepth >= 0) ? data.maxScrollDepth : 0;
        
        // Sync scroll with content reach to maintain consistency
        if (data.sectionsReached && Array.isArray(data.sectionsReached)) {
          const sectionKeys = Object.keys(sectionReachCounts);
          const reachedIndices = data.sectionsReached
            .map((id: string) => sectionKeys.indexOf(id))
            .filter((idx: number) => idx !== -1);
            
          if (reachedIndices.length > 0) {
            const maxSectionIndex = Math.max(...reachedIndices);
            // Calculate minimum consistent scroll percentage based on furthest section reached
            const minScrollFromSections = Math.round(((maxSectionIndex + 1) / sectionKeys.length) * 100);
            if (minScrollFromSections > scroll) {
              scroll = minScrollFromSections;
            }
          }
        }

        totalScroll += scroll;
        scrolls.push(scroll);
        
        // Hour analysis in JST (Group into 4-hour blocks)
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          const hourStr = date.toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', hour12: false }).split(':')[0];
          const hourNum = parseInt(hourStr);
          const blockStart = Math.floor(hourNum / 4) * 4;
          const blockLabel = `${blockStart.toString().padStart(2, '0')}-${(blockStart + 4).toString().padStart(2, '0')}`;
          fourHourBlocks[blockLabel] = (fourHourBlocks[blockLabel] || 0) + 1;
        }

        // Repeat visitor analysis
        if (data.deviceId) {
          deviceVisitCounts[data.deviceId] = (deviceVisitCounts[data.deviceId] || 0) + 1;
        } else {
          anonymousCount++;
        }

        // Section reach analysis
        if (data.sectionsReached && Array.isArray(data.sectionsReached)) {
          data.sectionsReached.forEach((id: string) => {
            if (sectionReachCounts[id] !== undefined) {
              sectionReachCounts[id]++;
            }
          });
        }
      });

      setSectionReachData(Object.keys(sectionReachCounts).map(id => ({
        id,
        name: sectionLabels[id],
        count: sectionReachCounts[id],
        percentage: totalValidVisits > 0 ? Math.round((sectionReachCounts[id] / totalValidVisits) * 100) : 0
      })));

      setRawVisits(visits);

      // Calculate duration statistics excluding outliers (> 30 mins)
      const validDurations = durations.filter(d => d > 0 && d <= 1800);
      let medianDuration = 0;
      if (validDurations.length > 0) {
        const sortedValid = [...validDurations].sort((a, b) => a - b);
        const mid = Math.floor(sortedValid.length / 2);
        medianDuration = sortedValid.length % 2 !== 0 
          ? sortedValid[mid] 
          : Math.round((sortedValid[mid - 1] + sortedValid[mid]) / 2);
      }

      // Calculate completion rate based on ALL valid visits as denominator
      let completionRate = 0;
      let completionCount = 0;
      if (scrolls.length > 0) {
        
        // Calculate completion count based on the last significant section (contact)
        // to maintain consistency with the section reach funnel analysis
        completionCount = sectionReachCounts['contact'] || 0;
        completionRate = totalValidVisits > 0 ? Math.round((completionCount / totalValidVisits) * 100) : 0;
      }

      setEngagementStats({
        avgDuration: validDurations.length > 0 ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length) : 0,
        medianDuration,
        avgScroll: totalValidVisits > 0 ? Math.round(totalScroll / totalValidVisits) : 0,
        medianScroll: 0,
        completionRate,
        completionCount
      });

      setTotalPageViews(totalValidVisits);

      setReferrerData(Object.keys(referrerCounts).map(name => ({ name, value: referrerCounts[name] })).sort((a, b) => b.value - a.value).slice(0, 5));

      // Fetch actions with cutoff
      const actionsRef = collection(db, 'analytics_actions');
      const actionsQ = query(actionsRef, where('timestamp', '>=', aggregationStart));
      const actionsSnapshot = await getDocs(actionsQ);
      
      const actionCounts: {[key: string]: number} = {};
      actionsSnapshot.forEach(doc => {
        const data = doc.data();
        let label = data.actionType;
        if (data.actionType === 'click_facebook') label = `FB: ${data.title || 'イベント'}`;
        else if (data.actionType === 'click_youtube') label = `YT: ${data.title || 'イベント'}`;
        else if (data.actionType === 'copy_event_info') label = `基本情報Copy: ${data.title || 'イベント'}`;
        else if (data.actionType === 'click_app_store') label = `App: ${data.name || 'ストア'}`;
        else if (data.actionType === 'click_header_youtube') label = 'Header YouTube';
        else if (data.actionType === 'click_header_youtube_mobile') label = 'Header YouTube (Mob)';
        else if (data.actionType === 'click_footer_instagram') label = 'Footer Insta';
        else if (data.actionType === 'click_footer_youtube') label = 'Footer YouTube';
        else if (data.actionType === 'click_footer_contact') label = 'Footer Mail';
        else if (data.actionType === 'click_youtube_promotion') label = 'Promo YouTube';
        
        actionCounts[label] = (actionCounts[label] || 0) + 1;
      });
      setActionStats(Object.keys(actionCounts).map(name => ({ name, value: actionCounts[name] })).sort((a, b) => b.value - a.value).slice(0, 10));

      // 4-Hour chart data
      const hourlyChartData = Object.keys(fourHourBlocks).map(block => ({
        hour: block,
        count: fourHourBlocks[block]
      }));
      setHourlyData(hourlyChartData);

      // Repeat stats
      const deviceIds = Object.keys(deviceVisitCounts);
      const returning = deviceIds.filter(id => deviceVisitCounts[id] > 1).length;
      const newVisitors = deviceIds.length - returning;
      
      // Calculate repeat visit count (Total identified visits - Number of identified people)
      let identifiedPageViews = 0;
      deviceIds.forEach(id => {
        identifiedPageViews += deviceVisitCounts[id];
      });
      const repeatIdentified = identifiedPageViews - deviceIds.length;
      
      setVisitorStats({ 
        new: newVisitors, 
        returning, 
        repeatVisits: repeatIdentified, 
        anonymousSessions: anonymousCount 
      });

      // Fill missing dates in analyticsData to ensure the chart shows the full period (zero-fill)
      const filledChartData = [];
      const jstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tokyo"}));
      
      // Zero-fill dates up to analysisPeriod, but not earlier than ANALYTICS_START_DATE
      for (let i = analysisPeriod - 1; i >= 0; i--) {
        const d = new Date(jstNow);
        d.setDate(d.getDate() - i);
        
        // Skip dates before aggregation start
        if (d < ANALYTICS_START_DATE && d.toDateString() !== ANALYTICS_START_DATE.toDateString()) continue;

        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        filledChartData.push({
          date: dateStr,
          count: counts[dateStr] || 0
        });
      }
      setAnalyticsData(filledChartData);

      const pieData = Object.keys(deviceCounts).map(type => ({
        name: type === 'mobile' ? 'モバイル' : 'デスクトップ',
        value: deviceCounts[type]
      })).filter(d => d.value > 0);
      setDeviceData(pieData);
      
      // Fetch Feedback
      const feedbackRef = collection(db, 'feedback');
      const feedbackQ = query(feedbackRef, orderBy('timestamp', 'desc'), limit(50));
      const feedbackSnapshot = await getDocs(feedbackQ);
      setFeedback(feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setFetchingAnalytics(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      const email = u?.email?.toLowerCase();
      if (email && ADMIN_EMAILS.includes(email)) {
        // Mark this device as admin to exclude from analytics
        localStorage.setItem('room8_is_admin', 'true');
        fetchData();
      }
    });

    return () => {
      unsub();
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleLogin = async () => {
    setStatus({ type: null, message: '' });
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login Error:", err);
      // Handle blocked popups explicitly if possible, or show generic error
      if (err.code === 'auth/popup-blocked') {
        setStatus({ type: 'error', message: 'ポップアップがブロックされました。ブラウザの設定で許可するか、新しいタブでアプリを開いてください。' });
      } else {
        setStatus({ type: 'error', message: `ログインに失敗しました: ${err.message}` });
      }
    }
  };

  const handleLogout = () => signOut(auth);

  const handleLocalFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: user?.uid,
        email: user?.email,
      },
      operationType,
      path
    };
    console.error('Local Firestore Error: ', JSON.stringify(errInfo));
    setStatus({ type: 'error', message: `アクセス権限エラー: ${errInfo.error}` });
  };

  const fetchData = async () => {
    try {
      // Fetch events
      const eventsRef = collection(db, 'events');
      const querySnapshot = await getDocs(eventsRef);
      const eventsList = querySnapshot.docs.map(doc => {
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
      });
      // Sort by order asc
      const sortedEvents = eventsList.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
      setEvents(sortedEvents);

      // Fetch products
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsList.sort((a, b) => (a.order || 0) - (b.order || 0)));

      // Fetch creators
      const creatorsRef = collection(db, 'creators');
      const creatorsSnapshot = await getDocs(creatorsRef);
      const creatorsList = creatorsSnapshot.docs.map(doc => ({
        id: doc.id,
        likesCount: 0,
        order: 0,
        ...doc.data()
      })) as Creator[];
      setCreators(creatorsList.sort((a, b) => (a.order || 0) - (b.order || 0)));

      // Fetch global settings
      const settingsRef = doc(db, 'settings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setGlobalSettings((prev: any) => ({
          ...prev,
          ...data,
          youtube: data.youtube || data.facebook || prev.youtube // Fallback for settings too
        }));
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
      handleLocalFirestoreError(err, OperationType.WRITE, 'settings/global');
    } finally {
      setSaving(false);
    }
  };

  const handleExportFeedbackCSV = () => {
    const dataToExport = feedback.map(fb => ({
      date: fb.timestamp?.toDate().toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}),
      rating: fb.rating,
      comment: fb.comment || '',
      deviceId: fb.deviceId || '',
      isTest: fb.testData ? 'YES' : 'NO'
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVisitsCSV = () => {
    if (rawVisits.length === 0) {
      setStatus({ type: 'error', message: '出力するデータがありません。' });
      return;
    }

    const dataToExport = rawVisits.map(v => ({
      timestamp: v.timestamp?.toDate().toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}),
      duration_seconds: v.duration || 0,
      max_scroll_percent: v.maxScrollDepth || 0,
      deviceId: v.deviceId || '',
      deviceType: v.deviceType || '',
      userAgent: v.userAgent || '',
      referrer: v.referrer || 'direct',
      isInApp: v.isInAppBrowser ? 'YES' : 'NO',
      sectionsReached: (v.sectionsReached || []).join(', ')
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `visits_raw_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFeedback = async (id: string) => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedback(prev => prev.filter(fb => fb.id !== id));
      setStatus({ type: 'success', message: 'フィードバックを削除しました。' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.DELETE, `feedback/${id}`);
    } finally {
      setSaving(false);
      setDeletingFeedbackId(null);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = events.map(ev => ({
      title: ev.title || '',
      date: ev.date,
      time: ev.time,
      endTime: ev.endTime || '',
      locationName: ev.locationName,
      address: ev.address,
      access: ev.access,
      fee: ev.fee,
      description: ev.description || '',
      youtubeUrl: ev.youtubeUrl || ev.facebookEventUrl || '',
      googleMapEmbedUrl: ev.googleMapEmbedUrl,
      order: ev.order || 0,
      isPublished: ev.isPublished !== false ? 'TRUE' : 'FALSE'
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `events_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = [];
          for (const row of results.data as any[]) {
            const eventData: Partial<EventItem> = {
              title: row.title || '',
              date: row.date || '',
              time: row.time || '',
              endTime: row.endTime || '',
              locationName: row.locationName || '',
              address: row.address || '',
              access: row.access || '',
              fee: row.fee || '',
              description: row.description || '',
              youtubeUrl: row.youtubeUrl || '',
              googleMapEmbedUrl: row.googleMapEmbedUrl || '',
              order: parseInt(row.order) || 0,
              isPublished: row.isPublished === 'TRUE',
              updatedAt: serverTimestamp()
            };
            batch.push(addDoc(collection(db, 'events'), eventData));
          }
          await Promise.all(batch);
          setStatus({ type: 'success', message: `${batch.length}件のイベントをインポートしました。` });
          fetchData();
        } catch (err) {
          console.error(err);
          setStatus({ type: 'error', message: 'インポートに失敗しました。ファイル形式を確認してください。' });
        } finally {
          setSaving(false);
          e.target.value = '';
        }
      }
    });
  };

  const handleSaveEvent = async (eventData: EventItem) => {
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const currentOrder = eventData.order || (events.length > 0 ? Math.max(...events.map(e => e.order || 0)) + 1 : 1);
      const data = {
        ...eventData,
        order: currentOrder,
        updatedAt: serverTimestamp()
      };
      delete (data as any).id;

      if (eventData.id) {
        await setDoc(doc(db, 'events', eventData.id), data);
      } else {
        await addDoc(collection(db, 'events'), data);
      }
      
      setStatus({ type: 'success', message: 'イベントが保存されました！' });
      setEditingEvent(null);
      fetchData();
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'events');
      setStatus({ type: 'error', message: '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      await deleteDoc(doc(db, 'events', id));
      await fetchData();
      setStatus({ type: 'success', message: 'イベントを削除しました。' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: '削除に失敗しました。権限を確認してください。' });
      try {
        handleLocalFirestoreError(err, OperationType.DELETE, `events/${id}`);
      } catch (e) {}
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (productData: Product) => {
    setSaving(true);
    setStatus({ type: null, message: '' });

    try {
      const currentOrder = productData.order || (products.length > 0 ? Math.max(...products.map(p => p.order || 0)) + 1 : 1);
      const data = {
        ...productData,
        order: currentOrder,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };
      delete (data as any).id;

      if (productData.id) {
        await setDoc(doc(db, 'products', productData.id), data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      
      setStatus({ type: 'success', message: '商品が保存されました！' });
      setEditingProduct(null);
      fetchData();
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'products');
      setStatus({ type: 'error', message: '保存に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      await deleteDoc(doc(db, 'products', id));
      await fetchData();
      setStatus({ type: 'success', message: '商品を削除しました。' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: '削除に失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  const moveProductOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === products.length - 1) return;

    const newProducts = [...products];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newProducts[index], newProducts[targetIndex]] = [newProducts[targetIndex], newProducts[index]];

    setSaving(true);
    try {
      await Promise.all(newProducts.map((p, i) => {
        if (p.id) {
          return setDoc(doc(db, 'products', p.id), { ...p, order: i + 1, updatedAt: serverTimestamp() });
        }
        return Promise.resolve();
      }));
      fetchData();
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'products');
    } finally {
      setSaving(false);
    }
  };

  const startNewProduct = () => {
    const nextOrder = products.length > 0 ? Math.max(...products.map(p => p.order || 0)) + 1 : 1;
    setEditingProduct({
      name: '',
      description: '',
      price: 0,
      currency: 'JPY',
      imageUrl: '',
      status: 'active',
      order: nextOrder
    });
  };

  const moveEventOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === events.length - 1) return;

    const newEvents = [...events];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap in array
    [newEvents[index], newEvents[targetIndex]] = [newEvents[targetIndex], newEvents[index]];

    setSaving(true);
    try {
      // Re-assign explicit orders top-to-bottom for safety
      await Promise.all(newEvents.map((evt, i) => {
        if (evt.id) {
          return setDoc(doc(db, 'events', evt.id), { ...evt, order: i + 1, updatedAt: serverTimestamp() });
        }
        return Promise.resolve();
      }));
      fetchData();
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'events');
      setStatus({ type: 'error', message: '並び替えに失敗しました。' });
    } finally {
      setSaving(false);
    }
  };

  const duplicateEvent = (event: EventItem) => {
    const nextOrder = events.length > 0 ? Math.max(...events.map(e => e.order || 0)) + 1 : 1;
    setEditingEvent({
      date: event.date + ' (コピー)',
      time: event.time,
      endTime: event.endTime || '',
      locationName: event.locationName,
      title: event.title || '',
      address: event.address,
      access: event.access,
      fee: event.fee,
      googleMapEmbedUrl: event.googleMapEmbedUrl,
      youtubeUrl: event.youtubeUrl || '',
      description: event.description || '',
      isPublished: false, // Default duplicated event to draft
      order: nextOrder
    });
  };

  const startNewEvent = () => {
    const nextOrder = events.length > 0 ? Math.max(...events.map(e => e.order || 0)) + 1 : 1;
    setEditingEvent({
      date: '',
      time: '13:00',
      endTime: '16:00',
      locationName: EVENT_INFO.locationName,
      title: '',
      address: EVENT_INFO.address,
      access: EVENT_INFO.access,
      fee: EVENT_INFO.fee,
      googleMapEmbedUrl: EVENT_INFO.googleMapEmbedUrl,
      isPublished: true, // Default to published for new events to keep current behavior
      order: nextOrder
    });
  };

  const handleSaveCreator = async (creatorData: Creator) => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      const isNew = !creatorData.id;
      const ref = isNew 
        ? doc(collection(db, 'creators')) 
        : doc(db, 'creators', creatorData.id!);

      const dataToSave: any = {
        name: creatorData.name,
        specialty: creatorData.specialty,
        bio: creatorData.bio,
        imageUrl: creatorData.imageUrl || '',
        instagram: creatorData.instagram || '',
        twitter: creatorData.twitter || '',
        likesCount: creatorData.likesCount !== undefined ? creatorData.likesCount : 0,
        order: creatorData.order !== undefined ? creatorData.order : 0,
        isExhibitingToday: !!creatorData.isExhibitingToday,
        isPastExhibitor: !!creatorData.isPastExhibitor,
        updatedAt: serverTimestamp()
      };

      if (isNew) {
        dataToSave.createdAt = serverTimestamp();
      } else if (creatorData.createdAt) {
        dataToSave.createdAt = creatorData.createdAt;
      } else {
        dataToSave.createdAt = serverTimestamp();
      }

      await setDoc(ref, dataToSave, { merge: true });
      setStatus({ 
        type: 'success', 
        message: isNew ? '新規クリエイターを登録しました。' : 'クリエイター情報を更新しました。' 
      });
      setEditingCreator(null);
      fetchData();
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'creators');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCreator = async (id: string) => {
    setSaving(true);
    setStatus({ type: null, message: '' });
    try {
      await deleteDoc(doc(db, 'creators', id));
      setCreators(prev => prev.filter(c => c.id !== id));
      setStatus({ type: 'success', message: 'クリエイターを削除しました。' });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: '削除に失敗しました。' });
    } finally {
      setSaving(false);
      setDeletingCreatorId(null);
    }
  };

  const moveCreatorOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === creators.length - 1) return;

    const newCreators = [...creators];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCreators[index], newCreators[targetIndex]] = [newCreators[targetIndex], newCreators[index]];

    setSaving(true);
    try {
      await Promise.all(newCreators.map((c, i) => {
        if (c.id) {
          return setDoc(doc(db, 'creators', c.id), { ...c, order: i + 1, updatedAt: serverTimestamp() });
        }
        return Promise.resolve();
      }));
      fetchData();
    } catch (err) {
      handleLocalFirestoreError(err, OperationType.WRITE, 'creators');
    } finally {
      setSaving(false);
    }
  };

  const startNewCreator = () => {
    const nextOrder = creators.length > 0 ? Math.max(...creators.map(c => c.order || 0)) + 1 : 1;
    setEditingCreator({
      name: '',
      specialty: '',
      bio: '',
      imageUrl: '',
      instagram: '',
      twitter: '',
      likesCount: 0,
      isExhibitingToday: false,
      isPastExhibitor: false,
      order: nextOrder
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
        <div className="bg-white border-4 border-artistic-text p-10 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] text-center max-w-xl">
          <AlertCircle className="mx-auto text-artistic-pink mb-6" size={64} />
          <h1 className="text-3xl font-black mb-4 italic">アクセス権限がありません</h1>
          <div className="bg-stone-100 p-6 rounded-2xl mb-8 border-2 border-stone-200">
            <p className="text-sm font-black opacity-40 uppercase tracking-widest mb-2">ログイン中のメールアドレス</p>
            <p className="text-xl font-mono font-black text-artistic-text">{user.email}</p>
          </div>
          <p className="font-bold text-lg mb-8 leading-relaxed">
            このアカウントは管理リストに登録されていません。<br/>
            正しい管理者アカウントでログインし直してください。
          </p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleLogout} 
              className="bg-artistic-primary text-white font-black py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:scale-105 active:scale-95 transition-all"
            >
              ログアウトして別のアカウントで試す
            </button>
            <Link to="/" className="text-artistic-text/40 font-black hover:text-artistic-text transition-colors">
              メインサイトへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-artistic-bg p-6 md:p-16 lg:p-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-20">
          <div className="flex items-center gap-8">
            <Link to="/" className="p-4 border-2 border-artistic-text rounded-full hover:bg-artistic-blue transition-all shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none hover:scale-105">
              <ArrowLeft size={28} />
            </Link>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic">ダッシュボード</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-3 border-2 border-artistic-text/10 rounded-2xl font-black text-artistic-text/50 hover:text-artistic-pink hover:border-artistic-pink/30 transition-all">
            <LogOut size={22} /> ログアウト
          </button>
        </div>

        {/* Status Message */}
        {status.type && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl font-black shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] border-4 border-artistic-text flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${status.type === 'success' ? 'bg-artistic-green text-white' : 'bg-artistic-pink text-white'}`}>
            {status.type === 'success' ? <CheckCircle /> : <AlertCircle />}
            {status.message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-20 overflow-x-auto pb-4 snap-x">
          <button 
            onClick={() => setActiveTab('events')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'events' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <Calendar size={isMobile ? 18 : 24} /> イベント管理
          </button>
          <button 
            onClick={() => setActiveTab('shop')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'shop' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <ShoppingBag size={isMobile ? 18 : 24} /> ショップ管理
          </button>
          <button 
            onClick={() => setActiveTab('creators')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'creators' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <Users size={isMobile ? 18 : 24} /> クリエイター管理
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'analytics' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <BarChart3 size={isMobile ? 18 : 24} /> アクセス分析
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'feedback' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <Heart size={isMobile ? 18 : 24} /> フィードバック
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`min-w-0 justify-center px-4 md:px-10 py-4 md:py-5 rounded-[1.5rem] font-black flex items-center gap-2 md:gap-4 transition-all border-4 shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none snap-start whitespace-nowrap text-sm md:text-base ${activeTab === 'settings' ? 'bg-artistic-text text-white border-artistic-text' : 'bg-white text-artistic-text border-artistic-text/10 hover:border-artistic-text'}`}
          >
            <Settings size={isMobile ? 18 : 24} /> 全般設定
          </button>
        </div>

        {/* Creators Tab Section */}
        {activeTab === 'creators' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black italic">他己紹介クリエイター一覧</h2>
                <p className="text-sm font-bold opacity-60">他己紹介ボードに表示されるクリエイターを登録・管理します。</p>
              </div>
              <button 
                onClick={startNewCreator}
                className="bg-artistic-accent text-artistic-text font-black px-8 py-4 rounded-xl border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 justify-center"
              >
                <Plus size={20} /> クリエイターを追加
              </button>
            </div>

            <div className="bg-white border-4 border-artistic-text p-6 md:p-10 rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-4 border-artistic-text">
                      <th className="pb-4 font-black text-sm uppercase opacity-40">並び順</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40">画像</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40">名前・専門分野</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40">プロフィール（紹介文）</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40">SNS</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40">いいね数</th>
                      <th className="pb-4 font-black text-sm uppercase opacity-40 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-stone-100">
                    {creators.map((creator, index) => (
                      <tr key={creator.id} className="hover:bg-stone-50/50">
                        <td className="py-6">
                          <div className="flex flex-col gap-1 items-center justify-center w-10">
                            <button 
                              onClick={() => moveCreatorOrder(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-neutral-100 rounded disabled:opacity-20"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <span className="font-bold text-xs">{index + 1}</span>
                            <button 
                              onClick={() => moveCreatorOrder(index, 'down')}
                              disabled={index === creators.length - 1}
                              className="p-1 hover:bg-neutral-100 rounded disabled:opacity-20"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="py-6">
                          <div className="w-16 h-16 rounded-2xl border-2 border-artistic-text overflow-hidden bg-stone-100">
                            {creator.imageUrl ? (
                              <img src={creator.imageUrl} alt={creator.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-stone-100">
                                No Img
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-6 max-w-xs pr-4">
                          <p className="font-black text-base flex flex-wrap gap-1.5 items-center">
                            {creator.name}
                            {creator.isExhibitingToday && (
                              <span className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-black whitespace-nowrap">
                                🟢 本日出展中
                              </span>
                            )}
                            {creator.isPastExhibitor && (
                              <span className="text-[9px] text-stone-600 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-black whitespace-nowrap">
                                📅 過去に出展
                              </span>
                            )}
                          </p>
                          <span className="inline-block mt-1 bg-artistic-primary/10 text-artistic-primary text-xs font-bold px-2 py-0.5 rounded">
                            {creator.specialty}
                          </span>
                        </td>
                        <td className="py-6 max-w-md pr-4">
                          <p className="text-xs font-bold text-stone-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">{creator.bio}</p>
                        </td>
                        <td className="py-6 space-y-1">
                          {creator.instagram && (
                            <p className="text-xs font-black text-[#E1306C]/80 flex items-center gap-1">
                              instagram: {creator.instagram}
                            </p>
                          )}
                          {creator.twitter && (
                            <p className="text-xs font-black text-[#1DA1F2]/80 flex items-center gap-1">
                              twitter: {creator.twitter}
                            </p>
                          )}
                          {!creator.instagram && !creator.twitter && (
                            <p className="text-xs font-bold text-gray-400 italic">未入力</p>
                          )}
                        </td>
                        <td className="py-6">
                          <div className="flex items-center gap-1 font-bold text-artistic-pink text-sm">
                            <Heart size={14} fill="currentColor" />
                            <span>{creator.likesCount || 0}</span>
                          </div>
                        </td>
                        <td className="py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setEditingCreator(creator)}
                              className="p-2 border-2 border-artistic-text hover:bg-neutral-100 rounded-lg"
                              title="編集"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => creator.id && setDeletingCreatorId(creator.id)}
                              className="p-2 border-2 border-artistic-text hover:bg-red-50 hover:text-red-500 rounded-lg"
                              title="削除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {creators.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-400 font-bold italic">
                          クリエイターが登録されていません。「クリエイターを追加」から新しく登録してください。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Global Settings Section */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
              <Settings size={24} className="text-artistic-primary" /> 全般設定
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
                  <label className="text-xs font-black uppercase opacity-60">YouTube URL</label>
                  <input 
                    type="text" 
                    value={globalSettings.youtube || ''} 
                    onChange={e => setGlobalSettings({...globalSettings, youtube: e.target.value})}
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
        )}

        {/* Analytics Section */}
        {activeTab === 'analytics' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4">
            {/* Analytics Header & Period selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
               <div>
                  <h2 className="text-4xl md:text-6xl font-black italic mb-2 tracking-tighter">アクセス分析</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <p className="font-bold opacity-40 uppercase tracking-widest text-[8px] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-artistic-green rounded-full animate-pulse" />
                      Timezone: Asia/Tokyo (JST)
                    </p>
                    <p className="font-bold opacity-40 uppercase tracking-widest text-[8px]">
                      Session Logic: 10m Timeout
                    </p>
                    <p className="font-bold opacity-40 uppercase tracking-widest text-[8px]">
                      Admin Excluded: ID Tracker
                    </p>
                  </div>
               </div>
               <div className="bg-white border-4 border-artistic-text p-2 rounded-2xl flex gap-1 shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                  {[7, 14, 30, 90].map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnalysisPeriod(p)}
                      className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${analysisPeriod === p ? 'bg-artistic-text text-white shadow-lg' : 'bg-transparent text-artistic-text/30 hover:text-artistic-text hover:bg-artistic-bg'}`}
                    >
                      {p}日間
                    </button>
                  ))}
                </div>
             </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">総訪問数 (セッション)</p>
                <p className="text-4xl lg:text-5xl font-black">{totalPageViews}</p>
                <div className="mt-2 pt-2 border-t border-artistic-text/5 flex items-center justify-between">
                  <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">リピート分 (再訪)</span>
                  <span className="text-sm font-black text-artistic-text/30">+{visitorStats.repeatVisits} 回</span>
                </div>
                <button 
                  onClick={() => fetchAnalytics()} 
                  disabled={fetchingAnalytics}
                  className="mt-4 text-[10px] font-black uppercase text-artistic-primary hover:underline flex items-center gap-1 disabled:opacity-30"
                >
                  <BarChart3 size={12} className={fetchingAnalytics ? 'animate-spin' : ''} /> {fetchingAnalytics ? '更新中...' : 'データを更新'}
                </button>
              </div>
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">平均滞在時間</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl lg:text-5xl font-black text-artistic-primary">{engagementStats.avgDuration}</p>
                  <span className="text-xs font-black opacity-40">s</span>
                </div>
                <div className="mt-2 pt-2 border-t border-artistic-text/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">中央値</span>
                    <span className="text-sm font-black text-artistic-primary/60">{engagementStats.medianDuration}s</span>
                  </div>
                </div>
                <button 
                  onClick={handleExportVisitsCSV}
                  className="mt-4 w-full py-2 bg-artistic-bg hover:bg-artistic-text hover:text-white transition-all rounded-xl border-2 border-artistic-text text-[10px] font-black uppercase flex items-center justify-center gap-2"
                >
                  <Download size={12} /> 詳細データをDL
                </button>
              </div>
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">平均スクロール</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl lg:text-5xl font-black text-artistic-green">{engagementStats.avgScroll}</p>
                  <span className="text-xs font-black opacity-40">%</span>
                </div>
              </div>
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">読了率 (90%+)</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl lg:text-5xl font-black text-artistic-pink">{engagementStats.completionRate}</p>
                  <span className="text-xs font-black opacity-40">%</span>
                </div>
                <div className="mt-2 pt-2 border-t border-artistic-text/5 flex items-center justify-between">
                  <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">読了数</span>
                  <span className="text-sm font-black text-artistic-pink/60">{engagementStats.completionCount} 回</span>
                </div>
              </div>
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">リピーター数 (人)</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl lg:text-5xl font-black text-artistic-accent">{visitorStats.returning}</p>
                  <span className="text-xs font-black opacity-40">名</span>
                </div>
                <p className="text-[7px] font-bold opacity-30 italic mt-2">※ 2回以上訪問した人数</p>
              </div>
              <div className="bg-white border-4 border-artistic-text p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] flex flex-col justify-between">
                <p className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-[0.2em]">新規訪問者数 (人)</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl lg:text-5xl font-black text-artistic-pink">{visitorStats.new}</p>
                  <span className="text-xs font-black opacity-40">名</span>
                </div>
                <p className="text-[7px] font-bold opacity-30 italic mt-2">※ 初めて訪問した人数</p>
              </div>

              {/* Conditional Alert for Anonymous Sessions (> 5%) */}
              {totalPageViews > 0 && (visitorStats.anonymousSessions / totalPageViews) > 0.05 && (
                <div className="bg-artistic-pink/5 border-4 border-artistic-pink p-8 rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(251,107,107,0.3)] flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="text-artistic-pink" size={16} />
                    <p className="text-[10px] font-black uppercase text-artistic-pink tracking-[0.2em]">匿名セッション警告</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-4xl lg:text-5xl font-black text-artistic-pink">{visitorStats.anonymousSessions}</p>
                    <span className="text-xs font-black text-artistic-pink/40">回</span>
                  </div>
                  <p className="text-[8px] font-bold text-artistic-pink/60 mt-4 leading-tight italic">
                    ※ 総アクセスの {Math.round((visitorStats.anonymousSessions / totalPageViews) * 100)}% が識別不可です。
                    広告ブロックやプライベートモードの影響が考えられます。
                  </p>
                </div>
              )}
            </div>

            {/* Content Reach (Funnel) */}
            <div className="bg-white border-4 border-artistic-text p-10 md:p-14 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-artistic-green/20 rounded-2xl flex items-center justify-center text-artistic-green">
                  <Monitor size={24} />
                </div>
                <div>
                  <h3 className="text-3xl font-black italic">コンテンツ到達率</h3>
                  <p className="text-[10px] font-black opacity-30 mt-1 uppercase tracking-widest">Section Reach Rate (Funnel Analysis)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                {sectionReachData.map((section, idx) => (
                  <div key={section.id} className="relative flex flex-col items-center group">
                    <div className="w-full aspect-square bg-artistic-bg rounded-[2rem] border-2 border-artistic-text/5 flex flex-col items-center justify-center p-4 transition-all hover:bg-white hover:border-artistic-text/20 hover:shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]">
                      <div className="text-3xl font-black text-artistic-text leading-none mb-1">{section.percentage}%</div>
                      <div className="text-[10px] font-black opacity-40 uppercase text-center mb-0.5">{section.name}</div>
                      <div className="text-[9px] font-black opacity-20 uppercase text-center mb-4">{section.count} 回</div>
                      <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-artistic-text/5 max-w-[80%]">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            section.percentage > 80 ? 'bg-artistic-primary' : 
                            section.percentage > 50 ? 'bg-artistic-green' : 
                            section.percentage > 20 ? 'bg-artistic-pink' : 'bg-artistic-text/20'
                          }`}
                          style={{ width: `${section.percentage}%` }}
                        />
                      </div>
                    </div>
                    {idx < sectionReachData.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 opacity-20 group-hover:opacity-40 transition-opacity">
                        <ArrowRight size={20} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 bg-artistic-bg/30 rounded-2xl border-2 border-dashed border-artistic-text/10 text-center">
                <p className="text-[10px] font-bold opacity-40 italic">※ 各セクションが画面に10%以上表示されたことを検知して計測しています。ページ長の変化（アーカイブ増など）により、読了数と個別の到達率に乖離が出ることがあります。</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="bg-white border-4 border-artistic-text p-12 md:p-16 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-artistic-pink/20 rounded-2xl flex items-center justify-center text-artistic-pink">
                    <BarChart3 size={24} />
                  </div>
                  <h3 className="text-2xl font-black italic">訪問者数 (過去{analysisPeriod}日間)</h3>
                </div>
                <div className="h-[400px]">
                  {analyticsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData} margin={{ top: 30, right: 40, left: 20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{fontSize: 12, fontWeight: 'bold', fill: '#2a2a2a', opacity: 0.4}}
                          tickFormatter={(val) => val.split('-').slice(1).join('/')}
                          dy={20}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{fontSize: 12, fontWeight: 'bold', fill: '#2a2a2a', opacity: 0.4}} 
                          allowDecimals={false} 
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: '3px solid #2a2a2a',
                            boxShadow: '6px 6px 0px 0px rgba(42,42,42,1)',
                            fontWeight: 'bold',
                            padding: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#FF7EB3" 
                          strokeWidth={6}
                          dot={{r: 8, strokeWidth: 3, fill: '#fff', stroke: '#FF7EB3'}}
                          activeDot={{r: 10, strokeWidth: 0}}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
                      データがありません
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border-4 border-artistic-text p-12 md:p-16 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-artistic-blue/20 rounded-2xl flex items-center justify-center text-artistic-blue">
                    <Clock size={24} />
                  </div>
                  <h3 className="text-2xl font-black italic">時間帯別アクティビティ</h3>
                </div>
                <div className="h-[400px]">
                  {hourlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData} margin={{ top: 30, right: 30, left: 20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                        <XAxis 
                          dataKey="hour" 
                          axisLine={false}
                          tickLine={false}
                          tick={{fontSize: 12, fontWeight: 'bold', fill: '#2a2a2a', opacity: 0.4}}
                          dy={20}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{fontSize: 12, fontWeight: 'bold', fill: '#2a2a2a', opacity: 0.4}} 
                          allowDecimals={false} 
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: '3px solid #2a2a2a',
                            boxShadow: '6px 6px 0px 0px rgba(42,42,42,1)',
                            fontWeight: 'bold',
                            padding: '12px'
                          }}
                          cursor={{fill: 'rgba(59, 204, 255, 0.1)'}}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#3BCCFF" 
                          radius={[8, 8, 0, 0]}
                          maxBarSize={50}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
                      データがありません
                    </div>
                  )}
                </div>
              </div>

            <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
              <div className="bg-white border-4 border-artistic-text p-8 lg:p-12 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] min-w-0">
                <div className="flex items-center gap-4 mb-10 w-full overflow-hidden">
                  <div className="w-12 h-12 shrink-0 bg-artistic-accent/20 rounded-2xl flex items-center justify-center text-artistic-accent">
                    <Monitor size={24} />
                  </div>
                  <h3 className="text-xl font-black italic truncate">デバイス比率</h3>
                </div>
                <div className="h-[250px] w-full">
                  {deviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius="50%"
                          outerRadius="80%"
                          paddingAngle={10}
                          dataKey="value"
                        >
                          {deviceData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3BCCFF' : '#FF7EB3'} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '2px solid #2a2a2a',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">
                      データなし
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border-4 border-artistic-text p-8 lg:p-12 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] min-w-0">
                <div className="flex items-center gap-4 mb-10 w-full overflow-hidden">
                  <div className="w-12 h-12 shrink-0 bg-artistic-primary/20 rounded-2xl flex items-center justify-center text-artistic-primary">
                    <Heart size={24} />
                  </div>
                  <h3 className="text-xl font-black italic truncate">リピーター率</h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '新規', value: visitorStats.new },
                          { name: 'リピーター', value: visitorStats.returning }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        innerRadius="50%"
                        outerRadius="80%"
                        paddingAngle={10}
                        dataKey="value"
                      >
                        <Cell fill="#FF7EB3" strokeWidth={0} />
                        <Cell fill="#3BCCFF" strokeWidth={0} />
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '2px solid #2a2a2a',
                          fontWeight: 'bold',
                          fontSize: '12px'
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: '900', whiteSpace: 'nowrap' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

              <div className="bg-white border-4 border-artistic-text p-10 md:p-14 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] md:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-artistic-accent/40 rounded-2xl flex items-center justify-center text-artistic-text">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black italic">人気コンテンツ</h3>
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">External Link Clicks Rankings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-artistic-bg px-4 py-2 rounded-xl border-2 border-artistic-text/5">
                    <Users size={16} className="text-artistic-primary" />
                    <span className="text-xs font-black">Total: {actionStats.reduce((acc, curr) => acc + curr.value, 0)} clicks</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {actionStats.length > 0 ? (
                    actionStats.map((item, idx) => {
                      const maxVal = actionStats[0].value;
                      const percentage = (item.value / maxVal) * 100;
                      const isTop3 = idx < 3;
                      
                      return (
                        <div key={idx} className={`relative group p-5 rounded-[1.5rem] border-2 transition-all hover:scale-[1.01] ${isTop3 ? 'border-artistic-text bg-white shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]' : 'border-artistic-text/10 bg-artistic-bg/30'}`}>
                          <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg border-2 ${
                                idx === 0 ? 'bg-artistic-primary text-white border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' : 
                                idx === 1 ? 'bg-artistic-pink text-white border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' : 
                                idx === 2 ? 'bg-artistic-green text-white border-artistic-text shadow-[2px_2px_0px_0px_rgba(42,42,42,1)]' : 
                                'bg-white text-artistic-text border-artistic-text/20'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-black text-sm md:text-base leading-tight">{item.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   {item.name.startsWith('FB:') && <span className="text-[9px] font-bold text-white bg-[#1877F2] px-1.5 py-0.5 rounded uppercase">Facebook</span>}
                                   {item.name.startsWith('YT:') && <span className="text-[9px] font-bold text-white bg-[#FF0000] px-1.5 py-0.5 rounded uppercase">YouTube</span>}
                                   {item.name.startsWith('App:') && <span className="text-[9px] font-bold text-white bg-artistic-text px-1.5 py-0.5 rounded uppercase">App Store</span>}
                                   {item.name.includes('Footer') && <span className="text-[9px] font-bold text-artistic-text/40 border border-artistic-text/20 px-1.5 py-0.5 rounded uppercase">Static</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black leading-none">{item.value}</p>
                              <p className="text-[9px] font-bold opacity-30 mt-1 uppercase">CLICKS</p>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-3 bg-artistic-bg rounded-full overflow-hidden border border-artistic-text/5 relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                idx === 0 ? 'bg-artistic-primary' : 
                                idx === 1 ? 'bg-artistic-pink' : 
                                idx === 2 ? 'bg-artistic-green' : 
                                'bg-artistic-text/10'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-20 text-center bg-artistic-bg/30 rounded-[2.5rem] border-4 border-dashed border-artistic-text/10">
                      <p className="text-xl font-bold opacity-20 italic">集計データがまだありません</p>
                    </div>
                  )}
                  <p className="text-[10px] font-bold opacity-40 italic mt-6">※ 「クリック数（CLICKS）」は延べ回数です。同一ユーザーが複数回クリックした場合もすべて加算されるため、訪問者ベースの「セクション到達数」より多くなることがあります。</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-4 border-artistic-text p-12 md:p-16 rounded-[4rem] shadow-[16px_16px_0px_0px_rgba(42,42,42,1)]">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-artistic-pink/20 rounded-2xl flex items-center justify-center text-artistic-pink">
                  <Heart size={24} fill="currentColor" />
                </div>
                <h3 className="text-3xl font-black italic">イベント別「いいね」数</h3>
              </div>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {events.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-4 border-2 border-artistic-text rounded-xl odd:bg-artistic-blue/5">
                    <div className="min-w-0 mr-4">
                      <p className="font-black truncate text-sm">{ev.title || ev.date}</p>
                      <p className="text-[10px] opacity-60 font-bold uppercase">{ev.date} @ {ev.locationName}</p>
                    </div>
                    <div className="flex items-center gap-1 font-black text-artistic-pink">
                      <Heart size={14} fill="currentColor" />
                      <span>{ev.likesCount || 0}</span>
                    </div>
                  </div>
                ))}
                {events.length === 0 && <p className="text-center text-gray-400 italic">データがありません</p>}
              </div>
            </div>

            {/* Definitions and Notes Section */}
            <div className="bg-white border-4 border-artistic-text p-10 md:p-12 rounded-[3.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] animate-in fade-in slide-in-from-bottom-8 mt-12 mb-12">
              <h3 className="text-2xl font-black italic mb-8 border-b-4 border-artistic-bg pb-4">📊 データ定義と計測の前提事項</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-artistic-bg/30 p-6 rounded-[2rem] border-2 border-artistic-text/5">
                  <h4 className="font-black text-artistic-primary mb-2 text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-artistic-primary" /> 総アクセス数
                  </h4>
                  <p className="text-[10px] font-bold opacity-70 leading-relaxed">
                    延べ訪問（セッション）数です。ブラウザを閉じた後や、10分以上の非アクティブ後の再アクセスは新しい訪問としてカウントされます。
                  </p>
                </div>
                <div className="bg-artistic-bg/30 p-6 rounded-[2rem] border-2 border-artistic-text/5">
                  <h4 className="font-black text-artistic-accent mb-2 text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-artistic-accent" /> リピーターの定義
                  </h4>
                  <p className="text-[10px] font-bold opacity-70 leading-relaxed">
                    集計期間内に、同じブラウザ識別子（Device ID）から2回以上のセッションが発生したユーザーを指します。
                  </p>
                </div>
                <div className="bg-artistic-bg/30 p-6 rounded-[2rem] border-2 border-artistic-text/5">
                  <h4 className="font-black text-artistic-green mb-2 text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-artistic-green" /> 滞在時間・スクロール
                  </h4>
                  <p className="text-[10px] font-bold opacity-70 leading-relaxed">
                    滞在時間は実測値（秒）、スクロールはページ全体の高さに対して到達した最大深度（%）です。滞在時間は一部の極端な数値に惑わされないよう、平均値と併せて中央値（全体を並べた時の真ん中の人の値）も表示しています。
                  </p>
                </div>
                <div className="bg-artistic-bg/30 p-6 rounded-[2rem] border-2 border-artistic-text/5">
                  <h4 className="font-black text-artistic-pink mb-2 text-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-artistic-pink" /> 管理者除外と時間帯
                  </h4>
                  <p className="text-[10px] font-bold opacity-70 leading-relaxed">
                    ログイン済みの管理者は集計から除外されます。すべての時刻データは日本標準時（JST）で記録・表示されています。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback List Section */}
        {activeTab === 'feedback' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter flex items-center gap-4">
                <Heart size={48} className="text-artistic-pink" fill="currentColor" /> フィードバック
              </h2>
              <button 
                onClick={handleExportFeedbackCSV}
                className="bg-white text-artistic-text h-14 px-8 rounded-2xl flex items-center justify-center gap-3 border-4 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:translate-y-0.5 hover:shadow-none transition-all font-black text-lg"
              >
                <Download size={24} /> フィードバックCSV出力
              </button>
            </div>

            <div className="grid gap-8">
               {feedback.map((fb) => (
                 <div key={fb.id} className="group bg-white border-4 border-artistic-text p-8 md:p-10 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] relative transition-all hover:shadow-[16px_16px_0px_0px_rgba(42,42,42,1)]">
                    {fb.testData && (
                      <div className="absolute -top-4 -right-4 bg-artistic-blue text-white px-4 py-1 rounded-xl text-[10px] font-black border-2 border-artistic-text rotate-[10deg] shadow-sm z-10">
                        ADMIN TEST
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Heart 
                            key={star} 
                            size={24} 
                            fill={fb.rating >= star ? "#FB6B6B" : "none"} 
                            stroke={fb.rating >= star ? "#FB6B6B" : "#2a2a2a"} 
                            strokeWidth={3}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black opacity-30 italic">
                          {fb.timestamp?.toDate().toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"})}
                        </span>
                        <button 
                          onClick={() => fb.id && setDeletingFeedbackId(fb.id)}
                          disabled={saving}
                          className="p-3 text-stone-300 hover:text-artistic-pink transition-colors relative z-10"
                          title="削除"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xl md:text-2xl font-bold leading-relaxed italic mb-8 text-artistic-text/90">
                      「{fb.comment || '（コメントなし）'}」
                    </p>
                    <div className="flex flex-wrap gap-3 pt-6 border-t-2 border-dashed border-artistic-text/5">
                      <span className="text-[10px] font-black uppercase opacity-20 tracking-widest bg-stone-50 px-3 py-1 rounded-lg">
                        ID: {fb.id}
                      </span>
                      <span className="text-[10px] font-black uppercase opacity-20 tracking-widest bg-stone-50 px-3 py-1 rounded-lg">
                        Device: {fb.deviceId?.slice(0, 12)}...
                      </span>
                    </div>
                 </div>
               ))}
               {feedback.length === 0 && (
                 <div className="bg-white border-4 border-dashed border-artistic-text p-24 text-center rounded-[3.5rem]">
                   <p className="text-2xl font-bold opacity-30 italic">フィードバックはまだありません 📥</p>
                 </div>
               )}
            </div>
          </div>
        )}
        {/* Events Management List */}
        {activeTab === 'events' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12">
              <h2 className="text-3xl font-black flex items-center gap-3 italic">
                <Calendar size={32} className="text-artistic-pink" /> イベント管理
              </h2>
            <div className="flex flex-wrap gap-4 items-center">
              <button 
                onClick={startNewEvent}
                className="bg-artistic-primary text-white h-14 px-6 rounded-2xl flex items-center justify-center gap-3 border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:scale-105 active:scale-95 transition-all font-black"
              >
                <Plus size={24} /> 新規作成
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportCSV}
                  className="bg-white text-artistic-text h-14 px-6 rounded-2xl flex items-center justify-center gap-3 border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:translate-y-0.5 hover:shadow-none transition-all font-black text-sm"
                >
                  <Download size={20} /> CSV出力
                </button>
                <label className="bg-white text-artistic-text h-14 px-6 rounded-2xl flex items-center justify-center gap-3 border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:translate-y-0.5 hover:shadow-none transition-all font-black text-sm cursor-pointer">
                  <Upload size={20} /> CSV読込
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
              </div>
            </div>

          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-xl font-black bg-artistic-accent inline-block px-4 py-2 rounded-xl shadow-[3px_3px_0px_0px_rgba(42,42,42,1)] border-2 border-artistic-text">開催予定のイベント</h3>
              {events.filter(e => !isPastEvent(e.date)).length === 0 && (
                <div className="bg-white border-2 border-dashed border-artistic-text p-12 text-center rounded-[2rem] flex flex-col items-center justify-center gap-6">
                  <p className="opacity-60 font-black text-lg">予定されているイベントはありません</p>
                </div>
              )}
              {events.map((event, index) => {
                if (isPastEvent(event.date)) return null;
                return (
                  <div key={event.id} className={`bg-white border-4 border-artistic-text p-6 rounded-[1.5rem] shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] flex flex-col md:flex-row justify-between md:items-center gap-4 group hover:shadow-[10px_10px_0px_0px_rgba(42,42,42,1)] transition-all ${index === 0 ? 'ring-4 ring-artistic-primary bg-artistic-accent/5' : ''}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col gap-1 items-center bg-gray-50 p-2 rounded-xl border-2 border-artistic-text">
                        <button 
                          onClick={() => moveEventOrder(index, 'up')} 
                          disabled={index === 0 || saving} 
                          className="hover:text-artistic-primary disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={20} />
                        </button>
                        <span className="font-black text-sm">{index + 1}</span>
                        <button 
                          onClick={() => moveEventOrder(index, 'down')} 
                          disabled={index === events.length - 1 || saving} 
                          className="hover:text-artistic-primary disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={20} />
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {index === 0 && <span className="bg-artistic-pink text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-sm">Main Display</span>}
                          <div className="flex flex-col">
                            {(() => {
                               const { year, monthDay, dayOfWeek } = formatEventDate(event.date);
                               return (
                                 <>
                                   {year && (
                                     <span className="text-[10px] font-black opacity-40 leading-none mb-0.5">
                                       {year}
                                     </span>
                                   )}
                                   <span className="text-xl md:text-2xl font-black tracking-tight leading-none">
                                     {monthDay} {dayOfWeek ? `(${dayOfWeek})` : ''}
                                   </span>
                                 </>
                               );
                            })()}
                          </div>
                          <span className="bg-artistic-accent/40 px-2 py-0.5 rounded-lg text-xs font-black uppercase">{event.time}{event.endTime ? ` 〜 ${event.endTime}` : ''}</span>
                          {event.isPublished === false ? (
                            <span className="bg-stone-300 text-stone-700 px-2 py-0.5 rounded-lg text-xs font-black uppercase">非公開</span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-xs font-black uppercase border border-green-300">公開中</span>
                          )}
                        </div>
                        {event.title && <p className="font-black text-lg md:text-xl mb-1">{event.title}</p>}
                        <p className="font-bold text-sm opacity-60 flex items-center gap-1">
                          <Calendar size={12} /> {event.locationName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap md:flex-nowrap">
                      <button onClick={() => duplicateEvent(event)} className="flex-1 md:flex-none px-4 py-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-green hover:text-white transition-colors flex items-center justify-center gap-2 font-black text-sm">
                        <Copy size={16} /> 複製
                      </button>
                      <button onClick={() => setEditingEvent(event)} className="flex-1 md:flex-none p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-blue transition-colors flex items-center justify-center gap-2 font-black text-sm">
                        <Edit2 size={16} /> 編集
                      </button>
                      <button onClick={() => event.id && setDeletingEventId(event.id)} className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-pink hover:text-white transition-colors flex items-center justify-center">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 pt-12">
              <h3 className="text-lg font-black bg-stone-200 inline-block px-3 py-1 rounded-lg opacity-60">アーカイブ済みイベント (終了)</h3>
              {events.filter(e => isPastEvent(e.date)).length === 0 && (
                <p className="text-center py-6 text-gray-400 font-bold italic">アーカイブはありません</p>
              )}
              {events.map((event, index) => {
                if (!isPastEvent(event.date)) return null;
                return (
                  <div key={event.id} className="bg-stone-50 border-2 border-artistic-text/30 p-4 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 opacity-70 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                    <div className="flex-1">
                      <div className="text-xs font-black opacity-40 mb-1">{event.date}</div>
                      <p className="font-black text-lg">{event.title || event.locationName}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => duplicateEvent(event)} className="p-2 border border-artistic-text rounded-lg hover:bg-artistic-green hover:text-white transition-colors">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => setEditingEvent(event)} className="p-2 border border-artistic-text rounded-lg hover:bg-artistic-blue transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => event.id && setDeletingEventId(event.id)} className="p-2 border border-artistic-text rounded-lg hover:bg-artistic-pink hover:text-white transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* Shop Management Section */}
        {activeTab === 'shop' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <h2 className="text-3xl font-black flex items-center gap-3 italic">
                <ShoppingBag size={32} className="text-artistic-primary" /> ショップ管理
              </h2>
              <button 
                onClick={startNewProduct}
                className="bg-artistic-primary text-white h-14 px-8 rounded-2xl flex items-center justify-center gap-3 border-4 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] hover:scale-105 active:scale-95 transition-all font-black text-lg"
              >
                <Plus size={24} /> 商品を追加
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <div key={product.id} className="bg-white border-4 border-artistic-text rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] group">
                  <div className="aspect-square relative bg-stone-100 border-b-4 border-artistic-text">
                    <img 
                      src={product.imageUrl || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop"} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       <div className="bg-white border-2 border-artistic-text px-3 py-1 rounded-full text-xs font-black shadow-sm">
                         ORDER: {product.order}
                       </div>
                       <div className={`px-3 py-1 rounded-full text-xs font-black shadow-sm border-2 border-artistic-text ${
                         product.status === 'active' ? 'bg-artistic-green text-white' : 
                         product.status === 'sold_out' ? 'bg-artistic-pink text-white' : 'bg-stone-200 text-stone-500'
                       }`}>
                         {product.status.toUpperCase()}
                       </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-black">{product.name}</h3>
                      <p className="text-lg font-black text-artistic-primary">¥{product.price.toLocaleString()}<span className="text-[10px] ml-1 opacity-60 font-bold">(税込)</span></p>
                    </div>
                    <p className="text-sm opacity-60 font-bold line-clamp-2 mb-6 h-10">{product.description}</p>
                    
                    <div className="flex gap-2">
                       <button 
                        onClick={() => moveProductOrder(index, 'up')}
                        disabled={index === 0 || saving}
                        className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-blue transition-all disabled:opacity-20"
                       >
                         <ArrowUp size={20} />
                       </button>
                       <button 
                        onClick={() => moveProductOrder(index, 'down')}
                        disabled={index === products.length - 1 || saving}
                        className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-blue transition-all disabled:opacity-20"
                       >
                         <ArrowDown size={20} />
                       </button>
                       <div className="flex-1" />
                       <button 
                        onClick={() => setEditingProduct(product)}
                        className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-blue transition-all"
                       >
                         <Edit2 size={20} />
                       </button>
                       <button 
                        onClick={() => product.id && setDeletingProductId(product.id)}
                        className="p-3 border-2 border-artistic-text rounded-xl hover:bg-artistic-pink hover:text-white transition-all"
                       >
                         <Trash2 size={20} />
                       </button>
                    </div>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="md:col-span-2 lg:col-span-3 py-20 text-center bg-white border-4 border-dashed border-artistic-text rounded-[2.5rem]">
                   <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                   <p className="text-xl font-black opacity-30 italic">商品がまだありません</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit/Add Event Form */}
        {editingEvent && (
          <EventEditModal 
            event={editingEvent} 
            onSave={handleSaveEvent} 
            onClose={() => setEditingEvent(null)} 
            saving={saving} 
          />
        )}
        {/* Edit/Add Product Form */}
        {editingProduct && (
          <ProductEditModal 
            product={editingProduct} 
            onSave={handleSaveProduct} 
            onClose={() => setEditingProduct(null)} 
            saving={saving} 
          />
        )}

        {/* Edit/Add Creator Form */}
        {editingCreator && (
          <CreatorEditModal 
            creator={editingCreator} 
            onSave={handleSaveCreator} 
            onClose={() => setEditingCreator(null)} 
            saving={saving} 
          />
        )}

        {/* Product Deleting Modal */}
        {deletingProductId && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-artistic-text rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] w-full max-w-md overflow-hidden">
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-pink/20">
                <h3 className="text-2xl font-black text-artistic-text">商品を削除</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="font-bold text-lg">この商品を削除してもよろしいですか？</p>
                <p className="text-sm opacity-70">※この操作は取り消せません。</p>
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => {
                      handleDeleteProduct(deletingProductId);
                      setDeletingProductId(null);
                    }}
                    disabled={saving}
                    className="flex-1 bg-artistic-pink text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                    {saving ? '削除中...' : '削除する'}
                  </button>
                  <button 
                    onClick={() => setDeletingProductId(null)}
                    disabled={saving}
                    className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deleting Modal */}
        {deletingEventId && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-artistic-text rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] w-full max-w-md overflow-hidden">
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-pink/20">
                <h3 className="text-2xl font-black text-artistic-text">イベントを削除</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="font-bold text-lg">このイベントを削除してもよろしいですか？</p>
                <p className="text-sm opacity-70">※この操作は取り消せません。</p>
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => {
                      handleDeleteEvent(deletingEventId);
                      setDeletingEventId(null);
                    }}
                    disabled={saving}
                    className="flex-1 bg-artistic-pink text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                    {saving ? '削除中...' : '削除する'}
                  </button>
                  <button 
                    onClick={() => setDeletingEventId(null)}
                    disabled={saving}
                    className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Deleting Modal */}
        {deletingFeedbackId && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-artistic-text rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] w-full max-w-md overflow-hidden">
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-pink/20">
                <h3 className="text-2xl font-black text-artistic-text">フィードバックを削除</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="font-bold text-lg">このフィードバックを削除してもよろしいですか？</p>
                <p className="text-sm opacity-70">※この操作は取り消せません。</p>
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => {
                      handleDeleteFeedback(deletingFeedbackId);
                    }}
                    disabled={saving}
                    className="flex-1 bg-artistic-pink text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                    {saving ? '削除中...' : '削除する'}
                  </button>
                  <button 
                    onClick={() => setDeletingFeedbackId(null)}
                    disabled={saving}
                    className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Creator Deleting Modal */}
        {deletingCreatorId && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border-4 border-artistic-text rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(42,42,42,1)] w-full max-w-md overflow-hidden">
              <div className="p-8 border-b-4 border-artistic-text bg-artistic-pink/20">
                <h3 className="text-2xl font-black text-artistic-text">クリエイターを削除</h3>
              </div>
              <div className="p-8 space-y-6">
                <p className="font-bold text-lg">このクリエイターを削除してもよろしいですか？</p>
                <p className="text-sm opacity-70">※この操作は取り消せません。</p>
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => {
                      handleDeleteCreator(deletingCreatorId);
                    }}
                    disabled={saving}
                    className="flex-1 bg-artistic-pink text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={20} />
                    {saving ? '削除中...' : '削除する'}
                  </button>
                  <button 
                    onClick={() => setDeletingCreatorId(null)}
                    disabled={saving}
                    className="px-8 border-2 border-artistic-text font-black rounded-xl hover:bg-neutral-100"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
