/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Coffee, 
  Trash2, 
  Edit3, 
  Search, 
  Info, 
  Plus, 
  Minus, 
  RefreshCw, 
  Check, 
  User, 
  DollarSign, 
  Clock, 
  Sparkles, 
  Copy, 
  Heart,
  ChevronRight
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// Google Apps Script GAS API 連線端點
const API_URL = "https://script.google.com/macros/s/AKfycbyWro1jxxyPIczQatxTTckSNi3ttDz58ybxZIrJUDMW2ufX2f5b89VgZqQFmfG84wOP/exec";

// 飲品介面定義
interface DrinkItem {
  name: string;
  price: number;
  category: string;
  description: string;
}

// 訂單介面定義
interface OrderItem {
  orderId?: string;
  timestamp?: string;
  name: string;
  drink: string;
  sugar: string;
  ice: string;
  quantity: number;
  totalPrice: number;
}

// 預設高品質茶飲菜單
const DEFAULT_MENU: DrinkItem[] = [
  { name: "蜜香紅玉紅茶", price: 40, category: "原味經典茶", description: "台茶 18 號紅玉，帶有獨特天然肉桂與薄荷薄甜香氣，茶感溫潤。" },
  { name: "茉香金萱青茶", price: 35, category: "原味經典茶", description: "選用高山優質金萱茶葉，茶湯淺綠滑順，帶有柔和茉莉花香與淡淡奶蜜香。" },
  { name: "經典冰焙熟成綠", price: 35, category: "原味經典茶", description: "經過低溫徐徐烘焙，保留綠茶兒茶素與清新茶感，香氣悠長回甘。" },
  { name: "靜岡抹茶鮮奶茶", price: 65, category: "小農香醇鮮奶", description: "採用日本靜岡石磨宇治抹茶，融入小農特A級乳源，濃郁微苦層次鮮明。" },
  { name: "手作黑糖初鹿鮮奶", price: 70, category: "小農香醇鮮奶", description: "慢熬手炒手工黑糖蜜，搭配台東初鹿鮮乳。本身不額外加糖，Q彈香濃。" },
  { name: "觀音岩鹽鮮奶蓋", price: 60, category: "小農香醇鮮奶", description: "厚實沉穩的鐵觀音茶底，頂部覆蓋上厚達3公分之特製玫瑰鹽鮮奶油乾起司。" },
  { name: "古法仙草凍皇家奶茶", price: 55, category: "私藏濃郁奶茶", description: "滑嫩的古法大柴燒純手工仙草凍，搭配黃金比例厚醇皇家奶茶。" },
  { name: "香Q雙Q醇厚奶茶", price: 55, category: "私藏濃郁奶茶", description: "同時加入古早味椰果與香甜黑糖波霸，雙重咀嚼口感，完美下午茶救星。" },
  { name: "鮮果百香香檸雙響", price: 60, category: "極鮮特調果茶", description: "埔里鮮百香果原粒，融合新鮮綠皮檸檬汁，與招牌鮮綠茶碰撞出酸甜交響樂。" },
  { name: "芝芝海鹽粉荔鮮鮮", price: 75, category: "極鮮特調果茶", description: "新鮮荔枝搗碎融入綠茶冰沙，配上香濃海鹽芝士奶蓋，粉亮剔透少女心最愛。" },
  { name: "小農琥珀厚拿鐵", price: 75, category: "經典現磨咖啡", description: "嚴選衣索比亞莊園級中焙咖啡豆，豐富濃郁豐厚油脂，極致順口滑嫩產品質量。" },
  { name: "焦糖燕麥玛奇朵", price: 85, category: "經典現磨咖啡", description: "選用優質 Oatly 燕麥奶，焦糖畫花絲滑香甜，乳糖不耐同仁的首選星級享受。" }
];

const SUGAR_OPTIONS = ["正常糖", "七分糖", "半糖", "微糖", "無糖"];
const ICE_OPTIONS = ["正常冰", "少冰", "微冰", "去冰", "溫熱"];

interface Toast {
  id: string;
  message: string;
  type: "success" | "warn" | "info";
}

export default function App() {
  const [menu, setMenu] = useState<DrinkItem[]>(DEFAULT_MENU);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 表單資料狀態
  const [formData, setFormData] = useState({
    name: "",
    selectedDrink: DEFAULT_MENU[0],
    sugar: "半糖",
    ice: "少冰",
    quantity: 1,
    totalPrice: DEFAULT_MENU[0].price
  });

  // 編輯與篩選狀態
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [menuSearch, setMenuSearch] = useState("");

  const formRef = useRef<HTMLDivElement>(null);

  // 一鍵複製文案
  const categories = useMemo(() => {
    const cats = new Set(menu.map(item => item.category));
    return ["All", ...Array.from(cats)];
  }, [menu]);

  // Toast 通知機制
  const showToast = (message: string, type: "success" | "warn" | "info" = "success") => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // 載入雲端或本地暫存資料
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(API_URL, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("API 連結失敗");
      const res = await response.json();

      if (res && res.menu) {
        setMenu(res.menu.length > 0 ? res.menu : DEFAULT_MENU);
        setOrders(res.orders || []);
        setIsFallback(false);
        setApiStatus("online");
        if (!silent) showToast("今日點單與茶品菜單已成功同步雲端！", "success");
      } else {
        throw new Error("格式異常");
      }
    } catch (error) {
      console.warn("無法取得雲端 Sheets 資料，改用 LocalStorage fallback 本機離線模式:", error);
      setMenu(DEFAULT_MENU);
      setApiStatus("offline");
      setIsFallback(true);

      const stored = localStorage.getItem("office_drink_orders");
      if (stored) {
        setOrders(JSON.parse(stored));
      } else {
        setOrders([]);
      }
      if (!silent) showToast("已自動切換至「本機暫存模式」運行", "info");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 快速更換飲料
  const handleSelectDrink = (drink: DrinkItem) => {
    setFormData(prev => ({
      ...prev,
      selectedDrink: drink,
      totalPrice: drink.price * prev.quantity
    }));
  };

  // 數量改變
  const adjustQuantity = (amount: number) => {
    setFormData(prev => {
      const nextQty = Math.max(1, prev.quantity + amount);
      return {
        ...prev,
        quantity: nextQty,
        totalPrice: prev.selectedDrink ? prev.selectedDrink.price * nextQty : 0
      };
    });
  };

  // 送出表單 (新增或更新)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("請輸入訂購人姓名！", "warn");
      return;
    }

    if (!formData.selectedDrink) {
      showToast("請選擇飲料款！", "warn");
      return;
    }

    setActionLoading(true);

    const payload = {
      action: editingOrderId ? "update" : "create",
      data: {
        orderId: editingOrderId || undefined,
        name: formData.name.trim(),
        drink: formData.selectedDrink.name,
        sugar: formData.sugar,
        ice: formData.ice,
        quantity: formData.quantity,
        totalPrice: formData.totalPrice
      }
    };

    if (isFallback || apiStatus === "offline") {
      // ─── Local 本機暫存模式 ───
      setTimeout(() => {
        let updatedOrders = [...orders];
        if (editingOrderId) {
          updatedOrders = updatedOrders.map(o => 
            o.orderId === editingOrderId 
              ? { ...o, ...payload.data, timestamp: o.timestamp || new Date().toISOString() }
              : o
          );
          showToast("點單修改成功(已更新至本機)", "success");
        } else {
          const localId = "local-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
          updatedOrders.push({
            orderId: localId,
            timestamp: new Date().toISOString(),
            ...payload.data
          });
          showToast("點單記錄成功！(記錄於本機暫存)", "success");
        }
        setOrders(updatedOrders);
        localStorage.setItem("office_drink_orders", JSON.stringify(updatedOrders));

        setFormData(prev => ({
          ...prev,
          selectedDrink: menu[0] || DEFAULT_MENU[0],
          sugar: "半糖",
          ice: "少冰",
          quantity: 1,
          totalPrice: (menu[0] || DEFAULT_MENU[0]).price
        }));
        setEditingOrderId(null);
        setActionLoading(false);
      }, 350);
    } else {
      // ─── 線上雲端模式 ───
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9500);

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await res.json();
        if (result && result.status === "success") {
          showToast(editingOrderId ? "訂單修改成功已同步雲端！" : "訂單登錄成功，並實時寫入 Google Sheets！", "success");
          await loadData(true);

          setFormData(prev => ({
            ...prev,
            selectedDrink: menu[0] || DEFAULT_MENU[0],
            sugar: "半糖",
            ice: "少冰",
            quantity: 1,
            totalPrice: (menu[0] || DEFAULT_MENU[0]).price
          }));
          setEditingOrderId(null);
        } else {
          throw new Error(result ? result.message : "發生異常");
        }
      } catch (err) {
        console.error("寫入雲端失敗，已自動降級至本地存儲:", err);
        showToast("雲端連網出錯，已為您安全保存於本機", "warn");
        setApiStatus("offline");
        setIsFallback(true);

        let updatedOrders = [...orders];
        if (editingOrderId) {
          updatedOrders = updatedOrders.map(o => 
            o.orderId === editingOrderId ? { ...o, ...payload.data } : o
          );
        } else {
          updatedOrders.push({
            orderId: "local-" + Date.now(),
            timestamp: new Date().toISOString(),
            ...payload.data
          });
        }
        setOrders(updatedOrders);
        localStorage.setItem("office_drink_orders", JSON.stringify(updatedOrders));
      } finally {
        setActionLoading(false);
      }
    }
  };

  // 按下編輯：載入值
  const handleStartEdit = (order: OrderItem) => {
    let matchingDrink = menu.find(d => d.name === order.drink);
    if (!matchingDrink) {
      matchingDrink = {
        name: order.drink,
        price: order.totalPrice / order.quantity,
        category: "其他",
        description: "今日點單飲品"
      };
    }

    setEditingOrderId(order.orderId || null);
    setFormData({
      name: order.name,
      selectedDrink: matchingDrink,
      sugar: order.sugar,
      ice: order.ice,
      quantity: order.quantity,
      totalPrice: order.totalPrice
    });

    showToast(`已載入 ${order.name} 的點單。`, "info");

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setFormData(prev => ({
      ...prev,
      selectedDrink: menu[0] || DEFAULT_MENU[0],
      sugar: "半糖",
      ice: "少冰",
      quantity: 1,
      totalPrice: (menu[0] || DEFAULT_MENU[0]).price
    }));
    showToast("已退出修改模式", "info");
  };

  // 刪除訂單
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("您確定要刪除此筆點餐項目？")) return;

    setActionLoading(true);

    if (isFallback || apiStatus === "offline") {
      const nextOrders = orders.filter(o => o.orderId !== orderId);
      setOrders(nextOrders);
      localStorage.setItem("office_drink_orders", JSON.stringify(nextOrders));
      showToast("訂單已於本機移除！", "success");
      setActionLoading(false);
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "delete",
            data: { orderId }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await res.json();
        if (result && result.status === "success") {
          showToast("已成功移出雲端 Sheets！", "success");
          await loadData(true);
        } else {
          throw new Error();
        }
      } catch (err) {
        console.error("雲端刪除失敗，本機強制移除一波:", err);
        const nextOrders = orders.filter(o => o.orderId !== orderId);
        setOrders(nextOrders);
        localStorage.setItem("office_drink_orders", JSON.stringify(nextOrders));
        setApiStatus("offline");
        setIsFallback(true);
        showToast("本網連線受阻，改於本機移除訂單", "warn");
      } finally {
        setActionLoading(false);
      }
    }
  };

  // 產生複製文案
  const statsSummaryText = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalQty = 0;
    let totalPrice = 0;

    orders.forEach(o => {
      const key = `${o.drink} (${o.sugar}/${o.ice})`;
      counts[key] = (counts[key] || 0) + o.quantity;
      totalQty += o.quantity;
      totalPrice += o.totalPrice;
    });

    const listString = Object.entries(counts)
      .map(([drinkStyle, qty]) => `• ${drinkStyle} x ${qty} 杯`)
      .join("\n");

    const todayStr = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });

    return `【辦公室飲料本日訂單 🧋 ${todayStr} 】\n\n點餐明細：\n${listString || "（目前暫無訂購項目）"}\n\n────────────────\n共計： ${totalQty} 杯 | 總金額： $${totalPrice} 元 \n\n產自辦公室飲料訂購系統`;
  }, [orders]);

  const handleCopyStats = () => {
    if (orders.length === 0) {
      showToast("今天尚未有人點單唷！", "warn");
      return;
    }
    navigator.clipboard.writeText(statsSummaryText)
      .then(() => showToast("統計報表已複製到剪貼簿，可直接在 Line 中貼下對帳！", "success"))
      .catch(() => showToast("複製失敗，請手動複製", "warn"));
  };

  const orderSummary = useMemo(() => {
    const totalAmount = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalCups = orders.reduce((sum, o) => sum + o.quantity, 0);
    const uniquePeeps = new Set(orders.map(o => o.name)).size;

    const drinkCounts: Record<string, number> = {};
    orders.forEach(o => {
      drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + o.quantity;
    });
    const popularDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "無";

    return { totalAmount, totalCups, uniquePeeps, popularDrink };
  }, [orders]);

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                          item.description.toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menu, selectedCategory, menuSearch]);

  return (
    <div className="relative min-h-screen flex flex-col pb-20 bg-slate-50 text-slate-800 selection:bg-indigo-600 selection:text-white font-sans">
      
      {/* Dynamic Toast System */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div 
              key={t.id} 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md pointer-events-auto transition-all ${
                t.type === 'success' 
                  ? 'bg-emerald-500/95 border-emerald-400 text-white' 
                  : t.type === 'warn'
                  ? 'bg-rose-500/95 border-rose-400 text-white'
                  : 'bg-indigo-600/95 border-indigo-500 text-white'
              }`}
            >
              {t.type === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
              {t.type === 'warn' && <Info className="w-5 h-5 flex-shrink-0 text-red-100" />}
              {t.type === 'info' && <Sparkles className="w-5 h-5 flex-shrink-0 text-indigo-100" />}
              <p className="text-sm font-semibold leading-relaxed font-sans">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Panel */}
      <header className="bg-white border-b border-slate-200 shadow-sm flex-shrink-0 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md flex-shrink-0"
            >
              <Coffee className="w-6 h-6 text-white" strokeWidth={2} />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                辦公室飲料訂購系統 <span className="text-[10px] tracking-widest text-indigo-700 font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">VITE-CORE</span>
              </h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">
                Office Beverage Order System • 揪團下午茶，一杯好茶開拓今日靈感 ✨
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md ${
                apiStatus === "online" 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                  : apiStatus === "offline"
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span className={`w-2 h-2 rounded-full inline-block ${
                apiStatus === "online" 
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                  : apiStatus === "offline" 
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  : "bg-slate-400"
              }`}></span>
              {apiStatus === "online" ? "雲端 Google Sheets 已啟動工件" : "本機高可靠離線運作"}
            </div>

            <button
              onClick={() => loadData()}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-100 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "同步中..." : "重新整理"}
            </button>
          </div>
        </div>
      </header>

      {/* Bento Bento Statistics */}
      <section className="max-w-7xl mx-auto w-full px-6 mt-8 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 bg-white p-6 rounded-3xl border border-slate-200/50 shadow-sm">
          
          <div className="p-4 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/10 border border-slate-100 flex items-center gap-4 transition-all duration-200">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider">本日點單總量</p>
              <p className="text-xl lg:text-2xl font-black text-slate-900 leading-none mt-1.5 flex items-baseline gap-1">
                {orderSummary.totalCups} <span className="text-xs font-normal text-slate-500">杯</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/50 hover:bg-emerald-50/10 border border-slate-100 flex items-center gap-4 transition-all duration-200">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider">統計總金額</p>
              <p className="text-xl lg:text-2xl font-black text-indigo-600 leading-none mt-1.5 flex items-baseline gap-0.5">
                <span className="text-sm font-semibold">$</span>{orderSummary.totalAmount}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/50 hover:bg-violet-50/10 border border-slate-100 flex items-center gap-4 transition-all duration-200">
            <div className="p-3.5 bg-violet-50 text-violet-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider">今日參與人氣</p>
              <p className="text-xl lg:text-2xl font-black text-slate-900 leading-none mt-1.5 flex items-baseline gap-1">
                {orderSummary.uniquePeeps} <span className="text-xs font-normal text-slate-500">人</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/50 hover:bg-pink-50/10 border border-slate-100 flex items-center gap-4 transition-all duration-200">
            <div className="p-3.5 bg-pink-50 text-pink-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider">本日人氣最夯</p>
              <p className="text-xs lg:text-sm font-black text-slate-900 leading-tight mt-1.5 truncate max-w-[130px]" title={orderSummary.popularDrink}>
                {orderSummary.popularDrink}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto w-full px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Fill Order Card */}
        <section ref={formRef} className="lg:col-span-5 flex flex-col gap-6">
          <div className={`bg-white rounded-3xl border border-slate-150 shadow-sm transition-all duration-300 relative overflow-hidden ${
            editingOrderId ? "ring-2 ring-indigo-500/70 shadow-lg" : ""
          }`}>
            
            {editingOrderId && (
              <div className="bg-indigo-600 px-6 py-2.5 flex items-center justify-between text-white font-semibold text-xs">
                <span className="flex items-center gap-1.5 leading-none">
                  <Edit3 className="w-4 h-4 animate-bounce" />
                  您正在編輯 【{formData.name}】 的點單內容
                </span>
                <button 
                  onClick={handleCancelEdit}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/35 rounded text-[10px] font-bold cursor-pointer transition text-white"
                >
                  取消編輯
                </button>
              </div>
            )}

            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-indigo-650 rounded-full inline-block"></span>
                {editingOrderId ? "修改今日點單" : "立即點單"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 ml-3">選定您今日午茶的幸運特調，快樂工作不塞車！</p>

              <form onSubmit={handleSubmitOrder} className="mt-6 flex flex-col gap-5">
                
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">01. 訂購人姓名 <span className="text-rose-500">*</span></label>
                  <div className="mt-2 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-404">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="請輸入姓名 (如: 王小明)"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Selected Drink info Card */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">02. 已選定飲品</label>
                  {formData.selectedDrink ? (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100/70 rounded-2xl flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold tracking-wide">
                            {formData.selectedDrink.category}
                          </span>
                          <span className="text-slate-300 text-xs">|</span>
                          <span className="text-sm font-bold text-slate-800">{formData.selectedDrink.name}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed italic pr-2">
                          「 {formData.selectedDrink.description || "美味的手調午後茶飲！"} 」
                        </p>
                      </div>
                      <p className="text-base font-black text-slate-800 flex-shrink-0">
                        ${formData.selectedDrink.price}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 p-3.5 rounded-2xl font-bold">請在右側或下方菜單選一杯飲料！</p>
                  )}
                </div>

                {/* Sugar Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">03. 甜度選擇</label>
                  <div className="grid grid-cols-5 gap-2">
                    {SUGAR_OPTIONS.map(sugarOpt => (
                      <button
                        key={sugarOpt}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, sugar: sugarOpt }))}
                        className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          formData.sugar === sugarOpt
                            ? "bg-indigo-50 border border-indigo-200 text-indigo-600"
                            : "bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50/55"
                        }`}
                      >
                        {sugarOpt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ice Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">04. 冰塊選擇</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICE_OPTIONS.map(iceOpt => (
                      <button
                        key={iceOpt}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, ice: iceOpt }))}
                        className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          formData.ice === iceOpt
                            ? "bg-indigo-50 border border-indigo-200 text-indigo-600"
                            : "bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50/55"
                        }`}
                      >
                        {iceOpt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">05. 訂購杯數</label>
                    <p className="text-[11px] text-slate-400 mt-0.5 ml-1">預約下午好能量</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => adjustQuantity(-1)}
                      className="w-8 h-8 rounded-full border border-slate-350 bg-white hover:bg-slate-50 active:scale-92 flex items-center justify-center font-bold cursor-pointer transition shadow-sm"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <span className="w-8 text-center text-base font-black text-slate-800 font-mono">
                      {formData.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQuantity(1)}
                      className="w-8 h-8 rounded-full border border-slate-350 bg-white hover:bg-slate-50 active:scale-92 flex items-center justify-center font-bold cursor-pointer transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Total and Submit Button Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 pt-4 mt-4 flex items-center justify-between relative overflow-hidden">
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase ml-0.5">預計總額</p>
                    <p className="text-2xl font-black text-indigo-600 font-sans mt-0.5">${formData.totalPrice} <span className="text-xs font-semibold text-slate-500">元</span></p>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50 text-white rounded-xl font-bold text-sm cursor-pointer flex items-center gap-2 transition-all duration-300"
                  >
                    {actionLoading ? (
                      <span className="h-4 w-4 border-2 border-white rounded-full border-t-transparent animate-spin"></span>
                    ) : editingOrderId ? (
                      <>
                        <Check className="w-4 h-4" />
                        儲存修改
                      </>
                    ) : (
                      <>
                        <Coffee className="w-4 h-4" />
                        送出訂單
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </section>

        {/* Right side Grid: Quick list of menu, order list */}
        <section className="lg:col-span-7 flex flex-col gap-6">

          {/* Quick Click Menu */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-indigo-650 rounded-full inline-block"></span>
                  招牌手調菜單
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 ml-3.5">點擊下方任一茶飲，即可直接裝載進填寫區！</p>
              </div>
              
              <div className="relative w-full md:w-56">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="搜尋品名、茶葉備註..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:bg-white outline-none focus:border-indigo-500 transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Sub Categories Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mt-4 ml-3.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 cursor-pointer transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200/70"
                  }`}
                >
                  {cat === "All" ? "全部特調" : cat}
                </button>
              ))}
            </div>

            {/* Quick click Cards List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-[290px] overflow-y-auto pr-1">
              {filteredMenu.map(item => {
                const isSelected = formData.selectedDrink?.name === item.name;
                return (
                  <div
                    key={item.name}
                    onClick={() => handleSelectDrink(item)}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected 
                        ? "bg-indigo-50/70 border-indigo-500/80 ring-1 ring-indigo-500/50 shadow-sm" 
                        : "bg-slate-50 hover:bg-white border-slate-150 shadow-sm hover:scale-[1.01] hover:border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 p-0.5 bg-indigo-600 text-white rounded-full">
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </span>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide ${
                          isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-205 text-slate-600'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm mt-1">{item.name}</p>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-light">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200/50 pt-2 mt-1">
                      <span className="text-xs font-black text-indigo-600">${item.price} <span className="font-normal text-[10px] text-slate-400">元/杯</span></span>
                      <span className="text-[10px] text-slate-450 flex items-center font-bold hover:text-indigo-600">快速點選 <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                );
              })}
              {filteredMenu.length === 0 && (
                <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                  暫無符合條件的飲料，請重新篩選！
                </div>
              )}
            </div>
          </div>

          {/* Today All Orders Show list */}
          <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-emerald-400 rounded-full inline-block"></span>
                  今日訂單列表
                </h2>
                <p className="text-xs text-slate-405 mt-1 ml-3.5">今天所有已經送出並成功同步的點餐名冊一覽</p>
              </div>
              
              <button
                onClick={handleCopyStats}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl active:scale-95 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Copy className="w-3.5 h-3.5" />
                一鍵複製訂單文字格式
              </button>
            </div>

            {/* List Body */}
            <div className="flex flex-col gap-3 min-h-[220px] max-h-[480px] overflow-y-auto pr-1">
              {orders.length > 0 ? (
                <AnimatePresence initial={false}>
                  {orders.map((order, idx) => {
                    const charCodeSum = order.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
                    const gradChoices = [
                      "from-rose-450 to-pink-500",
                      "from-violet-450 to-indigo-500",
                      "from-emerald-450 to-teal-500",
                      "from-teal-450 to-cyan-500",
                      "from-orange-450 to-amber-500",
                      "from-blue-450 to-indigo-500",
                      "from-fuchsia-450 to-purple-500"
                    ];
                    const avatarClass = gradChoices[charCodeSum % gradChoices.length];
                    const initialLetter = order.name ? order.name.slice(0, 1) : "無";

                    return (
                      <motion.div 
                        key={order.orderId || idx}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 transition-all duration-200 relative overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarClass} text-white font-extrabold flex items-center justify-center text-sm shadow-md`}>
                            {initialLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-850 text-sm leading-tight">{order.name}</span>
                              <span className="text-slate-300 text-xs font-light">|</span>
                              <span className="font-extrabold text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{order.drink}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold">{order.sugar}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-50 border border-sky-100 text-sky-700 font-bold">{order.ice}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 text-slate-600 font-bold">x {order.quantity}杯</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5">
                          <p className="text-base font-black text-indigo-600 font-sans tracking-tight">
                            ${order.totalPrice}
                          </p>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(order)}
                              className="p-1.5 bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg shadow-sm border border-slate-200 active:scale-95 cursor-pointer transition"
                              title="編輯此點單"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.orderId || "")}
                              className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg shadow-sm border border-slate-200 active:scale-95 cursor-pointer transition"
                              title="刪除此點單"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                /* No Orders Steam animation Graphic */
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl">
                  <div className="w-20 h-20 relative text-indigo-600/70">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <path d="M35 25 Q40 15 35 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="steam-line" />
                      <path d="M50 22 Q55 12 50 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="steam-line" />
                      <path d="M65 25 Q70 15 65 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" className="steam-line" />
                      <path d="M20 35 H80 V65 C80 75 70 85 50 85 C30 85 20 75 20 65 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                      <path d="M80 45 H92 C96 45 96 58 92 58 H80" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
                      <path d="M10 92 H90" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="font-bold text-slate-700 text-sm mt-4 tracking-wide text-center">今天目前還沒有人點單喔！</p>
                  <p className="text-xs text-slate-400 mt-1 pb-1.5 leading-relaxed text-center max-w-sm">
                    大家都在等你發起！選一杯幸運茶，送出本日下午茶的第一哩路吧 🍵✨
                  </p>
                </div>
              )}
            </div>

            {/* Hint Box */}
            <div className="bg-indigo-50/60 border border-indigo-150 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-indigo-900 mt-2">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-650" />
              <div>
                <h5 className="font-bold text-slate-900">訂單訂購超人小貼士：</h5>
                <p className="mt-1 leading-relaxed font-light text-slate-650">
                  點單完成後，您可直接點按右上角的「一鍵複製」按鈕。文字格式經過絕佳彙整，可貼於店家的 Line / 私訊，不黏手、免手抄，辦公室最溫暖的值日生就是你了！
                </p>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Footer copyright */}
      <footer className="max-w-7xl mx-auto w-full px-6 text-center text-xs text-slate-400 mt-16 flex flex-col items-center gap-2">
        <p className="flex items-center gap-1">
          由 Google AI Studio 匠心守護 <Heart className="w-3.5 h-3.5 text-rose-450 fill-rose-405 font-sans animate-pulse" /> 完美相容本地雙模式運行
        </p>
        <p>此版享有 Vite HMR 與生產編譯，極限加速與完整的類型安全！</p>
      </footer>

    </div>
  );
}
