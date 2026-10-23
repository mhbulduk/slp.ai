import { useState } from "react";
import { 
  Info, BookOpen, Brain, Activity, HelpCircle, GraduationCap, Search, CheckCircle, AlertTriangle, 
  ArrowRight, ShieldCheck, ChevronDown, ChevronUp, UserCheck, Layers, Award, Sparkles, Filter 
} from "lucide-react";

interface Theory {
  id: string;
  title: string;
  category: "psikolojik" | "ogrenme" | "fizyolojik" | "multifaktorel";
  author: string;
  summary: string;
  details: string;
  evidence: string;
}

interface Term {
  term: string;
  desc: string;
  clinicalNote?: string;
  category: "temel" | "davranis" | "istatistik";
}

export default function InfoHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"genel" | "kuramlar" | "cluttering" | "degerlendirme" | "kilavuz">("genel");
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null);
  const [clutteringSearch, setClutteringSearch] = useState("");

  // Theories compiled directly from Ondokuz Mayıs Üniversitesi DKT303 curriculum
  const theories: Theory[] = [
    {
      id: "diagnosogenic",
      title: "Diagnosojenik Teori (Tanısal Teori)",
      category: "ogrenme",
      author: "Wendell Johnson (Iowa Ekolü)",
      summary: "Kekemeliğin, ebeveynlerin çocuğun konuşmasındaki normal akıcısızlıkları yanlış etiketleyip aşırı tepki vermesinden doğduğunu savunur.",
      details: "Bu teoriye göre kekemelik, çocuğun ağzında değil dinleyicinin kulağında başlar. Ebeveyn normal tereddütleri 'kekemelik' olarak etiketlediğinde, çocuk konuşmaktan korkmaya ve kaçınmak için çabalamaya başlar; bu çaba ve gerginlik gerçek kekemeliğe dönüşür.",
      evidence: "1939'daki ünlü 'Mary Tudor - Monster Study' deneyi ile test edilmiştir. Yetimhanedeki çocuklara kekeme oldukları söylenerek baskı uygulanmıştır. Çocuklarda kaygı ve konuşma çekincesi gelişmiş ancak organik/kronik kekemelik yaratılamamıştır. Modern araştırmalar (Nippold, 1995) ebeveynlerin tek başına kekemeliğe sebep olmadığını göstermiştir; teori günümüzde geçerliliğini yitirse de tarihsel önemi büyüktür."
    },
    {
      id: "covert-repair",
      title: "Gizli Onarım Hipotezi (Covert Repair Hypothesis)",
      category: "fizyolojik",
      author: "Albert Kolk & Herman Postma (1997 / Levelt Modeline Dayalı)",
      summary: "Konuşma planlama aşamasındaki fonolojik kodlama hatalarının, içsel izleme (covert monitoring) tarafından algılanıp düzeltilmeye çalışılmasıyla kekemeliğin oluştuğunu öne sürer.",
      details: "Kekeleyen bireylerde fonolojik kodlama hızı normal akıcılara göre daha yavaştır. Beyin, konuşma organlarına komut göndermeden önce (pre-articulatory) taslaktaki hataları algılar ve düzeltmek için konuşmayı durdurur. Bu gizli onarım süreci yüzeyel konuşmada ses/hece tekrarları (onarım girişimi) veya bloklar (durma) şeklinde yansır.",
      evidence: "Psikolinguistik temelli en güçlü modellerden birisidir. Akıcısızlıkların hece başında ve özellikle fonolojik karmaşıklığı yüksek sözcüklerde yoğunlaşmasını mükemmel açıklar. Artikülasyon ve fonolojik problemleri olan çocuklarda eşlik eden kekemelik artışlarını destekleyen klinik bulguları mevcuttur."
    },
    {
      id: "demands-capacities",
      title: "Talepler ve Kapasiteler Modeli (Demands and Capacities Model - DCM)",
      category: "multifaktorel",
      author: "Starkweather & Gottwald (1987)",
      summary: "Kekemeliğin, çocuğun akıcı konuşma üretme kapasitesi ile çevre veya kendi tarafından yüklenen konuşma talepleri arasındaki dengesizlikten kaynaklandığını öne sürer.",
      details: "Model 4 temel kapasiteyi ele alır: \n1. Motorik kapasite (hızlı koordinasyon yetisi)\n2. Dilsel kapasite (sentaktik, semantik formülasyon)\n3. Sosyo-Duygusal kapasite (stres veya heyecan anında akıcılığı koruma)\n4. Bilişsel kapasite (üst dil becerileri).\nEğer içsel veya dışsal talepler (örn: hızlı konuşan anne baba, kelime bulma baskısı, hızlı düşünme) çocuğun bu kapasitelerini aşarsa akıcılık bozulur.",
      evidence: "Klinik pratikte ebeveyn danışmanlığında en çok tercih edilen çok boyutlu modeldir. Terapi, dışsal talepleri azaltmayı (aile hızını yavaşlatma, soruları azaltma) ve çocuğun kapasitelerini güçlendirmeyi hedefler."
    },
    {
      id: "dual-premotor",
      title: "İkili Premotor Sistemler Hipotezi",
      category: "fizyolojik",
      author: "Alm, Ingham (2004)",
      summary: "Konuşmanın ritmik kontrolünde görev alan Medial (Bazal Ganglionlar - SMA) ve Lateral (Premotor Korteks - Serebellum) döngüleri arasındaki dengesizliğe odaklanır.",
      details: "Medial yolak içsel zamanlamalı, otomatik konuşma etkinliklerini yönetir. Lateral yolak ise dışsal uyaranlara bağlı konuşmayı düzenler (şarkı söyleme, koro halinde konuşma). Kekeleyen bireylerde Medial yolakta (özellikle Bazal Ganglionlarda dopaminerjik dengesizlik ve düşük D1/D2 oranı) işlevsel yetersizlik görülür ve içsel otomatik konuşma başlatılamaz.",
      evidence: "Nöro-görüntüleme (fMRI) çalışmalarıyla desteklenmektedir. Kekeleyen bireylerin şarkı söylerken, taklit yaparken ya da koro halinde konuşurken (Lateral dışsal yardımla) kekelememelerini muhteşem şekilde açıklar. Bazal ganglionlarda dopamin reseptörlerinin 2.5 - 3 yaşlarında tepe noktasına ulaşması, gelişimsel kekemelik başlangıç yaşıyla birebir örtüşür."
    },
    {
      id: "explan",
      title: "EXPLAN Modeli (Yürütme ve Planlama Modeli)",
      category: "multifaktorel",
      author: "Peter Howell (2000)",
      summary: "Bilişsel-dilsel planlama süreci (PLAN) ile motorik yürütme süreci (EX) arasındaki asenkronizasyonu tanımlar.",
      details: "PLAN süreci dilsel yapıları (sözdizimsel, leksikal) sıraya dizerken; EX süreci bu planın motor organlar vasıtasıyla seslendirilmesini (execution) üstlenir. Eğer dilsel plan motor organların çalışma hızına yetişemezse motor sistem duraklamak zorunda kalır (hece tekrarları veya kelimenin başını uzatarak vakit kazanma girişimi).",
      evidence: "Cümle uzunluğu ve karmaşıklığı arttıkça planlama süresinin uzaması ve motorik koordinasyon zorluklarının artmasıyla paralellik gösterir. Dilsel karmaşıklık arttıkça kekemeliğin şiddetinin artmasını destekleyen araştırmalar mevcuttur."
    },
    {
      id: "dynamic-multifactorial",
      title: "Dinamik Çok Faktörlü Model (Dynamic Multifactorial Model)",
      category: "multifaktorel",
      author: "Anne Smith & Lestec Kelly (1997)",
      summary: "Kekemeliğin tek bir doğrusal nedeni olmadığını; fizyolojik, dilsel, duygusal ve bilişsel katmanların doğrusal olmayan, dinamik etkileşimiyle yüzeye çıktığını savunur.",
      details: "Bu modele göre kekemelik statik bir bozukluk değildir. Bireyin konuşma-motor kontrol alanı kesik çizgilerle temsil edilen bir sınır gibidir. Kişinin mizaç özellikleri, dil yükü, o anki heyecanı ve motor becerileri bir araya gelerek onu bu eşiğin dışına çıkardığında (tanılama alanına girdiğinde) kekemelik anı gözlemlenir. Aynı düzeydeki faktörler başka bir bireyde kekemelik gözlenmeksizin tolere edilebilir.",
      evidence: "Kekemeliğin günden güne, saniyeden saniyeye gösterdiği aşırı değişkenlik ve heterojen yapısını en iyi açıklayan kuramdır. Tek bir 'neden' aramaktan ziyade kişinin bütününe odaklanılması gerektiğini belirtir."
    },
    {
      id: "cerebral-dominance",
      title: "Serebral Asimetri ve Dominans Teorisi",
      category: "fizyolojik",
      author: "Samuel T. Orton & Lee Edward Travis (1920-1930)",
      summary: "Konuşma motor hareketlerinin senkronize edilebilmesi için sol yarımkürenin baskın olması gerektiğini, kekeleyenlerde bu baskınlığın tam olgunlaşmadığını öne sürer.",
      details: "Kekeleyen bireylerde sol hemisferin konuşma baskınlığının zayıf olması nedeniyle, sağ ve sol hemisferden konuşma kaslarına giden sinir uyarıları senkronize olamaz ve konuşmada takılmalar, uzatmalar meydana gelir.",
      evidence: "1920'lerde kekeleyenler arasında solaklık/iki ellilik oranlarının araştırılmasına yol açmıştır. Solak çocukları sağ elini kullanmaya zorlamanın kekemeliği tetiklediğine inanılmıştır. Günümüzde fMRI çalışmaları kekeleme anlarında sağ hemisferde (özellikle sağ premotor alanlarda) kompansatuar aşırı aktivasyon olduğunu doğrulamakla beraber, teorinin ilk fiziksel el zorlaması iddiaları geçerliliğini yitirmiştir."
    },
    {
      id: "repressed-need",
      title: "Bastırılmış İç Çatışma Belirtisi Olarak Kekemelik",
      category: "psikolojik",
      author: "Glauber, Barbara, Wyatt (Psikanalitik Görüş)",
      summary: "Kekemeliği derinlere yerleşmiş psikoseksüel, nevrotik ve bilinçsiz bir iç çatışmanın (dikkat çekme, sığınma, oral fiksasyon) yüzeyel yansıması olarak ele alır.",
      details: "Çatışmanın kaynağının yetersiz kişilerarası ilişkiler, erken çocukluk travmaları veya oral-anal evrede fiksasyon olduğunu savunmuştur. Kekemelik anı, bastırılmış dürtülerin kontrol edilemeyen bir boşalımıdır.",
      evidence: "Adams (1993) ve Yairi (1997) tarafından yapılan 35 binden fazla vakanın incelendiği meta-analizlerde, kekeleyen çocukların ebeveynlerinin normal akıcı çocukların ebeveynlerinden duygusal veya psikolojik olarak hiçbir fark göstermediği kanıtlanmıştır. Psikanalitik terapi yöntemlerinin kekemelik rehabilitasyonunda başarısız olduğu görülmüş, modern bilimde bu görüş tamamen dışlanmıştır."
    }
  ];

  // Key terminology compiled from slide decks
  const keyTerms: Term[] = [
    { 
      term: "Birincil Kekemelik", 
      desc: "Çocuğun heceleri ve kelimeleri kolayca, çaba veya gerginlik göstermeden tekrarlamasıdır. Çocuk genelde durumun farkında değildir.", 
      clinicalNote: "Çekirdek (saf, alfa) akıcılık bozulmaları olarak da adlandırılır ve genellikle geçicidir.",
      category: "temel" 
    },
    { 
      term: "İkincil Kekemelik", 
      desc: "Çocuğun akıcısızlıkların farkına varıp, bunlardan kaçınmak veya kurtulmak amacıyla fiziksel mücadele ve olumsuz tutum geliştirdiği kronik evredir.", 
      clinicalNote: "'Gerçek' kekemelik olarak adlandırılır. Terapi odağı fiziksel gerilimle mücadeledir.",
      category: "temel" 
    },
    { 
      term: "Kaçma Davranışı (Escape)", 
      desc: "Kişinin o an yaşamakta olduğu kekemelik anını (örneğin bir bloğu) hızla sonlandırmak ve sözcüğü bitirmek için yaptığı istemsiz/öğrenilmiş fiziksel hareketlerdir.", 
      clinicalNote: "Göz kırpma, baş sallama, çene fırlatma, bacağa vurma gibi reaksiyonlar kekemelik anı BAŞLADIKTAN sonra oluşur.",
      category: "davranis" 
    },
    { 
      term: "Kaçınma Davranışı (Avoidance)", 
      desc: "Kişinin kekeleyeceğini önceden tahmin edip (önsezi), o kekemelik anının hiç oluşmaması için konuşmaya başlamadan önce geliştirdiği stratejilerdir.", 
      clinicalNote: "Konuşmayı erteleme, kelimeyi eş anlamlısıyla değiştirme, laf arası doldurucular ('ııı', 'şey', 'yani') kullanma kekemelik BAŞLAMADAN önce yapılır.",
      category: "davranis" 
    },
    { 
      term: "Prevalans (Prevalence)", 
      desc: "Bir bozukluğun belirli bir zaman diliminde toplum genelinde görülme ve saptanma sıklığıdır.", 
      clinicalNote: "Kekemelik prevalansı okul çağı çocuklarında %1 civarında, yetişkinlerde ise daha düşüktür (%0.7 - %1).",
      category: "istatistik" 
    },
    { 
      term: "İnsidans (Incidence)", 
      desc: "Bireylerin hayatlarının herhangi bir döneminde bu bozukluk ile karşılaşmış olma (en az 6 ay kekelemiş olma) olasılık yüzdesidir.", 
      clinicalNote: "Kekemelik yaşam boyu insidansı %5 civarındadır. Kısa süreli çocukluk dönemi geçici akıcısızlıkları dahil edildiğinde %15'lere ulaşır.",
      category: "istatistik" 
    },
    { 
      term: "Önsezi (Anticipation)", 
      desc: "Kekeleyen bireyin, konuşmaya başlamadan milisaniyeler önce hangi kelimede veya seste kekeleyeceğini tam olarak hissetmesi ve tahmin etmesi yeteneğidir.", 
      clinicalNote: "Yetişkin kekemelerinde kaçınma davranışlarının ana tetikleyicisidir.",
      category: "temel" 
    },
    { 
      term: "Adaptasyon Etkisi", 
      desc: "Kişinin aynı okuma pasajını arka arkaya 5-6 kez okuduğunda, her okumada kekemelik sıklığının sönerek belirgin şekilde azalması bulgusudur.", 
      clinicalNote: "Kekemeliğin basit bir motorik arıza değil, öğrenilmiş davranış ve çevresel stres bileşenleri içerdiğinin kanıtıdır.",
      category: "temel" 
    },
    { 
      term: "Tutarlılık (Consistency)", 
      desc: "Kişinin bir pasajı birden fazla kez okuduğunda, genel olarak hep aynı kelimeler veya sesler üzerinde kekeleme eğilimi göstermesidir.", 
      clinicalNote: "Leksikal ve fonetik tetikleyicilerin stabil olduğunu ve önsezinin gücünü klinik olarak ispatlar.",
      category: "temel" 
    },
    {
      term: "SLD (Stuttering-Like Disfluencies)",
      desc: "Kekemelik benzeri akıcısızlıklar. Kısmi sözcük tekrarları, tek heceli sözcük tekrarları ve disritmik fonasyonları (uzatma-blok) içerir.",
      clinicalNote: "Tipik akıcı çocukların akıcısızlıklarından temel ayrım noktasıdır; kekeleyen çocuklarda bu tipler 10 kat daha yaygındır.",
      category: "temel"
    },
    {
      term: "Türkçe Uluslararası Fonetik Alfabe (IPA) Sesli Standartları",
      desc: "Türkçe transkripsiyonunda 8 ünlü harfin standart IPA karşılıkları: /a/→ʌ, /e/→ɛ, /i/→ɪ, /ı/→ɯ, /u/→u, /ü/→y, /o/→o, /ö/→œ.",
      clinicalNote: "Artikülasyon ve konuşma sesi bozuklukları (KSB) analizinde akustik ve fonetik doğruluğu sağlamak amacıyla standart olarak kullanılır.",
      category: "temel"
    }
  ];

  const filteredTheories = theories.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTerms = keyTerms.filter(t =>
    t.term.toLowerCase().includes(clutteringSearch.toLowerCase()) ||
    t.desc.toLowerCase().includes(clutteringSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* PROFESSIONAL HERO INSPIRED BY ARŞ. GÖR. ÖZGE ŞAHVELİOĞLU'S OMÜ LECTURES */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-505/10 bg-slate-800 border border-slate-700 p-1.5 px-3 rounded-full text-xs font-bold text-indigo-400">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            OMÜ DKT303 Akıcı Konuşma Bozuklukları Müfredatı
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
            Kekemelik ve Hızlı Bozuk Konuşma (HBK) Klinik Karar Destek Portalı
          </h2>
          <p className="text-xs text-slate-350 leading-relaxed">
            Arş. Gör. Özge ŞAHVELİOĞLU hocamızın literatür ders notları, DSM-5 kriterleri, etiyolojik kuramlar, risk faktörleri analizi ve ebeveyn görüşme standartlarına dayalı kapsamlı klinik rehber ve modifikasyon terminolojisi.
          </p>
        </div>
      </div>

      {/* CLINICAL ASSISTIVE NOTICE */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-amber-950">
            Terapiste Yardımcı Klinik Referans ve Literatür Havuzu
          </p>
          <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
            Bu portal, Dil ve Konuşma Terapistlerine (DKT) seans öncesi ve sonrasında akademik literatüre dayalı referans sunan <strong>yardımcı bir kaynaktır; kesinlikle bir terapistin yerini alamaz</strong>. Buradaki kuramsal ve pratik bilgiler kamuya açık, standart ders kitapları ve bilimsel araştırmalara dayanan genel-geçer teorik çerçeveyi içerir; doğrudan klinik reçete niteliği taşımaz. Her vakanın terapi planlaması yetkili terapistin kendi yüz yüze klinik değerlendirmesine bağlıdır.
          </p>
        </div>
      </div>

      {/* CLNICAL TABS HEADER */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto scroller-hide border border-slate-200/80">
        <button
          onClick={() => setActiveTab("genel")}
          className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === "genel" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-650 hover:text-slate-900"
          }`}
        >
          <Info className="w-4 h-4" />
          Temel Kavramlar & Akıcısızlık
        </button>
        <button
          onClick={() => setActiveTab("kuramlar")}
          className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === "kuramlar" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-650 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          Etiyolojik Kuramlar (Teoriler)
        </button>
        <button
          onClick={() => setActiveTab("cluttering")}
          className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === "cluttering" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-650 hover:text-slate-900"
          }`}
        >
          <Brain className="w-4 h-4" />
          Hızlı Bozuk Konuşma (Cluttering)
        </button>
        <button
          onClick={() => setActiveTab("degerlendirme")}
          className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === "degerlendirme" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-650 hover:text-slate-900"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Risk Analizi & Onset Sürümü
        </button>
        <button
          onClick={() => setActiveTab("kilavuz")}
          className={`flex-shrink-0 flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            activeTab === "kilavuz" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-650 hover:text-slate-900"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Ebeveyn Görüşme Formu (20 Soru)
          <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1 rounded font-black">CANLI</span>
        </button>
      </div>

      {/* DYNAMIC CONTENTS */}
      <div className="space-y-6">

        {/* TAB 1: GENEL KAVRAMLAR */}
        {activeTab === "genel" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Terminology Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Kekemelik & Akıcılık Terimler Sözlüğü</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Klinik sunumlarda saptanan en kritik 10 kavramın literatür tanımları.</p>
              </div>
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Kavram araması yapın..."
                  value={clutteringSearch}
                  onChange={(e) => setClutteringSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-2 pl-9 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Prefix Box */}
            <div className="bg-amber-50/50 border border-amber-205 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm">
                  -dis
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tanısal Ayrım: Disfluent vs. Dysfluent Önekleri</h4>
                  <p className="text-[11px] text-slate-600 mt-1 font-semibold leading-relaxed">
                    Alanyazında <strong>'-dis'</strong> öneki tersine çevirme üretirken genellikle tipik akıcı konuşucuların normal akıcısızlıklarını temsil eder. <strong>'-dys'</strong> öneki ise zor, bozuk, acı verici durumları yansıtıp kekemeliği olan bireylerin atipik konuşmalarını simgeler.
                  </p>
                </div>
              </div>
              <div className="bg-white p-3 border border-amber-200 rounded-xl space-y-1 text-center font-bold text-xs uppercase tracking-tight flex-shrink-0">
                <div className="text-[10px] text-slate-500 font-medium">Kriter</div>
                <div className="text-indigo-600">%3 Kriteri</div>
                <div className="text-[9px] text-slate-400 font-semibold">%SS ≥ 3% = Kekemelik Şüphesi</div>
              </div>
            </div>

            {/* Terms List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTerms.map((term, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 transition-colors hover:border-indigo-250">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 font-sans">{term.term}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                      term.category === "temel" 
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                        : term.category === "davranis" 
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-teal-50 text-emerald-700 border border-teal-100"
                    }`}>
                      {term.category === "temel" ? "Klinik Özellik" : term.category === "davranis" ? "İkincil Tepki" : "İnsidans & Prevalans"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">{term.desc}</p>
                  {term.clinicalNote && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-indigo-850 font-bold flex items-start gap-1">
                      <span className="text-indigo-500 flex-shrink-0">💡 İpucu:</span>
                      <span>{term.clinicalNote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: TEORİ VE KURAMLAR */}
        {activeTab === "kuramlar" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Search theory bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">Kekemelik Etiyoloji / Başlangıç Teorileri</h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Tarihsel ve modern kanıta dayalı tüm etiyolojik kuramlar.</p>
              </div>
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Teori veya yazar adı arayın..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-2 pl-9 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Theory Cards */}
            <div className="space-y-4">
              {filteredTheories.map((theory) => {
                const isExpanded = expandedTheoryId === theory.id;
                return (
                  <div 
                    key={theory.id} 
                    className={`bg-white rounded-2xl border transition-all duration-300 ${
                      isExpanded ? "border-indigo-500 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header Summary Row */}
                    <div 
                      onClick={() => setExpandedTheoryId(isExpanded ? null : theory.id)}
                      className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 tracking-tight">{theory.title}</h4>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            theory.category === "ogrenme" 
                              ? "bg-amber-100 text-amber-800" 
                              : theory.category === "fizyolojik" 
                                ? "bg-rose-100 text-rose-800" 
                                : theory.category === "multifaktorel" 
                                  ? "bg-indigo-150 text-indigo-800" 
                                  : "bg-slate-100 text-slate-800"
                          }`}>
                            {theory.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Müellif/Ekol: {theory.author}</p>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed pt-0.5">{theory.summary}</p>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-50 text-slate-500 mt-1 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-700" /> : <ChevronDown className="w-4 h-4 text-slate-700" />}
                      </div>
                    </div>

                    {/* Explanatory Details */}
                    {isExpanded && (
                      <div className="p-5 pt-0 border-t border-slate-100 space-y-4 bg-slate-50/30 rounded-b-2xl animate-in slide-in-from-top duration-300">
                        <div className="space-y-1.5 mt-4">
                          <span className="text-[10px] uppercase font-black text-indigo-750 tracking-widest block">Ayrıntılı Klinik Hipotez:</span>
                          <p className="text-xs font-semibold text-slate-700 whitespace-pre-line leading-relaxed">{theory.details}</p>
                        </div>
                        <div className="space-y-1.5 p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                          <span className="text-[10px] uppercase font-black text-indigo-800 tracking-widest block">Mevcut Bilimsel Kanıt Durumu:</span>
                          <p className="text-xs font-bold text-slate-600 leading-relaxed italic">{theory.evidence}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredTheories.length === 0 && (
                <div className="text-center py-10 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-slate-500 font-bold">
                  Sorgunuza uygun kuram bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CLUTTERING */}
        {activeTab === "cluttering" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cluttering Intro */}
            <div className="bg-white border border-slate-205 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Brain className="w-4 h-4 text-indigo-600" />
                Hızlı Bozuk Konuşma (Cluttering - HBK) Nedir?
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                ASHA ve van Zaalen (2023) tanımlarına göre konuşucunun artikülasyon hızını o anın anlamsal, sözdizimsel, pragmatik ve fonolojik gereksinimlerine göre ayarlayamadığı bir <strong>iletişim bozukluğudur</strong>. Genelde konuşma hızı ya çok yüksektir ya da düzensizdir.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Teleskop Etkisi (Telescoping) Nedir?
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Sözcüklerin veya tümcelerin aşırı derecede sıkıştırılarak kırma/birleştirme yapılmasıdır. Örn: <strong>'Did you eat?'</strong> sözce diziliminin tek bir heceye benzetilerek <strong>'Jeet?'</strong> şeklinde kısaltılması; veya <strong>'Lets go'</strong> sözkesinin <strong>'Sko'</strong> yapılması.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Mücadele & Rezistans
                  </h4>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                    Kekeleyen bireyler konuşma kusurlarının inanılmaz derecede farkındadır ve kaygı, korku besler. Oysa Cluttering (HBK) vakalar genellikle sorunlarının ve dinleyici üstündeki anlaşılmaz etki düzeyinin <strong>hiç farkında değildir</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Compare Matrix Stuttering vs Cluttering */}
            <div className="bg-white border border-slate-205 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-900 border-b border-slate-850 text-white text-xs font-extrabold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                AYIRT EDİCİ MATRİS: KEKEMELİK VS. HIZLI BOZUK KONUŞMA (CLUTTERING)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                      <th className="p-3 pl-5">Parametre / Davranış</th>
                      <th className="p-3">Hızlı Bozuk Konuşma (Cluttering)</th>
                      <th className="p-3">Kekemelik (Stuttering)</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs text-slate-700 font-semibold divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Konuşmaya Dikkat Etme</td>
                      <td className="p-3 text-emerald-700 font-extrabold">Akıcılığı İyileştirir (Better)</td>
                      <td className="p-3 text-rose-700 font-extrabold">Akıcılığı Bozar / Şiddetlendirir (Worse)</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Gevşeme / Rahatlama</td>
                      <td className="p-3 text-rose-700 font-extrabold">Akıcılığı Bozar (Worse)</td>
                      <td className="p-3 text-emerald-700 font-extrabold">Akıcılığı İyileştirir (Better)</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Semptom / Hata Farkındalığı</td>
                      <td className="p-3 text-slate-500">Yoktur / Eksiktir (No)</td>
                      <td className="p-3 text-slate-800">Çok Yüksektir (Yes)</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Konuşma Korkusu ve Kaygı</td>
                      <td className="p-3 text-slate-500">Yoktur (No)</td>
                      <td className="p-3 text-slate-800">Yaygındır / Yoğundur (Possible)</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Bilinen Bir Metni Sesli Okuma</td>
                      <td className="p-3 text-slate-700">Küçük kelimelerde çok hata yapar</td>
                      <td className="p-3 text-slate-700">Takılma oranı sabit / bilinmeyenle eşit</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Bilinmeyen Metni Sesli Okuma</td>
                      <td className="p-3 text-emerald-600 font-extrabold">Daha Az Hata Yapar (Better)</td>
                      <td className="p-3 text-slate-700">Sözcük bazlı takılmalar devam eder</td>
                    </tr>
                    <tr>
                      <td className="p-3 pl-5 font-bold bg-slate-50/50">Sözcük Yapısı Hataları</td>
                      <td className="p-3 text-red-600 font-extrabold">Mevcuttur (Teleskop ve kırma var)</td>
                      <td className="p-3 text-slate-400">Bulunmaz (Repetition/Block var)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subtypes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-205 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase pb-2 border-b border-slate-100">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
                  Sözdizimsel HBK (Syntactic Cluttering)
                </h4>
                <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                  Temelde dil biçimlendirme ve sözcük bulma güçlükleridir. Sözcük bulmakta zorlandıklarında sözcük ve tümce tekrarları, laf arası interjection ve revizyonlara başvurarak vakit kazanırlar.
                </p>
                <div className="p-3 bg-indigo-50/30 rounded-xl text-[10px] text-indigo-900 font-bold border border-indigo-100/50">
                  Örn: "Mama, I went to the, I walked to the library to buy, ... borrow a book on... what is it called... dinosaurs."
                </div>
              </div>
              <div className="bg-white border border-slate-205 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase pb-2 border-b border-slate-100">
                  <span className="w-2.5 h-2.5 rounded bg-rose-600" />
                  Sesbilgisel HBK (Phonological Cluttering)
                </h4>
                <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                  Temelde fonolojik kodlamadaki hızlı çökmelerdir. Çok heceli kelimelerin hece yapıları, bütünlüğü bozulur. Teleskop fırlaması (hece yutma), koartikülasyon hataları oluşur.
                </p>
                <div className="p-3 bg-rose-50/30 rounded-xl text-[10px] text-rose-955 font-bold border border-rose-100/50">
                  Örn: "Mama, wentary to borrow a binosaus" (Coalescence/Telescoping - Aslı: 'Mama I went to the library to borrow a book on dinosaurs')
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RISK ANALIZI & DEGERLENDIRME */}
        {activeTab === "degerlendirme" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Risk Factors Intro */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Card 1: Yaş ve Oranlar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center font-extrabold text-xs">
                  2-4
                </div>
                <h4 className="text-xs font-extrabold text-slate-800">Başlangıç Yaşı & Yoğunluk</h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Kekemelik nadiren okul yıllarından sonra başlar. Başlangıçların <strong>%60'ı 3 yaşından önce</strong>, <strong>%85'i ise 3.5 yaşından önce</strong> (yaşamın 24-42. aylarında, ortalama 33. ayda) gerçekleşir.
                </p>
              </div>

              {/* Card 2: Cinsiyet Çelişkisi */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                <div className="w-9 h-9 bg-indigo-650 text-white rounded-xl flex items-center justify-center font-extrabold text-xs">
                  E/K
                </div>
                <h4 className="text-xs font-extrabold text-slate-800">Cinsiyet & İyileşme Farkı</h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Başlangıç anında kız/erkek oranı 1:1 veya 2:1 gibi birbirine çok yakınken; yetişkinlikte bu oran <strong>3:1 ile 6:1 erkek lehine</strong> fırlar. Bunun nedeni kız çocuklarının kekemeliği doğal ve terapisiz iyileştirme oranlarının çok daha yüksek olmasıdır.
                </p>
              </div>

              {/* Card 3: İşlemsel Riskler */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                <div className="w-9 h-9 bg-rose-600 text-white rounded-xl flex items-center justify-center font-extrabold text-xs">
                  70%
                </div>
                <h4 className="text-xs font-extrabold text-slate-800">Aile Öyküsü & Kalıtım</h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  İkiz ve akraba çalışmalarına bakıldığında, kekemelik varyansının yaklaşık <strong>%70'inin genetik faktörlere</strong>, %30'unun ise paylaşılmayan çevresel faktörlere dayandığı hesaplanmıştır (Felsenfeld, 2000). Aile üyelerinde kekemelik öyküsü oranı %30-69 arasındadır.
                </p>
              </div>
            </div>

            {/* Hierarchical Factor Breakdown */}
            <div className="bg-white border border-slate-205 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Filter className="w-4 h-4 text-indigo-600" />
                Başlangıç Evresindeki Risk Faktörlerinin Dağılımları
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-4 bg-emerald-50/20 border border-emerald-150 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    En Etkili/Belirleyici Faktörler
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-650 font-semibold pl-1">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span><strong>Aile Öyküsü:</strong> Kekemeliği devam eden/geçen akrabaların varlığı.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span><strong>Cinsiyet:</strong> Erkek cinsiyet, kronikleşme riskini ciddi oranda artırır.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span><strong>Başlangıç Zamanından İtibaren Geçen Süre:</strong> 12 aydan daha uzun süredir devam etmesi.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span><strong>Uzatma/Bloklar:</strong> Konuşmada uzatmaların ve özellikle sessiz blokların sıklığının devam etmesi.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-rose-50/20 border border-rose-150 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    Daha Az Etkili/İkincil Faktörler
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-650 font-semibold pl-1">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-550 mt-1.5 flex-shrink-0" />
                      <span><strong>Fiziksel Gelişim ve Hastalıklar:</strong> Tipik çocuk genel fiziksel yapısıyla aynıdır; diş çıkarma, sütten kesme fark yaratmaz.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-550 mt-1.5 flex-shrink-0" />
                      <span><strong>Sosyoekonomik Düzey / Irk:</strong> Kekemelik tüm sosyoekonomik düzeylerde ve kültürlerde tam olarak aynı sıklıkta görülür.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-550 mt-1.5 flex-shrink-0" />
                      <span><strong>Bilingualizm (İki Dillilik):</strong> İki dil öğrenmenin kekemeliğe kalıcı zemin hazırladığına dair ispatlı bir risk faktörü kanıtı yoktur.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-550 mt-1.5 flex-shrink-0" />
                      <span><strong>Taklit:</strong> Çocuğun kekeleyen arkadaşını taklit ederek kalıcı organik kekeme olması alanyazında imkansız kabul edilir.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: EBEVEYN GÖRÜŞME FORMU */}
        {activeTab === "kilavuz" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Guide Info */}
            <div className="bg-white border border-slate-205 p-5 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                DKT Anamnez Formu: Klinik Görüşmede Sorulması Gereken 20 Altın Soru
              </h3>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Yairi & Seery (2014) anamnez sisteminden çevrilmiş, ebeveyn ile ilk klinik seans sırasında çocuğun akıcısızlık geçmişini saptamakta kullanılan rehber soru seti. Bu soruları seans sırasında kopyalayabilir veya ebeveyne klinik referans olarak yöneltebilirsiniz:
              </p>
            </div>

            {/* Interactive Question List */}
            <div className="bg-white rounded-3xl border border-slate-205 overflow-hidden">
              <div className="p-4 bg-slate-900 border-b border-slate-850 text-white text-xs font-extrabold flex items-center justify-between">
                <span>Ebeveyn Bilgilendirme ve Anamnez Aşamaları</span>
                <span className="p-1 px-3.5 bg-slate-805 text-indigo-400 border border-slate-700/60 rounded-lg text-[9px] uppercase font-bold tracking-wider">Altın Standart</span>
              </div>
              
              <div className="p-6 divide-y divide-slate-100">
                
                {/* Bölüm 1 */}
                <div className="py-4 first:pt-0">
                  <h4 className="text-[11px] font-black uppercase text-indigo-850 tracking-wider mb-3">1. Başlangıç Tespiti & Şekli</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">1.</span>
                      <span>Bozzukluğun veya kekemeliğin ilk olarak ne zaman (kaçıncı ayda) başladığını fark ettiniz?</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">2.</span>
                      <span>Başlangıç hızı nasıldı? (Ani mi [1-3 gün], orta derece mi [1-2 hafta], yoksa kademeli olarak haftalarca mı gelişti?)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">3.</span>
                      <span>Kekemelik başladığında çocuğun hayatında stresli/olağandışı özel bir olay gerçekleşiyor muydu? (Taşınma, kardeş doğumu, kaza vb.)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">4.</span>
                      <span>İlk fark edildiği dönemde çocuktaki akıcısızlıkların şiddeti ne düzeydeydi?</span>
                    </div>
                  </div>
                </div>

                {/* Bölüm 2 */}
                <div className="py-4">
                  <h4 className="text-[11px] font-black uppercase text-indigo-850 tracking-wider mb-3">2. Akıcısızlık Seyri & İkincil Belirtiler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">5.</span>
                      <span>Başladığı günden itibaren konuşmada değişiklikler oldu mu? (Artarak mı, azalarak mı, yoksa dalgalı seyirde mi devam ediyor?)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">6.</span>
                      <span>Sözünü tamamlayamadığı anlarda vücudunda, çenesinde veya gözlerinde gerilme, tikler gibi ek hareketler oluyor mu? (Escape)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">7.</span>
                      <span>Çocuğunuzun durumun farkında olduğunu ve konuşurken üzüldüğünü hissediyor musunuz?</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">8.</span>
                      <span>Çocuğun takılmaktan kaçınmak veya kekelememek için geliştirdiği özel teknikler (sözcük değiştirme, fısıldama) var mı? (Avoidance)</span>
                    </div>
                  </div>
                </div>

                {/* Bölüm 3 */}
                <div className="py-4">
                  <h4 className="text-[11px] font-black uppercase text-indigo-850 tracking-wider mb-3">3. Ailesel & Duygusal Arka Plan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">9.</span>
                      <span>Yakın/uzak akrabalarınız arasında kekemelik öyküsü veya başka bir dil/konuşma bozukluğu olan var mı? (Genetik geçiş şüphesi)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">10.</span>
                      <span>Ebeveynleri olarak sizler bu akıcılık sorununun neden kaynaklandığını düşünüyorsunuz? (Doğru bilinen yanlışlar tespiti)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">11.</span>
                      <span>Evde iki dillilik (bilingualizm) veya farklı dillerin bir arada konuşulduğu bir rutin var mı?</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">12.</span>
                      <span>Çocuğun genel gelişim, doğum ve hamilelik geçmişinde herhangi bir komplikasyon veya hastalık yaşandı mı?</span>
                    </div>
                  </div>
                </div>

                {/* Bölüm 4 */}
                <div className="py-4 last:pb-0">
                  <h4 className="text-[11px] font-black uppercase text-indigo-850 tracking-wider mb-3">4. İletişimsel Rutinler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">13.</span>
                      <span>Çocuk en çok hani durumlarda veya kiminle konuşurken daha çok akıcılık kaybı yaşıyor?</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">14.</span>
                      <span>Çocuğun kelime haznesi, cümle kurma becerileri ve motor motor koordinasyonu (koşma, tutma vb.) yaşıtlarına uygun mu?</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">15.</span>
                      <span>Çocuğun genel mizacı nasıldır? (Diken üstünde, aşırı hassas, mükemmeliyetçi, uyumlu vb.)</span>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-indigo-650 font-black">16.</span>
                      <span>DKT uzmanı olarak süreci daha iyi planlayabilmem için bana eklemek istediğiniz özel bir durum var mıdır?</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
