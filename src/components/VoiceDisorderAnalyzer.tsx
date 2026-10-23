import { useState, useRef, useEffect, ChangeEvent, MouseEvent } from "react";
import { 
  Client, 
  VoiceSession, 
  AcousticVoiceParameters, 
  GRBASScale, 
  CAPEVScale 
} from "../types";
import ClientManagerModal from "./ClientManagerModal";
import { 
  startLiveFrequencyTracker, 
  AudioFrequencyTracker, 
  FrequencyAnalysisResult 
} from "../utils/audioFrequencyAnalyzer";
import { 
  analyzeAudioAcoustics, 
  CLINICAL_ACOUSTIC_NORMS 
} from "../utils/voiceAcousticAnalyzer";
import { 
  Mic, Square, Trash2, Upload, Sparkles, AlertCircle, FileAudio, 
  Volume2, CheckCircle2, Award, HelpCircle, FileText, 
  Printer, Copy, Check, Info, BarChart2,
  Sliders, Settings, BookOpen, Lightbulb, ClipboardCheck, Users,
  UserPlus, AudioLines, Activity, HeartPulse, Stethoscope, Gauge,
  Timer, Clock, AlertTriangle, ShieldCheck, Waves
} from "lucide-react";

interface VoiceDisorderAnalyzerProps {
  clients: Client[];
  currentUserEmail: string;
  onAddClient?: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient?: (id: string) => void;
}

const RAINBOW_PASSAGE_SAMPLE = `Gökkuşağı, güneş ışığının havadaki yağmur damlalarına çarparak kırılması ve yansıması sonucu oluşan doğanın en etkileyici optik gösterilerinden biridir. Işık damlalardan geçerken farklı renk tayflarına ayrılır ve gökyüzünde kırmızı, turuncu, sarı, yeşil, mavi ve mor renklerden oluşan devasa bir yay meydana getirir.`;

export default function VoiceDisorderAnalyzer({
  clients,
  currentUserEmail,
  onAddClient,
  onDeleteClient
}: VoiceDisorderAnalyzerProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);

  // Client Management Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [clientModalInitialTab, setClientModalInitialTab] = useState<"list" | "add">("list");

  // Task & Patient Settings
  const [taskType, setTaskType] = useState<"sustained_vowel" | "continuous_speech" | "sz_ratio" | "mpt">("sustained_vowel");
  const [vowelSound, setVowelSound] = useState<string>("/a/");
  const [genderProfile, setGenderProfile] = useState<"female" | "male" | "child">("female");

  // s/z Ratio Dedicated State
  const [sDuration, setSDuration] = useState<number>(0);
  const [zDuration, setZDuration] = useState<number>(0);
  const [szTimerActive, setSzTimerActive] = useState<"s" | "z" | null>(null);

  // MPT State
  const [mptDurationSec, setMptDurationSec] = useState<number>(14.5);

  // History & Active Report Session
  const [historySessions, setHistorySessions] = useState<VoiceSession[]>([]);
  const [activeSession, setActiveSession] = useState<VoiceSession | null>(null);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Real-time Web Audio Pitch & Diarization
  const [liveFrequencyData, setLiveFrequencyData] = useState<FrequencyAnalysisResult | null>(null);
  const [finalFrequencySummary, setFinalFrequencySummary] = useState<FrequencyAnalysisResult | null>(null);
  const frequencyTrackerRef = useRef<AudioFrequencyTracker | null>(null);

  // Analysis Progress & Feedback
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const szTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(32).fill(4));

  const emailKey = currentUserEmail.replace(/[@.]/g, "_");

  // Load history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`dkt_voice_sessions_${emailKey}`);
    if (stored) {
      try {
        setHistorySessions(JSON.parse(stored));
      } catch (err) {
        console.error("Önceki ses analizi raporları yüklenemedi:", err);
      }
    }
  }, [emailKey]);

  // Set default client if available
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

  // Recording Timer Effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        setWaveformBars(prev => prev.map(() => Math.floor(Math.random() * 26) + 4));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setWaveformBars(Array(32).fill(4));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // s/z Ratio Timer effect
  useEffect(() => {
    if (szTimerActive === "s") {
      szTimerIntervalRef.current = setInterval(() => {
        setSDuration(prev => Math.round((prev + 0.1) * 10) / 10);
      }, 100);
    } else if (szTimerActive === "z") {
      szTimerIntervalRef.current = setInterval(() => {
        setZDuration(prev => Math.round((prev + 0.1) * 10) / 10);
      }, 100);
    } else {
      if (szTimerIntervalRef.current) clearInterval(szTimerIntervalRef.current);
    }
    return () => {
      if (szTimerIntervalRef.current) clearInterval(szTimerIntervalRef.current);
    };
  }, [szTimerActive]);

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
            noiseSuppression: false, // Ses pertürbasyonu analizinde ham vokal tonu korumak için
            autoGainControl: false,
            channelCount: 1
          }
        });
      } catch (err) {
        console.warn("Ham ses filtreleri uygulanamadı, varsayılan akışa dönülüyor:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      // Start Real-Time Web Audio Frequency & Speaker Classifier
      try {
        frequencyTrackerRef.current = startLiveFrequencyTracker(stream, {
          profile: genderProfile === "child" ? "child" : genderProfile === "female" ? "female_adult" : "male_adult",
          onUpdate: (result) => setLiveFrequencyData(result)
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
      setAnalysisError("Mikrofona erişilemedi. Lütfen tarayıcı izinlerinizi kontrol edin veya ses dosyası yükleyin.");
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

  // Perform Voice Acoustic Analysis via API + Client Signal Precalculation
  const handlePerformAnalysis = async () => {
    if (!audioBlob) {
      setAnalysisError("Değerlendirilecek bir ses kaydı veya yüklenmiş ses dosyası gereklidir.");
      return;
    }

    const clientObj = clients.find(c => c.id === selectedClientId);
    const clientName = clientObj ? clientObj.name : "İsimsiz Danışan";

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Step 1: Pre-calculate client-side acoustic signal metrics
      const calculatedSzRatio = zDuration > 0 ? Math.round((sDuration / zDuration) * 100) / 100 : undefined;
      const clientAcousticPrecalc = await analyzeAudioAcoustics(audioBlob, {
        gender: genderProfile,
        mptSec: recordingSeconds > 0 ? recordingSeconds : mptDurationSec,
        szRatio: calculatedSzRatio
      });

      // Step 2: Convert to base64 and call server endpoint
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        try {
          const response = await fetch("/api/analyze-voice", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-user-email": currentUserEmail
            },
            body: JSON.stringify({
              audioData: base64Audio,
              mimeType: audioBlob.type,
              clientName,
              gender: genderProfile,
              taskType,
              vowelSound,
              mptDuration: recordingSeconds > 0 ? recordingSeconds : mptDurationSec,
              szRatio: calculatedSzRatio,
              clientAcousticPrecalc,
              simulationMode: isSimulatedMode,
              speakerSeparationEnabled: true,
              liveFrequencySummary: finalFrequencySummary || liveFrequencyData
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || "Ses bozuklukları analizi gerçekleştirilemedi.");
          }

          const analysisResult = await response.json();

          const newSession: VoiceSession = {
            id: "voice_" + Date.now(),
            clientId: selectedClientId,
            clientName,
            date: new Date().toISOString(),
            taskType,
            gender: genderProfile,
            vowelSound,
            duration: recordingSeconds > 0 ? recordingSeconds : 10,
            acousticParams: analysisResult.acousticParams || clientAcousticPrecalc,
            grbas: analysisResult.grbas || { g: 0, r: 0, b: 0, a: 0, s: 0 },
            capev: analysisResult.capev,
            severity: analysisResult.severity || "Normal Ses",
            suspectedPathology: analysisResult.suspectedPathology || "Patoloji Saptanmadı",
            clinicalEvaluation: analysisResult.clinicalEvaluation || "Ses akustik analizi tamamlandı.",
            therapyRecommendations: analysisResult.therapyRecommendations || [],
            stroboscopyNeeded: !!analysisResult.stroboscopyNeeded,
            isSimulated: analysisResult.isSimulated,
            modelUsed: analysisResult.modelUsed || "Gemini 3.5 Flash",
            speakerSeparation: analysisResult.speakerSeparation || finalFrequencySummary
          };

          const updatedSessions = [newSession, ...historySessions];
          setHistorySessions(updatedSessions);
          localStorage.setItem(`dkt_voice_sessions_${emailKey}`, JSON.stringify(updatedSessions));
          setActiveSession(newSession);
          handleResetRecordState();
        } catch (subErr: any) {
          console.error("Voice analysis error:", subErr);
          setAnalysisError(subErr?.message || "Akustik ses analizi oluşturulurken bir hata oluştu.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (err: any) {
      console.error("Audio processing failed:", err);
      setAnalysisError("Ses verisi işlenirken bir sorun oluştu.");
      setIsAnalyzing(false);
    }
  };

  const handleDeleteHistorySession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = historySessions.filter(s => s.id !== id);
    setHistorySessions(updated);
    localStorage.setItem(`dkt_voice_sessions_${emailKey}`, JSON.stringify(updated));
    if (activeSession?.id === id) {
      setActiveSession(null);
    }
  };

  const handleCopyReportToClipboard = () => {
    if (!activeSession) return;
    const a = activeSession.acousticParams;
    let text = `==================================================\n`;
    text += `KLİNİK SES BOZUKLUKLARI & AKUSTİK DİSFONİ RAPORU\n`;
    text += `==================================================\n`;
    text += `Danışan: ${activeSession.clientName}\n`;
    text += `Tarih: ${new Date(activeSession.date).toLocaleString("tr-TR")}\n`;
    text += `Görev: ${activeSession.taskType === "sustained_vowel" ? `Sürdürülen Vokal Fonasyon (${activeSession.vowelSound || "/a/"})` : "Sürekli Konuşma Pasajı"}\n`;
    text += `Şiddet Derecesi: ${activeSession.severity}\n`;
    text += `Ön Tanısal Şüphe: ${activeSession.suspectedPathology}\n\n`;
    text += `--- AKUSTİK PERTÜRBASYON VE KEPSTRAL PARAMETRELER ---\n`;
    text += `Ortalama F0: ${a.f0Mean} Hz (Min: ${a.f0Min} Hz, Max: ${a.f0Max} Hz, SD: ${a.f0Std} Hz)\n`;
    text += `Jitter (Local): %${a.jitterLocal} (Norm < 1.04%)\n`;
    text += `Jitter (RAP): %${a.jitterRap} | Jitter (PPQ5): %${a.jitterPpq5}\n`;
    text += `Shimmer (Local): %${a.shimmerLocal} (Norm < 3.81%)\n`;
    text += `Shimmer (dB): ${a.shimmerDb} dB (Norm < 0.35 dB)\n`;
    text += `NHR (Gürültü/Uyum Oranı): ${a.nhr} (Norm < 0.19)\n`;
    text += `HNR (Harmonik/Gürültü Oranı): ${a.hnr} dB (Norm > 20 dB)\n`;
    text += `CPPS (Kepstral Tepe): ${a.cpps} dB (Norm > 10 dB vokal / > 4.5 dB konuşma)\n`;
    text += `DSI (Disfoni İndeksi): ${a.dsi} (+1.6 ile +5.0 arası normal)\n`;
    text += `MPT (Maks Fonasyon Süresi): ${a.mpt} sn\n`;
    if (a.szRatio) text += `s/z Oranı: ${a.szRatio} (Norm 1.0 - 1.4)\n`;
    text += `\n--- GRBAS ALGISAL SES DERECELENDİRMESİ ---\n`;
    text += `G (Grade): ${activeSession.grbas.g}/3 | R (Roughness): ${activeSession.grbas.r}/3 | B (Breathiness): ${activeSession.grbas.b}/3 | A (Asthenia): ${activeSession.grbas.a}/3 | S (Strain): ${activeSession.grbas.s}/3\n`;
    if (activeSession.grbas.justification) text += `Gerekçe: ${activeSession.grbas.justification}\n`;
    text += `\n--- KLİNİK DEĞERLENDİRME ---\n${activeSession.clinicalEvaluation}\n`;
    text += `\n--- DKT SES TERAPİSİ ÖNERİLERİ ---\n`;
    activeSession.therapyRecommendations.forEach((rec, idx) => {
      text += `${idx + 1}. ${rec}\n`;
    });
    if (activeSession.stroboscopyNeeded) {
      text += `\n[UYARI]: KBB Videolaringostroboskopi konsültasyonu tavsiye edilir.\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Helper for status badge colors
  const getBadgeForParam = (key: string, val: number) => {
    const norm = CLINICAL_ACOUSTIC_NORMS[key];
    if (!norm) return null;
    const st = norm.status(val, genderProfile);
    if (st === "normal") {
      return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-250">Normal</span>;
    }
    if (st === "borderline") {
      return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-250">Sınırda</span>;
    }
    return <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-250 animate-pulse">Patolojik</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* MODULE HEADER BANNER */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase text-teal-200">
              <Activity className="w-3.5 h-3.5 text-teal-300" />
              Klinik Ses Patolojisi & Akustik Disfoni Bataryası
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Ses Bozuklukları ve Akustik Analiz Modülü
            </h1>
            
            <p className="text-teal-100/90 text-xs leading-relaxed font-medium">
              PRAAT ve MDVP klinik standartlarında; <b>Jitter, Shimmer, NHR, HNR, F0</b>, en modern kanıta dayalı kepstral gösterge olan <b>CPPS</b> (Cepstral Peak Prominence Smoothed), <b>DSI, MPT, s/z oranı</b> ve <b>GRBAS</b> algısal skalasıyla ses teli patolojisi taraması.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Akustik Motoru: Aktif (Web Audio & Gemini)</span>
            </div>

            <button
              type="button"
              onClick={() => setIsSimulatedMode(!isSimulatedMode)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                isSimulatedMode 
                  ? "bg-amber-500/30 text-amber-200 border-amber-400/50 shadow-3xs" 
                  : "bg-white/10 text-white/90 border-white/20 hover:bg-white/20"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simülasyon Modu: {isSimulatedMode ? "AÇIK" : "KAPALI"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PROTOCOL, CLIENT & AUDIO CAPTURE */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* STEP 1: CLIENT SELECTION & PROFILE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Danışan & Ses Tipi
                </h3>
              </div>

              {onAddClient && (
                <button
                  type="button"
                  onClick={() => {
                    setClientModalInitialTab("add");
                    setIsClientModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  + Danışan Ekle
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                >
                  {clients.length === 0 ? (
                    <option value="">Kayıtlı danışan yok - Lütfen ekleyin...</option>
                  ) : (
                    clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.age} Yaşında)
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

              {/* GENDER & BIOLOGICAL PROFILE SELECTOR */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Biyolojik Cinsiyet & Normatif Aralık:
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setGenderProfile("female")}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      genderProfile === "female"
                        ? "bg-teal-600 text-white border-teal-600 shadow-3xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Kadın (180-240 Hz)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderProfile("male")}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      genderProfile === "male"
                        ? "bg-teal-600 text-white border-teal-600 shadow-3xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Erkek (100-140 Hz)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenderProfile("child")}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center ${
                      genderProfile === "child"
                        ? "bg-teal-600 text-white border-teal-600 shadow-3xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Çocuk (220-300 Hz)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: CLINICAL PROTOCOL & TASK SELECTOR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Gauge className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Klinik Test Görevi
              </h3>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setTaskType("sustained_vowel")}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  taskType === "sustained_vowel"
                    ? "bg-teal-50/70 border-teal-300 text-teal-900 shadow-3xs"
                    : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <Waves className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold">Sürdürülen Vokal Fonasyon (/a/ veya /i/)</p>
                  <p className="text-[10px] text-slate-500 font-medium">Jitter, Shimmer, NHR, CPPS ve temel pertürbasyon analizi için altın standart.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTaskType("continuous_speech")}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  taskType === "continuous_speech"
                    ? "bg-teal-50/70 border-teal-300 text-teal-900 shadow-3xs"
                    : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <BookOpen className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold">Sürekli Konuşma / Standart Okuma Pasajı</p>
                  <p className="text-[10px] text-slate-500 font-medium">Doğal konuşmada kepstral tepe belirginliği (CPPS) ve F0 değişkenliği.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTaskType("sz_ratio")}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  taskType === "sz_ratio"
                    ? "bg-teal-50/70 border-teal-300 text-teal-900 shadow-3xs"
                    : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/60"
                }`}
              >
                <Timer className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold">s/z Oranı & Glottal Kapanma Testi</p>
                  <p className="text-[10px] text-slate-500 font-medium">Kord lezyonu (nodül, polip) ayırıcı tanısında laringeal hava kaçağı testi.</p>
                </div>
              </button>
            </div>

            {/* VOWEL SELECTOR (if sustained vowel) */}
            {taskType === "sustained_vowel" && (
              <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-slate-600">Hedef Ünlü:</span>
                <div className="flex gap-1.5">
                  {["/a/", "/i/", "/u/", "/e/"].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVowelSound(v)}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        vowelSound === v
                          ? "bg-teal-600 text-white shadow-3xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* READING PASSAGE PROMPT (if continuous speech) */}
            {taskType === "continuous_speech" && (
              <div className="pt-2 border-t border-slate-150 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Gökkuşağı Pasajı (Standart Klinik Metin):</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 italic leading-relaxed">
                  "{RAINBOW_PASSAGE_SAMPLE}"
                </div>
              </div>
            )}

            {/* s/z RATIO ASSISTANT (if sz_ratio) */}
            {taskType === "sz_ratio" && (
              <div className="pt-2 border-t border-slate-150 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* S TIMER */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">/s/ Süresi (Titreşimsiz)</span>
                    <span className="text-xl font-mono font-black text-slate-800">{sDuration.toFixed(1)} sn</span>
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSzTimerActive(szTimerActive === "s" ? null : "s")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                          szTimerActive === "s" ? "bg-rose-600 text-white animate-pulse" : "bg-teal-600 text-white"
                        }`}
                      >
                        {szTimerActive === "s" ? "Durdur" : "Başlat"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSDuration(0)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>

                  {/* Z TIMER */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">/z/ Süresi (Titreşimli)</span>
                    <span className="text-xl font-mono font-black text-slate-800">{zDuration.toFixed(1)} sn</span>
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSzTimerActive(szTimerActive === "z" ? null : "z")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                          szTimerActive === "z" ? "bg-rose-600 text-white animate-pulse" : "bg-teal-600 text-white"
                        }`}
                      >
                        {szTimerActive === "z" ? "Durdur" : "Başlat"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setZDuration(0)}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                </div>

                {zDuration > 0 && sDuration > 0 && (
                  <div className={`p-2.5 rounded-xl border text-center text-xs font-bold ${
                    (sDuration / zDuration) <= 1.4 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-250" 
                      : "bg-rose-50 text-rose-800 border-rose-250"
                  }`}>
                    Hesaplanan s/z Oranı: {(sDuration / zDuration).toFixed(2)}
                    <span className="block text-[10px] font-semibold mt-0.5">
                      {(sDuration / zDuration) <= 1.4 ? "Normal Değer (1.0 - 1.4)" : "Yüksek Değer (> 1.4: Vokal kord patolojisi şüphesi)"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: AUDIO CAPTURE & RECORDING CARD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Ses Kaydı / Analiz Girdisi
                </h3>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <AudioLines className="w-3 h-3 text-teal-600" />
                DKT Filtresi Aktif
              </span>
            </div>

            {/* DARK WAVEFORM PREVIEW BOX */}
            <div className="bg-slate-900 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden h-28">
              {isRecording ? (
                <div className="absolute top-2 left-3 flex items-center gap-1.5 bg-rose-500/10 text-rose-400 p-0.5 px-2 rounded-full border border-rose-500/20 text-[9px] font-extrabold uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  Klinik Mikrofon Açık
                </div>
              ) : (
                <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  Vokal Akustik İzleyici
                </div>
              )}

              {/* DKT Voice Detected Live Badge */}
              {isRecording && liveFrequencyData?.activeSpeaker === "therapist" && (
                <div className="absolute top-2 right-3 flex items-center gap-1.5 bg-purple-500/20 text-purple-300 p-0.5 px-2 rounded-full border border-purple-500/30 text-[9px] font-extrabold animate-bounce">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  DKT Sesi Algılandı (Filtreleniyor)
                </div>
              )}

              {/* Timer */}
              <div className="text-xl font-mono text-white font-extrabold tracking-wider z-10">
                {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}
              </div>

              {/* Waveform Bars */}
              <div className="flex items-end gap-1 h-8 mt-2 w-full max-w-xs justify-center z-10">
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isRecording ? (
                        liveFrequencyData?.activeSpeaker === "therapist" 
                          ? "bg-purple-400 opacity-90" 
                          : "bg-teal-400 opacity-90"
                      ) : "bg-slate-600 opacity-30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* LIVE FREQUENCY & SPEAKER CLASSIFIER MONITOR */}
            {(isRecording || finalFrequencySummary) && (
              <div className="bg-slate-50 border border-teal-150 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      liveFrequencyData?.activeSpeaker === "client" ? "bg-teal-400" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-400" : "bg-slate-300"
                    }`} />
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      liveFrequencyData?.activeSpeaker === "client" ? "bg-teal-500" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-600" : "bg-slate-400"
                    }`} />
                  </span>

                  <span className="font-extrabold text-slate-800">
                    {isRecording ? (
                      liveFrequencyData?.currentPitchHz && liveFrequencyData.currentPitchHz > 0 ? (
                        `F0: ${liveFrequencyData.currentPitchHz} Hz`
                      ) : (
                        "Ses Dinleniyor..."
                      )
                    ) : (
                      "Akustik Sinyal Hazır"
                    )}
                  </span>

                  {isRecording && liveFrequencyData && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      liveFrequencyData.activeSpeaker === "client"
                        ? "bg-teal-50 text-teal-800 border-teal-250 animate-pulse"
                        : liveFrequencyData.activeSpeaker === "therapist"
                        ? "bg-purple-50 text-purple-800 border-purple-250 font-black"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                      {liveFrequencyData.speakerLabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-150 font-semibold">
                    Danışan: <b className="font-mono">{liveFrequencyData?.clientTimeSec || finalFrequencySummary?.clientTimeSec || 0} sn</b>
                  </span>
                  <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded-md border border-purple-150 font-semibold">
                    DKT: <b className="font-mono">{liveFrequencyData?.therapistTimeSec || finalFrequencySummary?.therapistTimeSec || 0} sn</b> (Filtreleniyor)
                  </span>
                </div>
              </div>
            )}

            {/* RECORDING BUTTONS */}
            <div className="flex gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isAnalyzing}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs p-3 rounded-xl shadow-xs transition-all cursor-pointer select-none"
                >
                  <Mic className="w-4 h-4 stroke-[2.5]" />
                  Vokal Kaydı Başlat
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
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Veya Ses Dosyası Yükle</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
            )}

            {/* FILE UPLOADER */}
            {!isRecording && !audioUrl && (
              <label className="border border-dashed border-slate-250 hover:border-teal-400 hover:bg-teal-50/20 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-xs font-semibold text-slate-600">
                <Upload className="w-5 h-5 text-slate-450 mb-1" />
                <span className="text-[11px] font-bold text-slate-700 text-center">Laboratuvar Ses Dosyası (.wav, .mp3, .m4a)</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* AUDIO READY & TRIGGER BUTTON */}
            {audioUrl && (
              <div className="bg-teal-50 border border-teal-150 rounded-xl p-3 space-y-2.5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span className="flex items-center gap-1.5 truncate">
                    <FileAudio className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    {uploadedFileName ? uploadedFileName : "Vokal Ses Örneği Kaydedildi"}
                  </span>
                  <button
                    onClick={handleResetRecordState}
                    className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                    title="Seçimi Sıfırla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <audio src={audioUrl} controls className="w-full h-8 opacity-90" />

                <button
                  onClick={handlePerformAnalysis}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-tr from-teal-700 via-teal-600 to-cyan-600 hover:from-teal-800 hover:to-cyan-700 text-white font-bold text-xs p-3 rounded-xl shadow-md cursor-pointer select-none transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  Yapay Zeka Destekli Akustik Analizi Çalıştır
                </button>
              </div>
            )}
          </div>

          {/* HISTORY SESSIONS LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Geçmiş Ses Raporları ({historySessions.length})
                </h3>
              </div>
            </div>

            {historySessions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium">
                Henüz tamamlanmış ses analizi bulunmuyor.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {historySessions.map(sess => (
                  <button
                    key={sess.id}
                    onClick={() => setActiveSession(sess)}
                    className={`w-full flex items-center justify-between text-left p-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                      activeSession?.id === sess.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="truncate flex-1 pr-2">
                      <p className="font-bold truncate">{sess.clientName}</p>
                      <p className={`text-[9px] ${activeSession?.id === sess.id ? "text-slate-300" : "text-slate-450"}`}>
                        {new Date(sess.date).toLocaleDateString("tr-TR")} • F0: {sess.acousticParams.f0Mean} Hz • Jitter: %{sess.acousticParams.jitterLocal}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteHistorySession(sess.id, e)}
                      className={`p-1 rounded-md ${activeSession?.id === sess.id ? "text-slate-400 hover:text-rose-400" : "text-slate-400 hover:text-rose-600"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED ACOUSTIC CLINICAL REPORT */}
        <div className="lg:col-span-8">
          
          {/* RUNNING LOADER */}
          {isAnalyzing && (
            <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6 shadow-xs flex flex-col items-center justify-center min-h-[480px]">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                <HeartPulse className="w-6 h-6 text-teal-600 absolute animate-pulse" />
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-base font-bold text-slate-800">
                  Laringeal Akustik & Pertürbasyon Analizi Yapılıyor
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Temel frekans ($F_0$), Jitter, Shimmer, NHR, HNR ve CPPS (Kepstral Tepe Belirginliği) hesaplanıyor; GRBAS ve laringeal patoloji sınıflaması oluşturuluyor...
                </p>
              </div>

              <div className="bg-teal-50 border border-teal-150 text-teal-800 text-[10px] font-bold p-2 px-4 rounded-xl animate-pulse">
                PRAAT/MDVP algoritmaları ve Gemini yapay zeka klinik laringoloji modeli çalışıyor.
              </div>
            </div>
          )}

          {/* EMPTY INTRO PLACEHOLDER */}
          {!isAnalyzing && !activeSession && (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center h-full flex flex-col justify-center items-center min-h-[480px] space-y-6">
              <div className="w-16 h-16 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center text-teal-600">
                <Activity className="w-8 h-8 stroke-[1.8]" />
              </div>

              <div className="space-y-2 max-w-lg">
                <h3 className="text-base font-bold text-slate-800">
                  Klinik Ses Bozuklukları ve Akustik Değerlendirme
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Sol panelden bir danışan seçiniz, vokal fonasyon (örn: /a/ uzatma) veya okuma pasajı kaydı alınız. Sistem; <b>Jitter, Shimmer, NHR, HNR, F0, CPPS, DSI, MPT</b> ve <b>GRBAS</b> algısal derecelendirmesini otomatik olarak çıkarıp laringeal klinik rapor hazırlayacaktır.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl text-left text-[11px]">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-teal-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Jitter & Shimmer
                  </span>
                  <p className="text-slate-500 text-[10px]">Periyotlar arası frekans ve genlik pertürbasyonu (pürüzlülük ve nefeslilik ölçümü).</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-teal-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> CPPS (Kepstral Tepe)
                  </span>
                  <p className="text-slate-500 text-[10px]">Disfoninin en modern altın standart göstergesi; sürekli konuşmada da yüksek güvenilirlik.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-teal-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> NHR & HNR Oranları
                  </span>
                  <p className="text-slate-500 text-[10px]">Gürültü ve harmonik oranları ile vokal kord kapanma kaçağının tespiti.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-teal-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> GRBAS Algısal Skalası
                  </span>
                  <p className="text-slate-500 text-[10px]">Grade, Roughness, Breathiness, Asthenia, Strain derecelendirmesi ve terapi planı.</p>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE COMPLETED CLINICAL VOICE REPORT */}
          {!isAnalyzing && activeSession && (
            <div className="space-y-5 print:space-y-0">
              
              {/* TOP ACTION BAR */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 print:hidden shadow-3xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">GÖRÜNTÜLENEN RAPOR:</span>
                  <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2 mt-0.5">
                    {activeSession.clientName}
                    <span className="bg-teal-50 text-teal-700 text-[9px] p-0.5 px-2 rounded-md font-bold border border-teal-200 uppercase">
                      Ses Analiz Raporu
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      activeSession.severity === "Normal Ses" 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250"
                        : "bg-rose-50 text-rose-700 border-rose-250"
                    }`}>
                      {activeSession.severity}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReportToClipboard}
                    className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 p-2 px-3.5 rounded-xl font-bold text-xs cursor-pointer transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        Kopyalandı!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        Metni Kopyala
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white p-2 px-4 rounded-xl font-bold text-xs cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    Raporu Yazdır (PDF)
                  </button>
                </div>
              </div>

              {/* MAIN PRINTABLE EVALUATION SHEET */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative print:border-none print:p-0 print:shadow-none space-y-6">
                
                {/* REPORT HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dashed border-slate-200 print:border-solid">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                      <HeartPulse className="w-5 h-5 text-teal-100" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-800 tracking-tight">
                        Klinik Akustik Ses Analizi ve Disfoni Raporu
                      </h2>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Dil ve Konuşma Terapisi Laringeal Fonasyon Değerlendirmesi
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs">
                    <p className="font-bold text-slate-800">ID: DKT-[SES]-{activeSession.id.substring(6, 13).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Tarih: {new Date(activeSession.date).toLocaleString("tr-TR")}</p>
                    <p className="text-[9px] text-teal-600 font-bold mt-0.5">Model: {activeSession.modelUsed}</p>
                  </div>
                </div>

                {/* SPEAKER SEPARATION & FREQUENCY AUDIT CARD */}
                {activeSession.speakerSeparation && (
                  <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white rounded-xl p-4 border border-teal-700/60 shadow-3xs print:bg-white print:text-slate-900 print:border-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800/50 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 print:bg-slate-100 print:text-slate-700">
                          <AudioLines className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-teal-100 print:text-slate-800">
                            Akustik Frekans & DKT Konuşmacı Ayrıştırması
                          </h4>
                          <p className="text-[10px] text-teal-300 print:text-slate-500">
                            DKT yönergeleri ve dış sesler frekans analiziyle filtrelenmiş; pertürbasyon ve kepstral analiz hedef danışan sesine odaklanmıştır.
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:bg-emerald-50 print:text-emerald-800">
                        ✓ DKT Sesi Filtrelendi
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-teal-300 block mb-0.5 print:text-slate-500">Konuşmacı Tespiti</span>
                        <span className="font-bold text-white print:text-slate-800">
                          {activeSession.speakerSeparation.detectedSpeakers || 1} Konuşmacı
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-teal-300 block mb-0.5 print:text-slate-500">Danışan Ses Aralığı</span>
                        <span className="font-bold text-emerald-300 print:text-emerald-700">
                          {activeSession.speakerSeparation.clientFrequencyRange || "180 - 240 Hz"}
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-teal-300 block mb-0.5 print:text-slate-500">Farklı Frekans (DKT)</span>
                        <span className="font-bold text-purple-300 print:text-purple-700">
                          {activeSession.speakerSeparation.therapistFrequencyRange || "110 - 180 Hz"}
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[9px] uppercase font-bold text-teal-300 block mb-0.5 print:text-slate-500">DKT Süresi</span>
                        <span className="font-bold text-amber-300 print:text-amber-700">
                          {activeSession.speakerSeparation.therapistSpeechDurationSec ? `${activeSession.speakerSeparation.therapistSpeechDurationSec} sn (Ölçüm Dışı)` : "Filtrelendi"}
                        </span>
                      </div>
                    </div>

                    {activeSession.speakerSeparation.clinicalNote && (
                      <div className="mt-2 text-[10px] text-teal-200/90 print:text-slate-600 bg-white/5 p-2 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
                        <b>Klinik Not:</b> {activeSession.speakerSeparation.clinicalNote}
                      </div>
                    )}
                  </div>
                )}

                {/* DIAGNOSTIC HIGHLIGHT BANNER */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  activeSession.severity === "Normal Ses"
                    ? "bg-emerald-50/70 border-emerald-250 text-emerald-950"
                    : "bg-rose-50/70 border-rose-250 text-rose-950"
                }`}>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Ön Tanısal Şüphe & Laringeal Değerlendirme
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {activeSession.suspectedPathology}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">
                      Şiddet Seviyesi: <b>{activeSession.severity}</b> • Görev: {activeSession.taskType === "sustained_vowel" ? `Sürdürülen ${activeSession.vowelSound || "/a/"}` : "Sürekli Konuşma"}
                    </p>
                  </div>

                  {activeSession.stroboscopyNeeded && (
                    <div className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-center">
                      <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <span>KBB Videolaringostroboskopi Sevk Önerilir</span>
                    </div>
                  )}
                </div>

                {/* CPPS HIGHLIGHT CARD (THE MODERN GOLD-STANDARD) */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-200/60 px-2 py-0.5 rounded-md">
                        ALTIN STANDART KEPSTRAL PARAMETRE
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold">CPPS (Cepstral Peak Prominence Smoothed)</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Modern ses kliniğinde gürültüye dayanıklı, nefeslilik ve disfoniyi en yüksek doğrulukla öngören kanıta dayalı parametre.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-2.5xl font-black font-mono text-teal-900">
                        {activeSession.acousticParams.cpps} dB
                      </span>
                      <span className="block text-[9px] text-slate-500 font-bold">
                        Norm: &gt; 10.0 dB (Vokal) / &gt; 4.5 dB (Konuşma)
                      </span>
                    </div>
                    {getBadgeForParam("cpps", activeSession.acousticParams.cpps)}
                  </div>
                </div>

                {/* ACOUSTIC PARAMETERS GRID */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-teal-600 rounded-full" />
                    Objektif Akustik Pertürbasyon ve Aerodinamik Göstergeler
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    
                    {/* F0 MEAN */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">F0 (Temel Frekans)</span>
                        {getBadgeForParam("f0", activeSession.acousticParams.f0Mean)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.f0Mean}</span>
                        <span className="text-[10px] text-slate-500 font-bold">Hz</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Min: {activeSession.acousticParams.f0Min} • Max: {activeSession.acousticParams.f0Max} Hz (SD: {activeSession.acousticParams.f0Std})
                      </span>
                    </div>

                    {/* JITTER LOCAL */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Jitter (Local)</span>
                        {getBadgeForParam("jitterLocal", activeSession.acousticParams.jitterLocal)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">%{activeSession.acousticParams.jitterLocal}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Klinik Norm: &lt; 1.04 % (Frekans Pertürbasyonu)
                      </span>
                    </div>

                    {/* SHIMMER LOCAL */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Shimmer (Local)</span>
                        {getBadgeForParam("shimmerLocal", activeSession.acousticParams.shimmerLocal)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">%{activeSession.acousticParams.shimmerLocal}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Klinik Norm: &lt; 3.81 % (Genlik Pertürbasyonu)
                      </span>
                    </div>

                    {/* NHR */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">NHR (Gürültü/Uyum)</span>
                        {getBadgeForParam("nhr", activeSession.acousticParams.nhr)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.nhr}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Klinik Norm: &lt; 0.19 (Glottal Kaçak)
                      </span>
                    </div>

                    {/* HNR */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">HNR (Harmonik/Gürültü)</span>
                        {getBadgeForParam("hnr", activeSession.acousticParams.hnr)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.hnr}</span>
                        <span className="text-[10px] text-slate-500 font-bold">dB</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Klinik Norm: &gt; 20.0 dB (Berrak Ses)
                      </span>
                    </div>

                    {/* SHIMMER DB */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Shimmer (dB)</span>
                        {getBadgeForParam("shimmerDb", activeSession.acousticParams.shimmerDb)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.shimmerDb}</span>
                        <span className="text-[10px] text-slate-500 font-bold">dB</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Klinik Norm: &lt; 0.35 dB
                      </span>
                    </div>

                    {/* DSI */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">DSI (Disfoni İndeksi)</span>
                        {getBadgeForParam("dsi", activeSession.acousticParams.dsi)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.dsi}</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Norm: +1.6 ile +5.0 arası
                      </span>
                    </div>

                    {/* MPT */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">MPT (Maks Fonasyon)</span>
                        {getBadgeForParam("mpt", activeSession.acousticParams.mpt)}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-mono font-black text-slate-850">{activeSession.acousticParams.mpt}</span>
                        <span className="text-[10px] text-slate-500 font-bold">sn</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        Aerodinamik Kapasite
                      </span>
                    </div>

                  </div>
                </div>

                {/* DETAILED PERTURBATION TABLE (RAP, PPQ5, APQ3, APQ5, S/Z) */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5 px-3">Gelişmiş Pertürbasyon Parametresi</th>
                        <th className="p-2.5 px-3">Ölçülen Değer</th>
                        <th className="p-2.5 px-3">Klinik Referans Norm</th>
                        <th className="p-2.5 px-3">Klinik Tanımı</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-2.5 px-3 font-bold text-slate-800">Jitter (RAP)</td>
                        <td className="p-2.5 px-3 font-mono font-bold text-teal-700">%{activeSession.acousticParams.jitterRap}</td>
                        <td className="p-2.5 px-3 text-slate-500">&lt; 0.68 %</td>
                        <td className="p-2.5 px-3 text-slate-600">3 periyotluk ortalamadan frekans sapması</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 px-3 font-bold text-slate-800">Jitter (PPQ5)</td>
                        <td className="p-2.5 px-3 font-mono font-bold text-teal-700">%{activeSession.acousticParams.jitterPpq5}</td>
                        <td className="p-2.5 px-3 text-slate-500">&lt; 0.84 %</td>
                        <td className="p-2.5 px-3 text-slate-600">5 periyotluk düzleştirilmiş periyot pertürbasyon katsayısı</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 px-3 font-bold text-slate-800">Shimmer (APQ3)</td>
                        <td className="p-2.5 px-3 font-mono font-bold text-teal-700">%{activeSession.acousticParams.shimmerApq3}</td>
                        <td className="p-2.5 px-3 text-slate-500">&lt; 3.00 %</td>
                        <td className="p-2.5 px-3 text-slate-600">3 periyotluk genlik pertürbasyon katsayısı</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 px-3 font-bold text-slate-800">Shimmer (APQ5)</td>
                        <td className="p-2.5 px-3 font-mono font-bold text-teal-700">%{activeSession.acousticParams.shimmerApq5}</td>
                        <td className="p-2.5 px-3 text-slate-500">&lt; 3.07 %</td>
                        <td className="p-2.5 px-3 text-slate-600">5 periyotluk genlik pertürbasyon katsayısı</td>
                      </tr>
                      {activeSession.acousticParams.szRatio && (
                        <tr>
                          <td className="p-2.5 px-3 font-bold text-slate-800">s/z Oranı</td>
                          <td className="p-2.5 px-3 font-mono font-bold text-teal-700">{activeSession.acousticParams.szRatio}</td>
                          <td className="p-2.5 px-3 text-slate-500">1.00 - 1.40</td>
                          <td className="p-2.5 px-3 text-slate-600">&gt; 1.40 vokal kord patolojisi (nodül/polip) şüphesi</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* GRBAS AUDITORY-PERCEPTUAL RATING CARD */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-teal-600" />
                      GRBAS Algısal Ses Derecelendirme Skalası (Japonya Foniatri Cemiyeti)
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold">0 = Normal, 1 = Hafif, 2 = Orta, 3 = Ağır</span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">G (Grade - Derece)</span>
                      <span className="text-xl font-mono font-black text-slate-850">{activeSession.grbas.g}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">R (Roughness - Pürüz)</span>
                      <span className="text-xl font-mono font-black text-teal-700">{activeSession.grbas.r}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">B (Breathiness - Nefes)</span>
                      <span className="text-xl font-mono font-black text-teal-700">{activeSession.grbas.b}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">A (Asthenia - Güçsüzlük)</span>
                      <span className="text-xl font-mono font-black text-slate-850">{activeSession.grbas.a}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-3xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">S (Strain - Gerginlik)</span>
                      <span className="text-xl font-mono font-black text-purple-700">{activeSession.grbas.s}</span>
                    </div>
                  </div>

                  {activeSession.grbas.justification && (
                    <p className="text-[11px] text-slate-600 font-medium italic bg-white p-2.5 rounded-xl border border-slate-200">
                      <b>Algısal Gerekçe:</b> {activeSession.grbas.justification}
                    </p>
                  )}
                </div>

                {/* CLINICAL EVALUATION & RECOMMENDATIONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CLINICAL SUMMARY */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      Klinik Akustik Sentez
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {activeSession.clinicalEvaluation}
                    </p>
                  </div>

                  {/* THERAPY RECOMMENDATIONS */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      Kanıta Dayalı DKT Ses Terapisi Planı
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                      {activeSession.therapyRecommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* CLIENT MANAGER MODAL */}
      <ClientManagerModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={clients}
        onAddClient={onAddClient}
        onDeleteClient={onDeleteClient}
        onSelectClient={(id) => setSelectedClientId(id)}
        initialTab={clientModalInitialTab}
        selectedClientId={selectedClientId}
        titleContext="Ses Bozuklukları (Disfoni) Modülü"
      />

    </div>
  );
}
