import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingBag, ArrowLeft, Heart, Check, Loader2, AlertCircle } from "lucide-react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { loadStripe } from "@stripe/stripe-js";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  status: "active" | "sold_out" | "hidden";
  stripePriceId?: string;
}

let stripePromise: Promise<any> | null = null;
let cachedPublishableKey: string | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    let key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
              (import.meta.env as any).VITE_STRIPE_PUBLISH ||
              (import.meta.env as any).VITE_STRIPE_PUBLISHABLE;

    // Reliability fallback: Fetch from server if not in client env
    if (!key) {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const config = await res.json();
          key = config.stripePublishableKey;
          console.log("Stripe key fetched from server config:", key ? "found" : "not found");
        }
      } catch (err) {
        console.error("Failed to fetch Stripe config from server:", err);
      }
    }

    if (!key) {
      console.warn("Stripe Publishable Key is missing. Please set 'VITE_STRIPE_PUBLISHABLE_KEY' in the Settings menu (Secrets).");
      return null;
    }

    if (key.startsWith('sk_')) {
      console.error("CRITICAL: Stripe Publishable Key starts with 'sk_'. This is a SECRET key and should not be on the client side. Please use the key starting with 'pk_'.");
      alert("エラー: 公開可能キー(Publishable Key)にシークレットキー(Secret Key)が設定されている可能性があります。設定を確認してください。");
    }

    console.log("Initializing Stripe with key starting with:", key.substring(0, 7));
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    // Backend health check
    fetch("/api/config")
      .then(res => res.json())
      .then(config => {
        console.log("Backend config check:", config.stripePublishableKey ? "Key found" : "Key missing");
      })
      .catch(err => {
        console.error("Backend unreachable from Shop component:", err);
      });

    const q = query(
      collection(db, "products"),
      where("status", "!=", "hidden"),
      orderBy("status"),
      orderBy("order", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error("Shop products fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckout = async (product: Product) => {
    if (!product.stripePriceId) {
      console.warn("Product stripePriceId is missing:", product.name);
      alert("【管理者向け】StripeのPrice IDが設定されていません。\n1. Stripeで商品を作成\n2. price_...で始まる価格IDを取得\n3. /admin画面で商品の設定に貼り付け\nを行ってください。");
      return;
    }

    setCheckoutLoading(product.id);
    try {
      console.log("Starting checkout process for:", product.name, "with Price ID:", product.stripePriceId);
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: product.stripePriceId,
          productId: product.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const session = await response.json();
      if (!session.url) {
        throw new Error("No checkout URL returned from server.");
      }

      console.log("Redirecting to checkout URL:", session.url);
      
      // Iframe内でのブロックを回避するため、新しいタブで開くことを試みます
      const checkoutWindow = window.open(session.url, '_blank');
      
      if (!checkoutWindow || checkoutWindow.closed || typeof checkoutWindow.closed === 'undefined') {
        // ポップアップがブロックされた場合は、現在のウィンドウで遷移を試行
        window.location.href = session.url;
      } else {
        // 別タブで開いた場合は、元のアプリ画面が固まらないようにローディングを解除
        setTimeout(() => setCheckoutLoading(null), 3000);
      }
      
    } catch (error: any) {
      setCheckoutLoading(null);
      console.error("Checkout error details:", error);
      alert(`エラーが発生しました: ${error.message || "お手数ですが管理者にお問い合わせください。"}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-artistic-bg flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-artistic-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-artistic-bg text-artistic-text p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-3 block">rOOM8 Merchandise</span>
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-none">
              SH<span className="text-artistic-primary underline decoration-artistic-accent underline-offset-8">OP</span>
            </h1>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-artistic-text rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <ArrowLeft size={18} /> ギャラリーへ戻る
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border-4 border-artistic-text p-12 rounded-[2.5rem] text-center shadow-[12px_12px_0px_0px_rgba(42,42,42,1)]">
            <ShoppingBag className="w-16 h-16 mx-auto mb-6 opacity-20" />
            <h2 className="text-2xl font-black mb-2">現在、販売中のアイテムはありません</h2>
            <p className="font-bold opacity-60">新しいアイテムの追加をお待ちください！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white border-2 border-artistic-text rounded-[2.5rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(42,42,42,1)] group"
              >
                <div className="aspect-square relative overflow-hidden bg-stone-100 border-b-2 border-artistic-text">
                  <img
                    src={product.imageUrl || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800&auto=format&fit=crop"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {product.status === "sold_out" && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-white text-artistic-text px-8 py-3 rounded-full font-black text-2xl rotate-[-12deg] border-2 border-artistic-text shadow-xl">
                        SOLD OUT
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black tracking-tight leading-tight">{product.name}</h3>
                    <div className="text-xl font-mono font-black text-artistic-primary italic">
                      ¥{product.price.toLocaleString()}<span className="text-[10px] ml-1 opacity-60 not-italic font-bold tracking-normal">(税込)</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold opacity-70 mb-8 leading-relaxed italic">
                    {product.description}
                  </p>
                  
                  <button
                    onClick={() => handleCheckout(product)}
                    disabled={product.status === "sold_out" || checkoutLoading === product.id}
                    className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all border-2 border-artistic-text shadow-[4px_4px_0px_0px_rgba(42,42,42,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                      product.status === "sold_out"
                        ? "bg-stone-100 text-stone-400 border-stone-200 shadow-none cursor-not-allowed"
                        : "bg-artistic-primary text-white hover:bg-artistic-primary/90"
                    }`}
                  >
                    {checkoutLoading === product.id ? (
                      <Loader2 className="animate-spin" />
                    ) : product.status === "sold_out" ? (
                      "売り切れ"
                    ) : (
                      <>
                        <ShoppingBag size={24} strokeWidth={3} />
                        購入する
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-20 border-t-2 border-dashed border-artistic-text/20 pt-12 flex flex-col md:flex-row gap-8 items-center justify-between text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white border-2 border-artistic-text rounded-2xl flex items-center justify-center rotate-[-6deg] shadow-sm">
              <Heart className="text-artistic-pink" strokeWidth={3} />
            </div>
            <div>
              <h4 className="font-black text-lg">収益について</h4>
              <p className="text-sm font-bold opacity-60">こちらの収益はrOOM8の活動運営費に使用させていただきます。</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold opacity-40 italic">
            <Check size={14} /> セキュアな決済処理（Stripe）を使用しています
          </div>
        </div>
      </div>
    </div>
  );
}
