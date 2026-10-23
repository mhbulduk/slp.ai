/**
 * DKT Klinik Karar Destek Sistemi
 * Gerçek Zamanlı Akustik Frekans Analizörü ve Konuşmacı Ayrıştırma (Diarization) Motoru
 *
 * Klinik Arka Plan:
 * Dil ve Konuşma Terapisi (DKT) seanslarında ve ölçümlerde; terapistin yönergeleri,
 * ara soruları veya dış sesler (yetişkin tonlu frekanslar ~90-215 Hz) ile danışanın
 * (özellikle çocuk danışanlar ~240-420 Hz veya kadın/erkek hedef sesler) konuşması
 * akustik temel frekans (F0) farkıyla tespit edilir ve filtrelenir.
 */

export type PitchProfile = "child" | "female_adult" | "male_adult" | "auto";

export interface FrequencyAnalysisResult {
  currentPitchHz: number;
  volumeRms: number; // 0 - 100
  activeSpeaker: "client" | "therapist" | "silence";
  speakerLabel: string;
  isTherapistVoice: boolean;
  clientTimeSec: number;
  therapistTimeSec: number;
  totalSpeechTimeSec: number;
  therapistInterferencePercentage: number;
  avgClientHz: number;
  avgTherapistHz: number;
  clientFrequencyRange: string;
  therapistFrequencyRange: string;
}

export interface AudioFrequencyTracker {
  stop: () => FrequencyAnalysisResult;
  getSummary: () => FrequencyAnalysisResult;
}

/**
 * Autocorrelation tabanlı temel frekans (F0 - Pitch) saptayıcı
 */
function autoCorrelatePitch(buffer: Float32Array, sampleRate: number): { pitch: number; rms: number } {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    sumOfSquares += val * val;
  }
  const rms = Math.sqrt(sumOfSquares / SIZE);

  // Ses şiddeti çok düşükse (sessizlik / mikrofon dip gürültüsü)
  if (rms < 0.015) {
    return { pitch: -1, rms: rms * 100 };
  }

  // Sinyali normalize edelim (clipping / trimming)
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.subarray(r1, r2);
  const trimmedLen = trimmed.length;

  const c = new Float32Array(trimmedLen);
  for (let i = 0; i < trimmedLen; i++) {
    for (let j = 0; j < trimmedLen - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (d < trimmedLen - 1 && c[d] > c[d + 1]) {
    d++;
  }

  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmedLen; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }

  let T0 = maxpos;

  // Parabolik interpolasyon ile alt örnekleme hassasiyeti
  if (T0 > 0 && T0 < trimmedLen - 1) {
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = T0 - b / (2 * a);
    }
  }

  const pitch = sampleRate / T0;

  // Standart insan konuşma aralığı: 65 Hz - 600 Hz
  if (pitch >= 65 && pitch <= 600) {
    return { pitch: Math.round(pitch), rms: Math.min(100, Math.round(rms * 250)) };
  }

  return { pitch: -1, rms: Math.min(100, Math.round(rms * 250)) };
}

/**
 * Verilen frekans ve profile göre konuşmacıyı sınıflandırır
 */
export function classifySpeakerByFrequency(
  pitchHz: number,
  profile: PitchProfile = "child"
): { speaker: "client" | "therapist"; label: string } {
  if (profile === "child") {
    // Çocuk danışan (Pediatrik): Genellikle 225 - 460 Hz
    // Yetişkin DKT / Terapist (Erkek/Kadın): Genellikle 85 - 215 Hz
    if (pitchHz >= 225) {
      return { speaker: "client", label: `Danışan Çocuk (${pitchHz} Hz)` };
    } else {
      return { speaker: "therapist", label: `DKT / Terapist (${pitchHz} Hz - Farklı Frekans)` };
    }
  } else if (profile === "female_adult") {
    // Kadın Danışan: 170 - 270 Hz
    // Farklı ses (Erkek Terapist veya Düşük/Yüksek ton): < 160 Hz veya > 280 Hz
    if (pitchHz >= 165 && pitchHz <= 275) {
      return { speaker: "client", label: `Danışan Sesi (${pitchHz} Hz)` };
    } else {
      return { speaker: "therapist", label: `DKT / 2. Konuşmacı (${pitchHz} Hz)` };
    }
  } else if (profile === "male_adult") {
    // Erkek Danışan: 85 - 165 Hz
    // Farklı ses (Kadın Terapist): > 175 Hz
    if (pitchHz >= 80 && pitchHz <= 165) {
      return { speaker: "client", label: `Danışan Sesi (${pitchHz} Hz)` };
    } else {
      return { speaker: "therapist", label: `DKT / 2. Konuşmacı (${pitchHz} Hz)` };
    }
  } else {
    // Auto modu: 220 Hz ayrım eşiği (standart klinik varsayılan)
    if (pitchHz >= 220) {
      return { speaker: "client", label: `Danışan Sesi (${pitchHz} Hz)` };
    } else {
      return { speaker: "therapist", label: `DKT / Farklı Frekans (${pitchHz} Hz)` };
    }
  }
}

/**
 * Canlı Web Audio akışını dinleyerek saniye saniye frekans ve konuşmacı ayrımı yapar
 */
export function startLiveFrequencyTracker(
  stream: MediaStream,
  options: {
    profile?: PitchProfile;
    onUpdate?: (result: FrequencyAnalysisResult) => void;
  } = {}
): AudioFrequencyTracker {
  const profile = options.profile || "child";
  const onUpdate = options.onUpdate;

  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let animationFrameId: number | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
  } catch (err) {
    console.warn("Web Audio Context başlatılamadı:", err);
  }

  const buffer = new Float32Array(analyser ? analyser.fftSize : 2048);

  let clientTimeSec = 0;
  let therapistTimeSec = 0;
  let clientPitches: number[] = [];
  let therapistPitches: number[] = [];
  let lastTickTime = Date.now();

  let latestResult: FrequencyAnalysisResult = {
    currentPitchHz: 0,
    volumeRms: 0,
    activeSpeaker: "silence",
    speakerLabel: "Sessizlik / Dinleniyor...",
    isTherapistVoice: false,
    clientTimeSec: 0,
    therapistTimeSec: 0,
    totalSpeechTimeSec: 0,
    therapistInterferencePercentage: 0,
    avgClientHz: 0,
    avgTherapistHz: 0,
    clientFrequencyRange: profile === "child" ? "240 - 400 Hz" : "170 - 270 Hz",
    therapistFrequencyRange: "90 - 215 Hz"
  };

  const sampleLoop = () => {
    if (!analyser || !audioContext) return;

    analyser.getFloatTimeDomainData(buffer);
    const { pitch, rms } = autoCorrelatePitch(buffer, audioContext.sampleRate);

    const now = Date.now();
    const dt = (now - lastTickTime) / 1000;
    lastTickTime = now;

    let activeSpeaker: "client" | "therapist" | "silence" = "silence";
    let speakerLabel = "Sessizlik / Dinleniyor...";
    let isTherapistVoice = false;

    if (pitch > 0 && rms >= 4) {
      const classification = classifySpeakerByFrequency(pitch, profile);
      activeSpeaker = classification.speaker;
      speakerLabel = classification.label;

      if (activeSpeaker === "client") {
        clientTimeSec += dt;
        clientPitches.push(pitch);
      } else {
        therapistTimeSec += dt;
        therapistPitches.push(pitch);
        isTherapistVoice = true;
      }
    }

    const totalSpeech = clientTimeSec + therapistTimeSec;
    const interferencePct = totalSpeech > 0 ? (therapistTimeSec / totalSpeech) * 100 : 0;

    const avgClient = clientPitches.length > 0
      ? Math.round(clientPitches.reduce((a, b) => a + b, 0) / clientPitches.length)
      : (profile === "child" ? 310 : 210);

    const avgTherapist = therapistPitches.length > 0
      ? Math.round(therapistPitches.reduce((a, b) => a + b, 0) / therapistPitches.length)
      : 145;

    latestResult = {
      currentPitchHz: pitch > 0 ? pitch : 0,
      volumeRms: rms,
      activeSpeaker,
      speakerLabel,
      isTherapistVoice,
      clientTimeSec: Math.round(clientTimeSec * 10) / 10,
      therapistTimeSec: Math.round(therapistTimeSec * 10) / 10,
      totalSpeechTimeSec: Math.round(totalSpeech * 10) / 10,
      therapistInterferencePercentage: Math.round(interferencePct),
      avgClientHz: avgClient,
      avgTherapistHz: avgTherapist,
      clientFrequencyRange: clientPitches.length > 2
        ? `${Math.min(...clientPitches)} - ${Math.max(...clientPitches)} Hz (Danışan)`
        : (profile === "child" ? "240 - 420 Hz (Danışan Çocuk)" : "165 - 265 Hz (Danışan)"),
      therapistFrequencyRange: therapistPitches.length > 2
        ? `${Math.min(...therapistPitches)} - ${Math.max(...therapistPitches)} Hz (DKT / Yetişkin)`
        : "90 - 215 Hz (DKT / Yetişkin Sesi)"
    };

    if (onUpdate) {
      onUpdate(latestResult);
    }

    animationFrameId = requestAnimationFrame(sampleLoop);
  };

  animationFrameId = requestAnimationFrame(sampleLoop);

  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    try {
      if (source) source.disconnect();
      if (analyser) analyser.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
    } catch (e) {
      // ignore
    }
    return latestResult;
  };

  return {
    stop: cleanup,
    getSummary: () => latestResult
  };
}
