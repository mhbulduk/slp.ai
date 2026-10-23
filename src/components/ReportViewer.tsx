import { Session, User } from "../types";
import { 
  Calendar, Clock, BarChart3, AlertTriangle, FileText, ArrowLeft, 
  Printer, Copy, Check, Info, FileDown, Download, ChevronDown, 
  FileSpreadsheet, FileJson, AudioLines 
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import FluencyProgressTracker from "./FluencyProgressTracker";

interface ReportViewerProps {
  session: Session;
  onBack: () => void;
  currentUser?: User | null;
  allSessions?: Session[];
}

export default function ReportViewer({ session, onBack, currentUser, allSessions = [] }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showPdfTip, setShowPdfTip] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerDownload = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const clientSlug = (session.clientName || "danisan").toLowerCase().replace(/[^a-z0-9]/gi, "_");
    const dateStr = session.date ? new Date(session.date).toISOString().split("T")[0] : "tarih";
    const fileName = `seans_${clientSlug}_${dateStr}.json`;

    const exportData = {
      archiveMetadata: {
        exportType: "DKT Clinical Session Archive",
        system: "DKT Klinik Karar Destek & Akıcılık Analiz Sistemi",
        version: "2.1",
        exportedAt: new Date().toISOString(),
        clinician: currentUser ? {
          name: `${currentUser.firstName} ${currentUser.lastName}`,
          title: currentUser.title || "DKT",
          email: currentUser.email
        } : null,
        purpose: "Klinik Arşivleme, Araştırma ve Takip (Clinical Archiving)"
      },
      session: {
        id: session.id,
        clientId: session.clientId,
        clientName: session.clientName,
        date: session.date,
        taskType: session.type,
        taskTypeLabel: session.type === "Reading" ? "Okuma" : session.type === "Conversation" ? "Konuşma" : session.type === "Monologue" ? "Monolog" : "Diğer",
        durationSeconds: session.duration,
        durationFormatted: `${Math.floor(session.duration / 60)} dk ${session.duration % 60} sn`,
        analysisMode: session.isManual ? "Manual Tracker (Manuel Tarama)" : "AI Acoustic Signal Analysis (Yapay Zeka)",
        isSimulated: session.isSimulated || false,
        severity: session.severity,
        metrics: {
          totalSyllables: session.stats.totalSyllables,
          blocks: session.stats.blocks,
          repetitions: session.stats.repetitions,
          prolongations: session.stats.prolongations,
          totalDisfluencies: session.stats.totalDisfluencies,
          percentSS: Number(session.stats.percentSS.toFixed(2)),
          formula: "%SS = (totalDisfluencies / totalSyllables) * 100"
        },
        transcription: session.transcription || "",
        clinicalObservations: session.analysisDetails || "",
        notes: session.notes || "",
        recommendations: session.recommendations || []
      }
    };

    triggerDownload(JSON.stringify(exportData, null, 2), fileName, "application/json;charset=utf-8;");
    setShowExportMenu(false);
    setExportNotice("JSON dosyası klinik arşiv için başarıyla indirildi.");
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportCSV = () => {
    const clientSlug = (session.clientName || "danisan").toLowerCase().replace(/[^a-z0-9]/gi, "_");
    const dateStr = session.date ? new Date(session.date).toISOString().split("T")[0] : "tarih";
    const fileName = `seans_${clientSlug}_${dateStr}.csv`;

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const headers = [
      "Seans ID",
      "Danışan Adı",
      "Danışan ID",
      "Tarih",
      "Görev Türü",
      "Süre (Saniye)",
      "Süre (Formatlı)",
      "Toplam Hece",
      "Blok Sayısı",
      "Tekrar Sayısı",
      "Uzatma Sayısı",
      "Toplam Akıcısızlık",
      "%SS Göstergesi",
      "Klinik Şiddet",
      "Analiz Modu",
      "Transkripsiyon",
      "Klinik Bulgular ve Gözlemler",
      "Öneriler ve Notlar",
      "Klinisyen / Terapist",
      "Dışa Aktarma Zamanı"
    ];

    const row = [
      session.id,
      session.clientName,
      session.clientId,
      session.date,
      session.type === "Reading" ? "Okuma" : session.type === "Conversation" ? "Konuşma" : session.type === "Monologue" ? "Monolog" : "Diğer",
      session.duration,
      `${Math.floor(session.duration / 60)} dk ${session.duration % 60} sn`,
      session.stats.totalSyllables,
      session.stats.blocks,
      session.stats.repetitions,
      session.stats.prolongations,
      session.stats.totalDisfluencies,
      session.stats.percentSS.toFixed(2),
      session.severity,
      session.isManual ? "Manuel Tarama" : "Yapay Zeka Analizi",
      session.transcription || "",
      session.analysisDetails || session.notes || "",
      (session.recommendations || []).join(" | "),
      currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Uzman DKT",
      new Date().toISOString()
    ];

    // Prepend UTF-8 BOM (\uFEFF) for Excel Turkish characters compatibility
    const csvString = "\uFEFF" + headers.map(escapeCsv).join(",") + "\r\n" + row.map(escapeCsv).join(",");
    triggerDownload(csvString, fileName, "text/csv;charset=utf-8;");
    setShowExportMenu(false);
    setExportNotice("CSV tablosu klinik arşiv için başarıyla indirildi.");
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleCopyText = () => {
    const reportText = `
DKT KEKEMELİK SEANS RAPORU
--------------------------
Danışan: ${session.clientName}
Tarih: ${new Date(session.date).toLocaleDateString("tr-TR")}
Görev Türü: ${session.type === "Reading" ? "Okuma" : session.type === "Conversation" ? "Konuşma" : "Monolog"}
Seans Süresi: ${Math.floor(session.duration / 60)} dk ${session.duration % 60} sn

KLİNİK İNDEKSLER:
- Toplam Hece: ${session.stats.totalSyllables}
- Blok Sayısı: ${session.stats.blocks}
- Tekrar Sayısı: ${session.stats.repetitions}
- Uzatma Sayısı: ${session.stats.prolongations}
- Toplam Akıcısızlık Olayı: ${session.stats.totalDisfluencies}
- %SS Göstergesi: %${session.stats.percentSS.toFixed(1)}
- Klinik Derece (Şiddet): ${session.severity}

TRANSKRİPSİYON & ETİKETLER:
${session.transcription || "Transkripsiyon verisi bulunmuyor."}

KLİNİK DEĞERLENDİRME NOTU:
${session.analysisDetails || session.notes || "Not eklenmemiş."}

ÖNERİLEN EGZERSİZLER & EV ÖDEVLERİ:
${session.recommendations ? session.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n") : "Özel öneri eklenmemiş."}
`;
    navigator.clipboard.writeText(reportText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPdf = () => {
    setShowPdfTip(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Helper to colorize/style key stuttering markers in transcription
  const renderTranscriptionWithStyling = (text: string) => {
    if (!text) return <p className="text-gray-400 italic">Döküm metni mevcut değil.</p>;

    // Split text by parentheses or square brackets to find labels, highlight tokens
    const tokens = text.split(/(\(.*?\)|\[.*?\])/g);

    return (
      <p className="text-sm text-gray-800 leading-relaxed font-sans">
        {tokens.map((token, i) => {
          if (token.startsWith("[blok]") || token.toLowerCase().includes("blok")) {
            return (
              <span key={i} className="mx-1 px-1.5 py-0.5 rounded-sm bg-red-100 text-red-800 font-bold border border-red-200 text-xs">
                {token}
              </span>
            );
          } else if (token.startsWith("(Tekrar)") || token.toLowerCase().includes("tekrar")) {
            return (
              <span key={i} className="mx-1 px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 font-semibold border border-amber-200 text-xs">
                {token}
              </span>
            );
          } else if (token.startsWith("(Uzatma)") || token.toLowerCase().includes("uzatma")) {
            return (
              <span key={i} className="mx-1 px-1.5 py-0.5 rounded-sm bg-pink-100 text-pink-800 font-semibold border border-pink-200 text-xs">
                {token}
              </span>
            );
          } else if (token.trim() === "") {
            return null;
          }
          return <span key={i}>{token}</span>;
        })}
      </p>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
      
      {/* ACTION HEADER BAR */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-slate-500 hover:text-indigo-700 text-xs font-bold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Klinik Geçmişe Dön
        </button>

        <div className="flex items-center gap-2">
          {/* EXPORT SESSION DATA BUTTON & DROPDOWN */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-900 text-xs font-bold px-3.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs hover:border-indigo-300 cursor-pointer transition-all"
              title="Klinik arşivleme için seans verilerini JSON veya CSV olarak indirin"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Session Data</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showExportMenu ? "rotate-180" : ""}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 border-b border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Klinik Veri Dışa Aktar</span>
                  <p className="text-[11px] text-slate-500 font-medium">Arşivleme formatını seçin:</p>
                </div>

                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-indigo-50/80 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-md mt-0.5 group-hover:bg-indigo-200 transition-colors shrink-0">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs group-hover:text-indigo-900">JSON Formatı (.json)</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">Tüm metrikler, transkripsiyon, analiz ve klinik metaveri</span>
                  </div>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-emerald-50/80 text-left transition-colors cursor-pointer group"
                >
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md mt-0.5 group-hover:bg-emerald-200 transition-colors shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs group-hover:text-emerald-900">CSV Formatı (.csv)</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">Excel / E-Tablo uyumlu, UTF-8 kodlu klinik tablo</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Kopyalandı!" : "Metni Kopyala"}
          </button>
          <button
            onClick={handleSaveAsPdf}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> PDF Olarak Kaydet
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> PDF / Yazdır
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs print:hidden shadow-xs animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-indigo-900">Arşiv Dışa Aktarıldı: </span>
            <span className="font-semibold text-indigo-800">{exportNotice}</span>
          </div>
        </div>
      )}

      {showPdfTip && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs animate-pulse print:hidden shadow-xs">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="space-y-1">
            <strong className="font-bold flex items-center gap-1 text-emerald-900">
              💡 Hızlı Bilgilendirme: PDF Kaydetme Talimatı
            </strong>
            <p className="leading-relaxed font-semibold">
              Yazdırma iletişim kutusu açıldığında, <span className="bg-emerald-200/60 px-1 py-0.5 rounded text-emerald-950 font-bold">"Hedef / Printer"</span> seçeneğini <strong className="font-bold font-mono">"PDF Olarak Kaydet"</strong> (veya <strong className="font-bold font-mono">"Save as PDF"</strong>) olarak değiştirip raporu dosya formatında indirebilirsiniz.
            </p>
          </div>
        </div>
      )}

      {/* CLINICAL REPORT BRANDING */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-950 text-white rounded-xl p-5 relative overflow-hidden print:bg-white print:text-slate-900 print:rounded-none print:border-b-2 print:border-slate-800 print:px-0 print:py-4 print:pb-6">
        <div className="z-10">
          <span className="text-[10px] bg-indigo-900 text-indigo-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest print:border print:border-slate-300 print:text-slate-700 print:bg-slate-100">
            Kekemelik Klinik Değerlendirme Raporu
          </span>
          <h2 className="text-xl font-bold mt-1.5 font-sans print:text-3xl print:font-extrabold">{session.clientName}</h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-indigo-200 mt-1 print:text-slate-600">
            <span className="flex items-center gap-1 font-sans">
              <Calendar className="w-3.5 h-3.5 text-indigo-300 print:text-slate-500" />
              Tarih: {new Date(session.date).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
            <span className="flex items-center gap-1 font-sans">
              <Clock className="w-3.5 h-3.5 text-indigo-300 print:text-slate-500" />
              Süre: {Math.floor(session.duration / 60)} dk {session.duration % 60} sn
            </span>
          </div>
        </div>

        <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/10 text-right z-10 font-sans shrink-0 print:bg-slate-50 print:border-slate-200 print:text-slate-900">
          <span className="block text-[9px] text-indigo-200 uppercase font-bold tracking-widest print:text-slate-550">Klinik Şiddet Derecesi</span>
          <span className="text-xl font-black text-indigo-200 print:text-indigo-900">{session.severity.toUpperCase()}</span>
          <span className="block text-[8px] text-indigo-105 mt-0.5 print:text-slate-600">%SS Göstergesi: %{session.stats.percentSS.toFixed(1)}</span>
        </div>
      </div>

      {/* METRIC SCORECARD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center print:bg-white">
          <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-1">Toplam Hece</span>
          <span className="text-lg font-bold text-slate-800 font-mono">{session.stats.totalSyllables}</span>
        </div>
        <div className="bg-red-50 border border-red-105 p-3 rounded-xl text-center print:bg-white print:border-slate-200">
          <span className="text-red-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Bloklar</span>
          <span className="text-lg font-bold text-red-700 font-mono">{session.stats.blocks}</span>
        </div>
        <div className="bg-amber-50 border border-amber-105 p-3 rounded-xl text-center print:bg-white print:border-slate-200">
          <span className="text-amber-600 block text-[9px] uppercase font-bold tracking-wider mb-1">Tekrarlar</span>
          <span className="text-lg font-bold text-amber-700 font-mono">{session.stats.repetitions}</span>
        </div>
        <div className="bg-pink-50 border border-pink-105 p-3 rounded-xl text-center print:bg-white print:border-slate-200">
          <span className="text-pink-500 block text-[9px] uppercase font-bold tracking-wider mb-1">Uzatmalar</span>
          <span className="text-lg font-bold text-pink-700 font-mono">{session.stats.prolongations}</span>
        </div>
        <div className="col-span-2 md:col-span-1 bg-indigo-50 border border-indigo-105 p-3 rounded-xl text-center print:bg-white print:border-slate-200">
          <span className="text-indigo-600 block text-[9px] uppercase font-bold tracking-wider mb-1">Akıcısızlık (%SS)</span>
          <span className="text-lg font-bold text-indigo-805 font-mono">%{session.stats.percentSS.toFixed(1)}</span>
        </div>
      </div>

      {/* SPEAKER SEPARATION & FREQUENCY AUDIT CARD */}
      {session.speakerSeparation && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4.5 border border-indigo-700/60 shadow-sm print:bg-white print:text-slate-900 print:border-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/50 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 print:bg-slate-100 print:text-slate-700">
                <AudioLines className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-100 print:text-slate-800">
                  Akustik Frekans & Konuşmacı Ayrıştırma (Speaker Diarization)
                </h4>
                <p className="text-[10px] text-indigo-300 print:text-slate-500">
                  DKT ara konuşmaları ve dış sesler frekans analiziyle ayrıştırılmış, ölçüm yalnızca danışan sesine uygulanmıştır.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:bg-emerald-50 print:text-emerald-800">
              ✓ DKT Frekansı Filtrelendi
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Konuşmacı Sayısı</span>
              <span className="font-bold text-white print:text-slate-800">
                {session.speakerSeparation.detectedSpeakers || 2} Konuşmacı (Danışan + DKT)
              </span>
            </div>

            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Hedef Danışan Frekansı</span>
              <span className="font-bold text-emerald-300 print:text-emerald-700">
                {session.speakerSeparation.clientFrequencyRange || "240 - 410 Hz (Çocuk)"}
              </span>
            </div>

            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">Farklı Frekans (DKT Sesi)</span>
              <span className="font-bold text-purple-300 print:text-purple-700">
                {session.speakerSeparation.therapistFrequencyRange || "110 - 180 Hz (Yetişkin DKT)"}
              </span>
            </div>

            <div className="bg-white/5 p-2.5 rounded-lg border border-white/10 print:bg-slate-50 print:border-slate-200">
              <span className="text-[9px] uppercase font-bold text-indigo-300 block mb-0.5 print:text-slate-500">DKT Yönerge Süresi</span>
              <span className="font-bold text-amber-300 print:text-amber-700">
                {session.speakerSeparation.therapistSpeechDurationSec ? `${session.speakerSeparation.therapistSpeechDurationSec} sn (Ölçüm Dışı)` : "Filtrelendi"}
              </span>
            </div>
          </div>

          {session.speakerSeparation.clinicalNote && (
            <div className="mt-2.5 text-[10.5px] text-indigo-200/90 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5 print:bg-slate-50 print:text-slate-700">
              <b>Klinik Değerlendirme:</b> {session.speakerSeparation.clinicalNote}
            </div>
          )}
        </div>
      )}

      {/* THERAPEUTIC PROGRESS & TREND OVER TIME (RECHARTS) */}
      {allSessions && allSessions.length > 0 && (
        <div className="print:hidden">
          <FluencyProgressTracker
            sessions={allSessions}
            clientId={session.clientId}
            clientName={session.clientName}
            highlightSessionId={session.id}
          />
        </div>
      )}

      {/* REPORT SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 print:block print:space-y-6">
        
        {/* Main Column */}
        <div className="md:col-span-8 space-y-6 print:w-full print:space-y-4">
          {/* Detailed Speech Transcription */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 print:p-0 print:border-none">
            <h3 className="text-xs font-bold text-slate-805 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2 print:border-b-2 print:border-slate-850 print:text-sm">
              <FileText className="w-4 h-4 text-indigo-600 print:hidden" />
              Klinik Transkripsiyon ve Etiketler
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl leading-relaxed print:bg-white print:border-none print:p-0">
              {renderTranscriptionWithStyling(session.transcription || "")}
            </div>
          </div>

          {/* Clinical Description Insights */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 print:p-0 print:border-none">
            <h3 className="text-xs font-bold text-slate-850 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2 print:border-b-2 print:border-slate-850 print:text-sm">
              <BarChart3 className="w-4 h-4 text-indigo-600 print:hidden" />
              Klinik Terapist Gözlemleri ve Bulgular
            </h3>
            <div className="text-xs text-slate-700 leading-relaxed font-sans space-y-2 whitespace-pre-line font-medium print:text-slate-800 print:text-sm">
              {session.analysisDetails || session.notes || "Klinik değerlendirme notu girilmemiş."}
            </div>
          </div>
        </div>

        {/* Sidebar recommendations */}
        <div className="md:col-span-4 space-y-6 print:w-full print:space-y-4">
          {/* Recommendations list */}
          <div className="bg-indigo-50/35 border border-indigo-100 rounded-xl p-5 space-y-4 print:p-0 print:bg-white print:border-none">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-100 pb-2 print:border-b-2 print:border-slate-850 print:text-sm print:pb-2">
              <AlertTriangle className="w-4 h-4 text-indigo-600 print:hidden" />
              Terapiste Yardımcı Literatür & Metodoloji Notları
            </h3>
            
            {session.recommendations && session.recommendations.length > 0 ? (
              <ul className="space-y-3 print:space-y-2">
                {session.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-slate-700 leading-normal font-medium print:text-sm print:text-slate-800">
                    <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5 font-mono print:bg-slate-200 print:text-slate-900">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-slate-400 text-[11px] py-4 font-semibold">
                Bu seans için otomatik öneri şablonu bulunmamaktadır.
              </div>
            )}
          </div>

          {/* Quick clinical indicators help */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-[10.5px] text-amber-900 leading-relaxed flex gap-2.5 font-medium print:bg-slate-50 print:border-slate-200">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 print:hidden" />
            <div>
              <strong className="font-bold block mb-0.5 text-amber-950">Klinik Yardımcı Araç Bildirimi:</strong>
              Bu rapordaki hece ölçümleri ve yapay zeka bulguları, Dil ve Konuşma Terapistine (DKT) veri ve analiz desteği sunan <strong>yardımcı bir araçtır; kesinlikle bir terapistin yerini alamaz</strong>. Terapi yöntemleri ve öneriler yalnızca standart literatür ve ders kitaplarında yer alan genel-geçer bilgi notlarıdır. Nihai tanı, klinik şiddet değerlendirmesi ve terapi planlaması yalnızca yetkili DKT tarafından yürütülür.
            </div>
          </div>

        </div>
      </div>

      {/* PDF PRINT SIGNATURE & AUTHORIZATION BLOCK */}
      <div className="pt-8 border-t border-slate-200 mt-8 flex flex-col sm:flex-row justify-between items-center gap-6 print:flex print:flex-row print:justify-between print:pt-6 print:border-t-2 print:border-slate-800">
        <div className="text-center sm:text-left text-[10px] text-slate-400 font-sans print:text-slate-500">
          <p className="font-bold">Dijital Klinik Karar Destek Sistemi (DKT AI-Analyst)</p>
          <p className="mt-0.5">Yapay Zeka Destekli Klinik Akıcılık & Fonetik Takip Analiz Raporu</p>
          <p className="mt-1 font-mono text-[9px]">Rapor ID: DKT-SYS-{session.id?.slice(0, 8).toUpperCase() || "VERIFIED"}</p>
        </div>
        <div className="text-center sm:text-right text-xs text-slate-700 font-sans min-w-[200px] print:text-right">
          <p className="font-bold text-slate-800">
            {currentUser 
              ? `${currentUser.title ? currentUser.title + " " : ""}${currentUser.firstName} ${currentUser.lastName}`
              : "Uzman Dil ve Konuşma Terapisti"
            }
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {currentUser?.title 
              ? (currentUser.title === "DKT" ? "Dil ve Konuşma Terapisti" : currentUser.title === "Uzman DKT" ? "Uzman Dil ve Konuşma Terapisti" : `${currentUser.title} / Dil ve Konuşma Terapisti`)
              : "Uzman Dil ve Konuşma Terapisti"
            }
          </p>
          <p className="text-[10px] text-slate-400 mt-1 mb-10 print:mb-12">İmza / Uygulama Onay Kaşesi</p>
          <div className="border-t border-slate-300 w-36 ml-auto print:border-slate-400"></div>
        </div>
      </div>

    </div>
  );
}
