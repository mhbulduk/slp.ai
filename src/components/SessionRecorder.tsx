import { useState, useRef, useEffect, ChangeEvent } from "react";
import { Client, StutterStats } from "../types";
import { 
  Mic, Square, Trash2, Upload, Send, Sparkles, AlertCircle, FileAudio, 
  UserPlus, Activity, Volume2, ShieldCheck, Check, Settings2, 
  SlidersHorizontal, Info, MicOff, RefreshCw, AudioLines, Users
} from "lucide-react";
import ClientManagerModal from "./ClientManagerModal";
import { 
  startLiveFrequencyTracker, 
  AudioFrequencyTracker, 
  FrequencyAnalysisResult, 
  PitchProfile 
} from "../utils/audioFrequencyAnalyzer";

interface SessionRecorderProps {
  clients: Client[];
  currentUserEmail?: string;
  onAnalysisComplete: (result: {
    clientId: string;
    clientName: string;
    type: "Reading" | "Conversation" | "Monologue" | "Other";
    duration: number;
    stats: StutterStats;
    severity: "Hafif" | "Orta" | "Şiddetli" | "Çok Şiddetli";
    isManual: boolean;
    notes: string;
    transcription: string;
    analysisDetails: string;
    recommendations: string[];
    isSimulated?: boolean;
    speakerSeparation?: any;
  }) => void;
  onAddClient?: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient?: (id: string) => void;
}

export default function SessionRecorder({ 
  clients, 
  currentUserEmail,
  onAnalysisComplete,
  onAddClient,
  onDeleteClient
}: SessionRecorderProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sessionType, setSessionType] = useState<"Reading" | "Conversation" | "Monologue" | "Other">("Conversation");
  const [isSimulatedMode, setIsSimulatedMode] = useState<boolean>(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string>("");

  // Client Manager Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientModalTab, setClientModalTab] = useState<"list" | "add">("list");

  // Speaker Diarization & Frequency Analyzer State
  const [speakerSeparationEnabled, setSpeakerSeparationEnabled] = useState<boolean>(true);
  const [pitchProfile, setPitchProfile] = useState<PitchProfile>("child");
  const [showFrequencySettings, setShowFrequencySettings] = useState<boolean>(false);
  const [liveFrequencyData, setLiveFrequencyData] = useState<FrequencyAnalysisResult | null>(null);
  const [finalFrequencySummary, setFinalFrequencySummary] = useState<FrequencyAnalysisResult | null>(null);
  const frequencyTrackerRef = useRef<AudioFrequencyTracker | null>(null);

  const standardPrompts = [
    {
      id: "ruzyar",
      title: "Rüzgar ile Güneş (OMÜ Standart Okuma Pasajı)",
      type: "Reading" as const,
      description: "Okul çağı ve yetişkin akıcılık taramaları için standart hece ölçümlü klinik okuma pasajı.",
      target: "Yetişkinler ve okul çağı çocuklarda spontan hızı ve çekirdek davranışları (uzatma, tekrar, blok) kontrol etmeye uygundur (Yaklaşık 210 Hece).",
      text: "Kuzey Rüzgârı ile Güneş, hangisinin daha güçlü olduğu konusunda tartışıyorlarmış. O sırada, sırtına kalın bir palto geçirmiş bir yolcunun yaklaştığını görmüşler. Yolcunun paltosunu sırtından ilk çıkaranın daha güçlü olduğunu kabul etmişler. Kuzey Rüzgârı bütün gücüyle esmeye başlamış. Ama o estikçe yolcu paltosuna daha da sıkı sarılmış. Sonunda rüzgâr vazgeçmiş. Sonra Güneş sıcacık parlamış ve yolcu hemen paltosunu çıkarmış. Böylece Kuzey Rüzgârı, Güneş'in kendisinden daha güçlü olduğunu kabul etmek zorunda kalmış."
    },
    {
      id: "kedi",
      title: "Mila ve Yavru Kedi Tarçın (Çocuklar İçin Spontan Resim Anlatımı)",
      type: "Monologue" as const,
      description: "Çocukların dil becerilerini, hızını ve akıcısızlık sıklığını ölçmek için geliştirilmiş hikaye tamamlama prompTu.",
      target: "Okul öncesi veya küçük yaşta çocukların spontan konuşma akışını ve heceleme yapılarını (SLD'ler) incelemeye uygundur.",
      text: "Mila o gün bahçede oynarken çalıların arasından küçük bir miyavlama sesi duydu. Yaklaştığında turuncu ve ıslanmış bir yavru kedi gördü. Kedicik çok korkmuştu ve bir çorba kasesi büyüklüğündeydi. Mila hemen kediciğe yaklaştı ve..."
    },
    {
      id: "funneling",
      title: "Conture (2001) İletişimsel Stres & Soru Taraması (Huni Tekniği)",
      type: "Conversation" as const,
      description: "Açık uçlu sorulardan başlayarak zaman baskısı yaratan tekerlemelere kadar giden funneling (huni) taraması.",
      target: "İletişimsel baskı anındaki vokal kord kilitlenmelerini, kaçma/kaçınma ikincil tepkilerinin ortaya çıkışını saptar.",
      text: "1. 'Bugün buraya gelirken dışarıda neler gördün? Detaylıca anlatır mısın?' (Geniş Açık)\n2. 'En sevdiğin oyunlardan birini nasıl oynadığınızı tarif et.' (Orta Açık)\n3. 'Klinisyen: Şimdi şu tekerlemeyi benimle çok hızlı tekrar etmeni istiyorum: Kartal kalkar dal sarkar, dal sarkar kartal kalkar!' (Akran/Zaman Baskısı)"
    }
  ];

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simple waveform data state for visualizer
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(24).fill(4));

  // Handle record timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        // Push random heights for waveform animation while recording
        setWaveformBars(prev => prev.map(() => Math.floor(Math.random() * 20) + 4));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setWaveformBars(Array(24).fill(4));
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
          } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
            mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/ogg" });
            recordedMimeType = "audio/ogg";
          } else {
            mediaRecorder = new MediaRecorder(stream);
            recordedMimeType = mediaRecorder.mimeType || "audio/webm";
          }
        } else {
          mediaRecorder = new MediaRecorder(stream);
          recordedMimeType = mediaRecorder.mimeType || "audio/webm";
        }
      } catch (mimeErr) {
        console.warn("MimeType seçimi başarısız, standart MediaRecorder oluşturuluyor:", mimeErr);
        mediaRecorder = new MediaRecorder(stream);
        recordedMimeType = mediaRecorder.mimeType || "audio/webm";
      }
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
 
      mediaRecorder.onstop = () => {
        const joinedBlob = new Blob(chunksRef.current, { type: recordedMimeType });
        const url = URL.createObjectURL(joinedBlob);
        setAudioBlob(joinedBlob);
        setAudioUrl(url);
 
        // Stop frequency analyzer and capture final summary
        if (frequencyTrackerRef.current) {
          const summary = frequencyTrackerRef.current.stop();
          setFinalFrequencySummary(summary);
          frequencyTrackerRef.current = null;
        }

        // Turn off stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setAnalysisError(null);
    } catch (err: any) {
      console.error("Mikrofon erişim hatası:", err);
      setAnalysisError("Mikrofonunuza erişilemedi. Lütfen izinlerinizi kontrol edin veya ses dosyası yükleme yöntemini deneyin.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);
    setLiveFrequencyData(null);
    setFinalFrequencySummary(null);

    setUploadedFileName(file.name);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
  };

  const handleDeleteRecording = () => {
    if (frequencyTrackerRef.current) {
      frequencyTrackerRef.current.stop();
      frequencyTrackerRef.current = null;
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadedFileName(null);
    setRecordingSeconds(0);
    setLiveFrequencyData(null);
    setFinalFrequencySummary(null);
    setAnalysisError(null);
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("FileReader reading failed."));
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleSendToAnalysis = async () => {
    if (!selectedClientId) {
      setAnalysisError("Lütfen analizin yapılacağı danışanı seçin.");
      return;
    }
    if (!audioBlob) {
      setAnalysisError("Lütfen önce ses kaydedin ya da bir ses dosyası yükleyin.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const clientName = clients.find(c => c.id === selectedClientId)?.name || "Bilinmiyor";

      const payload = {
        audioData: base64Audio,
        mimeType: audioBlob.type || "audio/webm",
        clientName,
        sessionType,
        simulationMode: isSimulatedMode,
        selectedPromptId,
        clientPitchProfile: pitchProfile,
        speakerSeparationEnabled,
        liveFrequencySummary: finalFrequencySummary || liveFrequencyData
      };

      const response = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUserEmail || ""
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Sunucu ses analizini gerçekleştiremedi.");
      }

      const result = await response.json();

      onAnalysisComplete({
        clientId: selectedClientId,
        clientName,
        type: sessionType,
        duration: recordingSeconds || 45,
        stats: result.stats,
        severity: result.severity,
        isManual: false,
        notes: `[Yapay Zeka Raporu] ${result.isSimulated ? "Simülasyon" : (result.modelUsed || "Gelişmiş Gemini 3.1 Pro (Düşünme Modu)")} modeli ile analiz edilmiştir.`,
        transcription: result.transcription,
        analysisDetails: result.analysisDetails,
        recommendations: result.recommendations,
        isSimulated: result.isSimulated,
        speakerSeparation: result.speakerSeparation || finalFrequencySummary
      });

      // Reset
      handleDeleteRecording();

    } catch (err: any) {
      console.error("Analysis execution failed:", err);
      setAnalysisError(err.message || "Bilinmeyen bir ses analizi hatası oluştu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
      
      {/* HEADER: CLIENT & SESSION CONFIGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-150">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Danışan Seçin *
            </label>
            {onAddClient && (
              <button
                type="button"
                onClick={() => {
                  setClientModalTab("add");
                  setIsClientModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                title="Yeni Danışan Ekle veya Listeyi Düzenle"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Danışan Ekle / Yönet
              </button>
            )}
          </div>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold transition-all cursor-pointer"
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
            className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold transition-all cursor-pointer"
          >
            <option value="Conversation">Karşılıklı Sohbet (Serbest)</option>
            <option value="Reading">Okuma Pasajı Çalışması</option>
            <option value="Monologue">Yapılandırılmış Monolog</option>
            <option value="Other">Diğer Konuşma Seansları</option>
          </select>
        </div>
      </div>

      {/* DKT & SPEAKER FREQUENCY SEPARATION (DIARIZATION) CONTROL CARD */}
      <div className="bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50 rounded-2xl border border-indigo-150/70 p-4.5 flex flex-col gap-3 shadow-3xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <AudioLines className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-850 tracking-tight">
                  Akustik Frekans & Konuşmacı Ayrıştırma (Speaker Diarization)
                </h3>
                <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  DKT / Terapist Sesi Filtresi
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-tight font-medium">
                Ölçüm sırasında farklı bir frekansta duyulan DKT yönergelerini ve dış sesleri algılar; hece sayımı ve kekemelik analizinden izole eder.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFrequencySettings(!showFrequencySettings)}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-250 shadow-3xs transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showFrequencySettings ? "Ayarları Gizle" : "Frekans Ayarları"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSpeakerSeparationEnabled(!speakerSeparationEnabled)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                speakerSeparationEnabled
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  : "bg-slate-100 text-slate-500 border-slate-250"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{speakerSeparationEnabled ? "Filtre Aktif" : "Filtre Kapalı"}</span>
            </button>
          </div>
        </div>

        {/* FREQUENCY SETTINGS DROPDOWN / EXPANDABLE */}
        {showFrequencySettings && (
          <div className="bg-white rounded-xl border border-indigo-150 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPitchProfile("child")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pitchProfile === "child"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-indigo-600">Önerilen (Pediatrik)</span>
                <span className="text-xs font-bold text-slate-800 mt-1">🧒 Çocuk Danışan</span>
                <span className="text-[10px] text-slate-500 mt-0.5">225 - 450 Hz (DKT Yetişkin Sesini İzolasyon: 90-215 Hz)</span>
              </button>

              <button
                type="button"
                onClick={() => setPitchProfile("female_adult")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pitchProfile === "female_adult"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-purple-600">Yetişkin / Genç</span>
                <span className="text-xs font-bold text-slate-800 mt-1">👩 Kadın Danışan</span>
                <span className="text-[10px] text-slate-500 mt-0.5">165 - 275 Hz (Erkek DKT veya Düşük Ton Filtreleme)</span>
              </button>

              <button
                type="button"
                onClick={() => setPitchProfile("male_adult")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pitchProfile === "male_adult"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-emerald-600">Yetişkin</span>
                <span className="text-xs font-bold text-slate-800 mt-1">👨 Erkek Danışan</span>
                <span className="text-[10px] text-slate-500 mt-0.5">85 - 165 Hz (Kadın DKT veya Tiz Ton Filtreleme)</span>
              </button>

              <button
                type="button"
                onClick={() => setPitchProfile("auto")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  pitchProfile === "auto"
                    ? "bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-amber-600">Dinamik</span>
                <span className="text-xs font-bold text-slate-800 mt-1">⚡ Otomatik Ayrıştırma</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Çift tepe (Harmonik kümeleme) ile canlı kalibrasyon</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <b>Klinik İlke:</b> Ölçüm yapılırken klinisyenin yönergeleri (örneğin <i>'şimdi şu tekerlemeyi söyle'</i> veya <i>'aferin'</i>) farklı bir frekans aralığında ortaya çıktığında yapay zeka tarafından tespit edilir ve danışanın hece istatistiklerine veya kekemelik puanına etki etmesi engellenir.
              </span>
            </div>
          </div>
        )}

        {/* LIVE FREQUENCY READING BADGES (DURING / AFTER RECORDING) */}
        {(isRecording || finalFrequencySummary) && (
          <div className="bg-white rounded-xl border border-indigo-150/90 p-3 flex flex-wrap items-center justify-between gap-3 shadow-3xs animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    liveFrequencyData?.activeSpeaker === "client" ? "bg-emerald-400" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-400" : "bg-slate-300"
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    liveFrequencyData?.activeSpeaker === "client" ? "bg-emerald-500" : liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-600" : "bg-slate-400"
                  }`} />
                </span>
                
                <span className="text-xs font-extrabold text-slate-800">
                  {isRecording ? (
                    liveFrequencyData?.currentPitchHz && liveFrequencyData.currentPitchHz > 0 ? (
                      `Canlı Frekans: ${liveFrequencyData.currentPitchHz} Hz`
                    ) : (
                      "Ses Dinleniyor..."
                    )
                  ) : (
                    "Akustik Frekans Ayrıştırma Tamamlandı"
                  )}
                </span>
              </div>

              {/* Status Pill */}
              {isRecording && liveFrequencyData && (
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                  liveFrequencyData.activeSpeaker === "client"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-250 animate-pulse"
                    : liveFrequencyData.activeSpeaker === "therapist"
                    ? "bg-purple-50 text-purple-800 border-purple-250 font-black animate-bounce"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {liveFrequencyData.speakerLabel}
                </span>
              )}
            </div>

            {/* Speaking Time Counters */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-150 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Danışan Sesi:</span>
                <b className="font-mono">{liveFrequencyData?.clientTimeSec || finalFrequencySummary?.clientTimeSec || 0} sn</b>
              </div>

              <div className="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-150 font-semibold">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                <span>DKT / 2. Ses:</span>
                <b className="font-mono">{liveFrequencyData?.therapistTimeSec || finalFrequencySummary?.therapistTimeSec || 0} sn</b>
                <span className="text-[9px] bg-purple-200 text-purple-900 px-1 rounded font-bold">Filtreleniyor</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STANDARD FLUENCY SCREENING PROMPTS SECTION */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              Standart Akıcılık & Kekemelik Tarama Protokolü
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Klinik Değerlendirme Metinleri
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Danışana canlı tarama yaptırmak için aşağıdaki standart klinik konuşma/okuma örneklerinden birini seçebilirsiniz. Seçilen metne göre yapay zeka analiz şablonları otomatik olarak optimize edilir.
          </p>
        </div>

        {/* PROMPTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedPromptId("");
            }}
            className={`border p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedPromptId === ""
                ? "bg-white border-slate-300 ring-2 ring-slate-100 shadow-3xs"
                : "bg-slate-50/50 hover:bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Serbest Mod</span>
              <h4 className="text-xs font-bold text-slate-800">Genel Sohbet / Dış Kayıt</h4>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                Kendi metniniz veya serbest sohbet kaydı üzerinden analiz yapın.
              </p>
            </div>
          </button>

          {standardPrompts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedPromptId(p.id);
                setSessionType(p.type);
              }}
              className={`border p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedPromptId === p.id
                  ? "bg-white border-indigo-600 ring-2 ring-indigo-100 shadow-3xs"
                  : "bg-slate-50/50 hover:bg-white border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div>
                <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">
                  {p.type === "Reading" ? "Okuma Pasajı" : p.type === "Monologue" ? "Monolog / Anlatım" : "Soru-Cevap Taraması"}
                </span>
                <h4 className="text-xs font-bold text-slate-800">{p.title}</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">{p.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* SELECTED PROMPT CARD SHOWING METIN */}
        {selectedPromptId && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping absolute" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 relative inline-block" />
              Müşteriye Gösterilecek / Okutulacak Canlı Tarama Metni
            </h4>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 max-h-[160px] overflow-y-auto mb-2.5 shadow-inner">
              <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-line font-serif tracking-wide">
                {standardPrompts.find((p) => p.id === selectedPromptId)?.text}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-indigo-850 bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-100/60 leading-normal font-semibold">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <b className="font-bold">Klinik Hedef:</b> {standardPrompts.find((p) => p.id === selectedPromptId)?.target}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ERROR CORNER */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-900 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">{analysisError}</div>
        </div>
      )}

      {/* CORE PANEL: SOUND RECORDER & AUDIO CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center min-h-[180px]">
        
        {/* Visualizer & Recorder */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden min-h-[180px]">
          {/* Active Audio Filter Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-50/90 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-150 shadow-3xs z-10 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Akustik Frekans Filtresi Açık
          </div>

          {isRecording ? (
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Pulsing Waveform Visualizer */}
              <div className="flex items-end justify-center gap-1.5 h-14 w-full px-6">
                {waveformBars.map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}px` }}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      liveFrequencyData?.activeSpeaker === "therapist" 
                        ? "bg-purple-600" 
                        : "bg-rose-500"
                    }`}
                  />
                ))}
              </div>
              
              <div className="text-center">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse ${
                  liveFrequencyData?.activeSpeaker === "therapist"
                    ? "bg-purple-100 text-purple-900"
                    : "bg-rose-100 text-rose-800"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    liveFrequencyData?.activeSpeaker === "therapist" ? "bg-purple-600" : "bg-rose-600"
                  }`} />
                  {liveFrequencyData?.activeSpeaker === "therapist" 
                    ? "DKT / 2. KONUŞMACI SESİ ALGILANDI (İZOLE EDİLİYOR)" 
                    : "SES KAYDEDİLİYOR"}
                </span>
                <span className="block text-lg font-mono font-bold text-slate-800 mt-1">
                  {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:
                  {(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>

              <button
                type="button"
                onClick={handleStopRecording}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-full p-4 shadow-md transition-all scale-105 active:scale-95 cursor-pointer"
                title="Kaydı Tamamla"
              >
                <Square className="w-5 h-5 fill-white" />
              </button>
            </div>
          ) : audioUrl ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-1 shadow-md">
                <FileAudio className="w-6 h-6 animate-bounce" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {uploadedFileName ? `Yüklenen Dosya: ${uploadedFileName}` : "Ses Kaydı Başarıyla Alındı!"}
              </p>
              
              {/* Real Audio Playback node */}
              <audio src={audioUrl} controls className="w-full max-w-xs mt-1" />

              <button
                type="button"
                onClick={handleDeleteRecording}
                className="mt-2 text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Kaydı Sil ve Sıfırla
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-120 shadow-xs">
                <Mic className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800">Ses Kaydı Başlat</p>
                <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto mt-1 leading-normal font-medium">
                  Danışanın okuduğu veya konuştuğu anlarda mikrofonunuzu açarak sesi doğrudan analiz için kaydedebilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartRecording}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-md transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer"
                title="Canlı Mikrofon Kaydı Başlat"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Upload Audio File fallback */}
        <div className="flex flex-col justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl border-dashed min-h-[180px]">
          <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
            <Upload className="w-4 h-4 text-indigo-600" />
            Harici Ses Dosyası Yükleyin
          </h4>
          <p className="text-[11px] text-slate-500 mb-4 leading-normal font-medium">
            Daha önce klinikte akıllı telefonunuz, ses cihazınız veya kayıt sisteminiz ile kaydettiğiniz ses dosyalarını (.mp3, .wav, .m4a vb.) yükleyip analiz edebilirsiniz.
          </p>

          <label className="border border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-800 rounded-xl p-3 text-center text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-3xs">
            <Upload className="w-4 h-4" />
            Dosya Seç veya Buraya Sürükle
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* AI PROCESSING LOADER */}
      {isAnalyzing ? (
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-150 flex flex-col items-center justify-center gap-4 text-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
            <Sparkles className="w-5 h-5 text-indigo-600 absolute top-3.5 left-3.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-indigo-900 uppercase tracking-widest animate-pulse">Yapay Zeka Ses Kaydını İnceliyor...</h4>
            <p className="text-[11px] text-indigo-750 max-w-sm mt-1.5 leading-relaxed font-semibold">
              {isSimulatedMode 
                ? "Simülasyon motoru ses hecelerini, süreyi ve kekemelik biçimlerini (blok, tekrar, uzatma) heceleyerek klinik rapor hazırlıyor..."
                : "Gelişmiş Gemini 3.1 Pro (Düşünme Modu) derin akustik motoru ses dalgalarındaki anomalileri inceliyor, DKT yönergelerini frekans farkıyla ayıklıyor."
              }
            </p>
          </div>
        </div>
      ) : (
        audioBlob && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleDeleteRecording}
              className="bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              İptal Et
            </button>
            <button
              type="button"
              onClick={handleSendToAnalysis}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              Yapay Zeka Analizini Başlat
            </button>
          </div>
        )
      )}

      {/* EDUCATIONAL DISCLAIMER */}
      <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex gap-2.5 text-indigo-800">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed font-medium">
          <strong className="font-bold">Gelişmiş Akustik Analiz & Frekans Ayrıştırma:</strong> Konuşma ses dalgaları, fonetik tonlama özellikleri, plosif patlamalardaki kilitlenme milisaniyeleri (Blok), hece/ses tabanlı sarsıntılı yinelemeler (Tekrar) ve ses tellerindeki gergin uzantılar (Uzatma) incelenir. DKT'nin farklı frekanstaki sesleri akustik filtre ile ayrıştırılır.
        </div>
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
          titleContext="Akıcılık & Ses Analizi"
        />
      )}
    </div>
  );
}
