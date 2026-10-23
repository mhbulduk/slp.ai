import { useState, useRef, useEffect } from "react";
import { 
  Send, Sparkles, User, HelpCircle, ArrowRight, CornerDownLeft, 
  RefreshCw, ClipboardCheck, MessageSquare, AlertTriangle, ShieldCheck, HelpCircle as HelpIcon, Clock, BookOpen
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  date: string;
}

interface DktChatAssistantProps {
  currentUserEmail: string;
}

// Simple Custom Markdown/Text Formatter to style bold, headers, list items and paragraphs
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split("\n");
  
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Render headings (### or ##)
        if (trimmed.startsWith("###")) {
          return (
            <h5 key={idx} className="text-xs font-black text-slate-800 uppercase tracking-wider mt-4 first:mt-0">
              {trimmed.replace(/^###\s*/, "")}
            </h5>
          );
        }
        if (trimmed.startsWith("##") || trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length < 100 && !trimmed.includes(":")) {
          return (
            <h4 key={idx} className="text-sm font-extrabold text-slate-900 tracking-tight mt-3 first:mt-0">
              {trimmed.replace(/^##\s*/, "").replace(/\*\*/g, "")}
            </h4>
          );
        }

        // Render Academic References Header
        if (trimmed.includes("📚") || trimmed.toLowerCase().startsWith("kaynakça") || trimmed.toLowerCase().startsWith("referanslar")) {
          return (
            <div key={idx} className="mt-3.5 pt-2.5 border-t border-indigo-150 flex items-center gap-2 text-xs font-bold text-indigo-950">
              <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{applyInlineFormatting(trimmed)}</span>
            </div>
          );
        }

        // Render Bullet lists
        if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          const rawContent = trimmed.substring(1).trim();
          const isCitation = rawContent.includes("(") && (rawContent.includes("20") || rawContent.includes("19"));
          return (
            <div key={idx} className={`flex items-start gap-2 pl-3 py-0.5 ${isCitation ? "text-slate-600 bg-slate-50/80 rounded-md p-1.5 my-0.5" : ""}`}>
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isCitation ? "bg-indigo-400" : "bg-indigo-500"}`} />
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                {applyInlineFormatting(rawContent)}
              </p>
            </div>
          );
        }

        // Render numbered lists
        const numberedMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numberedMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-3 py-0.5">
              <span className="text-[11px] font-mono font-bold text-indigo-600 mt-0.5">{numberedMatch[1]}.</span>
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                {applyInlineFormatting(numberedMatch[2])}
              </p>
            </div>
          );
        }

        // Default Paragraph
        if (trimmed === "") return <div key={idx} className="h-2" />;

        return (
          <p key={idx} className="text-xs font-semibold text-slate-600 leading-relaxed">
            {applyInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Support simple bold syntax (**text**) within lines
function applyInlineFormatting(txt: string) {
  const parts = txt.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return txt;
  
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <strong key={i} className="font-extrabold text-slate-800 bg-indigo-50/50 px-1 rounded-sm">
          {part}
        </strong>
      );
    }
    return part;
  });
}

export default function DktChatAssistant({ currentUserEmail }: DktChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emailKey = currentUserEmail.replace(/[@.]/g, "_");

  // Load chat history from localStorage
  useEffect(() => {
    const welcome: Message[] = [
      {
        id: "welcome-1",
        role: "model",
        text: `Merhaba! Ben Dil ve Konuşma Terapistlerine (DKT) klinik ve akademik çalışmalarında destek olmak amacıyla tasarlanmış **Yapay Zeka Klinik Asistanıyım**.

⚠️ **Klinik Yardımcı Araç Bildirimi:**
- Bu uygulama genel olarak terapiste yardımcı bir klinik karar destek aracıdır ve **kesinlikle bir Dil ve Konuşma Terapistinin (DKT) yerini alamaz**.
- Terapi yöntemleri konusunda, herkesin internette ve açık ders kitaplarında bulabileceği genel-geçer teorik özetler haricinde kişiye özel tedavi reçetesi verilemez.
- Hangi yöntemin uygulanacağı, seans hedefleri ve müdahale planı yalnızca yetkili bir DKT tarafından yüz yüze değerlendirmeyle kararlaştırılabilir.

**Danışabileceğiniz Bilimsel Konular:**
- Kekemelik ile Hızlı Bozuk Konuşma (Cluttering / HBK) arasındaki klinik, akustik ve farkındalık farkları.
- Türkçe seslerin fonetik özellikleri, çıkış yerleri ve akustik sınıflandırması.
- Gelişimsel dil basamakları, yaş normları ve Ortalama Sözce Uzunluğu (MLU/OSU) hesaplama kuralları.
- Standart değerlendirme testlerinin (TELD-3-T, SST vb.) kuramsal parametreleri ve normatif çerçevesi.

Dilerseniz aşağıdaki hazır bilimsel tarama konularından birini seçerek başlayabilirsiniz!`,
        date: new Date().toISOString()
      }
    ];

    const stored = localStorage.getItem(`dkt_chat_history_${emailKey}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If parsed is only the initial welcome message, refresh it to keep sample topics aligned
        if (parsed.length === 1 && parsed[0].id?.startsWith("welcome")) {
          setMessages(welcome);
          localStorage.setItem(`dkt_chat_history_${emailKey}`, JSON.stringify(welcome));
        } else {
          setMessages(parsed);
        }
      } catch (err) {
        console.error("Önceki DKT sohbet geçmişi yüklenemedi:", err);
      }
    } else {
      setMessages(welcome);
    }
  }, [emailKey]);

  // Handle auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const saveHistory = (updatedMsgs: Message[]) => {
    localStorage.setItem(`dkt_chat_history_${emailKey}`, JSON.stringify(updatedMsgs));
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim()) return;

    if (!customPrompt) {
      setInputText("");
    }

    setApiError(null);
    const userMsg: Message = {
      id: "msg_" + Date.now(),
      role: "user",
      text: textToSend,
      date: new Date().toISOString()
    };

    const currentHistory = [...messages, userMsg];
    setMessages(currentHistory);
    saveHistory(currentHistory);
    setIsLoading(true);

    try {
      const response = await fetch("/api/dkt-chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail
        },
        body: JSON.stringify({
          prompt: textToSend,
          // Send last 8 messages as context to maintain continuity
          history: currentHistory.slice(-8, -1).map(m => ({
            role: m.role,
            text: m.text
          })),
          simulationMode: isSimulatedMode
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Sunucu mesaja yanıt veremedi.");
      }

      const resData = await response.json();

      const modelMsg: Message = {
        id: "msg_" + Date.now() + "_model",
        role: "model",
        text: resData.response,
        date: new Date().toISOString()
      };

      const updatedHistory = [...currentHistory, modelMsg];
      setMessages(updatedHistory);
      saveHistory(updatedHistory);
    } catch (err: any) {
      console.error("AI Assistant process failed:", err);
      setApiError(err?.message || "Yapay zeka yanıtı alınamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Tüm DKT asistan sohbet geçmişinizi sıfırlamak istediğinize emin misiniz?")) {
      const resetMessages: Message[] = [
        {
          id: "welcome-reset",
          role: "model",
          text: "Sohbet geçmişi başarıyla temizlendi. Yeni bir DKT tarama sorgusu veya mesleki yardımı alabilirsiniz.",
          date: new Date().toISOString()
        }
      ];
      setMessages(resetMessages);
      saveHistory(resetMessages);
      setApiError(null);
    }
  };

  // Preset prompts to help user screen or test DKT topics instantly (ZERO therapy content, purely diagnostic/phonetic/linguistic norms)
  const presetPrompts = [
    {
      title: "Kekemelik & HBK Ayrıcı Tanısı",
      desc: "Kekemelik ile Hızlı Bozuk Konuşma arasındaki klinik ve akustik ayrım.",
      prompt: "Kekemelik ile Hızlı Bozuk Konuşma (Cluttering - HBK) arasındaki temel klinik, akustik, konuşma hızı ve danışan farkındalığı farklarını akademik kaynaklara dayalı olarak karşılaştırır mısın?"
    },
    {
      title: "Türkçe Sesler & IPA Standartları",
      desc: "8 sesli harf (/a/→ʌ, /e/→ɛ, /i/→ɪ, /ı/→ɯ...) ve ünsüzlerin Uluslararası Fonetik Alfabe karşılıkları.",
      prompt: "Türkçedeki 8 sesli (ünlü) harfin Uluslararası Fonetik Alfabe (IPA) karşılıkları (/a/→ʌ, /e/→ɛ, /i/→ɪ, /ı/→ɯ, /u/→u, /ü/→y, /o/→o, /ö/→œ) ve ünsüzlerin fonetik sınıflandırmasını akademik kaynak belirterek açıklar mısın?"
    },
    {
      title: "Ortalama Sözce Uzunluğu (MLU) Normları",
      desc: "Çocuk dilinde sözcük ve morfem bazlı MLU hesaplama standartları.",
      prompt: "Çocuk dilinde Ortalama Sözce Uzunluğunun (MLU / OSU) sözcük ve biçimbirim (morfem) bazında hesaplanma kuralları ve Türkçe için geliştirilmiş normatif standartlar nelerdir? Kaynaklarıyla açıklar mısın?"
    }
  ];

  return (
    <div className="flex flex-col h-[520px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs animate-in fade-in duration-300">
      
      {/* HEADER BAR */}
      <div className="p-4 px-6 bg-slate-900 border-b border-slate-850 flex items-center justify-between text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-650 rounded-xl flex items-center justify-center relative">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight font-sans">Yapay Zeka DKT Yardımcı Asistanı</h3>
            <p className="text-[9px] text-indigo-300 uppercase font-bold mt-0.5 tracking-wider">
              Terapiste Yardımcı Klinik Literatür ve Bilgi Platformu (Terapistin Yerini Alamaz)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* SIMULATION SWITCH */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 border border-slate-700/50 rounded-xl p-1.5 px-3">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-extrabold text-slate-300">Simülatör Sürümü</span>
              <span className="text-[8px] text-slate-400 font-medium leading-none">Çevrimdışı Yapay Zeka</span>
            </div>
            <button 
              onClick={() => setIsSimulatedMode(!isSimulatedMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all cursor-pointer ${
                isSimulatedMode ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-all ${
                isSimulatedMode ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Sohbeti Temizle"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DKT EXCLUSIVITY & ASSISTIVE SCOPE TOP NOTIFICATION */}
      <div className="p-2.5 px-6 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2.5 flex-shrink-0 text-[10.5px] text-amber-900 font-medium leading-relaxed">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Klinik Yardımcı Araç Bildirimi:</strong> Bu yapay zeka asistanı bir Dil ve Konuşma Terapistinin (DKT) <strong>yerini alamaz</strong>. Terapi yöntemleri konusunda yalnızca internette ve temel ders kitaplarında herkesin bulabileceği genel-geçer literatür bilgisi sunulur; kişiye özel tedavi reçetesi oluşturulamaz. Tüm değerlendirme ve müdahale süreçleri yetkili DKT tarafından yürütülmelidir.
          </span>
        </div>
      </div>

      {/* MESSAGES VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            {/* AVATAR */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
              msg.role === "user" 
                ? "bg-slate-800 text-white" 
                : "bg-indigo-600 text-white"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : "D"}
            </div>

            {/* BALLOON */}
            <div className={`rounded-2xl p-3.5 shadow-3xs ${
              msg.role === "user" 
                ? "bg-slate-800 text-white rounded-tr-none" 
                : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
            }`}>
              {msg.role === "user" ? (
                <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <FormattedMessageText text={msg.text} />
              )}
              <div className={`text-[8px] mt-1.5 font-bold uppercase tracking-wider text-right ${
                msg.role === "user" ? "text-slate-400" : "text-slate-400"
              }`}>
                {new Date(msg.date).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* LOADING INDICATOR */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              D
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 px-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {/* ERROR */}
        {apiError && (
          <div className="bg-rose-50 border border-rose-150 rounded-xl p-3 flex gap-2 text-rose-850 text-xs font-bold font-semibold max-w-lg mx-auto">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            <div>{apiError}</div>
          </div>
        )}

        {/* FLOATING PRESETS FOR COLD START */}
        {messages.length <= 1 && !isLoading && (
          <div className="space-y-2 pt-4">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">BİLİMSEL LİTERATÜR VE PARAMETRE ŞABLONLARI (TERAPİ VE REÇETE İÇERMEZ):</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presetPrompts.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(preset.prompt)}
                  className="bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl p-3.5 text-left text-xs space-y-1.5 shadow-3xs cursor-pointer select-none tracking-tight transition-all duration-300 hover:-translate-y-0.5"
                >
                  <p className="font-extrabold text-slate-800 font-sans">{preset.title}</p>
                  <p className="text-[10px] font-semibold text-slate-500 leading-snug">{preset.desc}</p>
                  <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold group-hover:underline pt-1 pt-auto mt-2">
                    Bu İstemi Gönder
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER ENTER MESSAGE INPUT */}
      <div className="p-3 bg-white border-t border-slate-150 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Buraya dil ve konuşma terapisi taraması veya literatür sorgunuzu yazın..."
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-2.5 px-4 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl p-3 cursor-pointer transition-all flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center font-medium">
          ⚠️ <strong>Yasal Uyarı:</strong> Bu uygulama terapiste yardımcı bir araçtır ve bir terapistin yerini alamaz. Terapi yöntemleri konusunda yalnızca genel literatür bilgisi sunulur; nihai klinik karar DKT&apos;ye aittir.
        </p>
      </div>

    </div>
  );
}
