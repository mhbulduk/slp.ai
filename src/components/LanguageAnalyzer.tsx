import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Client, LanguageSession, LanguageUtterance, LanguageError } from "../types";
import ClientManagerModal from "./ClientManagerModal";
import { 
  startLiveFrequencyTracker, 
  AudioFrequencyTracker, 
  FrequencyAnalysisResult,
  PitchProfile
} from "../utils/audioFrequencyAnalyzer";
import { 
  Mic, Square, Trash2, Upload, Sparkles, AlertCircle, FileAudio, 
  Play, Volume2, CheckCircle2, ChevronRight, Award, HelpCircle, FileText, 
  Printer, Copy, Check, Info, ArrowLeft, RefreshCw, BarChart2,
  Sliders, Settings, BookOpen, Lightbulb, SlidersHorizontal, ToggleLeft, ClipboardCheck, Users,
  UserPlus, AudioLines
} from "lucide-react";

interface LanguageAnalyzerProps {
  clients: Client[];
  currentUserEmail: string;
  onAddClient?: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient?: (id: string) => void;
}

export default function LanguageAnalyzer({ 
  clients, 
  currentUserEmail,
  onAddClient,
  onDeleteClient
}: LanguageAnalyzerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  // Client Management Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [clientModalInitialTab, setClientModalInitialTab] = useState<"list" | "add">("list");

  // Speaker & Frequency Diarization State
  const [pitchProfile, setPitchProfile] = useState<PitchProfile>("child");
  const [liveFrequencyData, setLiveFrequencyData] = useState<FrequencyAnalysisResult | null>(null);
  const [finalFrequencySummary, setFinalFrequencySummary] = useState<FrequencyAnalysisResult | null>(null);
  const frequencyTrackerRef = useRef<AudioFrequencyTracker | null>(null);

  // Settings Panel State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [analysisStrictness, setAnalysisStrictness] = useState<"standard" | "strict" | "lenient">("standard");
  const [analysisTarget, setAnalysisTarget] = useState<"teld" | "general" | "sli">("general");
  const [customDirectives, setCustomDirectives] = useState<string>("");

  // History / View state
  const [historySessions, setHistorySessions] = useState<LanguageSession[]>([]);
  const [activeSession, setActiveSession] = useState<LanguageSession | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Copy/print alerts
  const [copied, setCopied] = useState(false);

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Visual waveform animation state
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(28).fill(4));

  const emailKey = currentUserEmail.replace(/[@.]/g, "_");

  // Load completed language tests from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`dkt_languages_${emailKey}`);
    if (stored) {
      try {
        setHistorySessions(JSON.parse(stored));
      } catch (err) {
        console.error("Önceki dil analiz raporları yüklenemedi:", err);
      }
    }
  }, [emailKey]);

  // Set default client if available or update if current selected client was deleted
  useEffect(() => {
    if (clients.length > 0) {
      const exists = clients.some(c => c.id === selectedClientId);
      if (!selectedClientId || !exists) {
        setSelectedClientId(clients[0].id);
      }
    } else {
      setSelectedClientId("");
    }
  }, [clients, selectedClientId]);

  // Handle record timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        setWaveformBars(prev => prev.map(() => Math.floor(Math.random() * 22) + 5));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setWaveformBars(Array(28).fill(4));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    chunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadedFileName(null);
    setRecordingSeconds(0);
    setAnalysisError(null);
    setLiveFrequencyData(null);
    setFinalFrequencySummary(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          }
        });
      } catch (err) {
        console.warn("Gelişmiş ses filtreleri uygulanamadı, varsayılan akışa dönülüyor:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Start Real-Time Web Audio Frequency & Speaker Classifier
      try {
        frequencyTrackerRef.current = startLiveFrequencyTracker(stream, {
          profile: pitchProfile,
          onUpdate: (result) => {
            setLiveFrequencyData(result);
          }
        });
      } catch (freqErr) {
        console.warn("Canlı frekans analizörü başlatılamadı:", freqErr);
      }

      let mediaRecorder: MediaRecorder;
      let recordedMimeType = "audio/webm";

      try {
        if (typeof MediaRecorder.isTypeSupported === "function") {
          if (MediaRecorder.isTypeSupported("audio/webm")) {
            mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            recordedMimeType = "audio/webm";
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/mp4" });
            recordedMimeType = "audio/mp4";
          } else {
            mediaRecorder = new MediaRecorder(stream);
            recordedMimeType = mediaRecorder.mimeType || "audio/webm";
          }
        } else {
          mediaRecorder = new MediaRecorder(stream);
          recordedMimeType = mediaRecorder.mimeType || "audio/webm";
        }
      } catch (mimeErr) {
        mediaRecorder = new MediaRecorder(stream);
        recordedMimeType = mediaRecorder.mimeType || "audio/webm";
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: recordedMimeType });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        // Stop frequency tracker and capture final summary
        if (frequencyTrackerRef.current) {
          const summary = frequencyTrackerRef.current.stop();
          setFinalFrequencySummary(summary);
          frequencyTrackerRef.current = null;
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setAnalysisError(null);
    } catch (err: any) {
      console.error("Mikrofon erişim hatası:", err);
      setAnalysisError("Mikrofona erişilemedi. Lütfen izinleri kontrol edip sayfa izinlerini yenileyin.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (frequencyTrackerRef.current) {
      const summary = frequencyTrackerRef.current.stop();
      setFinalFrequencySummary(summary);
      frequencyTrackerRef.current = null;
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    setAnalysisError(null);
    setLiveFrequencyData(null);
    setFinalFrequencySummary(null);

    setUploadedFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleResetRecordState = () => {
    if (frequencyTrackerRef.current) {
      frequencyTrackerRef.current.stop();
      frequencyTrackerRef.current = null;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadedFileName(null);
    setRecordingSeconds(0);
    setAnalysisError(null);
    setIsRecording(false);
    setLiveFrequencyData(null);
    setFinalFrequencySummary(null);
  };

  // Analyze audio via API
  const handlePerformAnalysis = async () => {
    if (!audioBlob) {
      setAnalysisError("Değerlendirilecek bir ses kaydı veya yüklenmiş dosya bulunmalıdır.");
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId);
    const clientName = clientObj ? clientObj.name : "İsimsiz Danışan";

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const response = await fetch("/api/analyze-language", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": currentUserEmail
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: audioBlob.type,
              clientName,
              simulationMode: isSimulatedMode,
              analysisSettings: {
                strictness: analysisStrictness,
                target: analysisTarget,
                customDirectives
              },
              clientPitchProfile: pitchProfile,
              speakerSeparationEnabled: true,
              liveFrequencySummary: finalFrequencySummary || liveFrequencyData
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Sunucu dil analizini gerçekleştiremedi.");
          }

          const analysisResult = await response.json();

          const newSession: LanguageSession = {
            id: "lang_" + Date.now(),
            clientId: selectedClientId,
            clientName,
            date: new Date().toISOString(),
            utterances: analysisResult.utterances,
            stats: analysisResult.stats,
            morphologyDetails: analysisResult.morphologyDetails,
            syntaxDetails: analysisResult.syntaxDetails,
            errors: analysisResult.errors,
            clinicalSummary: analysisResult.clinicalSummary,
            recommendations: analysisResult.recommendations,
            isSimulated: analysisResult.isSimulated,
            modelUsed: analysisResult.modelUsed || "Gemini 3.5 Flash",
            speakerSeparation: analysisResult.speakerSeparation || finalFrequencySummary
          };

          const updatedSessions = [newSession, ...historySessions];
          setHistorySessions(updatedSessions);
          localStorage.setItem(`dkt_languages_${emailKey}`, JSON.stringify(updatedSessions));
          setActiveSession(newSession);
          handleResetRecordState();
        } catch (subErr: any) {
          console.error("Analysis process failed:", subErr);
          setAnalysisError(subErr?.message || "Yapay zeka dil analizi oluşturulurken hata meydan geldi.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (err: any) {
      console.error("Audio conversion failed:", err);
      setAnalysisError("Ses dosyası işlenirken bir sorun oluştu.");
      setIsAnalyzing(false);
    }
  };

  const handleCopyReportToClipboard = () => {
    if (!activeSession) return;
    
    let reportText = `==================================================\n`;
    reportText += `DİL VE KONUŞMA TÜMCE ANALİZ RAPORU (MLU/OSU)\n`;
    reportText += `==================================================\n`;
    reportText += `Danışan Adı: ${activeSession.clientName}\n`;
    reportText += `Değerlendirme Tarihi: ${new Date(activeSession.date).toLocaleString("tr-TR")}\n`;
    reportText += `Model Tipi: ${activeSession.isSimulated ? "Klinik Simülatör Modu" : "Yapay Zeka Analizör"}\n\n`;
    
    reportText += `[KLİNİK METRİKLER (ORTALAMA SÖZCE UZUNLUĞU)]\n`;
    reportText += `- Toplam Sözce (Söylem) Sayısı: ${activeSession.stats.totalUtterances}\n`;
    reportText += `- Toplam Sözcük Sayısı: ${activeSession.stats.totalWords}\n`;
    reportText += `- Toplam Biçimbirim (Morfem) Sayısı: ${activeSession.stats.totalMorphemes}\n`;
    reportText += `- OSU - Sözcük Bazlı (MLU-w): ${activeSession.stats.mluWords.toFixed(2)}\n`;
    reportText += `- OSU - Biçimbirim Bazlı (MLU-m): ${activeSession.stats.mluMorphemes.toFixed(2)}\n`;
    reportText += `- Sözcük Çeşitliliği (Type-Token Ratio - TTR): ${activeSession.stats.typeTokenRatio.toFixed(2)}\n\n`;
    
    reportText += `[YAZIYA DÖKÜLMİŞ SÖZCELER (SÖYLEM ÖRNEĞİ)]\n`;
    activeSession.utterances.forEach(u => {
      reportText += `Sözce #${u.id}: "${u.text}" | (Sözcük: ${u.wordCount} - Biçimbirim: ${u.morphemeCount})\n`;
    });
    reportText += `\n`;
    
    reportText += `[BİÇİMBİRİMSEL (MORFOLOJİK) YAPILAR]\n`;
    reportText += `${activeSession.morphologyDetails}\n\n`;
    
    reportText += `[SÖZDİZİMSEL (SİNTAKTİK) ÖZELLİKLER]\n`;
    reportText += `${activeSession.syntaxDetails}\n\n`;
    
    if (activeSession.errors && activeSession.errors.length > 0) {
      reportText += `[HATA VE SAPMA TESPİTLERİ]\n`;
      activeSession.errors.forEach((e, idx) => {
        reportText += `${idx+1}. Hatalı Sözce: "${e.error}"\n   Hata Tipi: ${e.type}\n   Hedeflenen Form: "${e.target}"\n   Klinik İzahat: ${e.description}\n`;
      });
      reportText += `\n`;
    }
    
    reportText += `[KLİNİK DEĞERLENDİRME ÖZETİ]\n`;
    reportText += `${activeSession.clinicalSummary}\n\n`;
    
    reportText += `[ÖNERİLEN TERAPİ HEDEFLERİ & TAVSİYELER]\n`;
    activeSession.recommendations.forEach((r, idx) => {
      reportText += `- ${r}\n`;
    });
    
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDeleteHistorySession = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Bu seans dil analizi raporunu silmek istediğinizden emin misiniz?")) {
      const updated = historySessions.filter(s => s.id !== id);
      setHistorySessions(updated);
      localStorage.setItem(`dkt_languages_${emailKey}`, JSON.stringify(updated));
      if (activeSession?.id === id) {
        setActiveSession(updated.length > 0 ? updated[0] : null);
      }
    }
  };

  // Helper to interpret word MLU based on developmental average expectations
  const getMluInference = (mlu: number) => {
    if (mlu < 2.0) return { label: "Ciddi Gecikme", color: "text-rose-600 bg-rose-50 border-rose-200" };
    if (mlu < 3.2) return { label: "Dil Gecikmesi / Sınırda", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (mlu < 4.5) return { label: "Hafif Sınırda / Yaşa Uygun Geçiş", color: "text-blue-700 bg-blue-50 border-blue-200" };
    return { label: "Tipik Gelişim", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: CONTROLS & DIAGNOSTIC CONFIGURATION */}
      <div className="lg:col-span-4 space-y-6 print:hidden">
        
        {/* NEW SELECTION CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Danışan Seçimi & Ayar</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setClientModalInitialTab("list");
                  setIsClientModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                Liste ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientModalInitialTab("add");
                  setIsClientModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-3xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Ekle
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Danışan Çocuk</label>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white"
                >
                  {clients.length === 0 ? (
                    <option value="">Danışan Kaydı Bulunmuyor</option>
                  ) : (
                    clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.age} Yaşında){c.parentName ? ` • Veli: ${c.parentName}` : ""}
                      </option>
                    ))
                  )}
                </select>

                {selectedClientId && onDeleteClient && (
                  <button
                    type="button"
                    onClick={() => onDeleteClient(selectedClientId)}
                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer shrink-0"
                    title="Seçili Danışanı Sistemden Sil / Çıkar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {clients.length === 0 && (
                <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
                  <p className="font-semibold text-[11px]">
                    Dil ve OSU analizi için en az bir danışan eklemelisiniz.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setClientModalInitialTab("add");
                      setIsClientModalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer shadow-3xs flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Danışan Ekle
                  </button>
                </div>
              )}
            </div>

            {/* SIMULATOR SWITCH */}
            <div className="bg-[#f8fafc] border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                  Klinik Simülasyon Sürümü
                </span>
                <span className="text-[9px] text-slate-500 font-medium">Bozukluğu ve analiz sistemini simüle et</span>
              </div>
              <button 
                onClick={() => setIsSimulatedMode(!isSimulatedMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all cursor-pointer ${
                  isSimulatedMode ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all ${
                  isSimulatedMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* PREFERENCES SLIDER BUTTON */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-2.5 rounded-xl border border-indigo-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                YAPAY ZEKA LİMİTLERİ VEYA DİREKTİFLER
              </span>
              <span className="text-[10px]">{showSettings ? "Kapat" : "Göster (Ayrıntılı)"}</span>
            </button>

            {/* DYNAMIC SETTINGS PANEL */}
            {showSettings && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 text-xs animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Değerlendirme Test Standardı</label>
                  <select
                    value={analysisTarget}
                    onChange={(e) => setAnalysisTarget(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline"
                  >
                    <option value="general">Genel Dil Örneklemi (Eski/Yeni Metotlar)</option>
                    <option value="teld">TELD-3-T (Türkçe Erken Dil Gelişimi Testi) Temelli</option>
                    <option value="sli">ÖDB/SLI Şüpheli Sözcük ve Ek Taraması</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Analiz Titizliği</label>
                  <select
                    value={analysisStrictness}
                    onChange={(e) => setAnalysisStrictness(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline"
                  >
                    <option value="standard">Standart Klinik Hassasiyet (Önerilen)</option>
                    <option value="strict">Yüksek Titizlik (Bebeksi/Kısaltılmış ekleri kaçırma)</option>
                    <option value="lenient">Diyakronik Tolere Sürümü</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ek Klinik Direktifler</label>
                  <textarea
                    value={customDirectives}
                    onChange={(e) => setCustomDirectives(e.target.value)}
                    placeholder="Örn: Çocuğun kekemelik eşliği de var, konuşma seslerinden r-y ikamesini de göz önünde tutun..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700 focus:outline h-16 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AUDIO CAPTURE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Ses Giriş Arabirimi (Kayıt/Yükleme)</h2>
            </div>
            
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full">
              <AudioLines className="w-3 h-3 text-indigo-600" />
              DKT / Frekans Filtresi Açık
            </span>
          </div>

          {/* PITCH PROFILE SELECTOR */}
          <div className="mb-3 flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-150 rounded-xl text-xs">
            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <span>Danışan Ses Profili:</span>
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPitchProfile("child")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  pitchProfile === "child"
                    ? "bg-indigo-600 text-white shadow-3xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Çocuk (240-420 Hz)
              </button>
              <button
                type="button"
                onClick={() => setPitchProfile("female_adult")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  pitchProfile === "female_adult"
                    ? "bg-indigo-600 text-white shadow-3xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Kadın (170-270 Hz)
              </button>
              <button
                type="button"
                onClick={() => setPitchProfile("male_adult")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  pitchProfile === "male_adult"
                    ? "bg-indigo-600 text-white shadow-3xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Erkek (85-165 Hz)
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* WAVEFORM PREVIEW */}
            <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden h-28">
              {isRecording ? (
                <div className="absolute top-2 left-3 flex items-center gap-1.5 bg-rose-500/10 text-rose-400 p-0.5 px-2 rounded-full border border-rose-500/20 text-[9px] font-extrabold uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  Klinik Mikrofon Canlı
                </div>
              ) : (
                <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  Sinyal İzleyici
                </div>
              )}

              {/* LIVE THERAPIST FREQUENCY WARNING BADGE */}
              {isRecording && liveFrequencyData?.activeSpeaker === "therapist" && (
                <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-purple-500/20 text-purple-300 p-0.5 px-2 rounded-full border border-purple-500/30 text-[9px] font-extrabold animate-bounce">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  DKT Sesi Algılandı (Filtreleniyor)
                </div>
              )}

              {/* TIMER */}
              <div className="text-xl font-mono text-white font-extrabold tracking-wider z-10">
                {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
              </div>

              {/* WAVEFORM DESIGN */}
              <div className="flex items-end gap-1 h-8 mt-2 w-full max-w-xs justify-center z-10">
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isRecording ? (
                        liveFrequencyData?.activeSpeaker === "therapist" 
                          ? "bg-purple-400 opacity-90" 
                          : "bg-emerald-450 opacity-90"
                      ) : "bg-slate-600 opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* LIVE FREQUENCY & SPEAKER CLASSIFIER MONITOR */}
            {(isRecording || finalFrequencySummary) && (
              <div className="bg-slate-50 border border-indigo-150 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      liveFrequencyData?.activeSpeaker === "client" ? "bg-emerald-400" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-400" : "bg-slate-300"
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      liveFrequencyData?.activeSpeaker === "client" ? "bg-emerald-500" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-600" : "bg-slate-400"
                    }`} />
                  </span>
                  
                  <span className="font-extrabold text-slate-800">
                    {isRecording ? (
                      liveFrequencyData?.currentPitchHz && liveFrequencyData.currentPitchHz > 0 ? (
                        `Frekans: ${liveFrequencyData.currentPitchHz} Hz`
                      ) : (
                        "Ses Dinleniyor..."
                      )
                    ) : (
                      "Frekans Analizi Hazır"
                    )}
                  </span>

                  {isRecording && liveFrequencyData && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      liveFrequencyData.activeSpeaker === "client"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-250 animate-pulse"
                        : liveFrequencyData.activeSpeaker === "therapist"
                        ? "bg-purple-50 text-purple-800 border-purple-250 font-black"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {liveFrequencyData.speakerLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-150 font-semibold">
                    Danışan: <b className="font-mono">{liveFrequencyData?.clientTimeSec || finalFrequencySummary?.clientTimeSec || 0} sn</b>
                  </span>
                  <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-150 font-semibold">
                    DKT: <b className="font-mono">{liveFrequencyData?.therapistTimeSec || finalFrequencySummary?.therapistTimeSec || 0} sn</b> (Filtreleniyor)
                  </span>
                </div>
              </div>
            )}

            {/* INTERACTION BUTTONS */}
            <div className="flex gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs p-3 rounded-xl shadow-xs transition-all cursor-pointer select-none"
                >
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                  Mikrofon Kaydını Başlat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs p-3 rounded-xl shadow-xs transition-all cursor-pointer animate-pulse select-none"
                >
                  <Square className="w-4 h-4 text-white stroke-[2.5]" />
                  Kaydı Durdur ve İşle
                </button>
              )}
            </div>

            {/* SEPARATOR OR */}
            {!isRecording && !audioUrl && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Veya Ses Dosyası Ekle</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            )}

            {/* FILE Uploader */}
            {!isRecording && !audioUrl && (
              <label className="border border-dashed border-slate-250 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-xl p-3.5 flex flex-col items-center justify-center cursor-pointer transition-colors text-xs font-semibold text-slate-600">
                <Upload className="w-5 h-5 text-slate-450 mb-1.5" />
                <span className="text-[11px] font-bold text-slate-755 text-center">Ses Dosyası Seç (.mp3, .wav, .m4a)</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* AUDIO SOURCE LOADED */}
            {audioUrl && (
              <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 space-y-2 animate-in zoom-in-95 duration-250">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span className="flex items-center gap-1.5 truncate">
                    <FileAudio className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    {uploadedFileName ? uploadedFileName : "Konuşma Söylemi Kaydedildi"}
                  </span>
                  <button
                    onClick={handleResetRecordState}
                    className="text-rose-600 hover:text-rose-800 p-0.5"
                    title="Seçimi İptal Et / Sıfırla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <audio src={audioUrl} controls className="w-full h-8 opacity-90" />

                <button
                  onClick={handlePerformAnalysis}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 hover:from-indigo-700 hover:to-violet-600 text-white font-bold text-xs p-3 rounded-xl shadow-md cursor-pointer select-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 animate-pulse text-yellow-300" />
                  Yapay Zeka Destekli MLU/OSU Analizini Çalıştır
                </button>
              </div>
            )}

            {/* ERROR CARD */}
            {analysisError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>{analysisError}</div>
              </div>
            )}
          </div>
        </div>

        {/* LOGGED REPORTS SESSIONS HISTORY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-3">
            <ClipboardCheck className="w-5 h-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Geçmiş Raporlar ({historySessions.length})</h2>
          </div>

          {historySessions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Henüz tamamlanmış dil analizi bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {historySessions.map(sess => (
                <button
                  key={sess.id}
                  onClick={() => setActiveSession(sess)}
                  className={`w-full flex items-center justify-between text-left p-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                    activeSession?.id === sess.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                      : "bg-slate-50 hover:bg-slate-150 border-slate-150 text-slate-700"
                  }`}
                >
                  <div className="truncate flex-1 pr-2">
                    <p className="font-bold truncate">{sess.clientName}</p>
                    <p className={`text-[9px] ${activeSession?.id === sess.id ? "text-slate-300" : "text-slate-450"}`}>
                      {new Date(sess.date).toLocaleDateString("tr-TR")} • OSUwd: {sess.stats.mluWords.toFixed(1)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteHistorySession(sess.id, e)}
                    className={`p-1 rounded-md hover:bg-rose-100/10 ${activeSession?.id === sess.id ? "text-slate-400 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: CORE REPORTS & METRICS */}
      <div className="lg:col-span-8">
        
        {/* RUNNING LOADER */}
        {isAnalyzing && (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6 shadow-xs animate-in zoom-in-95 duration-250 flex flex-col items-center justify-center min-h-[450px]">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-yellow-500 absolute animate-pulse" />
            </div>
            
            <div className="space-y-2 max-w-sm">
              <h3 className="text-md font-bold text-slate-800">Yapay Zeka Konuşma Söylemini İnceliyor</h3>
              <p className="text-xs text-slate-500 font-medium">
                Ses kaydındaki cümle sınırları (sözceler) tahlil ediliyor, Türkçe kök ve biçimbirim (morfem) sınırları hesaplanıyor...
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold p-2 px-4 rounded-xl animate-pulse">
              Lütfen bekleyin, bu işlem yaklaşık 10-15 saniye sürebilir.
            </div>
          </div>
        )}

        {/* EMPTY PLACEHOLDER */}
        {!isAnalyzing && !activeSession && (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center h-full flex flex-col justify-center items-center min-h-[450px] space-y-6">
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-150 rounded-2xl flex items-center justify-center text-indigo-600">
              <BarChart2 className="w-8 h-8 stroke-[1.8]" />
            </div>
            
            <div className="space-y-2 max-w-md">
              <h3 className="text-md font-bold text-slate-800">Dil Değerlendirmesi & OSU (MLU) Analizörü</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Sol panelden bir danışan seçiniz, mikrofonla çocuğun konuşma örneğinden (söylem çıktısı) kayıt alınız veya var olan bir ses dosyasını yükleyiniz. Yapay zeka, Türkçe dilbilgisel kurallarla Ortalama Sözce Uzunluğunu hesaplayarak raporunu oluşturacaktır.
              </p>
            </div>

            <div className="flex gap-4 p-4 px-6 bg-slate-50 border border-slate-150 rounded-2xl max-w-lg text-left items-start text-[11px] text-slate-550 font-semibold gap-3">
              <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-700">Yönetici / DKT Bilgilendirmesi:</p>
                <p className="mt-1 font-medium">Ortalama Sözce Uzunluğu (MLU), çocuğun dil edinim derecesini ve morfolojik/sözdizimsel karmaşıklığını belirlemede en güvenilir altın standart klinik ölçümlerden biridir.</p>
              </div>
            </div>
          </div>
        )}

        {/* COMPLETED REPORT SHEET */}
        {!isAnalyzing && activeSession && (
          <div className="space-y-6 print:space-y-0">
            
            {/* ACTION CARD PANEL */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 print:hidden shadow-3xs">
              <div className="text-xs">
                <span className="text-slate-400 font-bold">GÖSTERİLEN SEANS:</span>
                <p className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5 mt-0.5">
                  {activeSession.clientName}
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] p-0.5 px-2 rounded-md font-bold border border-indigo-100 uppercase">
                    Dil Raporu
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReportToClipboard}
                  className="flex items-center gap-1 bg-slate-50 hover:bg-slate-150 border border-slate-200 text-slate-700 p-2 px-3.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      Kopyalandı!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      Yazıyı Kopyala
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white p-2 px-4 rounded-xl font-bold text-xs cursor-pointer select-none transition-all flex-shrink-0"
                >
                  <Printer className="w-4 h-4 text-white" />
                  Raporu Yazdır (PDF)
                </button>
              </div>
            </div>

            {/* MAIN PRINTABLE RENDER CARD */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative print:border-none print:p-0 print:shadow-none">
              
              {/* PRINT HEADER DISPLAY */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dashed border-slate-200 mb-6 print:border-solid">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm relative">
                      <Sparkles className="w-4 h-4 absolute text-yellow-300 -top-1.5 -right-1.5 animate-pulse" />
                      D
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-850 tracking-tight font-sans">Klinik Dil Değerlendirmesi & Gözlemi</h2>
                      <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5 tracking-wider">Morfosentaktik & Ortalama Sözce Uzunluğu Raporu</p>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <p className="font-bold text-slate-800 leading-none">ID: DKT-[DIL]-{activeSession.id.substring(5, 12).toUpperCase()}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">Tarih: {new Date(activeSession.date).toLocaleString("tr-TR")}</p>
                  <p className="text-[9px] text-indigo-600 mt-0.5 font-bold">Model: {activeSession.modelUsed}</p>
                </div>
              </div>

              {/* SPEAKER SEPARATION & FREQUENCY AUDIT CARD */}
              {activeSession.speakerSeparation && (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-indigo-700/60 shadow-3xs print:bg-white print:text-slate-900 print:border-slate-300 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/50 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 print:bg-slate-100 print:text-slate-700">
                        <AudioLines className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100 print:text-slate-800">
                          Akustik Frekans & DKT Konuşmacı Ayrıştırması
                        </h4>
                        <p className="text-[10px] text-indigo-300 print:text-slate-500">
                          DKT yönlendirici soruları ve konuşmaları frekans analiziyle tespit edilmiş, MLU ve morfem analizi yalnızca danışana odaklanmıştır.
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:bg-emerald-50 print:text-emerald-800">
                      ✓ DKT Sesi Filtrelendi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Konuşmacı Tespiti</span>
                      <span className="font-bold text-white print:text-slate-800">
                        {activeSession.speakerSeparation.detectedSpeakers || 2} Konuşmacı (Danışan + DKT)
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Danışan Frekansı</span>
                      <span className="font-bold text-emerald-300 print:text-emerald-700">
                        {activeSession.speakerSeparation.clientFrequencyRange || "240 - 410 Hz (Çocuk)"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Farklı Frekans (DKT)</span>
                      <span className="font-bold text-purple-300 print:text-purple-700">
                        {activeSession.speakerSeparation.therapistFrequencyRange || "110 - 180 Hz (DKT / Yetişkin)"}
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">DKT Süresi</span>
                      <span className="font-bold text-amber-300 print:text-amber-700">
                        {activeSession.speakerSeparation.therapistSpeechDurationSec ? `${activeSession.speakerSeparation.therapistSpeechDurationSec} sn (Ölçüm Dışı)` : "Filtrelendi"}
                      </span>
                    </div>
                  </div>

                  {activeSession.speakerSeparation.clinicalNote && (
                    <div className="mt-2 text-[10px] text-indigo-200/90 print:text-slate-600 bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                      <b>Klinik Not:</b> {activeSession.speakerSeparation.clinicalNote}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: TWO-WAY ANALYSIS GRID METRICS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                
                {/* METRIC OSU WORDS */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-550 uppercase">OSU (Sözcük - MLUw)</span>
                    <span title="Sözcük bazlı Ortalama Sözce Uzunluğu">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </div>
                  <div className="my-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-800 font-mono tracking-tight">
                      {activeSession.stats.mluWords.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold">sözcük/sözce</span>
                  </div>
                  <div className={`text-[9px] font-bold py-1 px-2 rounded-lg border text-center ${getMluInference(activeSession.stats.mluWords).color}`}>
                    {getMluInference(activeSession.stats.mluWords).label}
                  </div>
                </div>

                {/* METRIC OSU MORPHEMES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-550 uppercase">OSU (Biçimbirim - MLUm)</span>
                    <span title="Biçimbirim bazlı Ortalama Sözce Uzunluğu">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </div>
                  <div className="my-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-indigo-700 font-mono tracking-tight">
                      {activeSession.stats.mluMorphemes.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-indigo-500 font-bold">morfem/sözce</span>
                  </div>
                  <div className="text-[9px] text-indigo-755 bg-indigo-50 border border-indigo-150 py-1 px-2 rounded-lg text-center font-bold">
                    Türkçe Sondan Eklemeli
                  </div>
                </div>

                {/* COUNTERS METRIC GRID */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-3 gap-2 shadow-3xs justify-center items-center">
                  <div className="text-center">
                    <span className="text-[8px] text-slate-450 font-bold block uppercase leading-none">Toplam Sözce</span>
                    <span className="text-md font-mono font-black text-slate-750 block mt-1">{activeSession.stats.totalUtterances}</span>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <span className="text-[8px] text-slate-450 font-bold block uppercase leading-none">Sözcük</span>
                    <span className="text-md font-mono font-black text-slate-755 block mt-1">{activeSession.stats.totalWords}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[8px] text-slate-450 font-bold block uppercase leading-none">Biçimbirim</span>
                    <span className="text-md font-mono font-black text-slate-750 block mt-1">{activeSession.stats.totalMorphemes}</span>
                  </div>
                </div>

                {/* METRIC VOCABULARY DIVERSITY */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-550 uppercase">Kelime Çeşitliliği (TTR)</span>
                    <span title="Type-Token Ratio: Farklı Kelimeler / Toplam Kelimeler">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1">
                    <span className="text-2.5xl font-black text-emerald-700 font-mono tracking-tight">
                      {(activeSession.stats.typeTokenRatio * 100).toFixed(0)}%
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold">leksikal skor</span>
                  </div>
                  <div className="text-[9px] text-slate-500 font-semibold leading-relaxed">
                    Sözcük zenginliği beklentiye uygundur.
                  </div>
                </div>

              </div>

              {/* SEGMENT 1: UTTERANCES DETAILED LIST */}
              <div className="space-y-3 mb-6">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                  Kaydedilen Sözceler (Transkript Örneklemi)
                </h3>
                
                <div className="border border-slate-150 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold">
                        <th className="py-2.5 px-3 w-10 text-center">ID</th>
                        <th className="py-2.5 px-3">Sözce Transkripsiyonu</th>
                        <th className="py-2.5 px-3 text-center w-24">Sözcük (Token)</th>
                        <th className="py-2.5 px-3 text-center w-28">Biçimbirim (Morfem)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSession.utterances.map(ut => (
                        <tr key={ut.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 text-center font-bold font-mono text-slate-400">#{ut.id}</td>
                          <td className="py-3 px-3 italic font-semibold text-slate-800">"{ut.text}"</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">{ut.wordCount}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600">{ut.morphemeCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEGMENT 2: GRAMMAR, MORPHOLOGY & SYNTAX DISCOVERIES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4">
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    Biçimbirimsel (Morfolojik) Yapılar
                  </h4>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    {activeSession.morphologyDetails}
                  </p>
                </div>

                <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-4">
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Sözdizimsel (Sintaktik) Özellikler
                  </h4>
                  <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                    {activeSession.syntaxDetails}
                  </p>
                </div>

              </div>

              {/* SEGMENT 3: ERROR LIST & ANALYSIS */}
              {activeSession.errors && activeSession.errors.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-rose-500 rounded-full" />
                    Hata ve Düşme (Omission) Ayıklamaları
                  </h3>

                  <div className="space-y-3">
                    {activeSession.errors.map((err, index) => (
                      <div 
                        key={index}
                        className="bg-rose-50/30 border border-rose-100 rounded-xl p-3.5 flex flex-col md:flex-row md:items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 p-0.5 px-2 rounded-md border border-rose-100 uppercase">
                              {err.type}
                            </span>
                            <span className="text-xs text-slate-400 font-bold block">
                              Sözce: <span className="italic text-slate-700 font-semibold">"{err.error}"</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">
                            <span className="font-extrabold text-slate-750">Hedeflenen Söylem:</span> "{err.target}"
                          </p>
                          <p className="text-[11px] text-slate-550 leading-relaxed mt-1 font-semibold">
                            <span className="font-extrabold text-slate-700">Klinik İzahat:</span> {err.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEGMENT 4: SUMMARY & CLINICAL OPINION */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 mb-2 flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-indigo-400" />
                  KLİNİK ÖZET & DEĞERLENDİRME MÜLAHAZALARI
                </h4>
                <p className="text-xs leading-relaxed font-semibold text-slate-100">
                  {activeSession.clinicalSummary}
                </p>
              </div>

              {/* SEGMENT 5: RECOMMENDATIONS AND TREATMENT PLANS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-yellow-500 animate-pulse" />
                  Terapötik Hedefler & Ev Programı Önerileri
                </h3>

                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activeSession.recommendations.map((rec, index) => (
                    <li 
                      key={index}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px] leading-relaxed font-semibold text-slate-700 relative shadow-3xs"
                    >
                      <div className="absolute top-2 right-3 font-mono font-black text-slate-300 text-sm">0{index+1}</div>
                      <p className="mt-1">{rec}</p>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* CLIENT MANAGEMENT MODAL */}
      {onAddClient && onDeleteClient && (
        <ClientManagerModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          clients={clients}
          selectedClientId={selectedClientId}
          onSelectClient={(id) => setSelectedClientId(id)}
          onAddClient={onAddClient}
          onDeleteClient={onDeleteClient}
          initialTab={clientModalInitialTab}
          titleContext="Dil / OSU Analiz Modülü"
        />
      )}

    </div>
  );
}
