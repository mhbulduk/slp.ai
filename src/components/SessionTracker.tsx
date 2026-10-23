import { useState, useEffect, useRef } from "react";
import { Client, StutterStats } from "../types";
import { Play, Square, RotateCcw, Save, MessageSquare, Sparkles, Smile, Keyboard, Plus, X, UserPlus } from "lucide-react";
import ClientManagerModal from "./ClientManagerModal";

interface CustomShortcuts {
  fluent: string[];
  block: string[];
  repetition: string[];
  prolongation: string[];
}

const DEFAULT_SHORTCUTS: CustomShortcuts = {
  fluent: ["s", "a", " "],
  block: ["b", "ı", "i"],
  repetition: ["r", "t"],
  prolongation: ["p", "u"]
};

const formatKeyName = (key: string) => {
  if (key === " ") return "Spacebar";
  return key.toUpperCase();
};

interface SessionTrackerProps {
  clients: Client[];
  onSaveSession: (session: {
    clientId: string;
    clientName: string;
    type: "Reading" | "Conversation" | "Monologue" | "Other";
    duration: number;
    stats: StutterStats;
    severity: "Hafif" | "Orta" | "Şiddetli" | "Çok Şiddetli";
    isManual: boolean;
    notes: string;
  }) => void;
  onAddClient?: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient?: (id: string) => void;
}

export default function SessionTracker({ 
  clients, 
  onSaveSession,
  onAddClient,
  onDeleteClient
}: SessionTrackerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalTab, setClientModalTab] = useState<"list" | "add">("list");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (text: string, type: "success" | "error" = "error") => {
    setFeedback({ text, type });
    window.setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };
  
  const [sessionType, setSessionType] = useState<"Reading" | "Conversation" | "Monologue" | "Other">("Conversation");
  
  // Custom shortcuts state
  const [shortcuts, setShortcuts] = useState<CustomShortcuts>(() => {
    const saved = localStorage.getItem("dkt_custom_shortcuts");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_SHORTCUTS;
  });
  const [showShortcutsConfig, setShowShortcutsConfig] = useState(false);
  const [editingCategory, setEditingCategory] = useState<keyof CustomShortcuts | null>(null);

  // Counters
  const [blocks, setBlocks] = useState(0);
  const [repetitions, setRepetitions] = useState(0);
  const [prolongations, setProlongations] = useState(0);
  const [fluentSyllables, setFluentSyllables] = useState(0);

  // Durations & Hold timing
  const [totalBlockMs, setTotalBlockMs] = useState(0);
  const [totalProlongationMs, setTotalProlongationMs] = useState(0);
  const [holdDetails, setHoldDetails] = useState<{
    type: "block" | "prolongation" | null;
    ms: number;
  }>({ type: null, ms: 0 });

  const holdStartTimeRef = useRef<number | null>(null);
  const holdTypeRef = useRef<"block" | "prolongation" | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  // Stop Watch
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [notes, setNotes] = useState("");
  const [physicalConcomitants, setPhysicalConcomitants] = useState({
    distractingSounds: 0, // 0-4
    facialGrimaces: 0,     // 0-4
    headMovements: 0,      // 0-4
    extremityMovements: 0   // 0-4
  });

  // Calculate stats
  const totalDisfluencies = blocks + repetitions + prolongations;
  const totalSyllables = fluentSyllables + totalDisfluencies;
  const percentSS = totalSyllables > 0 ? (totalDisfluencies / totalSyllables) * 100 : 0;

  // Active Hold Functions
  const startHold = (type: "block" | "prolongation") => {
    if (!timerActive || holdTypeRef.current) return;
    
    // Increment counts
    if (type === "block") {
      setBlocks(prev => prev + 1);
    } else {
      setProlongations(prev => prev + 1);
    }
    
    // Visual trigger highlight
    triggerHighlight(type === "block" ? "btn-block" : "btn-pro");
    
    // Record start
    holdTypeRef.current = type;
    const startTime = Date.now();
    holdStartTimeRef.current = startTime;
    setHoldDetails({ type, ms: 0 });
    
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setHoldDetails({ type, ms: elapsed });
    }, 50);
  };

  const endHold = () => {
    if (!holdTypeRef.current || !holdStartTimeRef.current) return;
    
    const elapsed = Date.now() - holdStartTimeRef.current;
    const type = holdTypeRef.current;
    
    if (type === "block") {
      setTotalBlockMs(prev => prev + elapsed);
    } else if (type === "prolongation") {
      setTotalProlongationMs(prev => prev + elapsed);
    }
    
    // Clear refs
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    holdTypeRef.current = null;
    holdStartTimeRef.current = null;
    setHoldDetails({ type: null, ms: 0 });
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
    };
  }, []);

  // Key listening
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!timerActive) return;
      
      // Don't trigger when therapist is typing in the notes textbox
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (shortcuts.block.includes(key)) {
        if (e.repeat) return; // Prevent repetitive keydown events
        e.preventDefault();
        startHold("block");
      } else if (shortcuts.prolongation.includes(key)) {
        if (e.repeat) return; // Prevent repetitive keydown events
        e.preventDefault();
        startHold("prolongation");
      } else if (shortcuts.repetition.includes(key)) {
        if (e.repeat) return;
        setRepetitions(prev => prev + 1);
        triggerHighlight("btn-rep");
      } else if (shortcuts.fluent.includes(key)) {
        if (key === " ") {
          e.preventDefault();
        }
        if (e.repeat) return;
        setFluentSyllables(prev => prev + 1);
        triggerHighlight("btn-fluent");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!timerActive) return;
      const key = e.key.toLowerCase();
      
      // Close active hold if the released key belongs to active holding type
      if (holdTypeRef.current) {
        const activeKeys = shortcuts[holdTypeRef.current];
        if (activeKeys.includes(key)) {
          endHold();
        }
      }
    };

    const handleGlobalRelease = () => {
      endHold();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mouseup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mouseup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
    };
  }, [timerActive, shortcuts]);

  // Capturing custom pressed key when assigning keys
  useEffect(() => {
    if (!editingCategory) return;

    const captureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const pressedKey = e.key.toLowerCase();
      
      if (e.key === "Escape") {
        setEditingCategory(null);
        return;
      }

      const cleanedKey = pressedKey;
      if (!shortcuts[editingCategory].includes(cleanedKey)) {
        const updated = {
          ...shortcuts,
          [editingCategory]: [...shortcuts[editingCategory], cleanedKey]
        };
        setShortcuts(updated);
        localStorage.setItem("dkt_custom_shortcuts", JSON.stringify(updated));
      }
      setEditingCategory(null);
    };

    window.addEventListener("keydown", captureKey, true);
    return () => window.removeEventListener("keydown", captureKey, true);
  }, [editingCategory, shortcuts]);

  const handleRemoveKey = (category: keyof CustomShortcuts, keyToRemove: string) => {
    const updated = {
      ...shortcuts,
      [category]: shortcuts[category].filter(k => k !== keyToRemove)
    };
    setShortcuts(updated);
    localStorage.setItem("dkt_custom_shortcuts", JSON.stringify(updated));
  };

  const handleResetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
    localStorage.setItem("dkt_custom_shortcuts", JSON.stringify(DEFAULT_SHORTCUTS));
    setEditingCategory(null);
    showFeedback("Klavye kısayolları varsayılan ayarlara sıfırlandı.", "success");
  };

  const triggerHighlight = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("scale-105", "bg-indigo-700", "text-white");
      setTimeout(() => {
        el.classList.remove("scale-105", "bg-indigo-700", "text-white");
      }, 100);
    }
  };

  // Stopwatch effect
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  // Determine Severity Index (%SS criteria)
  let severity: "Hafif" | "Orta" | "Şiddetli" | "Çok Şiddetli" = "Hafif";
  if (percentSS >= 25) severity = "Çok Şiddetli";
  else if (percentSS >= 15) severity = "Şiddetli";
  else if (percentSS >= 6) severity = "Orta";

  // Actions
  const handleStartStop = () => {
    if (timerActive) {
      endHold();
    }
    setTimerActive(!timerActive);
  };

  const handleReset = () => {
    endHold();
    setTimerActive(false);
    setSeconds(0);
    setBlocks(0);
    setRepetitions(0);
    setProlongations(0);
    setFluentSyllables(0);
    setTotalBlockMs(0);
    setTotalProlongationMs(0);
    setHoldDetails({ type: null, ms: 0 });
    setNotes("");
    setPhysicalConcomitants({
      distractingSounds: 0,
      facialGrimaces: 0,
      headMovements: 0,
      extremityMovements: 0
    });
  };

  const handleSave = () => {
    if (!selectedClientId) {
      showFeedback("Lütfen önce seansı kaydedeceğiniz danışanı seçin.", "error");
      return;
    }
    if (totalSyllables === 0) {
      showFeedback("Herhangi bir hece sayımı yapmadınız.", "error");
      return;
    }

    const clientName = clients.find(c => c.id === selectedClientId)?.name || "Bilinmiyor";

    // Append physical concomitants report to notes if loaded
    const sumPhysical = (Object.values(physicalConcomitants) as number[]).reduce((a, b) => a + b, 0);
    let completeNotes = notes;
    if (sumPhysical > 0) {
      completeNotes += `\n\n[Semptom Değerlendirmesi] Fiziksel İkincil Eşlikçiler Toplamı: ${sumPhysical}/16. ` +
        `(Gürültülü solunum/sesler: ${physicalConcomitants.distractingSounds}/4, ` +
        `Yüz mimikleri/Gerilim: ${physicalConcomitants.facialGrimaces}/4, ` +
        `Kafa hareketleri: ${physicalConcomitants.headMovements}/4, ` +
        `Ekstremite devinimleri: ${physicalConcomitants.extremityMovements}/4)`;
    }

    if (totalBlockMs > 0 || totalProlongationMs > 0) {
      completeNotes += `\n\n[Süre Ölçümleri]`;
      if (totalBlockMs > 0) {
        const avgB = (totalBlockMs / 1000 / (blocks || 1)).toFixed(2);
        completeNotes += ` Toplam Blok Süresi: ${(totalBlockMs / 1000).toFixed(2)} sn (Ortalama: ${avgB} sn).`;
      }
      if (totalProlongationMs > 0) {
        const avgP = (totalProlongationMs / 1000 / (prolongations || 1)).toFixed(2);
        completeNotes += ` Toplam Uzatma Süresi: ${(totalProlongationMs / 1000).toFixed(2)} sn (Ortalama: ${avgP} sn).`;
      }
    }

    onSaveSession({
      clientId: selectedClientId,
      clientName,
      type: sessionType,
      duration: seconds || 1,
      stats: {
        totalSyllables,
        blocks,
        repetitions,
        prolongations,
        totalDisfluencies,
        percentSS
      },
      severity,
      isManual: true,
      notes: completeNotes
    });

    handleReset();
    showFeedback("Oturum seans kaydı başarıyla tamamlandı ve danışanın profiline eklendi!", "success");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6 relative">
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 duration-200 ${
          feedback.type === "success"
            ? "bg-emerald-50 border-emerald-250 text-emerald-800"
            : "bg-rose-50 border-rose-250 text-rose-800"
        }`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-405 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span>{feedback.text}</span>
        </div>
      )}
      {/* HEADER CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-150">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Danışan Seçin *</label>
            {onAddClient && (
              <button
                type="button"
                onClick={() => {
                  setClientModalTab("add");
                  setIsClientModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                title="Yeni Danışan Ekle veya Düzenle"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Danışan Ekle / Yönet
              </button>
            )}
          </div>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 transition-all font-bold cursor-pointer"
          >
            <option value="">-- Danışan Seçin --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.age} yaş)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Seans Odak Türü</label>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 transition-all font-bold cursor-pointer"
          >
            <option value="Conversation">Karşılıklı Sohbet (Serbest)</option>
            <option value="Reading">Okuma Pasajı Çalışması</option>
            <option value="Monologue">Yapılandırılmış Monolog</option>
            <option value="Other">Diğer Konuşma Seansları</option>
          </select>
        </div>

        {/* Stopwatch Visualizer */}
        <div className="flex items-center justify-end gap-3 bg-indigo-50/50 px-4 py-2 rounded-xl border border-indigo-100/30">
          <div className="text-right">
            <span className="block text-[9px] font-bold text-indigo-805 uppercase tracking-widest">Süre / Kronometre</span>
            <span className="text-xl font-mono font-bold text-slate-805 leading-none">{formatTime(seconds)}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleStartStop}
              className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                timerActive ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              }`}
            >
              {timerActive ? <Square className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={handleReset}
              title="Sıfırla"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg flex items-center justify-center transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KEYBOARD SHORTCUTS SECTION */}
      <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-150 rounded-lg text-indigo-700">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Özelleştirilebilir Klavye Kısayolları
              </h4>
              <p className="text-[10px] text-slate-550 font-semibold uppercase">Sayaç Aktifken Dinleyerek Seri Hece Sayımı Yapın</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowShortcutsConfig(!showShortcutsConfig)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-3xs cursor-pointer"
          >
            {showShortcutsConfig ? "Kısayol Düzenleyiciyi Kapat" : "Kısayol Tuşlarını Kendine Göre Ata / Düzenle"}
          </button>
        </div>

        {showShortcutsConfig && (
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tuş Atama Paneli</span>
              <button
                type="button"
                onClick={handleResetShortcuts}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
              >
                Varsayılan Kısayollara Dön
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(DEFAULT_SHORTCUTS) as Array<keyof CustomShortcuts>).map((category) => {
                const categoryLabels: Record<keyof CustomShortcuts, string> = {
                  fluent: "Akıcı Hece",
                  block: "Blok",
                  repetition: "Tekrar",
                  prolongation: "Uzatma"
                };

                const categoryColors: Record<keyof CustomShortcuts, string> = {
                  fluent: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  block: "bg-red-50 text-red-700 border-red-200",
                  repetition: "bg-amber-50 text-amber-700 border-amber-200",
                  prolongation: "bg-pink-50 text-pink-700 border-pink-200"
                };

                const isEditing = editingCategory === category;

                return (
                  <div key={category} className="p-3 rounded-lg border flex flex-col justify-between gap-2 bg-slate-50/50 border-slate-150">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-705">{categoryLabels[category]}</span>
                      {isEditing ? (
                        <span className="text-[10px] font-bold text-indigo-600 animate-pulse bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Tuşa Basın... (Esc: İptal)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingCategory(category)}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Tuş Ekle
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 items-center min-h-6">
                      {shortcuts[category].length === 0 ? (
                        <span className="text-[10px] text-slate-450 italic font-semibold">Kısayol atanmamış</span>
                      ) : (
                        shortcuts[category].map((key) => (
                          <div
                            key={key}
                            className={`flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded border shadow-3xs ${categoryColors[category]}`}
                          >
                            <span>{formatKeyName(key)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(category, key)}
                              className="hover:bg-slate-200/60 p-0.5 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
              💡 <strong>Nasıl Çalışır?</strong> "Tuş Ekle" butonuna basıp ardından klavyenizdeki dilediğiniz bir harf, sayı veya spacebar tuşuna basmanız yeterlidir. Atadığınız tuşlar tarayıcıda saklanır ve sekmeler arasında kalıcıdır.
            </p>
          </div>
        )}

        {timerActive && (
          <div className="text-[11px] font-semibold text-slate-650 bg-amber-50/60 border border-amber-200/50 p-2.5 rounded-lg flex items-start gap-2">
            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase">Klavye Aktif</span>
            <div className="leading-relaxed">
              Atadığınız kısayollar aktif: 
              <strong> Akıcı Hece:</strong> {shortcuts.fluent.map(formatKeyName).join(", ") || "Atanmadı"} | 
              <strong> Blok:</strong> {shortcuts.block.map(formatKeyName).join(", ") || "Atanmadı"} | 
              <strong> Tekrar:</strong> {shortcuts.repetition.map(formatKeyName).join(", ") || "Atanmadı"} | 
              <strong> Uzatma:</strong> {shortcuts.prolongation.map(formatKeyName).join(", ") || "Atanmadı"}.
            </div>
          </div>
        )}
      </div>

      {/* CORE CLIKER MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Safe Syllables (Akıcı) */}
        <div
          id="btn-fluent"
          onClick={() => timerActive && setFluentSyllables(prev => prev + 1)}
          className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all select-none ${
            timerActive
              ? "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 cursor-pointer text-emerald-990"
              : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed text-slate-400"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-805 mb-1 flex items-center gap-1.5">
            Akıcı Hece <span className="bg-emerald-200 px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold">[{shortcuts.fluent.map(formatKeyName).join("/") || "Atanmadı"}]</span>
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-700">{fluentSyllables}</span>
          <span className="text-[10px] text-emerald-600 mt-2 font-medium">Düzgün ve Akıcı Akış</span>
        </div>

        {/* Blocks (Bloklar) */}
        <div
          id="btn-block"
          onMouseDown={() => timerActive && startHold("block")}
          onTouchStart={(e) => { if (timerActive) { e.preventDefault(); startHold("block"); } }}
          onMouseLeave={() => timerActive && endHold()}
          className={`relative flex flex-col items-center justify-center p-6 border rounded-2xl transition-all select-none ${
            timerActive
              ? "bg-red-50 hover:bg-red-100/70 border-red-200 cursor-pointer text-red-990"
              : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed text-slate-400"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-805 mb-1 flex items-center gap-1.5">
            Blok <span className="bg-red-200 px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold">[{shortcuts.block.map(formatKeyName).join("/") || "Atanmadı"}]</span>
          </span>
          <span className="text-3xl font-bold font-mono text-red-600">{blocks}</span>
          <span className="text-[10px] text-red-650 mt-2 font-medium">Kilitlenme ve Takılma</span>
          {totalBlockMs > 0 && (
            <span className="text-[10px] text-red-700 mt-1.5 font-mono font-bold bg-red-100 px-2 py-0.5 rounded-full">
              Toplam: {(totalBlockMs / 1000).toFixed(1)} sn (Ort: {(totalBlockMs / 1000 / (blocks || 1)).toFixed(1)} sn)
            </span>
          )}

          {holdDetails.type === "block" && (
            <div className="absolute inset-0 bg-red-600/10 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center animate-pulse z-10 animate-fade-in">
              <span className="text-red-700 font-mono text-xl font-extrabold">⏱ {(holdDetails.ms / 1000).toFixed(2)} sn</span>
              <span className="text-red-800 text-[9px] font-bold uppercase tracking-wider">Metrik Ölçülüyor...</span>
            </div>
          )}
        </div>

        {/* Repetitions (Tekrarlar) */}
        <div
          id="btn-rep"
          onClick={() => timerActive && setRepetitions(prev => prev + 1)}
          className={`flex flex-col items-center justify-center p-6 border rounded-2xl transition-all select-none ${
            timerActive
              ? "bg-amber-50 hover:bg-amber-100/70 border-amber-200 cursor-pointer text-amber-990"
              : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed text-slate-400"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-805 mb-1 flex items-center gap-1.5">
            Tekrar <span className="bg-amber-200 px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold">[{shortcuts.repetition.map(formatKeyName).join("/") || "Atanmadı"}]</span>
          </span>
          <span className="text-3xl font-bold font-mono text-amber-600">{repetitions}</span>
          <span className="text-[10px] text-amber-650 mt-2 font-medium">Ses/Hece/Sözcük Tekrarı</span>
        </div>

        {/* Prolongations (Uzatmalar) */}
        <div
          id="btn-pro"
          onMouseDown={() => timerActive && startHold("prolongation")}
          onTouchStart={(e) => { if (timerActive) { e.preventDefault(); startHold("prolongation"); } }}
          onMouseLeave={() => timerActive && endHold()}
          className={`relative flex flex-col items-center justify-center p-6 border rounded-2xl transition-all select-none ${
            timerActive
              ? "bg-pink-50 hover:bg-pink-100/70 border-pink-200 cursor-pointer text-pink-990"
              : "bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed text-slate-400"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-805 mb-1 flex items-center gap-1.5">
            Uzatma <span className="bg-pink-200 px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold">[{shortcuts.prolongation.map(formatKeyName).join("/") || "Atanmadı"}]</span>
          </span>
          <span className="text-3xl font-bold font-mono text-pink-600">{prolongations}</span>
          <span className="text-[10px] text-pink-650 mt-2 font-medium">Sesi Uzatarak Söyleme</span>
          {totalProlongationMs > 0 && (
            <span className="text-[10px] text-pink-700 mt-1.5 font-mono font-bold bg-pink-100 px-2 py-0.5 rounded-full">
              Toplam: {(totalProlongationMs / 1000).toFixed(1)} sn (Ort: {(totalProlongationMs / 1000 / (prolongations || 1)).toFixed(1)} sn)
            </span>
          )}

          {holdDetails.type === "prolongation" && (
            <div className="absolute inset-0 bg-pink-600/10 backdrop-blur-2xs rounded-2xl flex flex-col items-center justify-center animate-pulse z-10 animate-fade-in">
              <span className="text-pink-700 font-mono text-xl font-extrabold">⏱ {(holdDetails.ms / 1000).toFixed(2)} sn</span>
              <span className="text-pink-850 text-[9px] font-bold uppercase tracking-wider">Metrik Ölçülüyor...</span>
            </div>
          )}
        </div>
      </div>

      {/* METRIC ESTIMATES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-205">
        <div className="space-y-1">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Toplanmış Aktivite</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-150">
              <span className="text-slate-400 block text-[9px] font-semibold">Toplam Akıcısızlık</span>
              <strong className="text-slate-800 text-sm font-bold font-mono">{totalDisfluencies} olay</strong>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-150">
              <span className="text-slate-400 block text-[9px] font-semibold">Toplam Hece</span>
              <strong className="text-slate-800 text-sm font-bold font-mono">{totalSyllables} hece</strong>
            </div>
          </div>
        </div>

        {/* Real-time calculated %SS */}
        <div className="flex flex-col justify-center">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Kekemelik Akıcısızlık Yüzdesi (%SS)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600 font-mono">
              %{percentSS.toFixed(1)}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              severity === "Hafif" ? "bg-emerald-100 text-emerald-800" :
              severity === "Orta" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
            }`}>
              {severity} Derece
            </span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 font-semibold">%SS = (Akıcısızlık / Toplam Hece) * 100</span>
        </div>

        {/* Speech speed */}
        <div className="flex flex-col justify-center">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
            Konuşma Hızı (Hız Faktörü)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800 font-mono">
              {seconds > 0 ? Math.round((totalSyllables / seconds) * 60) : 0}
            </span>
            <span className="text-xs text-slate-550 font-semibold">Hece / Dakika (SPM)</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1 font-semibold">Normal aralık yetişkinlerde: 160-220 SPM.</span>
        </div>
      </div>

      {/* DETAILED DIAGNOSTICS: PHYSICAL CONCOMITANTS (SSI-4 Eşlikçiler) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Fiziksel İkincil Eşlikçiler Değerlendirmesi
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
          Kekemelik Şiddet Ölçeği (SSI-4) standartları doğrultusunda, konuşurken saptanan fiziksel ikincil gerilim tepkilerini derecelendirin (0: Belirti Yok, 4: Ağır/Çok Dikkat Dağıtıcı).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Gürültülü Solunum / Çıtlatma</label>
            <select
              value={physicalConcomitants.distractingSounds}
              onChange={(e) => setPhysicalConcomitants(prev => ({ ...prev, distractingSounds: Number(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 transition-all cursor-pointer font-bold"
            >
              <option value={0}>0 - Dikkat dağıtmıyor</option>
              <option value={1}>1 - Zayıf belirtilimler</option>
              <option value={2}>2 - Orta düzey sesler</option>
              <option value={3}>3 - Belirgin / Rahatsızlık verici</option>
              <option value={4}>4 - Ağır düzey gürültü</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Yüz Mimikleri / Çene Kasımı</label>
            <select
              value={physicalConcomitants.facialGrimaces}
              onChange={(e) => setPhysicalConcomitants(prev => ({ ...prev, facialGrimaces: Number(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 transition-all cursor-pointer font-bold"
            >
              <option value={0}>0 - Dudak gerginliği yok</option>
              <option value={1}>1 - Hafif göz kırpma</option>
              <option value={2}>2 - Dudak büzme, çene kilitlenmesi</option>
              <option value={3}>3 - Belirgin burun kırıştırma, asimetri</option>
              <option value={4}>4 - Şiddetli tikler ve gerilim</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Baş Hareketleri (Öne/Yana)</label>
            <select
              value={physicalConcomitants.headMovements}
              onChange={(e) => setPhysicalConcomitants(prev => ({ ...prev, headMovements: Number(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 transition-all cursor-pointer font-bold"
            >
              <option value={0}>0 - Baş stabil</option>
              <option value={1}>1 - Hafif kafa silkeleme</option>
              <option value={2}>2 - Göz kontağını koparan kafa çevirme</option>
              <option value={3}>3 - Belirgin baş sallama/ritm tutma</option>
              <option value={4}>4 - Ağır tik şeklinde baş hareketi</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Ekstremite (Ayak/Kol) Vurma</label>
            <select
              value={physicalConcomitants.extremityMovements}
              onChange={(e) => setPhysicalConcomitants(prev => ({ ...prev, extremityMovements: Number(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 transition-all cursor-pointer font-bold"
            >
              <option value={0}>0 - Eklem hareketleri yok</option>
              <option value={1}>1 - Hafif parmak ritmi</option>
              <option value={2}>2 - Masaya dokunma, kıpırdanma</option>
              <option value={3}>3 - Belirgin ayak vurma, bacak sallama</option>
              <option value={4}>4 - Şiddetli gövde salınımı/yumruk sıkma</option>
            </select>
          </div>
        </div>
      </div>

      {/* SESSION CLINICAL NOTES FORM */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
          Klinik Gözlemler ve Oturum Değerlendirmesi
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bu hece sayımı seansında danışanın kullandığı baş etme stratejileri, durum tespiti, teknik uygulamadaki başarısı vb."
          className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-800 transition-all resize-none font-semibold"
        />
      </div>

      {/* SAVE CONTROLS */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={handleReset}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Seansı Boşalt / Temizle
        </button>
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Oturum Raporunu Kaydet
        </button>
      </div>

      {/* CLIENT MANAGER MODAL */}
      {onAddClient && onDeleteClient && (
        <ClientManagerModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={(id) => setSelectedClientId(id)}
          onAddClient={onAddClient}
          onDeleteClient={onDeleteClient}
          initialTab={clientModalTab}
          titleContext="Manuel Hece Sayımı"
        />
      )}
    </div>
  );
}
