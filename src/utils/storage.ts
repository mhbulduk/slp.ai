import { Client, Session } from "../types";

const INITIAL_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Kadir Yılmaz",
    age: 14,
    notes: "Okul çağında ergen kekemeliği. Konuşurken göz kaçırma ve çene gerilimi (fiziksel eşlikçi) saptandı. Konuşma kaygısı yaşıyor.",
    createdAt: "2026-03-10T10:00:00Z",
    parentName: "Ahmet Yılmaz (Büyükçadır Ortaokulu)"
  },
  {
    id: "c2",
    name: "Aylin Şen",
    age: 7,
    notes: "Okul öncesi fizyolojik akıcısızlık dalgalanmaları. Son 6 aydır artış eğiliminde. Ebeveyn rehberliği ve destekleyici akıcılık terapisi uyguluyoruz.",
    createdAt: "2026-04-12T14:30:00Z",
    parentName: "Meltem Şen (Veli)"
  },
  {
    id: "c3",
    name: "Ömer Aslan",
    age: 26,
    notes: "Yetişkin kekemeliği. İşe giriş mülakatı öncesi heyecan yönetimi ve Blok Modifikasyonu (Cancellation, Pull-out) teknikleri üzerine çalışıyoruz.",
    createdAt: "2026-05-01T09:15:00Z"
  }
];

const INITIAL_SESSIONS: Session[] = [
  {
    id: "s1",
    clientId: "c1",
    clientName: "Kadir Yılmaz",
    date: "2026-06-01T10:15:00Z",
    type: "Reading",
    duration: 180,
    stats: {
      totalSyllables: 154,
      blocks: 3,
      repetitions: 12,
      prolongations: 4,
      totalDisfluencies: 19,
      percentSS: 12.3
    },
    severity: "Orta",
    isManual: true,
    notes: "Kitap okuma pasajı sırasında kelime başlarındaki uzatmalar azaldı fakat 'k' ve 't' seslerinde bloklar devam ediyor. Pull-out tekniği hatırlatıldı.",
    transcription: "K- k- kitap (Tekrar) okurken bazen b- b- b-  [blok] (Tekrar) başlayamıyorum ama sssssakince (Uzatma) nefes aldığımda t- t- daha (Tekrar) rahat hissediyorum."
  },
  {
    id: "s2",
    clientId: "c1",
    clientName: "Kadir Yılmaz",
    date: "2026-06-12T11:00:00Z",
    type: "Conversation",
    duration: 210,
    stats: {
      totalSyllables: 210,
      blocks: 12,
      repetitions: 28,
      prolongations: 8,
      totalDisfluencies: 48,
      percentSS: 22.8
    },
    severity: "Orta",
    isManual: false,
    notes: "Yapılan karşılıklı sohbet kaydı analizidir. Heyecan seviyesi arttığında bloklar peş peşe geldi. İkincil davranış olarak sol ayağını yere vurma eğilimi saptandı.",
    transcription: "D- d- dün (Tekrar) akşam arkadaşlarımla ppppazar (Uzatma) yerinin arkasındaki m- maç sahasına g- g- g- [blok] (Tekrar) gittik. O- o- orada (Tekrar) oyun oynarken b- b- birden (Tekrar) g- k- [blok] kaleci kilitlendi.",
    analysisDetails: "Konuşma akışı heyecan sarmalıyla hızlı kilitlenmeler içermektedir. Dudak ve dil organlarında aşırı gergin plosif başlatma saptandı. Bloklar ortalama 1.8 saniye sürmektedir.",
    recommendations: [
      "Hafif temas çalışması: Plosif harfleri minimum dudak/dil kuvvetiyle çıkarma.",
      "Oturum başlangıcında ve gündelik hayatta yumuşak fonasyon başlatma çalışmaları.",
      "Grup konuşmalarında heyecanlandığı anlarda derin diyafram nefesiyle 2 saniye kuralı uygulaması."
    ]
  },
  {
    id: "s3",
    clientId: "c2",
    clientName: "Aylin Şen",
    date: "2026-06-05T15:00:00Z",
    type: "Conversation",
    duration: 120,
    stats: {
      totalSyllables: 92,
      blocks: 1,
      repetitions: 5,
      prolongations: 2,
      totalDisfluencies: 8,
      percentSS: 8.7
    },
    severity: "Hafif",
    isManual: false,
    notes: "Oyun eşliğinde serbest sohbet yapıldı. Çoğunlukla hece ve bağlaç tekrarları mevcut, gerinim düzeyi düşük. Aileye konuşma baskısı yapmamaları gerektiği tekrarlandı.",
    transcription: "O- o- oyuncak (Tekrar) bebeğimin sssssaçlarını (Uzatma) ördüm, ssssonra (Uzatma) ona mama ve- ve- verdik (Tekrar) d- d- dondurma (Tekrar) yedik.",
    analysisDetails: "Hafif düzeyde fizyolojik akıcısızlığa benzeyen bir profil. Bloklar neredeyse yok (1 adet hafif çene takılması), kelime ve hece tekrarları yaygın. Çocuk durumunun farkında değil veya konuşmaktan çekinmiyor, bu çok olumlu.",
    recommendations: [
      "Ebeveynlerin çocuk takıldığında sözünü tamamlamaması ve 'yavaş konuş' gibi uyarılardan kesinlikle kaçınması.",
      "Okul öncesi terapilerde dolaylı (indirect) terapi modellerine ağırlık verilmesi.",
      "Terapistin çocukla konuşurken model kalarak kendi konuşma hızını yavaşlatması."
    ]
  },
  {
    id: "s4",
    clientId: "c1",
    clientName: "Kadir Yılmaz",
    date: "2026-06-24T10:30:00Z",
    type: "Conversation",
    duration: 215,
    stats: {
      totalSyllables: 245,
      blocks: 6,
      repetitions: 16,
      prolongations: 5,
      totalDisfluencies: 27,
      percentSS: 11.0
    },
    severity: "Orta",
    isManual: false,
    notes: "Nefes koordinasyonu ve pull-out tekniğiyle blok süresi ve şiddeti belirgin şekilde geriledi. Hece hızı 68 H/dk seviyesine yükseldi.",
    transcription: "Dersler b- b- bittikten sonra k- kütüphaneye gidip ödevleri b- b- bitirdik. T- t- teneffüste (Tekrar) ssssakince (Uzatma) dinlendim.",
    analysisDetails: "Önceki seansa (%22.8) kıyasla akıcısızlık yarı yarıya azalarak %11.0 seviyesine inmiştir. Blokların yerini yumuşak hece tekrarları almaktadır.",
    recommendations: [
      "Pull-out tekniğinin günlük konuşma ortamlarında genellenmesi.",
      "Yumuşak başlangıç egzersizlerine devam edilmesi."
    ]
  },
  {
    id: "s5",
    clientId: "c1",
    clientName: "Kadir Yılmaz",
    date: "2026-07-08T11:00:00Z",
    type: "Conversation",
    duration: 230,
    stats: {
      totalSyllables: 310,
      blocks: 2,
      repetitions: 9,
      prolongations: 3,
      totalDisfluencies: 14,
      percentSS: 4.5
    },
    severity: "Hafif",
    isManual: false,
    notes: "Akıcılık modifikasyonu ve gevşeme teknikleri oturmaya başladı. Kendine güven arttı, %SS %4.5 seviyesine indi, hece hızı 81 H/dk.",
    transcription: "Yaz tatilinde ailemle birlikte yaylaya g- gideceğiz. Orada bol bol kitap okuyup spor y- y- yapacağım.",
    analysisDetails: "Klinik düzeyde hafif eşiğe (%4.5) inilmiş, sekonder fiziksel eşlikçiler tamamen kaybolmuştur. Hece hızı normalleşmiştir.",
    recommendations: [
      "Haftalık ev egzersizlerinin sürdürülmesi.",
      "Özgüven pekiştirici grup etkinliklerine katılım."
    ]
  },
  {
    id: "s6",
    clientId: "c2",
    clientName: "Aylin Şen",
    date: "2026-06-22T14:30:00Z",
    type: "Conversation",
    duration: 140,
    stats: {
      totalSyllables: 135,
      blocks: 0,
      repetitions: 4,
      prolongations: 1,
      totalDisfluencies: 5,
      percentSS: 3.7
    },
    severity: "Hafif",
    isManual: false,
    notes: "Dolaylı ebeveyn terapisi ve oyun ortamında akıcılık stabil. Blok sıfır, tekrarlar hafif.",
    transcription: "Parkta k- k- salıncakta (Tekrar) sallandım ve mmmavi (Uzatma) balon aldım.",
    analysisDetails: "Akıcılık %8.7'den %3.7'ye gerilemiştir. Fizyolojik akıcısızlık toparlanmaktadır.",
    recommendations: [
      "Ailenin sabırlı ve destekleyici iletişim tutumunu sürdürmesi."
    ]
  },
  {
    id: "s7",
    clientId: "c3",
    clientName: "Ömer Aslan",
    date: "2026-05-15T09:30:00Z",
    type: "Conversation",
    duration: 240,
    stats: {
      totalSyllables: 260,
      blocks: 14,
      repetitions: 20,
      prolongations: 8,
      totalDisfluencies: 42,
      percentSS: 16.2
    },
    severity: "Şiddetli",
    isManual: false,
    notes: "İş mülakatı simülasyonu. Heyecan anında kilitlenme ve gırtlak gerilimi yüksek.",
    transcription: "M- m- mühendislik (Tekrar) alanındaki tecrübelerimi a- a- [blok] anlatmak istiyorum.",
    analysisDetails: "Yetişkin tipi dirençli kekemelik. Blok modifikasyonu Cancellation çalışıldı.",
    recommendations: [
      "Cancellation ve duyarsızlaşma çalışmaları."
    ]
  },
  {
    id: "s8",
    clientId: "c3",
    clientName: "Ömer Aslan",
    date: "2026-06-05T10:00:00Z",
    type: "Conversation",
    duration: 260,
    stats: {
      totalSyllables: 340,
      blocks: 6,
      repetitions: 14,
      prolongations: 5,
      totalDisfluencies: 25,
      percentSS: 7.4
    },
    severity: "Orta",
    isManual: false,
    notes: "Pull-out tekniği mülakat sorularında başarıyla uygulandı, %SS %16.2'den %7.4'e düştü.",
    transcription: "Projelerimde ssssorumluluk (Uzatma) almaktan çekinmiyorum, e- e- ekipleri (Tekrar) yönetebiliyorum.",
    analysisDetails: "Blok şiddeti ve süresi belirgin düzelme gösterdi, hece hızı 78 H/dk.",
    recommendations: [
      "Gerçek mülakat öncesi prova seansları."
    ]
  }
];

export function getStoredClients(): Client[] {
  try {
    const data = localStorage.getItem("dkt_clients");
    if (!data) {
      try {
        localStorage.setItem("dkt_clients", JSON.stringify(INITIAL_CLIENTS));
      } catch (e) {
        console.warn("localStorage write failed:", e);
      }
      return INITIAL_CLIENTS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CLIENTS;
  } catch (err) {
    console.error("Bozuk danışan verisi tespit edildi, varsayılana dönülüyor:", err);
    return INITIAL_CLIENTS;
  }
}

export function saveStoredClients(clients: Client[]): void {
  try {
    localStorage.setItem("dkt_clients", JSON.stringify(clients));
  } catch (err) {
    console.error("Danışan verileri localStorage'a kaydedilemedi (Kota dolu olabilir):", err);
  }
}

export function getStoredSessions(): Session[] {
  try {
    const data = localStorage.getItem("dkt_sessions");
    if (!data) {
      try {
        localStorage.setItem("dkt_sessions", JSON.stringify(INITIAL_SESSIONS));
      } catch (e) {
        console.warn("localStorage write failed:", e);
      }
      return INITIAL_SESSIONS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_SESSIONS;
  } catch (err) {
    console.error("Bozuk seans geçmişi tespit edildi, varsayılana dönülüyor:", err);
    return INITIAL_SESSIONS;
  }
}

export function saveStoredSessions(sessions: Session[]): void {
  try {
    localStorage.setItem("dkt_sessions", JSON.stringify(sessions));
  } catch (err) {
    console.error("Seans verileri localStorage'a kaydedilemedi (Kota dolu olabilir):", err);
  }
}
