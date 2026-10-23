export interface Client {
  id: string;
  name: string;
  age: number;
  notes?: string;
  createdAt: string;
  parentName?: string; // Optional for pediatric cases
}

export interface StutterStats {
  totalSyllables: number;
  blocks: number;
  repetitions: number;
  prolongations: number;
  totalDisfluencies: number;
  percentSS: number; // Percent Syllables Stuttered %SS = (totalDisfluencies / totalSyllables) * 100
}

export interface SpeakerSeparationInfo {
  detectedSpeakers: number; // e.g. 1 or 2
  therapistVoiceDetected: boolean;
  therapistFrequencyRange?: string; // e.g. "90 - 215 Hz (DKT / Yetişkin)"
  clientFrequencyRange?: string; // e.g. "240 - 420 Hz (Danışan Çocuk)"
  clientSpeechDurationSec?: number;
  therapistSpeechDurationSec?: number;
  filterApplied: boolean;
  clinicalNote?: string;
}

export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  type: "Reading" | "Conversation" | "Monologue" | "Other";
  duration: number; // in seconds
  stats: StutterStats;
  severity: "Hafif" | "Orta" | "Şiddetli" | "Çok Şiddetli";
  isManual: boolean;
  notes?: string;
  transcription?: string;
  analysisDetails?: string;
  recommendations?: string[];
  isSimulated?: boolean;
  speakerSeparation?: SpeakerSeparationInfo;
}

export type ActiveTab = "clients" | "manual-tracker" | "ai-analyzer" | "education" | "admin";

export interface ArticulationError {
  target: string;
  uttered: string;
  type: string;
  description: string;
  wordsAffected: string[];
}

export interface PhonologicalProcess {
  name: string;
  frequency: string;
  details: string;
}

export interface ArticulationSession {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  intendedText: string;
  originalIpa: string;
  utteredIpa: string;
  intelligibilityScore: number;
  errors: ArticulationError[];
  phonologicalProcesses: PhonologicalProcess[];
  clinicalSummary: string;
  recommendations: string[];
  isSimulated?: boolean;
  pcc?: number; // Doğru Ünsüz Yüzdesi (DÜY)
  pvc?: number; // Doğru Ünlü Yüzdesi (DÜL)
  ppc?: number; // Toplam Doğru Sesbirim Yüzdesi (DSY)
  speakerSeparation?: SpeakerSeparationInfo;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  createdAt: string;
  title?: string;
  password?: string;
}

export interface LanguageUtterance {
  id: number;
  text: string;
  wordCount: number;
  morphemeCount: number;
}

export interface LanguageError {
  error: string;
  type: string;
  target: string;
  description: string;
}

export interface LanguageSession {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  utterances: LanguageUtterance[];
  stats: {
    totalUtterances: number;
    totalWords: number;
    totalMorphemes: number;
    mluWords: number;
    mluMorphemes: number;
    typeTokenRatio: number;
  };
  morphologyDetails: string;
  syntaxDetails: string;
  errors: LanguageError[];
  clinicalSummary: string;
  recommendations: string[];
  isSimulated?: boolean;
  modelUsed?: string;
  speakerSeparation?: SpeakerSeparationInfo;
}

export interface AcousticVoiceParameters {
  f0Mean: number; // Hz (Temel Frekans Ortalama)
  f0Min: number; // Hz
  f0Max: number; // Hz
  f0Std: number; // Hz (F0 Standart Sapma)
  jitterLocal: number; // % (Local Jitter - Frekans Pertürbasyonu)
  jitterRap: number; // % (Relative Average Perturbation)
  jitterPpq5: number; // % (Five-point Period Perturbation Quotient)
  shimmerLocal: number; // % (Local Shimmer - Genlik Pertürbasyonu)
  shimmerDb: number; // dB (Shimmer dB)
  shimmerApq3: number; // % (Three-point Amplitude Perturbation Quotient)
  shimmerApq5: number; // % (Five-point Amplitude Perturbation Quotient)
  nhr: number; // Noise-to-Harmonics Ratio (Gürültü/Uyum Oranı)
  hnr: number; // dB (Harmonics-to-Noise Ratio - Harmonik/Gürültü Oranı)
  cpps: number; // dB (Cepstral Peak Prominence Smoothed - Kepstral Tepe Belirginliği)
  dsi: number; // Dysphonia Severity Index (Disfoni Şiddet İndeksi)
  mpt: number; // sn (Maksimum Fonasyon Süresi)
  szRatio?: number; // s/z Oranı
  formants?: {
    f1: number; // Hz
    f2: number; // Hz
    f3?: number; // Hz
  };
}

export interface GRBASScale {
  g: number; // Grade (Genel Derece 0-3)
  r: number; // Roughness (Pürüzlülük / Kabalık 0-3)
  b: number; // Breathiness (Nefeslilik / Hava Kaçağı 0-3)
  a: number; // Asthenia (Asteniklik / Güçsüzlük 0-3)
  s: number; // Strain (Gerginlik / Hiperfonksiyon 0-3)
  justification?: string;
}

export interface CAPEVScale {
  overallSeverity: number; // 0 - 100 mm VAS
  roughness: number; // 0 - 100
  breathiness: number; // 0 - 100
  strain: number; // 0 - 100
  pitch: number; // 0 - 100 (Uygunluk)
  loudness: number; // 0 - 100 (Uygunluk)
}

export interface VoiceSession {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  taskType: "sustained_vowel" | "continuous_speech" | "sz_ratio" | "mpt";
  gender: "male" | "female" | "child";
  vowelSound?: string; // "/a/", "/i/", "/u/"
  duration: number; // sn
  acousticParams: AcousticVoiceParameters;
  grbas: GRBASScale;
  capev?: CAPEVScale;
  severity: "Normal Ses" | "Hafif Disfoni" | "Orta Derece Disfoni" | "İleri Derece Disfoni";
  suspectedPathology: string; // Örn: Kas Gerilim Disfonisi (MTD), Vokal Nodül Şüphesi, Presbifoni vb.
  clinicalEvaluation: string;
  therapyRecommendations: string[];
  stroboscopyNeeded: boolean;
  isSimulated?: boolean;
  modelUsed?: string;
  speakerSeparation?: SpeakerSeparationInfo;
}

