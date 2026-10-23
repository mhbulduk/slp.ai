import React, { useState, useMemo } from "react";
import { Session } from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Gauge,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  Table,
  CheckCircle2,
  Filter,
  Info
} from "lucide-react";

export interface FluencyProgressTrackerProps {
  sessions: Session[];
  clientName?: string;
  clientId?: string;
  highlightSessionId?: string;
  compact?: boolean;
}

type MetricMode = "percentSS" | "syllableRate" | "disfluencyTypes" | "dualTrend";
type TaskFilter = "all" | "Reading" | "Conversation" | "Monologue";

export default function FluencyProgressTracker({
  sessions,
  clientName,
  clientId,
  highlightSessionId,
  compact = false
}: FluencyProgressTrackerProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>("percentSS");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [viewTable, setViewTable] = useState(false);

  // Filter client-specific sessions if clientId provided, else use passed sessions
  const clientSessions = useMemo(() => {
    let list = clientId ? sessions.filter((s) => s.clientId === clientId) : sessions;
    if (taskFilter !== "all") {
      list = list.filter((s) => s.type === taskFilter);
    }
    // Sort chronological: oldest to newest for trendline progression
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, clientId, taskFilter]);

  // Process data points for Recharts
  const chartData = useMemo(() => {
    return clientSessions.map((session, index) => {
      const durationSec = session.duration || 1;
      const totalSyllables = session.stats.totalSyllables || 0;
      // Syllable rate in Syllables Per Minute (SPM)
      const syllableRate = Math.round((totalSyllables / durationSec) * 60);
      const syllablesPerSec = Number((totalSyllables / durationSec).toFixed(1));

      const d = new Date(session.date);
      const shortDate = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
      const fullDate = d.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      return {
        id: session.id,
        sessionNumber: index + 1,
        sessionLabel: `S${index + 1}`,
        dateStr: shortDate,
        fullDate,
        rawDate: session.date,
        percentSS: Number(session.stats.percentSS.toFixed(1)),
        syllableRate,
        syllablesPerSec,
        totalSyllables,
        durationSec,
        blocks: session.stats.blocks || 0,
        repetitions: session.stats.repetitions || 0,
        prolongations: session.stats.prolongations || 0,
        totalDisfluencies: session.stats.totalDisfluencies || 0,
        severity: session.severity,
        type: session.type,
        notes: session.notes,
        isCurrent: session.id === highlightSessionId
      };
    });
  }, [clientSessions, highlightSessionId]);

  // Summary statistics
  const summary = useMemo(() => {
    if (chartData.length === 0) return null;

    const first = chartData[0];
    const latest = chartData[chartData.length - 1];

    const ssDiff = latest.percentSS - first.percentSS;
    const ssImprovementPct = first.percentSS > 0 
      ? (((first.percentSS - latest.percentSS) / first.percentSS) * 100).toFixed(0)
      : "0";

    const avgRate = Math.round(
      chartData.reduce((acc, d) => acc + d.syllableRate, 0) / chartData.length
    );

    const totalBlocks = chartData.reduce((acc, d) => acc + d.blocks, 0);
    const totalRepetitions = chartData.reduce((acc, d) => acc + d.repetitions, 0);
    const totalProlongations = chartData.reduce((acc, d) => acc + d.prolongations, 0);

    let dominantType = "Dengeli";
    if (totalBlocks > totalRepetitions && totalBlocks > totalProlongations) {
      dominantType = "Blok Ağırlıklı";
    } else if (totalRepetitions > totalBlocks && totalRepetitions > totalProlongations) {
      dominantType = "Tekrar Ağırlıklı";
    } else if (totalProlongations > totalBlocks && totalProlongations > totalRepetitions) {
      dominantType = "Uzatma Ağırlıklı";
    }

    return {
      initialSS: first.percentSS,
      latestSS: latest.percentSS,
      ssDiff,
      ssImprovementPct,
      avgRate,
      dominantType,
      sessionCount: chartData.length,
      firstDate: first.fullDate,
      latestDate: latest.fullDate
    };
  }, [chartData]);

  // Custom accessible Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs p-3.5 rounded-xl shadow-xl border border-slate-700 max-w-[260px] z-50 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-bold text-indigo-300 font-mono">
              Seans #{data.sessionNumber} ({data.dateStr})
            </span>
            <span
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                data.severity === "Hafif"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : data.severity === "Orta"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {data.severity}
            </span>
          </div>

          <div className="space-y-1.5 font-medium text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Akıcısızlık (%SS):</span>
              <strong className="text-indigo-400 font-mono font-bold text-xs">
                %{data.percentSS.toFixed(1)}
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Hece Hızı:</span>
              <strong className="text-emerald-400 font-mono font-bold">
                {data.syllableRate} H/dk ({data.syllablesPerSec} H/sn)
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Toplam Hece / Süre:</span>
              <span className="text-slate-300 font-mono">
                {data.totalSyllables} hece / {data.durationSec} sn
              </span>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-800/80 flex justify-between text-[10px] text-slate-400">
              <span className="text-rose-400">Blok: {data.blocks}</span>
              <span className="text-amber-400">Tekrar: {data.repetitions}</span>
              <span className="text-pink-400">Uzatma: {data.prolongations}</span>
            </div>

            {data.notes && (
              <p className="pt-1 text-[10px] text-slate-300 italic line-clamp-2 border-t border-slate-800/60 mt-1">
                "{data.notes}"
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // If there are less than 1 sessions recorded for this client
  if (chartData.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
        <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <h4 className="text-xs font-bold text-slate-700">Gelişim Grafiği İçin Yetersiz Veri</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          {taskFilter !== "all" 
            ? `Seçilen "${taskFilter === "Reading" ? "Okuma" : taskFilter === "Conversation" ? "Sohbet" : "Monolog"}" görev türünde kayıtlı seans bulunamadı. Filtreyi 'Tümü' yaparak diğer oturumları görebilirsiniz.`
            : "Bu danışan için henüz akıcılık oturumu kaydedilmemiş. Manuel sayaç veya yapay zeka ses analizi ile ilk seansı kaydedebilirsiniz."
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-indigo-600" />
              Terapötik Akıcılık ve Konuşma Gelişim Eğrisi (Recharts)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {clientName ? `${clientName} • ` : ""}
            Toplam {chartData.length} seans boyunca ölçümlenen kekemelik (%SS) ve hece hızı trendi.
          </p>
        </div>

        {/* Task type filter pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
          <button
            onClick={() => setTaskFilter("all")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              taskFilter === "all"
                ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setTaskFilter("Reading")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              taskFilter === "Reading"
                ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Okuma
          </button>
          <button
            onClick={() => setTaskFilter("Conversation")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              taskFilter === "Conversation"
                ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sohbet
          </button>
          <button
            onClick={() => setTaskFilter("Monologue")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              taskFilter === "Monologue"
                ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monolog
          </button>
        </div>
      </div>

      {/* Analytical KPI Scorecards */}
      {summary && chartData.length > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: %SS Change */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
              Akıcısızlık (%SS) Değişimi
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                %{summary.latestSS.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold line-through">
                %{summary.initialSS.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold">
              {summary.ssDiff <= 0 ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> %{Math.abs(summary.ssDiff).toFixed(1)} İyileşme
                </span>
              ) : (
                <span className="text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +%{summary.ssDiff.toFixed(1)} Artış
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Average Syllable Rate (SPM) */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
              Ortalama Hece Hızı
            </span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-xl font-black text-emerald-700 font-mono">
                {summary.avgRate}
              </span>
              <span className="text-[10px] font-bold text-slate-500">Hece / dk</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">
              Normal: ~150-220 H/dk
            </span>
          </div>

          {/* Card 3: Dominant Disfluency Pattern */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
              Baskın Akıcısızlık Türü
            </span>
            <div className="text-sm font-extrabold text-indigo-900 mt-1.5">
              {summary.dominantType}
            </div>
            <span className="text-[10px] font-semibold text-slate-500 mt-1">
              {summary.sessionCount} seans toplamı
            </span>
          </div>

          {/* Card 4: Clinical Trajectory */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">
              Klinik Seyir İndeksi
            </span>
            <div className="flex items-center gap-1.5 mt-1.5">
              {summary.ssDiff < 0 ? (
                <span className="text-emerald-700 font-black text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pozitif Regresyon
                </span>
              ) : (
                <span className="text-amber-700 font-black text-xs flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-amber-600" /> Stabil / Dalgalı
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-medium mt-1">
              Hedef: &lt; %3.0 Akıcısızlık
            </span>
          </div>
        </div>
      )}

      {/* Metric Mode Selectors & Table Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/70 text-[11px] font-bold">
          <button
            onClick={() => {
              setMetricMode("percentSS");
              setViewTable(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricMode === "percentSS" && !viewTable
                ? "bg-white text-indigo-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            %SS Akıcısızlık Oranı
          </button>

          <button
            onClick={() => {
              setMetricMode("syllableRate");
              setViewTable(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricMode === "syllableRate" && !viewTable
                ? "bg-white text-emerald-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-600" />
            Konuşma / Hece Hızı (SPM)
          </button>

          <button
            onClick={() => {
              setMetricMode("disfluencyTypes");
              setViewTable(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricMode === "disfluencyTypes" && !viewTable
                ? "bg-white text-purple-700 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            Akıcısızlık Türleri Dağılımı
          </button>

          <button
            onClick={() => {
              setMetricMode("dualTrend");
              setViewTable(false);
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              metricMode === "dualTrend" && !viewTable
                ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            Kombine Trend (Çift Eksen)
          </button>
        </div>

        <button
          onClick={() => setViewTable(!viewTable)}
          className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            viewTable
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          {viewTable ? "Grafiğe Dön" : "Klinik Veri Tablosu"}
        </button>
      </div>

      {/* MAIN VIEW: Chart or Data Table */}
      {viewTable ? (
        /* Clinical Data Table */
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full divide-y divide-slate-200 text-[11px]">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2.5 text-left">Seans</th>
                <th className="px-3 py-2.5 text-left">Tarih</th>
                <th className="px-3 py-2.5 text-left">Görev</th>
                <th className="px-3 py-2.5 text-right">Süre</th>
                <th className="px-3 py-2.5 text-right">Toplam Hece</th>
                <th className="px-3 py-2.5 text-right text-rose-600">Blok</th>
                <th className="px-3 py-2.5 text-right text-amber-600">Tekrar</th>
                <th className="px-3 py-2.5 text-right text-pink-600">Uzatma</th>
                <th className="px-3 py-2.5 text-right text-indigo-700 font-black">%SS</th>
                <th className="px-3 py-2.5 text-right text-emerald-700 font-bold">Hece Hızı (SPM)</th>
                <th className="px-3 py-2.5 text-center">Şiddet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-700">
              {chartData.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-indigo-50/20 transition-colors ${
                    row.isCurrent ? "bg-indigo-50/60 font-bold" : ""
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-slate-900">
                    #{row.sessionNumber}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-500">{row.dateStr}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        row.type === "Reading"
                          ? "bg-amber-100 text-amber-800"
                          : row.type === "Conversation"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {row.type === "Reading"
                        ? "Okuma"
                        : row.type === "Conversation"
                        ? "Sohbet"
                        : "Monolog"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{row.durationSec} sn</td>
                  <td className="px-3 py-2 text-right font-mono">{row.totalSyllables}</td>
                  <td className="px-3 py-2 text-right font-mono text-rose-600 font-bold">{row.blocks}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-600 font-bold">{row.repetitions}</td>
                  <td className="px-3 py-2 text-right font-mono text-pink-600 font-bold">{row.prolongations}</td>
                  <td className="px-3 py-2 text-right font-mono font-black text-indigo-700">
                    %{row.percentSS.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                    {row.syllableRate} H/dk
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        row.severity === "Hafif"
                          ? "bg-emerald-100 text-emerald-800"
                          : row.severity === "Orta"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {row.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Recharts Interactive Visualizer */
        <div className="w-full bg-slate-50/60 p-4 rounded-xl border border-slate-150">
          
          {/* Chart 1: %SS Disfluency Progression (AreaChart) */}
          {metricMode === "percentSS" && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-600 rounded-sm inline-block" />
                  Kekemelik Akıcısızlık Yüzdesi (%SS)
                </span>
                <span className="text-[10px] text-slate-400">
                  Düşük değer daha yüksek akıcılığı gösterir
                </span>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ssGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={3.0}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: "Hafif Eşik (%3)", fill: "#059669", fontSize: 9, position: "insideBottomLeft" }}
                    />
                    <ReferenceLine
                      y={8.0}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{ value: "Orta Eşik (%8)", fill: "#d97706", fontSize: 9, position: "insideBottomLeft" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="percentSS"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#ssGradient)"
                      dot={{ r: 4, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#312e81", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Syllable Rate (SPM) (LineChart / AreaChart) */}
          {metricMode === "syllableRate" && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-emerald-600 rounded-sm inline-block" />
                  Konuşma / Hece Hızı (Syllable Rate - H/dk)
                </span>
                <span className="text-[10px] text-slate-400">
                  Klinik hedef aralığı: 150 - 220 hece / dakika
                </span>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={160}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      label={{ value: "Alt Standart (160 H/dk)", fill: "#059669", fontSize: 9, position: "insideBottomLeft" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="syllableRate"
                      stroke="#059669"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#rateGradient)"
                      dot={{ r: 4, fill: "#059669", stroke: "#ffffff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#064e3b", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 3: Disfluency Types Breakdown (Stacked BarChart) */}
          {metricMode === "disfluencyTypes" && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-rose-500 rounded-sm inline-block" /> Blok,
                  <span className="w-3 h-3 bg-amber-500 rounded-sm inline-block ml-1" /> Tekrar,
                  <span className="w-3 h-3 bg-pink-500 rounded-sm inline-block ml-1" /> Uzatma Dağılımı
                </span>
                <span className="text-[10px] text-slate-400">
                  Oturum başı takılma kompozisyonu
                </span>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      iconType="circle"
                      formatter={(val) => {
                        const labels: Record<string, string> = {
                          blocks: "Bloklar",
                          repetitions: "Tekrarlar",
                          prolongations: "Uzatmalar"
                        };
                        return <span className="text-[10px] font-bold text-slate-600 mr-2">{labels[val] || val}</span>;
                      }}
                    />
                    <Bar dataKey="blocks" stackId="disfluency" fill="#e11d48" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="repetitions" stackId="disfluency" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="prolongations" stackId="disfluency" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 4: Dual Trend (ComposedChart: %SS & Hece Hızı) */}
          {metricMode === "dualTrend" && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full inline-block" /> %SS (Sol)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full inline-block" /> Hece Hızı SPM (Sağ)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Akıcılık ile konuşma hızının eşzamanlı korelasyonu
                </span>
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#4f46e5", fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#059669", fontSize: 10, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      yAxisId="left"
                      dataKey="percentSS"
                      fill="#818cf8"
                      opacity={0.65}
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="syllableRate"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#059669", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Clinical Guidance Footnote */}
      <div className="flex items-start gap-2 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100/60 text-[10px] text-indigo-900 font-medium">
        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
        <p>
          <strong>Klinik DKT Notu:</strong> Akıcılık modifikasyonu sürecinde kekemeliğin şiddeti (%SS) düşerken, konuşma hızının (SPM) doğal aralıkta (160-220 H/dk) dengelenmesi amaçlanır. Blok ve uzatmaların kolay tekrarlara, ardından akıcı üretime evrilmesi terapötik ilerlemenin temel göstergesidir.
        </p>
      </div>

    </div>
  );
}
