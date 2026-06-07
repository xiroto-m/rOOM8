import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Upload, X, Check, Save, Eye, Edit2 } from 'lucide-react';
import Masonry from 'react-masonry-css';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface GalleryImage {
  id: string;
  url: string;
  createdAt: number;
  order: number;
}

export default function PrivacyGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [blurRadius, setBlurRadius] = useState(20);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('room8_is_admin') === 'true' || !!auth.currentUser);
  const [isEditMode, setIsEditMode] = useState(localStorage.getItem('room8_is_admin') === 'true' || !!auth.currentUser);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const adminStatus = localStorage.getItem('room8_is_admin') === 'true' || !!user;
      setIsAdmin(adminStatus);
      setIsEditMode(adminStatus);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryImage[];
      setImages(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'gallery');
    });

    return () => unsubscribe();
  }, []);

  // Migrate any existing local storage images to Firestore for the admin
  useEffect(() => {
    if (isAdmin) {
      const stored = localStorage.getItem('room8_gallery');
      if (stored) {
        try {
          const localImages = JSON.parse(stored) as any[];
          if (localImages && localImages.length > 0) {
            // Give it a tiny delay to ensure db is ready
            setTimeout(() => {
              localImages.forEach(async (img, idx) => {
                const id = img.id || Date.now().toString() + idx;
                try {
                  await setDoc(doc(db, 'gallery', id), {
                    url: img.url,
                    createdAt: img.createdAt || Date.now(),
                    order: img.order !== undefined ? img.order : idx
                  });
                } catch(e) {
                  console.error('Error during migration of image', e);
                }
              });
              localStorage.removeItem('room8_gallery');
            }, 1000);
          }
        } catch (e) {
          console.error('Failed to parse local images', e);
        }
      }
    }
  }, [isAdmin]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setEditingImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (editingImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        // Calculate responsive size
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.6;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Store original image data for blur operations
        canvas.dataset.originalWidth = width.toString();
        canvas.dataset.originalHeight = height.toString();
      };
      img.src = editingImage;
    }
  }, [editingImage]);

  const applyBlur = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Apply pixelation effect
    const size = blurRadius;
    const w = canvas.width;
    const h = canvas.height;

    // Get pixel data around the mouse
    const brushSize = size * 2;
    const px = Math.max(0, x - brushSize/2);
    const py = Math.max(0, y - brushSize/2);
    const pw = Math.min(brushSize, w - px);
    const ph = Math.min(brushSize, h - py);
    
    if (pw <= 0 || ph <= 0) return;

    const imageData = ctx.getImageData(px, py, pw, ph);
    const data = imageData.data;
    
    // Pixelate
    const pixelSize = 10; // block size
    for (let by = 0; by < ph; by += pixelSize) {
      for (let bx = 0; bx < pw; bx += pixelSize) {
        // Get average color of this block
        let r = 0, g = 0, b = 0, count = 0;
        for (let iby = 0; iby < pixelSize && by + iby < ph; iby++) {
          for (let ibx = 0; ibx < pixelSize && bx + ibx < pw; ibx++) {
            const i = ((by + iby) * pw + (bx + ibx)) * 4;
            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
          }
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Fill block
        for (let iby = 0; iby < pixelSize && by + iby < ph; iby++) {
          for (let ibx = 0; ibx < pixelSize && bx + ibx < pw; ibx++) {
            const dx = (bx + ibx) - (pw / 2);
            const dy = (by + iby) - (ph / 2);
            // Circle brush
            if (dx * dx + dy * dy <= (brushSize/2) * (brushSize/2)) {
              const i = ((by + iby) * pw + (bx + ibx)) * 4;
              data[i] = r;
              data[i+1] = g;
              data[i+2] = b;
            }
          }
        }
      }
    }
    ctx.putImageData(imageData, px, py);
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    
    // Check dataUrl size
    if (dataUrl.length > 1048000) {
      alert("加工後の画像サイズが大きすぎます。もう少し小さくしてください。");
      return;
    }

    const id = Date.now().toString();
    const newImage: GalleryImage = {
      id,
      url: dataUrl,
      createdAt: Date.now(),
      order: images.length > 0 ? (images[0].order || 0) - 1 : 0
    };

    setEditingImage(null);

    try {
      await setDoc(doc(db, 'gallery', id), newImage);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `gallery/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("この画像を削除しますか？")) {
      try {
        await deleteDoc(doc(db, 'gallery', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before styling the original element
    setTimeout(() => {
      const target = e.target as HTMLElement;
      if (target && target.style) {
         target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (!isEditMode) return;
    setDraggedId(null);
    const target = e.target as HTMLElement;
    if (target && target.style) {
      target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const oldIndex = images.findIndex((img) => img.id === draggedId);
    const newIndex = images.findIndex((img) => img.id === targetId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newImages = [...images];
      const [movedItem] = newImages.splice(oldIndex, 1);
      newImages.splice(newIndex, 0, movedItem);

      // Re-assign order based on new position
      newImages.forEach(async (img, idx) => {
        if (img.order !== idx) {
          try {
            await setDoc(doc(db, 'gallery', img.id), { ...img, order: idx }, { merge: true });
          } catch(error) {
            console.error("Error updating order", error);
          }
        }
      });
    }
    setDraggedId(null);
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 flex items-center gap-3 tracking-tighter">
            <Camera className="text-artistic-pink" size={36} strokeWidth={3} /> ROOM8's Atmosphere
            {isAdmin && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className="ml-4 text-sm bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors border-2 border-transparent hover:border-stone-300"
              >
                {isEditMode ? <><Eye size={16} /> プレビュー</> : <><Edit2 size={16} /> 編集モード</>}
              </button>
            )}
          </h2>
          {isEditMode ? (
            <p className="text-artistic-text/70 font-bold max-w-xl">
              ギャラリーに写真を追加して公開できます。<br />
              アップロード前に顔などをなぞると、モザイク処理ができるプライバシーフィルター機能付きです。
            </p>
          ) : (
            <p className="text-artistic-text/70 font-bold max-w-xl">
              ルームエイトの思い出ギャラリーです。<br />
              （※プライバシー保護のため、一部画像を加工しています）
            </p>
          )}
        </div>
        
        {isEditMode && (
          <div className="relative group shrink-0">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <button className="bg-artistic-primary text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 border-2 border-artistic-text shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] group-hover:shadow-[2px_2px_0px_0px_rgba(42,42,42,1)] group-hover:translate-x-[4px] group-hover:translate-y-[4px] transition-all">
              <Upload size={20} strokeWidth={3} />
              写真を追加する
            </button>
          </div>
        )}
      </div>

      {images.length > 0 ? (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex -ml-6 w-auto"
          columnClassName="pl-6 bg-clip-padding space-y-6"
        >
          {images.map((img) => (
            <motion.div 
              key={img.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              draggable={isEditMode}
              onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, img.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, img.id)}
              className={`relative group border-2 border-artistic-text rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(42,42,42,1)] ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <img src={img.url} alt="Gallery item" className="w-full h-auto block" />
              {isEditMode && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => handleDelete(img.id)}
                    className="bg-white text-artistic-text border-2 border-artistic-text p-3 rounded-xl font-black hover:bg-artistic-pink hover:text-white transition-colors"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </Masonry>
      ) : (
        <div className="bg-white border-4 border-dashed border-artistic-text/30 p-16 rounded-[2.5rem] text-center flex flex-col items-center justify-center">
          <div className="bg-stone-100 p-6 rounded-full mb-6">
            <Camera size={48} className="text-stone-300" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-black text-stone-400 mb-2">写真はまだありません</h3>
          {isEditMode && (
            <p className="text-sm font-bold text-stone-400">「写真を追加する」ボタンから、思い出をシェアしよう！</p>
          )}
        </div>
      )}

      {/* Editing Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-[200] bg-artistic-text/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-4 border-artistic-text rounded-[2.5rem] shadow-[24px_24px_0px_0px_rgba(42,42,42,1)] max-w-5xl w-full overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b-2 border-artistic-text bg-artistic-accent flex justify-between items-center">
              <div>
                <h3 className="font-black text-2xl flex items-center gap-2">
                  <Camera size={24} /> プライバシーフィルター
                </h3>
                <p className="font-bold text-sm opacity-70 mt-1">
                  顔など隠したい部分をマウスや指でなぞると、モザイクがかかります。
                </p>
              </div>
              <button 
                onClick={() => setEditingImage(null)}
                className="bg-white border-2 border-artistic-text p-2 rounded-xl hover:scale-110 transition-transform"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-4 bg-stone-100 flex-1 overflow-auto flex items-center justify-center relative touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={(e) => { setIsDrawing(true); applyBlur(e); }}
                onMouseMove={applyBlur}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={(e) => { setIsDrawing(true); applyBlur(e); }}
                onTouchMove={(e) => {
                  // Prevent scrolling while drawing on mobile
                  e.preventDefault();
                  applyBlur(e);
                }}
                onTouchEnd={() => setIsDrawing(false)}
                className="border-4 border-white shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] rounded-xl cursor-crosshair touch-none"
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </div>
            
            <div className="p-6 border-t-2 border-artistic-text bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <span className="font-black text-sm uppercase opacity-40 tracking-widest">Brush Size</span>
                <input 
                  type="range" 
                  min="10" 
                  max="60" 
                  value={blurRadius} 
                  onChange={(e) => setBlurRadius(Number(e.target.value))}
                  className="w-32 accent-artistic-primary"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setEditingImage(null)}
                  className="px-6 py-3 font-black text-artistic-text hover:bg-stone-100 rounded-xl transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-artistic-primary text-white border-2 border-artistic-text px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:scale-105 transition-transform shadow-[4px_4px_0px_0px_rgba(42,42,42,1)]"
                >
                  <Save size={20} strokeWidth={3} />
                  ギャラリーに追加
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
