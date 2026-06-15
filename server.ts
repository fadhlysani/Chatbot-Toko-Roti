import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { BotConfig, Message } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Error initializing Gemini API Client:", err);
  }
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined or is placeholder. Running in demo mode.");
}

// Keep a light in-memory log of queries for real-time dashboard analytics
interface ChatLog {
  timestamp: string;
  responseTime: number;
  wordCount: number;
  success: boolean;
  intent: string;
}

const analyticsLogs: ChatLog[] = [
  { timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), responseTime: 850, wordCount: 45, success: true, intent: "Jam Operasional" },
  { timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), responseTime: 920, wordCount: 62, success: true, intent: "Harga & Pembayaran" },
  { timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), responseTime: 710, wordCount: 30, success: true, intent: "Kebijakan Pengembalian" },
  { timestamp: new Date(Date.now() - 3600000 * 1).toISOString(), responseTime: 1050, wordCount: 75, success: true, intent: "Alamat Toko" },
];

/**
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dateTime: new Date().toISOString(),
    geminiInitialized: !!ai,
  });
});

/**
 * Chat generation endpoint
 */
app.post("/api/chat", async (req, res) => {
  const { 
    message, 
    history = [], 
    config 
  } = req.body as { 
    message: string; 
    history: Message[]; 
    config: BotConfig 
  };

  if (!message || !config) {
    return res.status(400).json({ error: "Missing required message or custom config parameters." });
  }

  const startTime = Date.now();

  // If Gemini client isn't configured, fallback to a smart custom placeholder service
  if (!ai) {
    const errorMsg = "Gemini API Key belum dikonfigurasi di panel Secrets. Silakan tambahkan GEMINI_API_KEY di Settings > Secrets.";
    console.warn(errorMsg);
    
    // Simulate smart offline response based on FAQ settings
    setTimeout(() => {
      // Look for matched keyword in FAQs or standard things
      let matchedResponse = "";
      const lowerMsg = message.toLowerCase();
      
      // Match business name/hours/refund
      if (lowerMsg.includes("jam") || lowerMsg.includes("pukul") || lowerMsg.includes("buka") || lowerMsg.includes("tutup")) {
        matchedResponse = `Jam operasional ${config.businessName} adalah: **${config.operationalHours}**.`;
      } else if (lowerMsg.includes("kontak") || lowerMsg.includes("telepon") || lowerMsg.includes("wa") || lowerMsg.includes("hubungi")) {
        matchedResponse = `Tentu! Kakak bisa menghubungi kami di nomor **${config.contactNumber}** atau mengunjungi kami di **${config.addressOrWebsite}**.`;
      } else if (lowerMsg.includes("alamat") || lowerMsg.includes("lokasi") || lowerMsg.includes("dimana") || lowerMsg.includes("posisi")) {
        matchedResponse = `Kantor/Toko kami berlokasi di **${config.addressOrWebsite}**.`;
      } else if (lowerMsg.includes("refund") || lowerMsg.includes("kembali") || lowerMsg.includes("batal") || lowerMsg.includes("garansi")) {
        matchedResponse = `Berikut kebijakan pengembalian kami: _${config.refundPolicy}_.`;
      } else {
        // Try to match compiled FAQs
        const found = config.faqs.find(
          faq => lowerMsg.includes(faq.question.toLowerCase()) || faq.question.toLowerCase().split(" ").some(word => word.length > 4 && lowerMsg.includes(word))
        );
        if (found) {
          matchedResponse = found.answer;
        } else {
          matchedResponse = `Halo! Terima kasih telah menghubungi **${config.businessName}**. 
          
Saat ini asisten virtual kami (**${config.botName}**) sedang berjalan dalam *Demo Mode* karena API Key Gemini belum terpasang.

**Informasi Bisnis Kami:**
- **Deskripsi:** ${config.businessDescription}
- **Jam Buka:** ${config.operationalHours}
- **Kontak:** ${config.contactNumber}

_Untuk mengaktifkan kecerdasan penuh chatbot otomatis ini, silakan masukkan **GEMINI_API_KEY** Anda di panel Secrets AI Studio._`;
        }
      }

      const duration = Date.now() - startTime;
      
      // Log interaction
      analyticsLogs.push({
        timestamp: new Date().toISOString(),
        responseTime: duration,
        wordCount: matchedResponse.split(" ").length,
        success: true,
        intent: "Demo Offline Fallback"
      });

      return res.json({
        content: matchedResponse,
        responseTime: duration,
        demoMode: true,
      });
    }, 450);
    return;
  }

  try {
    // Construct System Instruction dynamically based on user config
    const faqString = config.faqs.length > 0 
      ? config.faqs.map((f, i) => `${i+1}. T: ${f.question}\n   J: ${f.answer}`).join("\n")
      : "Belum ada FAQ khusus yang ditambahkan.";

    // Determine tone guidelines
    let toneRules = "";
    if (config.tone === "friendly") {
      toneRules = "- Jadilah sangat ramah, penuh perhatian, hangat, dan gunakan emoji yang bersahabat (seperti 😊, ✨, 🙌).\n- Tunjukkan antusiasme yang tinggi untuk menolong.";
    } else if (config.tone === "casual") {
      toneRules = "- Gunakan gaya bahasa santai/gaul anak muda Indonesia masa kini (seperti menggunakan sapaan 'kak', 'guys', 'siaap', 'oke bgt').\n- Tetap sopan namun terasa bersahabat dan tidak berjarak.";
    } else if (config.tone === "professional") {
      toneRules = "- Gunakan sapaan resmi, hormat, dan baku seperti 'Bapak/Ibu' atau 'Pelanggan yang terhormat'.\n- Hindari singkatan tidak formal, singkatan gaul, atau emoji berlebihan. Bahasa harus bersih, elegan, dan profesional.";
    } else if (config.tone === "concise") {
      toneRules = "- Jawab dengan sangat singkat, padat, langsung pada poin utama tanpa berbasa-basi.\n- Gunakan poin-poin (bullet points) jika menjelaskan lebih dari satu hal untuk kenyamanan pembaca.";
    }

    const systemPrompt = `Anda adalah chatbot asisten pelanggan otomatis yang terintegrasi di website perusahaan kami.
Silakan gunakan identitas berikut dalam melayani pelanggan:

### IDENTITAS & PROFIL BISNIS:
- Nama Chatbot Anda: ${config.botName} (Gunakan nama ini saat memperkenalkan diri)
- Nama Bisnis/Perusahaan: ${config.businessName}
- Kategori/Sektor Bisnis: ${config.category}
- Deskripsi Bisnis: ${config.businessDescription}
- Jam Operasional Resmi: ${config.operationalHours}
- Alamat Fisik / Website: ${config.addressOrWebsite}
- Kontak yang bisa dihubungi: ${config.contactNumber}
- Kebijakan Pengembalian / Refund: ${config.refundPolicy}

### DAFTAR PERTANYAAN UMUM (FAQ) SEBAGAI REFERENSI UTAMA:
${faqString}

### ATURAN BAHASA & GAYA KOMUNIKASI (SANGAT PENTING):
${toneRules}
- Bahasa komunikasi utama harus disesuaikan dengan bahasa yang digunakan pelanggan, namun prioritaskan bahasa utama yang dikonfigurasi: ${config.language === "id" ? "Bahasa Indonesia" : "Bahasa Inggris"}.
- Jangan mengarang informasi! Jika sebuah pertanyaan pelanggan sama sekali tidak dapat dijawab berdasarkan data profil bisnis ataupun FAQ di atas, berikan jawaban alternatif yang masuk akal secara sopan, lalu sarankan pelanggan untuk menghubungi nomor bantuan operasional kami di ${config.contactNumber}.
- Gunakan format teks yang kaya (Markdown) seperti mencetak tebal (**kata penting**), menceritakan langkah-langkah, atau membuat baris baru agar tanggapan terlihat profesional dan mudah dibaca lewat layar gadget/komputer pelanggan.
- Jaga agar jawaban Anda tidak terlalu panjang secara berlebihan agar pelanggan membaca dengan cepat.

Harap berikan tanggapan yang sempurna dan akurat kepada pelanggan sekarang!`;

    // Format chat history for Gemini API
    // We can map user and assistant messages structure
    // Let's filter the messages array to ensure standard Gemini input format matching latest API rules
    const formattedContents = history.map((h) => ({
      role: h.role, // 'user' or 'model'
      parts: [{ text: h.content }],
    }));

    // Append current user prompt
    formattedContents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Query Gemini model gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const botResponse = response.text || "Maaf, kami belum bisa menjawab pertanyaan tersebut saat ini. Silakan hubungi customer service kami.";
    const duration = Date.now() - startTime;

    // Detect general intent from the question (simplistic keyword detection)
    let detectedIntent = "Pertanyaan Umum";
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("jam") || lowerMessage.includes("buka") || lowerMessage.includes("operasional")) {
      detectedIntent = "Jam Operasional";
    } else if (lowerMessage.includes("refund") || lowerMessage.includes("kembal") || lowerMessage.includes("garansi")) {
      detectedIntent = "Garansi/Refund";
    } else if (lowerMessage.includes("lokasi") || lowerMessage.includes("alamat") || lowerMessage.includes("toko") || lowerMessage.includes("cabang")) {
      detectedIntent = "Alamat Toko";
    } else if (lowerMessage.includes("harga") || lowerMessage.includes("bayar") || lowerMessage.includes("diskon") || lowerMessage.includes("ongkir")) {
      detectedIntent = "Harga/Biaya";
    } else if (lowerMessage.includes("kontak") || lowerMessage.includes("hubung") || lowerMessage.includes("wa")) {
      detectedIntent = "Hubungi Admin";
    }

    // Save statistics in memory
    analyticsLogs.push({
      timestamp: new Date().toISOString(),
      responseTime: duration,
      wordCount: botResponse.split(" ").length,
      success: true,
      intent: detectedIntent
    });

    // Trim logs size in memory to keep memory light
    if (analyticsLogs.length > 200) {
      analyticsLogs.shift();
    }

    return res.json({
      content: botResponse,
      responseTime: duration,
      demoMode: false,
    });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    const duration = Date.now() - startTime;

    analyticsLogs.push({
      timestamp: new Date().toISOString(),
      responseTime: duration,
      wordCount: 0,
      success: false,
      intent: "Error API"
    });

    return res.status(500).json({ 
      error: "Terjadi kesalahan internal saat memproses pertanyaan.",
      details: error.message || error,
      responseTime: duration
    });
  }
});

/**
 * FAQ automatic generation helper endpoint
 */
app.post("/api/generate-mock-faqs", async (req, res) => {
  const { businessName, businessDescription, category, language } = req.body;

  if (!businessName || !businessDescription) {
    return res.status(400).json({ error: "Nama bisnis dan deskripsi bisnis wajib disediakan." });
  }

  if (!ai) {
    // Generate lovely predefined fallback FAQs if Gemini isn't loaded
    console.warn("Gemini is offline. Returning default tailored mock FAQs.");
    const defaultFaqs = [
      {
        id: "faq-1",
        question: `Apakah layanan ${businessName} sudah terjamin kualitasnya?`,
        answer: `Tentu saja! ${businessName} bergerak di bidang ${category || "layanan umum"} yang fokus mengutamakan kepuasan pelanggan secara optimal dengan kualitas layanan terbaik.`
      },
      {
        id: "faq-2",
        question: "Berapa lama estimasi pengerjaan atau pengiriman pesanan?",
        answer: "Estimasi pengiriman atau pengerjaan pesanan berkisar antara 1-3 hari kerja tergantung lokasi dan tingkat kepadatan antrean layanan kami."
      },
      {
        id: "faq-3",
        question: "Bagaimana cara melakukan pembayaran atau konfirmasi?",
        answer: "Kami menerima pembayaran melalui transfer Bank lokal (BCA, Mandiri, BNI) serta berbagai macam platform E-Wallet terpercaya. Konfirmasi pembayaran dapat langsung dikirimkan ke kontak admin kami."
      }
    ];
    return res.json({ faqs: defaultFaqs, offline: true });
  }

  try {
    const prompt = `Buatkan 3 buah daftar FAQ (Frequently Asked Questions) berupa pertanyaan dan jawaban yang sering ditanyakan oleh pelanggan baru secara realistis. FAQ ini harus sangat relevan dan disesuaikan secara khusus dengan data bisnis ini:
- Nama Bisnis: ${businessName}
- Kategori Sektor: ${category || "Umum"}
- Deskripsi Bisnis: ${businessDescription}

Harap tuliskan outputnya dalam bahasa: ${language === "en" ? "Bahasa Inggris" : "Bahasa Indonesia"}.
Hasil harus berupa struktur JSON array yang valid. Format array tersebut harus berisi objek dengan key "question" dan "answer". Jangan menyertakan blok markdown (\`\`\`json ...) di dalam output, melainkan hanya plain-text mentah JSON saja.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const resultText = response.text || "[]";
    let faqsList = [];
    try {
      faqsList = JSON.parse(resultText);
    } catch {
      // Regexp fallback for matching JSON array if parser fails
      const jsonStart = resultText.indexOf("[");
      const jsonEnd = resultText.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        faqsList = JSON.parse(resultText.substring(jsonStart, jsonEnd + 1));
      }
    }

    // Add unique IDs
    const faqsWithId = faqsList.map((f: any, i: number) => ({
      id: `faq-gen-${Date.now()}-${i}`,
      question: f.question || "Pertanyaan Baru?",
      answer: f.answer || "Detail jawaban belum lengkap.",
    }));

    return res.json({ faqs: faqsWithId, offline: false });
  } catch (error: any) {
    console.error("Error generating FAQs with Gemini:", error);
    return res.status(500).json({ error: "Gagal memproduksi FAQ cerdas otomatis secara instan.", details: error.message });
  }
});

/**
 * Analytics summary reporting endpoint
 */
app.get("/api/analytics", (req, res) => {
  // Compute nice aggregations for our stats dashboards
  const total = analyticsLogs.length;
  const successfulOnes = analyticsLogs.filter(l => l.success);
  const avgResponse = total > 0 
    ? Math.round(analyticsLogs.reduce((acc, l) => acc + l.responseTime, 0) / total)
    : 0;
  
  // Count frequency of intents
  const intentMap: Record<string, number> = {};
  analyticsLogs.forEach(l => {
    intentMap[l.intent] = (intentMap[l.intent] || 0) + 1;
  });

  const topIntents = Object.entries(intentMap).map(([intent, count]) => ({
    text: intent,
    value: count
  })).sort((a, b) => b.value - a.value);

  // Hourly counts
  const hourlyDistribution = Array.from({ length: 5 }, (_, i) => {
    const timeLabel = `${i+1} jam lalu`;
    const count = analyticsLogs.filter(l => {
      const msDiff = Date.now() - new Date(l.timestamp).getTime();
      return msDiff >= i * 3600000 && msDiff < (i + 1) * 3600000;
    }).length;
    return { hour: timeLabel, count };
  }).reverse();

  res.json({
    totalChats: total,
    successRate: total > 0 ? Math.round((successfulOnes.length / total) * 100) : 100,
    avgResponseTime: avgResponse,
    topIntents,
    hourlyDistribution
  });
});

// Vite / static file serving middleware config
async function setupViteOrStaticStructure() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Serving application in development mode with Vite middleware mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production bundle static assets from build directory");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express customer chatbot backend running at http://localhost:${PORT}`);
  });
}

setupViteOrStaticStructure().catch((err) => {
  console.error("Critical error setting up Web server:", err);
});
