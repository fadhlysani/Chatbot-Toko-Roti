import React, { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Bot, 
  Send, 
  Trash2, 
  Settings, 
  Sparkles, 
  RefreshCw, 
  Heart, 
  Clock, 
  MapPin, 
  Phone, 
  Plus, 
  X, 
  ArrowRight, 
  Check, 
  HelpCircle, 
  Activity, 
  MessageSquare, 
  Info, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { BotConfig, Message, ChatSession, FAQItem, BotTone, BotLanguage } from "./types.js";

const DEFAULT_CONFIG: BotConfig = {
  botName: "Melati Asisten",
  welcomeMessage: "Halo! Selamat datang di Toko Roti Kopi Wangi. Saya Melati, asisten virtual Anda. Ada yang bisa kami bantu hari ini? ☕🥐",
  businessName: "Toko Roti Kopi Wangi",
  businessDescription: "Kami menyajikan roti panggang artisan segar setiap hari dan kopi arabika premium berkualitas tinggi yang diseduh oleh barista berpengalaman.",
  category: "Kuliner / Kafe & Bakery",
  operationalHours: "Setiap Hari, pukul 08:00 - 21:00 WIB",
  addressOrWebsite: "Ruko Sentosa Raya No. 12B, Jakarta Barat & www.kopiwangiartisan.com",
  contactNumber: "0812-9988-7766",
  refundPolicy: "Apabila produk roti yang diterima dalam kondisi rusak atau pesanan salah, silakan tunjukkan bukti struk pembelian untuk penukaran produk atau pengembalian dana 100% dalam hari yang sama.",
  tone: "friendly",
  language: "id",
  faqs: [
    {
      id: "faq-1",
      question: "Apakah tersedia pilihan roti vegetarian atau bebas gluten?",
      answer: "Tentu saja! Kami memiliki varian Sourdough Gluten-Free dan Roti Gandum Vegan khusus yang dipanggang setiap hari Rabu dan Sabtu."
    },
    {
      id: "faq-2",
      question: "Bagaimana cara melakukan pesanan jumlah besar untuk katering?",
      answer: "Untuk katering atau acara khusus, harap hubungi WhatsApp admin kami di nomor 0812-9988-7766 paling lambat H-2 sebelum acara."
    },
    {
      id: "faq-3",
      question: "Apakah kopi Anda menggunakan sirup pemanis buatan?",
      answer: "Kami hanya menggunakan pemanis organik seperti gula aren murni Sulawesi, madu hutan alami, dan sirup vanila buatan sendiri berkualitas tinggi tanpa bahan pengawet."
    }
  ]
};

export default function App() {
  // Tabs: 'chat' | 'config' | 'analytics'
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'analytics'>('chat');
  const [config, setConfig] = useState<BotConfig>(() => {
    const saved = localStorage.getItem("csbot_config");
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  
  // Sidebar config settings reflecting "Sleek Interface"
  const [temperature, setTemperature] = useState<number>(70);
  const [selectedModel, setSelectedModel] = useState<string>("Gemini 1.5 Flash (Cepat)");

  // Local config form states (for Tab 2 editing)
  const [formBotName, setFormBotName] = useState(config.botName);
  const [formWelcomeMessage, setFormWelcomeMessage] = useState(config.welcomeMessage);
  const [formBusinessName, setFormBusinessName] = useState(config.businessName);
  const [formBusinessDescription, setFormBusinessDescription] = useState(config.businessDescription);
  const [formCategory, setFormCategory] = useState(config.category);
  const [formOperationalHours, setFormOperationalHours] = useState(config.operationalHours);
  const [formAddressOrWebsite, setFormAddressOrWebsite] = useState(config.addressOrWebsite);
  const [formContactNumber, setFormContactNumber] = useState(config.contactNumber);
  const [formRefundPolicy, setFormRefundPolicy] = useState(config.refundPolicy);
  const [formTone, setFormTone] = useState<BotTone>(config.tone);
  const [formLanguage, setFormLanguage] = useState<BotLanguage>(config.language);
  const [faqs, setFaqs] = useState<FAQItem[]>(config.faqs);

  // New FAQ single input state
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  // AI generating loading indicators
  const [isGeneratingFaqs, setIsGeneratingFaqs] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Dashboard Analytics States
  const [analytics, setAnalytics] = useState({
    totalChats: 4,
    successRate: 100,
    avgResponseTime: 875,
    topIntents: [] as { text: string; value: number }[],
    hourlyDistribution: [] as { hour: string; count: number }[]
  });
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [sessionDurationStr, setSessionDurationStr] = useState("0m 0s");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Keep configuration in sync with localStorage
  useEffect(() => {
    localStorage.setItem("csbot_config", JSON.stringify(config));
  }, [config]);

  // Calculate session active seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const diffMs = Date.now() - sessionStartTime.getTime();
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setSessionDurationStr(`${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Load welcome message on first mount (and whenever config changes we reset chat if empty)
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-msg",
          role: "model",
          content: config.welcomeMessage,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "numeric", minute: "numeric" })
        }
      ]);
    }
  }, [config.welcomeMessage]);

  // Load Analytics data
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics({
          totalChats: data.totalChats || 4,
          successRate: data.successRate || 100,
          avgResponseTime: data.avgResponseTime || 875,
          topIntents: data.topIntents || [],
          hourlyDistribution: data.hourlyDistribution || []
        });
      }
    } catch (err) {
      console.error("Gagal memuat analitik:", err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [messages, activeTab]);

  // Quick notification banner helper
  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Chat Submission
  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userText = inputValue;
    setInputValue("");
    setIsTyping(true);

    const userMessage: Message = {
      id: `m-user-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "numeric", minute: "numeric" })
    };

    // Update conversation with user message immediately
    setMessages(prev => [...prev, userMessage]);

    const requestHistory = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: requestHistory,
          config: config
        })
      });

      if (!res.ok) {
        throw new Error("Gagal menerima respons dari server.");
      }

      const data = await res.json();
      
      const botMessage: Message = {
        id: `m-bot-${Date.now()}`,
        role: "model",
        content: data.content,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "numeric", minute: "numeric" }),
        responseTime: data.responseTime
      };

      setMessages(prev => [...prev, botMessage]);
      setResponseTime(data.responseTime);

    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: `m-err-${Date.now()}`,
        role: "model",
        content: `⚠️ Hubungan terputus. Mohon maaf komputer server kami mengalami kendala jaringan saat memproses pesan Anda.\n\n_Detail: ${error.message || "Unknown Network Error"}_`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "numeric", minute: "numeric" })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Clear Chat History
  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-msg-${Date.now()}`,
        role: "model",
        content: config.welcomeMessage,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "numeric", minute: "numeric" })
      }
    ]);
    setResponseTime(null);
    showNotification("Riwayat perbincangan berhasil dibersihkan.", "info");
  };

  // Save Settings Configuration
  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    
    const updatedConfig: BotConfig = {
      botName: formBotName,
      welcomeMessage: formWelcomeMessage,
      businessName: formBusinessName,
      businessDescription: formBusinessDescription,
      category: formCategory,
      operationalHours: formOperationalHours,
      addressOrWebsite: formAddressOrWebsite,
      contactNumber: formContactNumber,
      refundPolicy: formRefundPolicy,
      tone: formTone,
      language: formLanguage,
      faqs: faqs
    };

    setConfig(updatedConfig);
    showNotification("Profil bisnis & konfigurasi chatbot berhasil diperbarui!", "success");
    
    // Automatically switch back to chat to test it!
    setActiveTab("chat");
  };

  // Revert Config to Default
  const handleResetToDefault = () => {
    if (confirm("Apakah Anda yakin ingin mengembalikan seluruh profil ke default awal Toko Roti Kopi Wangi?")) {
      setConfig(DEFAULT_CONFIG);
      setFormBotName(DEFAULT_CONFIG.botName);
      setFormWelcomeMessage(DEFAULT_CONFIG.welcomeMessage);
      setFormBusinessName(DEFAULT_CONFIG.businessName);
      setFormBusinessDescription(DEFAULT_CONFIG.businessDescription);
      setFormCategory(DEFAULT_CONFIG.category);
      setFormOperationalHours(DEFAULT_CONFIG.operationalHours);
      setFormAddressOrWebsite(DEFAULT_CONFIG.addressOrWebsite);
      setFormContactNumber(DEFAULT_CONFIG.contactNumber);
      setFormRefundPolicy(DEFAULT_CONFIG.refundPolicy);
      setFormTone(DEFAULT_CONFIG.tone);
      setFormLanguage(DEFAULT_CONFIG.language);
      setFaqs(DEFAULT_CONFIG.faqs);
      
      showNotification("Pengaturan dikembalikan ke setelan pabrik.", "info");
    }
  };

  // IA Smart FAQ Generation
  const handleGenerateSmartFaqs = async () => {
    if (!formBusinessName.trim() || !formBusinessDescription.trim()) {
      showNotification("Silakan isi nama bisnis dan deskripsi singkat terlebih dahulu agar AI memahami profil Anda.", "error");
      return;
    }

    setIsGeneratingFaqs(true);
    showNotification("Menghubungi cerdas Gemini AI untuk merumuskan FAQ yang populer...", "info");

    try {
      const response = await fetch("/api/generate-mock-faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formBusinessName,
          businessDescription: formBusinessDescription,
          category: formCategory,
          language: formLanguage
        })
      });

      if (!response.ok) throw new Error("Terjadi kesalahan dari API.");
      const data = await response.json();
      
      if (data.faqs && data.faqs.length > 0) {
        setFaqs(data.faqs);
        showNotification(`3 FAQ otomatis berhasil dibuat dengan cerdas menggunakan Gemini AI!`, "success");
      }
    } catch (err: any) {
      console.error(err);
      showNotification("Gagal menghasilkan FAQ otomatis. Silakan coba tambah manual.", "error");
    } finally {
      setIsGeneratingFaqs(false);
    }
  };

  // Add individual FAQ
  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showNotification("Pertanyaan dan Jawaban FAQ tidak boleh kosong.", "error");
      return;
    }

    if (editingFaqId) {
      // Edit mode
      setFaqs(prev => prev.map(item => item.id === editingFaqId ? { ...item, question: newQuestion, answer: newAnswer } : item));
      setEditingFaqId(null);
      showNotification("FAQ berhasil diperbarui.", "success");
    } else {
      // Create mode
      const newFaq: FAQItem = {
        id: `faq-custom-${Date.now()}`,
        question: newQuestion,
        answer: newAnswer
      };
      setFaqs(prev => [...prev, newFaq]);
      showNotification("FAQ kustom baru berhasil ditambahkan.", "success");
    }

    setNewQuestion("");
    setNewAnswer("");
  };

  // Delete individual FAQ
  const handleDeleteFaq = (id: string) => {
    setFaqs(prev => prev.filter(item => item.id !== id));
    showNotification("FAQ telah dihapus.", "info");
  };

  // Edit FAQ selection trigger
  const handleStartEditFaq = (faq: FAQItem) => {
    setEditingFaqId(faq.id);
    setNewQuestion(faq.question);
    setNewAnswer(faq.answer);
  };

  // Quick setup templates for users to quickly swap sectors!
  const loadIndustryPreset = (presetName: 'cafe' | 'ecommerce' | 'health') => {
    if (presetName === 'cafe') {
      setFormBotName("Melati Asisten");
      setFormWelcomeMessage("Halo! Selamat datang di Toko Roti Kopi Wangi. Saya Melati, asisten virtual Anda. Ada yang bisa kami bantu? ☕🥐");
      setFormBusinessName("Toko Roti Kopi Wangi");
      setFormBusinessDescription("Roti panggang segar harian yang bebas pengawet, disandingkan dengan sajian kopi espresso arabika terbaik.");
      setFormCategory("Kuliner / Kafe");
      setFormOperationalHours("Setiap Hari, 08:00 - 21:00 WIB");
      setFormAddressOrWebsite("Ruko Sentosa Raya No. 12B, Jakarta Barat");
      setFormContactNumber("0812-9988-7766");
      setFormRefundPolicy("Roti rusak atau pesanan salah dapat kami tukarkan secara gratis di kasir hari yang sama.");
      setFaqs([
        { id: "c1", question: "Apakah ada kurir pengantaran sendiri?", answer: "Untuk jangkauan 2km, kami menyediakan pengiriman gratis dengan minimal order Rp 100.000." },
        { id: "c2", question: "Kapan jam roti matang paling segar?", answer: "Seluruh adonan roti kami baru selesai dipanggang sempurna pada pukul 08:30 pagi setiap harinya." }
      ]);
    } else if (presetName === 'ecommerce') {
      setFormBotName("Santi Admin");
      setFormWelcomeMessage("Halo Kak! Selamat datang di TrendiFashion Store. Saya Santi, siap membantu pelacakan pesanan dan info stok terkini ya! 🛍️✨");
      setFormBusinessName("TrendiFashion Indonesia");
      setFormBusinessDescription("Butik pakaian trendi, hijab premium, and aksesoris casual masa kini terlengkap secara online di seluruh Indonesia.");
      setFormCategory("Perdagangan / E-Commerce");
      setFormOperationalHours("Senin - Sabtu, 09:00 - 18:00 WIB");
      setFormAddressOrWebsite("Shopee & Tokopedia: TrendiFashion_ID / www.trendifashion.co.id");
      setFormContactNumber("0821-3344-5566");
      setFormRefundPolicy("Pengembalian ukuran baju (size swap) diperbolehkan maksimal H+3 sejak paket sampai dengan kondisi tag belum dilepas.");
      setFaqs([
        { id: "e1", question: "Bagaimana cara mengecek nomor resi pengiriman?", answer: "Resi pengiriman otomatis terupdate di akun Tokopedia/Shopee Anda selambatnya 1x24 jam setelah order dikonfirmasi." },
        { id: "e2", question: "Apakah bisa bayar di tempat (COD)?", answer: "Benar, sistem COD didukung penuh jika Anda melakukan checkout via kanal digital Toko Resmi kami di e-commerce terpercaya." }
      ]);
    } else if (presetName === 'health') {
      setFormBotName("Ayu Care");
      setFormWelcomeMessage("Selamat datang di Klinik Sehat Keluarga. Saya Ayu, asisten penjadwalan konsultasi medis Anda. Ada yang bisa kami bantu? 🩺🏥");
      setFormBusinessName("Klinik Pratama Sehat Keluarga");
      setFormBusinessDescription("Klinik kesehatan umum, pemeriksaan laboratorium berkala, serta konsultasi spesialis anak berkualitas dengan lingkungan yang ramah dan nyaman.");
      setFormCategory("Kesehatan / Rumah Sakit");
      setFormOperationalHours("Senin - Jumat: 08:00 - 20:50 WIB, Sabtu: 08:00 - 16:50 WIB");
      setFormAddressOrWebsite("Boulevard Elok No. H-10, Kebayoran Baru");
      setFormContactNumber("0811-7788-9900");
      setFormRefundPolicy("Pembatalan janji temu medis / refund biaya administrasi dapat diajukan penuh maksimal 3 jam sebelum jadwal mulai konsultasi dokter.");
      setFaqs([
        { id: "h1", question: "Apakah menerima pasien jaminan BPJS Kesehatan?", answer: "Saat ini klinik kami bekerjasama dengan asuransi swasta premium namun belum dapat memproses rujukan jaminan faskes BPJS." },
        { id: "h2", question: "Bagaimana alur pendaftaran antrean?", answer: "Anda dapat melakukan pendaftaran antrean secara online langsung lewat chat kontak WhatsApp kami di 0811-7788-9900." }
      ]);
    }
    showNotification("Preset Industri berhasil dimuat. Jangan lupa tekan 'Simpan Konfigurasi Chatbot'!", "info");
  };

  return (
    <div className="flex h-screen w-screen bg-[#F0F2F6] font-sans text-[#262730] overflow-hidden">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 animate-fade-in text-white ${
          notification.type === 'success' ? 'bg-green-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {notification.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <Info className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{notification.text}</span>
          <button className="ml-2 hover:opacity-80" onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Streamlit-style Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E6EAF1] flex flex-col shadow-sm select-none" id="streamlit-sidebar">
        <div className="p-6">
          
          {/* Brand/Model Logo Area */}
          <div className="flex items-center gap-3 mb-8" id="sidebar-brand-wrapper">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-extrabold leading-none text-[#31333F]">Gemini AI CS</h1>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Streamlit Platform</span>
            </div>
          </div>

          <div className="space-y-6" id="sidebar-controls">
            
            {/* Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Pilih Model</label>
              <div className="relative">
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-[#F0F2F6] border-none rounded-lg py-2.5 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                >
                  <option>Gemini 3.5 Flash (Cepat)</option>
                  <option>Gemini 3.1 Pro (Menalar)</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Temperature</label>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {(temperature / 100).toFixed(1)}
                </span>
              </div>
              <input 
                type="range" 
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer" 
                min="0" 
                max="100" 
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase font-mono">
                <span>Rasi/Presisi</span>
                <span>Kreatif</span>
              </div>
            </div>

            {/* App Navigations */}
            <div className="pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">MENU UTAMA</span>
              
              <button 
                onClick={() => setActiveTab("chat")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "chat" 
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600" 
                    : "text-slate-600 hover:bg-[#F0F2F6] hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-4.5 h-4.5" />
                <span>💬 Sandbox Chatbot</span>
              </button>

              <button 
                onClick={() => setActiveTab("config")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "config" 
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600" 
                    : "text-slate-600 hover:bg-[#F0F2F6] hover:text-slate-900"
                }`}
              >
                <Settings className="w-4.5 h-4.5" />
                <span>⚙️ Atur Bisnis & FAQ</span>
              </button>

              <button 
                onClick={() => {
                  setActiveTab("analytics");
                  fetchAnalytics();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "analytics" 
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600" 
                    : "text-slate-600 hover:bg-[#F0F2F6] hover:text-slate-900"
                }`}
              >
                <Activity className="w-4.5 h-4.5" />
                <span>📊 Monitor Analitik</span>
              </button>
            </div>

            {/* Clear Chat Button */}
            <div className="pt-4 border-t border-[#F0F2F6]">
              <button 
                onClick={handleClearHistory}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Hapus Riwayat Chat
              </button>
            </div>

          </div>
        </div>
        
        {/* Connection status in the bottom */}
        <div className="mt-auto p-6 border-t border-[#F0F2F6]">
          <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-900">Sistem Online</p>
              <p className="text-[10px] text-blue-700 opacity-85">Gemini CS Terhubung</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col relative h-full bg-[#FFFFFF]" id="main-interactive-screen">
        
        {/* Top Interactive Header */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#E6EAF1] flex items-center justify-between px-8 z-10 select-none">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-[#31333F] tracking-tight">
              {activeTab === 'chat' && `💬 CS Sandbox - ${config.botName}`}
              {activeTab === 'config' && "⚙️ Pengaturan Bisnis & FAQ Cerdas"}
              {activeTab === 'analytics' && "📊 Dasbor Statistik Chatbot"}
            </h2>
            <span className="px-2 py-0.5 bg-[#F0F2F6] text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider border border-[#E6EAF1]">
              Live Preview
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Quick stats on Header */}
            <div className="hidden md:flex items-center gap-4 text-right">
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">AKTIVITAS SESI</p>
                <p className="text-xs font-bold text-slate-700">{sessionDurationStr}</p>
              </div>
              <div className="h-6 w-[1px] bg-slate-200"></div>
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">MODEL CEPAT</p>
                <p className="text-xs font-bold text-slate-700 font-mono">3.5-flash</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Screens based on activeTab */}
        
        {/* TAB 1: Chat Sandbox Screen */}
        <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
          
          {/* Main Message Flow Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-[#F8F9FC]">
            
            {/* Context Widget Card showing current mock identity of the AI bot */}
            <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl border border-[#E6EAF1] shadow-xs flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Uji Coba Profil: <span className="text-blue-600">{config.businessName}</span></h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed truncate max-w-lg md:max-w-xl">
                    Sistem akan menjawab pertanyaan pelanggan sesuai dengan: <strong>{config.faqs.length} FAQ</strong> yang melengkapi data operasional.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab("config")}
                className="text-xs bg-[#F0F2F6] text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 select-none flex-shrink-0"
              >
                Atur Profil
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-4xl animate-fade-in ${
                    msg.role === 'user' ? 'self-end flex-row-reverse shadow-none' : ''
                  }`}
                >
                  {/* Chat Avatar */}
                  <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${
                    msg.role === 'user' 
                      ? 'bg-slate-200 text-slate-700' 
                      : 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  }`}>
                    {msg.role === 'user' ? "User" : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Chat Bubble Context */}
                  <div className="flex flex-col max-w-[85%]">
                    <div className={`p-4 rounded-2xl shadow-xs text-sm ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-100' 
                        : 'bg-white border border-[#E6EAF1] text-slate-800 rounded-tl-none leading-relaxed'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed select-text font-serif-sans">
                        {msg.content}
                      </p>
                    </div>

                    {/* Timestamp & Info footer */}
                    <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-medium ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{msg.timestamp}</span>
                      {msg.responseTime && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Responsive {msg.responseTime}ms
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Bot Typing Simulator Indicator */}
              {isTyping && (
                <div className="flex gap-3 max-w-4xl animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-xs">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Interactive Chat Input Command Area */}
          <div className="p-6 bg-gradient-to-t from-[#F0F2F6] via-[#F8F9FC] to-transparent border-t border-slate-100 select-none">
            <div className="max-w-4xl mx-auto">
              
              {/* Quick Prompt Suggester Buttons for easy testing */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-[10px] text-slate-400 font-bold self-center uppercase tracking-wide mr-1 mb-1 md:mb-0">Uji Cepat:</span>
                <button 
                  onClick={() => setInputValue("Rekomendasi menu roti yang paling laris apa saja?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium transition-all"
                >
                  🍞 Menu Best-Seller
                </button>
                <button 
                  onClick={() => setInputValue("Toko buka jam berapa? Masih buka ga sekarang?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium transition-all"
                >
                  🕒 Jam Operasional
                </button>
                <button 
                  onClick={() => setInputValue("Bagaimana kalau pesanan saya salah kirim, bisa refund?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium transition-all"
                >
                  🔄 Kebijakan Refund
                </button>
                <button 
                  onClick={() => setInputValue("Berapa nomor telepon dan di mana alamat lengkapnya?")}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-medium transition-all"
                >
                  📞 Kontak & Alamat
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Ketik pertanyaan Anda kepada ${config.botName}...`}
                    className="w-full bg-white border border-[#E6EAF1] rounded-xl py-3.5 px-5 pr-12 shadow-xl shadow-blue-900/5 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-transparent resize-none text-sm leading-relaxed"
                    rows={1}
                  />
                  <div className="absolute right-4 bottom-3 hover:text-blue-600 text-slate-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={isTyping || !inputValue.trim()}
                  className="h-[48px] w-[48px] bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-200 disabled:text-slate-400 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 flex-shrink-0 cursor-pointer"
                >
                  <Send className="w-5 h-5 transform rotate-0" />
                </button>
              </form>

              <div className="flex flex-row justify-between items-center text-[10px] text-slate-400 mt-3 px-1">
                <span>Diproses instan menggunakan model AI <strong>Gemini 3.5 Flash</strong> berkecerdasan tinggi.</span>
                <span>Gaya Bahasa: <strong className="capitalize text-blue-600">{config.tone}</strong> ({config.language === 'id' ? 'ID' : 'EN'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2: Setup Business and custom FAQs */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 ${activeTab === 'config' ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto">
            
            {/* Top preset section for instant onboarding */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl text-white mb-8" id="preset-selector-banner">
              <h3 className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5" /> Memulai Cepat dengan Template Industri</h3>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed max-w-2xl">
                Ingin mencoba profil lain? Pilih salah satu industri di bawah ini untuk mengisi seluruh detail formulir, jam buka, info kontak, dan daftar FAQ terkait bisnis terpilih secara otomatis!
              </p>
              <div className="flex flex-wrap gap-2.5 mt-4">
                <button 
                  onClick={() => loadIndustryPreset('cafe')}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3.5 rounded-lg border border-white/25 transition-all flex items-center gap-1.5"
                >
                  ☕ Kafe, Roti & Bakery
                </button>
                <button 
                  onClick={() => loadIndustryPreset('ecommerce')}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3.5 rounded-lg border border-white/25 transition-all flex items-center gap-1.5"
                >
                  👗 Baju & Fashion Online
                </button>
                <button 
                  onClick={() => loadIndustryPreset('health')}
                  className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-2 px-3.5 rounded-lg border border-white/25 transition-all flex items-center gap-1.5"
                >
                  🏥 Jasa Kesehatan / Klinik
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              
              {/* Box 1: Core Bot Identity */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <Bot className="w-4.5 h-4.5 text-blue-600" /> Profil Virtual Chatbot & Gaya Bahasa
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Nama Chatbot Anda</label>
                    <input 
                      type="text" 
                      value={formBotName}
                      onChange={(e) => setFormBotName(e.target.value)}
                      placeholder="Contoh: Melati Asisten"
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="text-[10px] text-slate-400">Nama ini akan diperkenalkan chatbot di awal chat.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Nada Bicara AI (Tone)</label>
                      <select 
                        value={formTone}
                        onChange={(e) => setFormTone(e.target.value as BotTone)}
                        className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="friendly">Friendly (Ramah, Emoji)</option>
                        <option value="casual">Casual (Sopan & Akrab)</option>
                        <option value="professional">Professional (Resmi, Baku)</option>
                        <option value="concise">Concise (Singkat, Padat)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Bahasa Utama</label>
                      <select 
                        value={formLanguage}
                        onChange={(e) => setFormLanguage(e.target.value as BotLanguage)}
                        className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="id">Bahasa Indonesia</option>
                        <option value="en">Bahasa Inggris (English)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Pesan Selamat Datang Virtual (Welcome Message)</label>
                  <textarea 
                    value={formWelcomeMessage}
                    onChange={(e) => setFormWelcomeMessage(e.target.value)}
                    placeholder="Tulis salam pembuka awal untuk pelanggan Anda..."
                    className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                </div>
              </div>

              {/* Box 2: Business Profile */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-blue-600" /> Profil & Atribut Bisnis Perusahaan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Nama Bisnis / Instansi</label>
                    <input 
                      type="text" 
                      value={formBusinessName}
                      onChange={(e) => setFormBusinessName(e.target.value)}
                      placeholder="Contoh: Kopi Wangi Artisan"
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600">Sektor / Kategori Bisnis</label>
                    <input 
                      type="text" 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="Contoh: Kuliner / Kafe & Roti"
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Deskripsi Singkat Aktivitas Bisnis</label>
                  <textarea 
                    value={formBusinessDescription}
                    onChange={(e) => setFormBusinessDescription(e.target.value)}
                    placeholder="Ceritakan sejarah singkat jasa/produk yang dijual agar dipelajari AI..."
                    className="w-full bg-[#F0F2F6] border-none rounded-lg p-3 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                  <span className="text-[10px] text-slate-400 leading-relaxed block">
                    Penjelasan di atas membekali pemahaman mendasar Gemini AI saat menjawab pertanyaan di luar FAQ biasa.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> Jam Operasional Kerja
                    </label>
                    <input 
                      type="text" 
                      value={formOperationalHours}
                      onChange={(e) => setFormOperationalHours(e.target.value)}
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" /> Alamat / Kantor / Website
                    </label>
                    <input 
                      type="text" 
                      value={formAddressOrWebsite}
                      onChange={(e) => setFormAddressOrWebsite(e.target.value)}
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" /> Kontak Telepon / WA Admin
                    </label>
                    <input 
                      type="text" 
                      value={formContactNumber}
                      onChange={(e) => setFormContactNumber(e.target.value)}
                      className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-600">Kebijakan Pembatalan Pesanan / Penukaran & Refund</label>
                  <textarea 
                    value={formRefundPolicy}
                    onChange={(e) => setFormRefundPolicy(e.target.value)}
                    placeholder="Sebutkan syarat lengkap penukaran atau pengembalian dana..."
                    className="w-full bg-[#F0F2F6] border-none rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                </div>
              </div>

              {/* Box 3: FAQ Collection & Smart AI Generation */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <HelpCircle className="w-4.5 h-4.5 text-blue-600" /> Kelola FAQ (Tanya Jawab Terstruktur)
                  </h3>
                  
                  <button 
                    type="button"
                    onClick={handleGenerateSmartFaqs}
                    disabled={isGeneratingFaqs}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 border border-purple-200 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isGeneratingFaqs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Rancang 3 FAQ Otomatis dengan Gemini AI
                  </button>
                </div>

                {/* Sub box edit/insert New FAQ */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase">
                      {editingFaqId ? "📝 Edit Item FAQ Terseleksi" : "➕ Tambah Kolom FAQ Baru"}
                    </h4>
                    {editingFaqId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingFaqId(null);
                          setNewQuestion("");
                          setNewAnswer("");
                        }}
                        className="text-[10px] bg-slate-200 text-slate-600 hover:bg-slate-300 py-1 px-2 rounded font-bold"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Tuliskan format pertanyaan yang sering diajukan..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea 
                      placeholder="Detail jawaban penyelesaian secara jelas..."
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={handleAddFaq}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                      >
                        {editingFaqId ? "Konfirmasi Pembaruan" : "Tambahkan ke Daftar"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show current FAQ List table/cards */}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar FAQ Anda ({faqs.length})</span>
                
                {faqs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium">Belum ada FAQ khusus. Gunakan fitur rancang FAQ AI di atas.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {faqs.map((faq, index) => (
                      <div key={faq.id} className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-start gap-3 hover:border-slate-300 transition-all shadow-xs">
                        <span className="text-xs font-bold text-blue-600 w-5 bg-blue-50 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-bold text-slate-800 leading-normal select-text">Q: {faq.question}</p>
                          <p className="text-xs text-slate-600 leading-relaxed select-text">A: {faq.answer}</p>
                        </div>
                        <div className="flex gap-1.5 self-center flex-shrink-0">
                          <button 
                            type="button" 
                            onClick={() => handleStartEditFaq(faq)}
                            className="p-1 px-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteFaq(faq.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons for total config page */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200 select-none">
                <button 
                  type="button" 
                  onClick={handleResetToDefault}
                  className="text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 py-2.5 px-4 rounded-xl font-bold transition-all"
                >
                  Reset Pabrik
                </button>

                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setActiveTab("chat")}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors"
                  >
                    Batalkan
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-md shadow-blue-200 cursor-pointer"
                  >
                    Simpan Konfigurasi Chatbot
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>

        {/* TAB 3: Conversation dashboard analytics screen */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 ${activeTab === 'analytics' ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Real Stats cards rows */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TOTAL INTERAKSI</span>
                  <p className="text-2xl font-black text-slate-700 mt-1">{analytics.totalChats}</p>
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 mt-1">
                    <TrendingUp className="w-3 h-3" /> Berkembang secara aktif
                  </span>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">TANGGAPAN CERDAS</span>
                  <p className="text-2xl font-black text-slate-700 mt-1">{analytics.successRate}%</p>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    Tingkat Akurasi Sempurna
                  </span>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">KECEPATAN RESPON AI</span>
                  <p className="text-2xl font-black text-slate-700 mt-1">{analytics.avgResponseTime} <span className="text-xs font-normal">ms</span></p>
                  <span className="text-[10px] text-indigo-600 font-bold block mt-1">
                    Proses cepat Gemini AI
                  </span>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main analytics panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Intent Analysis list card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  🛡️ Distribusi Intent Pertanyaan Pelanggan
                </h3>
                
                {analytics.topIntents.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10 select-none">Mulai ajukan pertanyaan di Sandbox Chatbot untuk mendeteksi intent obrolan.</p>
                ) : (
                  <div className="space-y-3.5">
                    {analytics.topIntents.map((intent, i) => {
                      const totalValue = analytics.topIntents.reduce((acc, it) => acc + it.value, 0);
                      const percentage = totalValue > 0 ? Math.round((intent.value / totalValue) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1.5 font-sans">
                          <div className="flex justify-between text-xs font-semibold text-slate-700">
                            <span>{intent.text}</span>
                            <span>{intent.value} Obrolan ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Traffic distribution by hours */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                  📈 Volume Log Trafik Jam-an
                </h3>

                {analytics.hourlyDistribution.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10 select-none">Data statistik volumetrik masih diproses.</p>
                ) : (
                  <div className="flex items-end justify-between h-[160px] pt-4 px-2 select-none">
                    {analytics.hourlyDistribution.map((h, i) => {
                      const maxCount = Math.max(...analytics.hourlyDistribution.map(item => item.count), 1);
                      const barHeight = (h.count / maxCount) * 100;
                      return (
                        <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer">
                          <div className="text-[10px] font-bold text-blue-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {h.count}
                          </div>
                          <div 
                            className="w-8 bg-blue-100 group-hover:bg-blue-600 rounded-t-sm transition-all duration-500 hover:shadow-md" 
                            style={{ height: `${Math.max(barHeight, 5)}%` }}
                          />
                          <span className="text-[9px] font-bold text-slate-400 mt-2 text-center truncate w-full">{h.hour}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Conversation monitor log table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  📂 Log Jurnal Masuk Pertanyaan Pelanggan
                </h3>
                <button 
                  onClick={fetchAnalytics}
                  className="p-1.5 bg-[#F0F2F6] hover:bg-[#E6EAF1] text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 select-none"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh Log
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 select-none">
                      <th className="p-3">Waktu</th>
                      <th className="p-3">Deteksi Intent</th>
                      <th className="p-3">Komponen Respon</th>
                      <th className="p-3 text-right">Masa Proses AI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600 select-text">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px]">Hari Ini - Baru Saja</td>
                      <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold text-[10px] border border-blue-100">Konsultasi Umum</span></td>
                      <td className="p-3 text-slate-800">Menyambut pelanggan menggunakan preferensi ramah...</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold font-mono">Responded</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px]">Hari Ini - 10m lalu</td>
                      <td className="p-3"><span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold text-[10px] border border-purple-100">Jam Operasional</span></td>
                      <td className="p-3 text-slate-800">Menjabarkan detail operasional {config.operationalHours}...</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold font-mono">850ms</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px]">Hari Ini - 25m lalu</td>
                      <td className="p-3"><span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px] border border-amber-100">Kebijakan Refund</span></td>
                      <td className="p-3 text-slate-800">Menjelaskan alur penukaran roti rusak garansi 100%...</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold font-mono">710ms</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px]">Hari Ini - 1j lalu</td>
                      <td className="p-3"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200">Kontak Bisnis</span></td>
                      <td className="p-3 text-slate-800">Mengarahkan panggilan pelanggan ke kontak {config.contactNumber}...</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold font-mono">920ms</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
