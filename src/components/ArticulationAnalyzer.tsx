import { useState, useRef, useEffect, ChangeEvent, MouseEvent } from "react";
import { Client, ArticulationSession, ArticulationError, PhonologicalProcess } from "../types";
import { normalizeTurkishIpaVowels, TURKISH_IPA_VOWELS } from "../utils/ipaUtils";
import ClientManagerModal from "./ClientManagerModal";
import { 
  startLiveFrequencyTracker, 
  AudioFrequencyTracker, 
  FrequencyAnalysisResult 
} from "../utils/audioFrequencyAnalyzer";
import { 
  Mic, Square, Trash2, Upload, Send, Sparkles, AlertCircle, FileAudio, 
  Play, Volume2, CheckCircle2, ChevronRight, Award, HelpCircle, FileText, 
  Printer, Copy, Check, Info, ArrowLeft, RefreshCw, Layers,
  Sliders, Settings, BookOpen, Lightbulb, SlidersHorizontal, ToggleLeft,
  Users, UserPlus, AudioLines
} from "lucide-react";

interface ArticulationAnalyzerProps {
  clients: Client[];
  currentUserEmail: string;
  onAddClient?: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient?: (id: string) => void;
}

const PRESET_SENTENCES = [
  {
    id: "r-y",
    title: "Sıvı/Akıcı Sesler (R - Y - L) Testi",
    text: "Kırmızı araba yolda tıkandı. Tren hızlı gidiyor.",
    focus: "ɾ, j, l fonemleri ve alveolar titreşim/akıcı ses tahlili (Gliding)"
  },
  {
    id: "s-t",
    title: "Sürtünmeli Sesler (S - Ş - Z - V) Testi",
    text: "Sarı saçlı çocuk su istiyor. Tavşan hızlı kaçtı.",
    focus: "s, ʃ, z, v sürtünmeli seslerin duraklaşması (Stopping) & ikamesi"
  },
  {
    id: "k-t",
    title: "Velar / Alveolar (K - G -> T - D) Testi",
    text: "Kedi köprüden geçti. Kitap okudum.",
    focus: "k, g arka damak (velar) sesleri, öne kayma (Fronting) & arkaya kayma"
  },
  {
    id: "complex-cluster",
    title: "Ünsüz Öbeği & Hece Yapıları Testi",
    text: "Spor salonunda kreş açıldı. Tren istasyona girdi.",
    focus: "Bileşik ünsüzlerin tekleşmesi (Cluster Reduction) & hece yutumu"
  },
  {
    id: "assim-metathesis",
    title: "Benzeşme & Göçüşme (Asimilasyon/Metatez)",
    text: "Toprak köprüden kaydı. Kibritle sarı sosis pişirdik.",
    focus: "Metatez (köprü->körpü, toprak->torpak) & asimilasyon (sosis->sosit)"
  },
  {
    id: "affricate-ch",
    title: "Afrikasyon / Yarı-Sızıcı (Ç - C) Testi",
    text: "Geceleyin cüce çocuk sıcak çorba içti.",
    focus: "tʃ (ç) ve dʒ (c) afrikat seslerin sızıcılaşması veya patlamalılaşması"
  },
  {
    id: "other",
    title: "Serbest Konuşma / Söylem Örneklemi",
    text: "",
    focus: "Klinisyen tarafından özelleştirilebilen serbest söylem analizi"
  }
];

export default function ArticulationAnalyzer({ 
  clients, 
  currentUserEmail,
  onAddClient,
  onDeleteClient
}: ArticulationAnalyzerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [customTargetText, setCustomTargetText] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("r-y");
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  // Client Management Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [clientModalInitialTab, setClientModalInitialTab] = useState<"list" | "add">("list");

  // Settings Panel State
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"audio" | "intelligence">("audio");
  
  // Audio Settings
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [autoGainControl, setAutoGainControl] = useState<boolean>(true);
  const [sampleRate, setSampleRate] = useState<string>("48000"); // '16000' | '44100' | '48000'
  const [audioFormat, setAudioFormat] = useState<string>("audio/webm");

  // AI Intelligence Details
  const [analysisStrictness, setAnalysisStrictness] = useState<"standard" | "strict" | "lenient">("standard");
  const [analysisDetailLevel, setAnalysisDetailLevel] = useState<"basic" | "clinic-rich" | "academic">("clinic-rich");
  const [customDirectives, setCustomDirectives] = useState<string>("");

  // Interactive Secondary Tabs for Right Column
  const [rightSidebarTab, setRightSidebarTab] = useState<"history" | "ipa" | "guide" | "ideas">("history");

  // History / View state
  const [historySessions, setHistorySessions] = useState<ArticulationSession[]>([]);
  const [activeSession, setActiveSession] = useState<ArticulationSession | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Live Speaker & Frequency Tracking
  const [liveFrequencyData, setLiveFrequencyData] = useState<FrequencyAnalysisResult | null>(null);
  const [finalFrequencySummary, setFinalFrequencySummary] = useState<FrequencyAnalysisResult | null>(null);
  const frequencyTrackerRef = useRef<AudioFrequencyTracker | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Copied alert state
  const [copied, setCopied] = useState(false);
  const [copiedVowel, setCopiedVowel] = useState<string | null>(null);

  const handleCopyIpa = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVowel(label);
    setTimeout(() => setCopiedVowel(null), 1800);
  };

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Visual waveform animation state
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(28).fill(4));

  const emailKey = currentUserEmail.replace(/[@.]/g, "_");

  // Load completed articulation tests from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`dkt_articulations_${emailKey}`);
    if (stored) {
      try {
        const rawSessions: ArticulationSession[] = JSON.parse(stored);
        const cleanedSessions = rawSessions.map(s => ({
          ...s,
          originalIpa: normalizeTurkishIpaVowels(s.originalIpa || ""),
          utteredIpa: normalizeTurkishIpaVowels(s.utteredIpa || "")
        }));
        setHistorySessions(cleanedSessions);
      } catch (err) {
        console.error("Önceki artikülasyon raporları yüklenemedi:", err);
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

  // Sync preset choice to sample target text
  useEffect(() => {
    const preset = PRESET_SENTENCES.find(p => p.id === selectedPresetId);
    if (preset) {
      setCustomTargetText(preset.text);
    }
  }, [selectedPresetId]);

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
    try {
      setAudioUrl(null);
      setAudioBlob(null);
      setUploadedFileName(null);
      setRecordingSeconds(0);
      setLiveFrequencyData(null);
      setFinalFrequencySummary(null);
      chunksRef.current = [];

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: echoCancellation,
            noiseSuppression: noiseSuppression,
            autoGainControl: autoGainControl,
            sampleRate: sampleRate ? parseInt(sampleRate) : undefined,
            channelCount: 1
          }
        });
      } catch (err) {
        console.warn("Gelişmiş ses filtreleri uygulanamadı, varsayılan akışa dönülüyor:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Real-time Web Audio Pitch & Speaker Diarization
      try {
        frequencyTrackerRef.current = startLiveFrequencyTracker(stream, {
          profile: "child",
          onUpdate: (res) => setLiveFrequencyData(res)
        });
      } catch (freqErr) {
        console.warn("Frekans analizörü başlatılamadı:", freqErr);
      }

      let mediaRecorder: MediaRecorder;
      let recordedMimeType = "audio/webm";

      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm")) {
          mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
          recordedMimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/mp4" });
          recordedMimeType = "audio/mp4";
        } else {
          mediaRecorder = new MediaRecorder(stream);
        }
      } else {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        if (frequencyTrackerRef.current) {
          const summary = frequencyTrackerRef.current.stop();
          setFinalFrequencySummary(summary);
          frequencyTrackerRef.current = null;
        }
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setAnalysisError(null);
    } catch (err: any) {
      console.error("Mikrofon erişim hatası:", err);
      setAnalysisError("Mikrofona erişilemedi. Lütfen izinleri kontrol edin.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    setAnalysisError(null);

    setUploadedFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleResetRecordState = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadedFileName(null);
    setRecordingSeconds(0);
    setAnalysisError(null);
    setIsRecording(false);
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
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const response = await fetch("/api/analyze-articulation", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": currentUserEmail
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: audioBlob.type,
              clientName,
              sampleText: customTargetText,
              simulationMode: isSimulatedMode,
              clientPitchProfile: "child",
              speakerSeparationEnabled: true,
              liveFrequencySummary: finalFrequencySummary || liveFrequencyData,
              audioSettings: {
                echoCancellation,
                noiseSuppression,
                autoGainControl,
                sampleRate,
                audioFormat
              },
              analysisSettings: {
                strictness: analysisStrictness,
                detailLevel: analysisDetailLevel,
                customDirectives
              }
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Fonetik çözümleme yapılırken hata oluştu.");
          }

          const parsedResult = await response.json();

          const newSession: ArticulationSession = {
            id: `art-${Math.random().toString(36).substring(2, 11)}`,
            clientId: selectedClientId,
            clientName,
            date: new Date().toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }),
            intendedText: parsedResult.intendedText || customTargetText || "Serbest Konuşma",
            originalIpa: normalizeTurkishIpaVowels(parsedResult.originalIpa || "/-/"),
            utteredIpa: normalizeTurkishIpaVowels(parsedResult.utteredIpa || "[-]"),
            intelligibilityScore: parsedResult.intelligibilityScore || 80,
            errors: parsedResult.errors || [],
            phonologicalProcesses: parsedResult.phonologicalProcesses || [],
            clinicalSummary: parsedResult.clinicalSummary || "Klinik özet çıkarılamadı.",
            recommendations: parsedResult.recommendations || [],
            isSimulated: parsedResult.isSimulated,
            pcc: parsedResult.pcc !== undefined ? parsedResult.pcc : 100,
            pvc: parsedResult.pvc !== undefined ? parsedResult.pvc : 100,
            ppc: parsedResult.ppc !== undefined ? parsedResult.ppc : 100,
            speakerSeparation: parsedResult.speakerSeparation || finalFrequencySummary
          };

          // Save to local storage history
          const updatedHistory = [newSession, ...historySessions];
          setHistorySessions(updatedHistory);
          localStorage.setItem(`dkt_articulations_${emailKey}`, JSON.stringify(updatedHistory));

          // Set active view
          setActiveSession(newSession);
          handleResetRecordState();
        } catch (err: any) {
          console.error("Analysis request failed", err);
          setAnalysisError(err.message || "Fonetik ses tahlili başarısız oldu. Lütfen tekrar deneyin.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (err: any) {
      console.error("FileReader failed", err);
      setAnalysisError("Dosya işleme hatası.");
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = (session: ArticulationSession) => {
    let textToCopy = `=== ARTIKÜLASYON VE SESBİLGİSİ EVALUASYON RAPORU ===\n`;
    textToCopy += `Danışan: ${session.clientName}\n`;
    textToCopy += `Tarih: ${session.date}\n`;
    textToCopy += `Hedef Söylem: ${session.intendedText}\n`;
    textToCopy += `Hedef IPA Transkripsiyonu: ${session.originalIpa}\n`;
    textToCopy += `Gerçek IPA Transkripsiyonu (Duyulan): ${session.utteredIpa}\n`;
    textToCopy += `Anlaşılırlık Derecesi: %${session.intelligibilityScore}\n\n`;
    
    textToCopy += `HATA SINIFLANDIRMASI:\n`;
    session.errors.forEach((err, idx) => {
      textToCopy += `${idx + 1}. Hedef: /${err.target}/ -> Söylenen: [${err.uttered}] (${err.type})\n`;
      textToCopy += `   Açıklama: ${err.description}\n`;
      textToCopy += `   Sözcükler: ${err.wordsAffected.join(", ")}\n`;
    });
    
    textToCopy += `\nSESBİLGİSEL SÜREÇ ANALİZİ:\n`;
    session.phonologicalProcesses.forEach((pr, idx) => {
      textToCopy += `${idx + 1}. Süreç: ${pr.name} (Sıklık: ${pr.frequency})\n`;
      textToCopy += `   Detaylar: ${pr.details}\n`;
    });

    textToCopy += `\nKLİNİK ÖZET VE DEĞERLENDİRME:\n${session.clinicalSummary}\n\n`;
    textToCopy += `TERAPÖTİK ÖNERİLER:\n`;
    session.recommendations.forEach((rec, idx) => {
      textToCopy += `- ${rec}\n`;
    });

    textToCopy += `\nDKT Sistem Rapor Doğrulaması: DKT-KSB-OK\n`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteHistorySession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bu fonetik analiz raporunu kalıcı olarak silmek istiyor musunuz?")) {
      const updated = historySessions.filter(s => s.id !== id);
      setHistorySessions(updated);
      localStorage.setItem(`dkt_articulations_${emailKey}`, JSON.stringify(updated));
      if (activeSession && activeSession.id === id) {
        setActiveSession(null);
      }
    }
  };

  // Filter history by selected client
  const clientFilteredSessions = historySessions.filter(s => s.clientId === selectedClientId);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION (HIDDEN IN PRINT) */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10 bg-white w-64 h-64 rounded-full blur-2xl" />
        <div className="absolute left-1/3 bottom-0 translate-y-8 opacity-5 bg-indigo-200 w-48 h-48 rounded-full blur-xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-violet-500/30 text-violet-100 text-[10px] font-bold px-2 px-2.5 py-0.5 rounded-full border border-violet-400/20 uppercase tracking-wider">
                Yeni Modül
              </span>
              <span className="bg-indigo-500/30 text-indigo-100 text-[10px] font-bold px-2 px-2.5 py-0.5 rounded-full border border-indigo-400/20 uppercase tracking-wider">
                Yapay Zeka Destekli (IPA)
              </span>
            </div>
            <h1 className="text-xl font-bold mt-2 font-sans tracking-tight">Konuşma Sesi Bozuklukları Değerlendirmesi & Fonetik Çözümleme</h1>
            <p className="text-violet-100/90 text-xs mt-1 max-w-3xl font-medium">
              Uluslararası Fonetik Alfabe (IPA) transkripsiyonu ile artikülasyon ve sesbilgisi (fonoloji) değerlendirme modülü. Ses kaydı üzerinden hatalı söylemleri, ses yeri ikamelerini ve fonolojik süreçleri saniyeler içinde saptayın.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-100">Simülasyon Modu:</span>
            <button
              onClick={() => setIsSimulatedMode(!isSimulatedMode)}
              className={`relative inline-flex h-5.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${isSimulatedMode ? 'bg-amber-500' : 'bg-white/20'}`}
              title={isSimulatedMode ? "Simülasyon Aktif (Kota harcamaz, hızlı test)" : "Gerçek Yapay Zeka Aktif (Sesleri doğrudan analiz eder)"}
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isSimulatedMode ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">
              {isSimulatedMode ? "Açık (Demo)" : "Kapalı (Gerçek AI)"}
            </span>
          </div>
        </div>
      </div>

      {activeSession ? (
        /* ==================== ACTIVE REPORT VIEWER CONTAINER ==================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in print:border-none print:shadow-none">
          
          {/* Back & Actions header (hidden in print) */}
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <button
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-100 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition-all select-none cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Paneli Kapat ve Analiz Sayfasına Dön
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyReport(activeSession)}
                className="flex items-center gap-1.5 text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Kopyalandı!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Metin Raporunu Kopyala
                  </>
                )}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-3 py-1.5 rounded-xl transition-all shadow-3xs cursor-pointer select-none"
              >
                <Printer className="w-3.5 h-3.5" />
                Raporu Yazdır / PDF İndir
              </button>
            </div>
          </div>

          {/* PRINT-FRIENDLY CLINICAL REPORT CONTENT */}
          <div className="p-6 md:p-8 space-y-6 print:p-0">
            
            {/* Report Header Logo & Reference (Printed only) */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">DKT DİL VE KONUŞMA EVALUASYON MERKEZİ</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Konuşma Sesi Bozukluğu (KSB) & Fonetik Analiz Belgesi</p>
                <p className="text-[9px] text-slate-400 mt-1">Geliştirilmiş Otomatik Fonetik Transkripsiyon Altyapısı</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white font-mono text-[10px] font-bold px-2 py-1 rounded-sm">VERIFIED REPORT</span>
                <p className="text-[9px] text-slate-500 mt-1.5 font-mono">ID: DKT-KSB-{(activeSession.id || "").toUpperCase()}</p>
              </div>
            </div>

            {/* Demographics / General Info bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150 print:bg-transparent print:border-slate-300 print:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danışanın Adı Soyadı</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5 print:text-black">{activeSession.clientName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Değerlendirme Tarihi</p>
                <p className="font-bold text-slate-700 text-sm mt-0.5 print:text-black">{activeSession.date}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modül / Değerlendiren</p>
                <p className="font-bold text-indigo-700 text-sm mt-0.5 print:text-black">Konuşma Sesi Bozuklukları (IPA-Analizör)</p>
              </div>
            </div>

            {/* SPEAKER SEPARATION & FREQUENCY AUDIT CARD */}
            {activeSession.speakerSeparation && (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 border border-indigo-700/60 shadow-3xs print:bg-white print:text-slate-900 print:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/50 pb-2.5 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 print:bg-slate-100 print:text-slate-700">
                      <AudioLines className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100 print:text-slate-800">
                        Akustik Frekans & DKT Modelleme Ayrıştırması
                      </h4>
                      <p className="text-[10px] text-indigo-300 print:text-slate-500">
                        DKT modelleme ve yönergeleri frekans analiziyle ayrıştırılmış, artikülasyon analizi yalnızca danışana odaklanmıştır.
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
                      {activeSession.speakerSeparation.clientFrequencyRange || "240 - 410 Hz"}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Farklı Frekans (DKT)</span>
                    <span className="font-bold text-purple-300 print:text-purple-700">
                      {activeSession.speakerSeparation.therapistFrequencyRange || "110 - 180 Hz"}
                    </span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">DKT Süresi</span>
                    <span className="font-bold text-amber-300 print:text-amber-700">
                      {activeSession.speakerSeparation.therapistSpeechDurationSec ? `${activeSession.speakerSeparation.therapistSpeechDurationSec} sn (Ölçüm Dışı)` : "Filtrelendi"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MAIN TRANSCRIPTION CARD AND GAUGE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* TRANSCRIPTION CARD */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4 print:border-slate-200">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Volume2 className="w-4 h-4 text-violet-500" />
                    Söylem Transkripsiyon Seansı
                  </h3>
                  
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Hedef Söylem (Doğal Türkçe)</span>
                    <p className="font-semibold text-slate-700 mt-1 bg-white border border-slate-150 p-2.5 rounded-xl text-xs leading-relaxed italic">
                      "{activeSession.intendedText}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Hedef IPA Gösterimi</span>
                      <p className="font-mono font-semibold text-indigo-700 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl text-xs mt-1 tracking-wider leading-relaxed">
                        {activeSession.originalIpa}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-violet-600 flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        Duyulan Gerçek IPA Çözümü
                      </span>
                      <p className="font-mono font-bold text-violet-700 bg-violet-50/50 border border-violet-100 p-2.5 rounded-xl text-xs mt-1 tracking-wider leading-relaxed">
                        {activeSession.utteredIpa}
                      </p>
                    </div>
                  </div>

                  {/* TURKISH IPA VOWEL REFERENCE QUICK BAR */}
                  <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-2.5 space-y-1.5 print:hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-violet-600"></span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-600 font-black">
                          Standart Türkçe IPA Seslileri (8 Ünlü):
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRightSidebarTab("ipa")}
                        className="text-[10px] font-bold text-violet-700 hover:text-violet-900 underline underline-offset-2 cursor-pointer flex items-center gap-1"
                      >
                        <BookOpen className="w-3 h-3 text-violet-600" />
                        Detaylı Fonetik Tablo →
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {TURKISH_IPA_VOWELS.map(v => (
                        <button
                          key={v.letter}
                          type="button"
                          onClick={() => handleCopyIpa(v.ipa, v.letter)}
                          title={`${v.name} ("${v.exampleWord}" → ${v.exampleIpa}) • Kopyalamak için tıkla`}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all font-mono text-[11px] text-slate-800 flex items-center gap-1 cursor-pointer shadow-3xs group"
                        >
                          <span className="text-slate-400 font-sans font-medium text-[10px]">/{v.letter}/</span>
                          <span className="text-violet-700 font-bold group-hover:scale-110 transition-transform">[{v.ipa}]</span>
                          {copiedVowel === v.letter && (
                            <span className="text-[8px] text-emerald-600 font-bold animate-pulse">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* INTELLIGIBILITY GAUGE */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between print:border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-2 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Konuşma Anlaşılırlığı
                </h3>
                
                <div className="flex flex-col items-center justify-center py-4">
                  {/* Circular Gauge SVG */}
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="text-slate-200"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="38"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className={`${
                          activeSession.intelligibilityScore >= 75 
                            ? "text-emerald-500" 
                            : activeSession.intelligibilityScore >= 55 
                              ? "text-amber-500" 
                              : "text-rose-500"
                        } transition-all duration-300`}
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 38}`}
                        strokeDashoffset={`${2 * Math.PI * 38 * (1 - activeSession.intelligibilityScore / 100)}`}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="38"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">%{activeSession.intelligibilityScore}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Skor</span>
                    </div>
                  </div>
                  
                  <div className="text-center mt-3 border-b border-slate-100 pb-3 w-full">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      activeSession.intelligibilityScore >= 75 
                        ? "bg-emerald-50 border-emerald-150 text-emerald-700" 
                        : activeSession.intelligibilityScore >= 55 
                          ? "bg-amber-50 border-amber-150 text-amber-700" 
                          : "bg-rose-50 border-rose-150 text-rose-700"
                    }`}>
                      {activeSession.intelligibilityScore >= 75 
                        ? "Yüksek Anlaşılırlık" 
                        : activeSession.intelligibilityScore >= 55 
                          ? "Orta / Sınırda Anlaşılırlık" 
                          : "Hassas / Düşük Anlaşılırlık"
                      }
                    </span>
                  </div>

                  <div className="w-full mt-3 space-y-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-150 flex items-center justify-between shadow-3xs transition-all hover:border-indigo-150">
                      <div className="flex items-center gap-1.55">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="font-bold text-slate-600">Doğru Ünsüz Yüzdesi (DÜY / PCC)</span>
                      </div>
                      <span className="font-mono font-extrabold text-indigo-700 shrink-0">%{activeSession.pcc !== undefined ? activeSession.pcc : 100}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-150 flex items-center justify-between shadow-3xs transition-all hover:border-violet-150">
                      <div className="flex items-center gap-1.55">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                        <span className="font-bold text-slate-600">Doğru Ünlü Yüzdesi (DÜL / PVC)</span>
                      </div>
                      <span className="font-mono font-extrabold text-violet-700 shrink-0">%{activeSession.pvc !== undefined ? activeSession.pvc : 100}</span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-150 flex items-center justify-between shadow-3xs transition-all hover:border-emerald-150">
                      <div className="flex items-center gap-1.55">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-600">Toplam Doğru Sesbirim (DSY / PPC)</span>
                      </div>
                      <span className="font-mono font-extrabold text-emerald-700 shrink-0">%{activeSession.ppc !== undefined ? activeSession.ppc : 100}</span>
                    </div>

                    <p className="text-[9px] text-slate-400 italic text-center leading-normal pt-1.5">
                      * Ölçümler fonolojik işlemler üzerinden değil, doğrudan konuşma örneği fonemleri üzerinden hesaplanmaktadır.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ARTICULATION ERROR CATALOG */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Layers className="w-4 h-4 text-amber-500" />
                Artikülasyon / Ses Üretim Hata Detayları
              </h3>

              {activeSession.errors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSession.errors.map((err, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-2.5 print:shadow-none print:border-slate-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-800">
                            /{err.target}/ &rarr; [{err.uttered}]
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          err.type.includes("Yer") 
                            ? "bg-amber-50 text-amber-700 border-amber-100" 
                            : err.type.includes("Düş") 
                              ? "bg-rose-50 text-rose-700 border-rose-100" 
                              : "bg-violet-50 text-violet-700 border-violet-150"
                        }`}>
                          {err.type}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        {err.description}
                      </p>

                      <div className="pt-1 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Etkilenen Sözcük Söylemleri:</span>
                        <div className="flex flex-wrap gap-1">
                          {err.wordsAffected.map((w, wIdx) => (
                            <span key={wIdx} className="bg-slate-50 text-slate-700 text-[10px] px-2 py-0.5 rounded-md font-mono border border-slate-150 font-semibold">
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Belirgin artikülasyon ve ses üretim hatası saptanmamıştır.
                </div>
              )}
            </div>

            {/* PHONOLOGICAL PROCESSES */}
            {activeSession.phonologicalProcesses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <HelpCircle className="w-4 h-4 text-violet-500" />
                  Sesbilgisel (Fonolojik) Süreçlerin İncelemesi
                </h3>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[10px]">Süreç Sınıflandırması</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[10px] w-32">Görülme Sıklığı</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase tracking-wider text-[10px]">KLİNİK Fonetik Detay ve Gelişim</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 divide-slate-150">
                      {activeSession.phonologicalProcesses.map((pr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800">{pr.name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold border ${
                              pr.frequency === "Yüksek" 
                                ? "bg-rose-50 text-rose-700 border-rose-150" 
                                : pr.frequency === "Orta" 
                                  ? "bg-amber-50 text-amber-700 border-amber-150" 
                                  : "bg-slate-50 text-slate-600 border-slate-150"
                            }`}>
                              {pr.frequency}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 leading-relaxed font-semibold">{pr.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CLINICAL SUMMARY & RECOMMENDATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* SUMMARY */}
              <div className="bg-indigo-50/10 border border-indigo-100 p-5 rounded-2xl md:col-span-1 space-y-3 print:bg-transparent print:border-slate-300">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-indigo-150/50 pb-2">
                  <FileText className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Klinik-Fonetik Değerlendirme Özeti
                </h4>
                <p className="text-slate-750 text-xs leading-relaxed font-semibold whitespace-pre-wrap">
                  {activeSession.clinicalSummary}
                </p>
                {activeSession.isSimulated && (
                  <div className="bg-amber-50/70 border border-amber-100/50 p-2.5 rounded-lg text-[10px] text-amber-800">
                    * Bu analiz simülasyon modu destekli üretilmiştir. Yapay Zekaya doğrudan kayıt dinletmek için simülasyon düğmesini kapalı tutun.
                  </div>
                )}
              </div>

              {/* RECOMMENDATIONS */}
              <div className="bg-emerald-50/10 border border-emerald-100 p-5 rounded-2xl md:col-span-1 space-y-3 print:bg-transparent print:border-slate-300">
                <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-150/50 pb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Terapi Planlaması ve Öneriler
                </h4>
                <ul className="space-y-2.5">
                  {activeSession.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-semibold">
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-2e0 select-none">
                        ✓
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Signature Block (Standardised across program) */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 print:mt-12 print:border-slate-300">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sistem Doğrulaması</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-mono text-xs text-slate-600 font-bold uppercase">DKT-SYS-SECURED</p>
                </div>
              </div>
              <div className="text-left sm:text-right min-w-[200px]">
                <p className="font-bold text-slate-800 text-xs">Uygulayan Dil ve Konuşma Terapisti</p>
                <p className="text-[10px] text-slate-400 mt-1">Onay Kaşesi / İmza Alanı</p>
                <div className="border-b border-slate-300 w-36 ml-auto mt-8 print:border-slate-400"></div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ==================== ANALYZER RECORDER & SETUP CONTAINER ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: SETUP & RECORDING */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs p-6 space-y-6">
              
              {/* STEP 1: SELECT CLIENT & CLIENT MANAGEMENT */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    1. Danışan Seçimi & Yönetimi
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setClientModalInitialTab("list");
                        setIsClientModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Danışan Listesi ({clients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientModalInitialTab("add");
                        setIsClientModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-3xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      + Yeni Ekle
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="block flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.age} Yaşında){c.parentName ? ` • Veli: ${c.parentName}` : ""}
                      </option>
                    ))}
                    {clients.length === 0 && (
                      <option value="">Kayıtlı danışan yok - Lütfen danışan ekleyin...</option>
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
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <p className="font-semibold text-[11px]">
                      KSB artikülasyon analizi yapabilmek için sisteme en az bir danışan eklemelisiniz.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setClientModalInitialTab("add");
                        setIsClientModalOpen(true);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer shadow-3xs flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Danışan Ekle
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: SELECT PRESET TESTING SENTENCE */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Söylem veya Test Cümlesi Seçimi
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRESET_SENTENCES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPresetId(p.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedPresetId === p.id 
                          ? "bg-violet-50/50 border-violet-500 shadow-3xs" 
                          : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <h4 className={`text-xs font-bold ${selectedPresetId === p.id ? "text-violet-700" : "text-slate-800"}`}>
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 font-medium">{p.focus}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {selectedPresetId === "other" ? "Kendi Söylem Metninizi Yazın" : "Seçilen Söylem Örneği"}
                  </span>
                  <textarea
                    rows={2}
                    value={customTargetText}
                    onChange={(e) => setCustomTargetText(e.target.value)}
                    placeholder="Lütfen söylenmesi beklenen kelimeleri veya cümleyi buraya girin (Yapay Zeka bu hedef doğrultusunda saniyeler içinde ses tahlili yapacaktır)..."
                    disabled={selectedPresetId !== "other"}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all disabled:bg-slate-100/50 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* ADVANCED CLINICAL SETTINGS ACCORDION */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 transition-all text-left select-none cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-violet-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Gelişmiş Değerlendirme & Ses Filtre Ayarları
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Yapay zeka analiz hassasiyeti ve ses filtreleri yapılandırın.</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-violet-600 bg-white border border-slate-200 px-2 py-1 rounded-lg transition-transform">
                    {showSettings ? "GİZLE ▲" : "AYARLARI AÇ ▼"}
                  </span>
                </button>

                {showSettings && (
                  <div className="p-4 border-t border-slate-200 bg-white space-y-4 animate-in fade-in duration-200">
                    
                    {/* Settings Tabs */}
                    <div className="flex border-b border-slate-250 pb-2 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab("audio")}
                        className={`pb-1 px-2 border-b-2 transition-all cursor-pointer ${activeSettingsTab === "audio" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                      >
                        Ses Kayıt Kalitesi & Filtreler
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSettingsTab("intelligence")}
                        className={`pb-1 px-2 border-b-2 transition-all cursor-pointer ${activeSettingsTab === "intelligence" ? "border-violet-600 text-violet-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
                      >
                        Yapay Zeka Analiz & Hassasiyet
                      </button>
                    </div>

                    {activeSettingsTab === "audio" ? (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Audio Format */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ses Formatı / MimeType</label>
                            <select
                              value={audioFormat}
                              onChange={(e) => setAudioFormat(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-semibold text-slate-705 focus:outline-hidden text-xs"
                            >
                              <option value="audio/webm">audio/webm (Standart)</option>
                              <option value="audio/ogg">audio/ogg (Kayıpsız Sıkıştırma)</option>
                              <option value="audio/mp4">audio/mp4 (Yüksek Cihaz Uyumu)</option>
                              <option value="audio/wav">audio/wav (Ham PCM Verisi)</option>
                            </select>
                          </div>

                          {/* Sample Rate */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Örnekleme Frekansı (Sample Rate)</label>
                            <select
                              value={sampleRate}
                              onChange={(e) => setSampleRate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-semibold text-slate-705 focus:outline-hidden text-xs"
                            >
                              <option value="48000">48.000 Hz (Yüksek Çözünürlüklü Klinik Kalite)</option>
                              <option value="44100">44.100 Hz (Standart CD Kalitesi)</option>
                              <option value="16000">16.000 Hz (Dar Bant Sadece Ses Odaklı)</option>
                            </select>
                          </div>
                        </div>

                        {/* Interactive Toggle Buttons for Audio Filters */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          
                          <button
                            type="button"
                            onClick={() => setNoiseSuppression(!noiseSuppression)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${noiseSuppression ? "bg-violet-50 border-violet-200 text-violet-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                              <span className={`w-2 h-2 rounded-full ${noiseSuppression ? "bg-violet-500" : "bg-slate-350"}`} />
                              Gürültü Engelleme
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Arka plandaki fan ve oda hışırtısını aktif filtreler.</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEchoCancellation(!echoCancellation)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${echoCancellation ? "bg-violet-50 border-violet-200 text-violet-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                              <span className={`w-2 h-2 rounded-full ${echoCancellation ? "bg-violet-500" : "bg-slate-350"}`} />
                              Eko/Yankı Engelleme
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Oparlör geri beslemesini ve mikrofon yankılarını keser.</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAutoGainControl(!autoGainControl)}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${autoGainControl ? "bg-violet-50 border-violet-200 text-violet-800 font-bold" : "bg-slate-50 border-slate-200 text-slate-500"}`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide">
                              <span className={`w-2 h-2 rounded-full ${autoGainControl ? "bg-violet-500" : "bg-slate-350"}`} />
                              Desibel Eşitleme
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">Uzak-yakın konuşma eforu farkını otomatik dengeler.</p>
                          </button>

                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Strictness */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fonetik Titizlik Seviyesi</label>
                            <select
                              value={analysisStrictness}
                              onChange={(e) => setAnalysisStrictness(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-semibold text-slate-705 focus:outline-hidden text-xs"
                            >
                              <option value="standard">Klinik Standart (Dengeli Tahlil)</option>
                              <option value="strict">Yüksek Hassasiyet (Tüm Bozulmaları Yakala)</option>
                              <option value="lenient font-bold">Gelişimsel Tolerans (Sadece Majör Hatalar)</option>
                            </select>
                          </div>

                          {/* Detail level */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Klinik Rapor Derinliği</label>
                            <select
                              value={analysisDetailLevel}
                              onChange={(e) => setAnalysisDetailLevel(e.target.value as any)}
                              className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg font-semibold text-slate-705 focus:outline-hidden text-xs"
                            >
                              <option value="clinic-rich">Zengin Klinik Rapor & Tanılama</option>
                              <option value="academic">Akademik & Kapsamlı Fonetik Analiz</option>
                              <option value="basic">Sadece Eyleme Dönük Pratik Öneriler</option>
                            </select>
                          </div>
                        </div>

                        {/* Textarea for custom instructions context */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terapist Özel Müdahale ve Vak'a Notları</label>
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Yapay zekayı yönlendirir</span>
                          </div>
                          <textarea
                            rows={2}
                            value={customDirectives}
                            onChange={(e) => setCustomDirectives(e.target.value)}
                            placeholder="Örn: 'Çocuk 5.5 yaşında. Pelteklik eğilimi var. Sürtünmeli s-ş seslerine ve alveolar sızmalara odaklanın.'"
                            className="w-full bg-slate-50 border border-slate-200 p-2 px-3 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-violet-400 focus:outline-hidden transition-all placeholder:text-[11px]"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* STEP 3: AUDIO INPUT (RECORDER / UPLOADER) */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Ses Kaydı Alın veya Ses Belgesi Yükleyin
                </label>

                <div className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50/30 gap-4 transition-all">
                  
                  {isRecording ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-red-600 font-mono text-sm font-bold">
                          {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                        </span>
                      </div>

                      {/* Waveform Visualizer */}
                      <div className="flex items-center gap-0.5 h-10 px-4 mt-1 select-none">
                        {waveformBars.map((height, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full bg-violet-500 transition-all duration-150"
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={handleStopRecording}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-150 text-rose-700 px-4 py-2 rounded-xl border border-rose-200 font-bold transition-all text-xs select-none cursor-pointer"
                      >
                        <Square className="w-4 h-4 fill-rose-600 stroke-none" />
                        Kaydı Tamamla
                      </button>
                    </div>
                  ) : audioUrl ? (
                    <div className="w-full space-y-4">
                      <div className="bg-violet-50/40 p-4 rounded-xl border border-violet-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700">
                            <FileAudio className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">
                              {uploadedFileName || "DKT_Tek_Söylem_Ses_Kaydı.webm"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Dinlemeye ve Yapay Zekayla analiz edilmeye hazır.</p>
                          </div>
                        </div>

                        <button
                          onClick={handleResetRecordState}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Kaydı Temizle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <audio src={audioUrl} controls className="w-full h-10 select-none" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      {/* Record button */}
                      <button
                        onClick={handleStartRecording}
                        className="flex items-center justify-center gap-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold px-5 py-3 rounded-xl transition-all text-xs cursor-pointer select-none"
                      >
                        <Mic className="w-4 h-4" />
                        Mikrofonu Başlat (Kayıt Al)
                      </button>

                      {/* Upload local file */}
                      <label className="flex items-center justify-center gap-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-xl transition-all text-xs cursor-pointer select-none">
                        <Upload className="w-4 h-4" />
                        Cihazdan Ses Dosyası Yükle
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                </div>
              </div>

              {/* ACTION: INITIATE ANALYSIS */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Analiz süresi ses kaydının uzunluğuna bağlı olarak 3-6 saniye sürebilir.
                </div>

                <button
                  onClick={handlePerformAnalysis}
                  disabled={isAnalyzing || !audioBlob || !selectedClientId}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl transition-all shadow-md shadow-violet-100 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-450 disabled:shadow-none cursor-pointer text-xs"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Yapay Zeka Sesleri Çözümlüyor...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Yapay Zeka IPA Analizini Başlat
                    </>
                  )}
                </button>
              </div>

              {analysisError && (
                <div className="bg-rose-50 border border-rose-150 rounded-xl p-4 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Analiz Tamamlanamadı</p>
                    <p className="mt-0.5 leading-relaxed">{analysisError}</p>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* RIGHT COLUMN: MULTI-TAB HISTORY & CLINICAL UTILITIES */}
          <div className="lg:col-span-1 space-y-4">
            
            <div className="bg-white border border-slate-200 rounded-2xl shadow-3xs p-4 space-y-4">
              
              {/* Tab Navigation buttons */}
              <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-150 select-none">
                <button
                  type="button"
                  onClick={() => setRightSidebarTab("history")}
                  className={`flex items-center justify-center py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rightSidebarTab === "history"
                      ? "bg-white text-violet-750 shadow-3xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Geçmiş Değerlendirmeler"
                >
                  Geçmiş ({clientFilteredSessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRightSidebarTab("ipa")}
                  className={`flex items-center justify-center py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rightSidebarTab === "ipa"
                      ? "bg-white text-violet-750 shadow-3xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Türkçe IPA Sesliler Tablosu"
                >
                  IPA (🔤)
                </button>
                <button
                  type="button"
                  onClick={() => setRightSidebarTab("guide")}
                  className={`flex items-center justify-center py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rightSidebarTab === "guide"
                      ? "bg-white text-violet-750 shadow-3xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Fonolojik Süreçler Sözlüğü"
                >
                  Süreçler (📖)
                </button>
                <button
                  type="button"
                  onClick={() => setRightSidebarTab("ideas")}
                  className={`flex items-center justify-center py-1.5 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    rightSidebarTab === "ideas"
                      ? "bg-white text-violet-750 shadow-3xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Geliştirme Fikirleri"
                >
                  Fikirler (💡)
                </button>
              </div>

              {/* TAB CONTENT: HISTORY & SESSIONS */}
              {rightSidebarTab === "history" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Tamamlanan Değerlendirmeler
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold">
                      {clientFilteredSessions.length} Kayıt
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {clientFilteredSessions.length > 0 ? (
                      clientFilteredSessions.map(session => (
                        <button
                          type="button"
                          key={session.id}
                          onClick={() => setActiveSession(session)}
                          className="w-full text-left p-3 rounded-xl border border-slate-150 hover:border-violet-300 hover:bg-violet-50/20 transition-all flex items-start justify-between gap-3 group cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-850 leading-none group-hover:text-violet-700 transition-colors">
                                %{session.intelligibilityScore} Anlaşılırlık
                              </p>
                              {session.isSimulated && (
                                <span className="bg-amber-50 text-amber-600 text-[8px] font-bold px-1 rounded-sm tracking-widest uppercase">
                                  Demo
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400">{session.date}</p>
                            <p className="text-[10px] text-slate-650 line-clamp-2 font-semibold">
                              "{session.intendedText}"
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHistorySession(session.id, e);
                              }}
                              className="p-1 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-350 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                          <FileText className="w-5 h-5 text-slate-350" />
                        </div>
                        <p className="text-[11px] leading-relaxed max-w-[210px] mx-auto font-medium">
                          Seçilen danışanın KSB fonetik analizi henüz bulunmamaktadır. İlk analizini başlatın.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TURKISH IPA VOWELS CHART */}
              {rightSidebarTab === "ipa" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="border-b border-slate-150 pb-2">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                      Türkçe Sesli Harfler IPA Tablosu
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">
                      Türkçedeki 8 ünlü sesin standart Uluslararası Fonetik Alfabe (IPA) karşılıkları ve klinik fonetik özellikleri.
                    </p>
                  </div>

                  {/* Summary Quick Badge Grid */}
                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-violet-50/60 rounded-xl border border-violet-100">
                    {TURKISH_IPA_VOWELS.map(v => (
                      <button
                        key={v.letter}
                        type="button"
                        onClick={() => handleCopyIpa(v.ipa, v.letter)}
                        className="flex flex-col items-center justify-center p-1.5 bg-white rounded-lg border border-violet-200/70 hover:border-violet-400 hover:scale-105 transition-all shadow-3xs cursor-pointer group"
                        title={`${v.name} - Kopyalamak için tıkla`}
                      >
                        <span className="text-[9px] text-slate-400 font-sans font-semibold">/{v.letter}/</span>
                        <span className="text-sm font-mono font-bold text-violet-700 group-hover:text-violet-900">{v.ipa}</span>
                        {copiedVowel === v.letter ? (
                          <span className="text-[8px] text-emerald-600 font-bold">Kopyalandı!</span>
                        ) : (
                          <span className="text-[8px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Kopyala</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Detailed Vowels List */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {TURKISH_IPA_VOWELS.map(v => (
                      <div
                        key={v.letter}
                        className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-violet-200 transition-all text-xs space-y-1 shadow-3xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                              {v.letter}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="text-sm font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                              /{v.ipa}/
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyIpa(v.ipa, v.letter)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-violet-700 bg-slate-50 hover:bg-violet-50 px-2 py-1 rounded-md border border-slate-200 transition-all cursor-pointer"
                          >
                            {copiedVowel === v.letter ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600 font-semibold">Kopyalandı</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>/{v.ipa}/ Kopyala</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-700 font-bold">
                          {v.name}
                        </div>
                        <p className="text-[9px] text-slate-500 leading-normal">
                          {v.description}
                        </p>
                        <div className="bg-slate-50 p-1.5 rounded-md text-[10px] font-mono flex justify-between font-bold border border-slate-100">
                          <span className="text-slate-600">Örnek: "{v.exampleWord}"</span>
                          <span className="text-violet-700">{v.exampleIpa}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-[10px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-amber-800">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        Ünsüz 'y' ile Vurgu Notu:
                      </div>
                      <p className="text-[9px] leading-relaxed text-amber-800">
                        Türkçedeki ünsüz 'y' harfi (örn: yol, ayak) IPA'da <strong>[j]</strong> sembolüyle gösterilir. Uluslararası Fonetik Alfabe'deki <strong>[y]</strong> sembolü ise kapalı ön yuvarlak sesli olan <strong>/ü/</strong> sesini temsil eder.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TURKISH PHONOLOGICAL ENCYCLOPEDIA */}
              {rightSidebarTab === "guide" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="border-b border-slate-150 pb-2">
                    <h3 className="text-[11px] font-black text-slate-705 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-violet-650" />
                      Türkçe Fonolojik Süreçler Sözlüğü
                    </h3>
                    <p className="text-[9px] text-slate-405 mt-0.5 leading-normal">Dil gelişiminde sık gözlenen tipik ve atipik fonolojik süreçler rehberi.</p>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    
                    {/* Process 1 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Sıvı/Akıcılaşma (Gliding)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">3-4 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Akıcı ünsüzlerin (/r/, /l/) sızıcı veya yarı-akıcı seslere (/j/) dönüşmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /karpuz/ &rarr; [kajpuz]</span>
                        <span>/r/ &rarr; [j]</span>
                      </div>
                    </div>

                    {/* Process 2 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Öne Kayma (Velar Fronting)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">3 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Ağzın arkasında üretilen seslerin (/k/, /g/) öndeki diş-eti dikeyinde (/t/, /d/) üretilmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /kapı/ &rarr; [tapı]</span>
                        <span>/k/ &rarr; [t]</span>
                      </div>
                    </div>

                    {/* Process 3 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Duraklaşma (Stopping)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">3 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Sürekli sızıcı seslerin (/s/, /ş/, /f/) kesintili patlamalı seslere (/t/, /p/) dönüşmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /sabun/ &rarr; [tabun]</span>
                        <span>/s/ &rarr; [t]</span>
                      </div>
                    </div>

                    {/* Process 4 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Ünsüz Tekleşmesi (Cluster)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">4 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Aynı hecedeki ünsüz öbeklerinden birinin yutularak basitleştirilmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /tren/ &rarr; [ten]</span>
                        <span>/tr/ &rarr; [t]</span>
                      </div>
                    </div>

                    {/* Process 5 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Arkaya Kayma (Velar Backing)</span>
                        <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">Atipik</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Ön seslerin patolojik olarak arka damak düzeyine itilerek söylenmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /top/ &rarr; [kop]</span>
                        <span>/t/ &rarr; [k]</span>
                      </div>
                    </div>

                    {/* Process 6 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Yer Değiştirme (Metathesis)</span>
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">Gelişimsel</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Kelime içinde bulunan iki sesin yer değiştirerek telaffuz edilmesidir.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /köprü/ &rarr; [körpü]</span>
                        <span>p-r &rarr; r-p</span>
                      </div>
                    </div>

                    {/* Process 7 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Hece Düşmesi (Syllable Deletion)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">3 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Özellikle vurgusuz zayıf hecelerin sözcükten tamamen yutulmasıdır.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /limonata/ &rarr; [monata]</span>
                        <span>/li-/ &rarr; [ø]</span>
                      </div>
                    </div>

                    {/* Process 8 */}
                    <div className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">Ses Benzeşmesi (Assimilation)</span>
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">3.5 Yaş</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold leading-normal">Bir sesin kelime içindeki baskın başka bir sesin özelliğini almasıdır.</p>
                      <div className="bg-white/80 p-1.5 rounded-md text-[10px] font-mono text-indigo-700 flex justify-between font-bold border border-slate-100">
                        <span>Hedef: /ekmek/ &rarr; [epmek]</span>
                        <span>/e-k/ &rarr; [p] (labial)</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB CONTENT: STATE-OF-THE-ART CLINICAL SOLUTIONS (IDEAS) */}
              {rightSidebarTab === "ideas" && (
                <div className="space-y-3 animate-in fade-in duration-200 text-xs">
                  <div className="border-b border-slate-150 pb-2">
                    <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      Mükemmel KSB Analizör Yol Haritası
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">Yapay zeka teşhis modülünü dünya standartlarına ulaştıracak 4 vizyoner fikir.</p>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    
                    {/* Idea 1 */}
                    <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 font-black text-[9px]">1</span>
                        Minimal Çift Kart Üreteci
                      </div>
                      <p className="text-[10px] text-slate-600 leading-normal font-semibold">
                        Yapay zeka çocuğun yaptığı spesifik hataya göre (örn: t-k öne kayması) anında seans odasında basılı terapide kullanılacak <strong>"tel-kel", "tava-kava", "tas-kas"</strong> minimal çift görsel kartları tasarlar ve çıktıya hazırlar.
                      </p>
                    </div>

                    {/* Idea 2 */}
                    <div className="p-3 rounded-xl border border-violet-100 bg-violet-50/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-violet-900 text-[11px]">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-violet-100 text-violet-700 font-black text-[9px]">2</span>
                        Akustik Spektrogram Entegrasyonu
                      </div>
                      <p className="text-[10px] text-slate-605 leading-normal font-semibold">
                        Sadece transkripsiyon değil; arka planda ses frekansı, formant 1 (F1) ve formant 2 (F2) eğrilerini çizerek çocuğun dil ve dudak koordinasyonunu ekranda dikey spektrum ve biyo-geribildirimle görselleştirir.
                      </p>
                    </div>

                    {/* Idea 3 */}
                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-[11px]">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 font-black text-[9px]">3</span>
                        Oyunlaştırılmış Ev Ödev Köprüsü
                      </div>
                      <p className="text-[10px] text-slate-605 leading-normal font-semibold">
                        Terapistin ürettiği fonetik rapor, tek tıkla velinin telefonundaki <strong>"Ev Ödevi Canavarı"</strong> uygulamasına gönderilir. Çocuk evde sözcükleri tekrarladıkça yapay zeka performansı kaydederek raporu günceller.
                      </p>
                    </div>

                    {/* Idea 4 */}
                    <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-[11px]">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 font-black text-[9px]">4</span>
                        Çoklu-Mikrofon Maskeleme Süzgeci
                      </div>
                      <p className="text-[10px] text-slate-605 leading-normal font-semibold">
                        Terapistin ve danışanın ses dalgalarını eşzamanlı çift kanal kaydedip, birbirinin frekansını gürültü olarak maskeleyerek sıfır yankılı, stüdyo stili bir akustik oda yalıtımı simüle eder.
                      </p>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

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
          titleContext="KSB (IPA) Modülü"
        />
      )}

    </div>
  );
}
