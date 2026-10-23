import { useState, useEffect } from "react";
import { User } from "../types";
import { 
  Users, Search, ShieldAlert, Sparkles, AlertCircle, RefreshCw, Calendar, Mail, FileText, 
  Trash2, UserX, Check, X, Zap, Activity, Clock, Sliders, History, ShieldCheck 
} from "lucide-react";

interface AdminPanelProps {
  adminEmail: string;
}

export default function AdminPanel({ adminEmail }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // API Usage states
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const [newLimit, setNewLimit] = useState(1000);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  // Deletion states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);

  const fetchApiUsage = async () => {
    setApiLoading(true);
    try {
      const response = await fetch("/api/admin/api-usage", {
        headers: {
          "x-user-email": adminEmail
        }
      });
      if (response.ok) {
        const data = await response.json();
        setApiUsage(data);
        setNewLimit(data.totalLimit);
      }
    } catch (err) {
      console.error("Error fetching API usage:", err);
    } finally {
      setApiLoading(false);
    }
  };

  const handleSetLimit = async () => {
    try {
      const response = await fetch("/api/admin/api-usage/set-limit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": adminEmail
        },
        body: JSON.stringify({ limit: Number(newLimit) })
      });
      if (response.ok) {
        const data = await response.json();
        setApiUsage(data.usage);
        setEditingLimit(false);
        setActionMessage({ text: "API kullanım limiti başarıyla güncellendi.", type: "success" });
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || "Limit güncellenemedi.", type: "error" });
    }
  };

  const handleResetUsage = async () => {
    try {
      const response = await fetch("/api/admin/api-usage/reset", {
        method: "POST",
        headers: {
          "x-user-email": adminEmail
        }
      });
      if (response.ok) {
        const data = await response.json();
        setApiUsage(data.usage);
        setResetConfirm(false);
        setActionMessage({ text: "API kullanım istatistikleri başarıyla sıfırlandı.", type: "success" });
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || "Sıfırlama başarısız oldu.", type: "error" });
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          "x-user-email": adminEmail
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Kullanıcılar yüklenirken bir hata oluştu.");
      }

      const data = await response.json();
      setUsers(data.users || []);
      
      // Also fetch API usage in parallel
      await fetchApiUsage();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Kullanıcı listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    setActionMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": adminEmail
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kullanıcı silinirken bir hata oluştu.");
      }

      setActionMessage({ text: "Kullanıcı başarıyla sistemden silindi.", type: "success" });
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error(err);
      setActionMessage({ text: err?.message || "Kullanıcı silinemedi.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [adminEmail]);

  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 font-sans">Yönetici Paneli (Kayıtlı DKT Listesi)</h2>
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                Süper Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Sisteme kayıtlı tüm Dil ve Konuşma Terapistlerinin profil ve kayıt bilgilerini kontrol edin.
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-705 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Listeyi Yenile
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="relative flex h-8 w-8">
            <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></div>
            <div className="relative inline-flex rounded-full h-8 w-8 bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
              ...
            </div>
          </div>
          <p className="text-xs text-slate-500 font-semibold">Kullanıcı veri havuzu sorgulanıyor...</p>
        </div>
      ) : error ? (
        <div className="py-12 bg-rose-50/50 border border-rose-150 rounded-2xl flex flex-col items-center p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-rose-600 mb-3" />
          <p className="text-sm font-bold text-rose-950">Yetkilendirme Hatası veya Sunucu Bağlantı Kesintisi</p>
          <p className="text-xs text-rose-800 font-medium mt-1 max-w-md">{error}</p>
          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-semibold">
            Giriş yaptığınız e-posta: <strong className="text-indigo-600">{adminEmail}</strong>. Bu sayfa sadece sisteme atanmış yetkili geliştirici/admin e-postasına açıktır.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* Action indicator messages */}
          {actionMessage && (
            <div className={`flex items-center gap-2 p-3 text-xs rounded-xl border ${
              actionMessage.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-150" 
                : "bg-rose-50 text-rose-800 border-rose-150"
            } animate-in fade-in slide-in-from-top-1 duration-200`}>
              <AlertCircle className={`w-4 h-4 ${actionMessage.type === "success" ? "text-emerald-600" : "text-rose-600"}`} />
              <span className="font-semibold">{actionMessage.text}</span>
              <button 
                onClick={() => setActionMessage(null)} 
                className="ml-auto text-[10px] hover:underline font-bold text-slate-500 cursor-pointer"
              >
                Kapat
              </button>
            </div>
          )}

          {/* API Usage & Quotas Dashboard */}
          {apiUsage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 border border-slate-200/80 p-5 rounded-2xl">
              
              {/* Card 1: Usage Credit Ratio */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">API KULLANIM KOTASI</span>
                  <div className="w-7 h-7 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-amber-500" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {apiUsage.usedCount}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      / {apiUsage.totalLimit} istek
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">
                    Kalan Hak: <strong className="text-indigo-600 font-mono">{Math.max(0, apiUsage.totalLimit - apiUsage.usedCount)}</strong> istek
                  </p>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/40">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (apiUsage.usedCount / apiUsage.totalLimit) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Module breakdown */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">MODÜL BAZLI DAĞILIM</span>
                  <div className="w-7 h-7 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                  <div className="bg-slate-50/55 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                    <span>Kekemelik:</span>
                    <span className="text-indigo-600 font-mono">{(apiUsage.byModule && apiUsage.byModule.fluency) || 0}</span>
                  </div>
                  <div className="bg-slate-50/55 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                    <span>Artikülasyon:</span>
                    <span className="text-indigo-600 font-mono">{(apiUsage.byModule && apiUsage.byModule.articulation) || 0}</span>
                  </div>
                  <div className="bg-slate-50/55 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                    <span>Dil / MLU:</span>
                    <span className="text-indigo-600 font-mono">{(apiUsage.byModule && apiUsage.byModule.language) || 0}</span>
                  </div>
                  <div className="bg-slate-50/55 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                    <span>Ses / Disfoni:</span>
                    <span className="text-teal-600 font-mono">{(apiUsage.byModule && (apiUsage.byModule as any).voice) || 0}</span>
                  </div>
                  <div className="bg-slate-50/55 p-1.5 rounded border border-slate-100 flex items-center justify-between">
                    <span>DKT Chat:</span>
                    <span className="text-indigo-600 font-mono">{(apiUsage.byModule && apiUsage.byModule.chat) || 0}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Limits & Controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">KOTA YÖNETİMİ</span>
                  <div className="w-7 h-7 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                </div>

                {editingLimit ? (
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                      min={1}
                      placeholder="Limit"
                    />
                    <button 
                      onClick={handleSetLimit}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2 py-1.5 rounded shadow-xs cursor-pointer"
                    >
                      Kaydet
                    </button>
                    <button 
                      onClick={() => {
                        setEditingLimit(false);
                        setNewLimit(apiUsage.totalLimit);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] px-2 py-1.5 rounded border border-slate-200 cursor-pointer"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setEditingLimit(true)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                    >
                      Limiti Değiştir
                    </button>

                    {resetConfirm ? (
                      <div className="flex items-center gap-1 bg-rose-50 p-1 rounded border border-rose-150">
                        <span className="text-[9px] text-rose-700 font-bold mr-1">Emin misiniz?</span>
                        <button 
                          onClick={handleResetUsage}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer"
                        >
                          Evet
                        </button>
                        <button 
                          onClick={() => setResetConfirm(false)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] px-2 py-1 rounded border border-slate-200 cursor-pointer"
                        >
                          Hayır
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setResetConfirm(true)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-extrabold px-2.5 py-1.5 rounded border border-rose-200 transition-colors cursor-pointer"
                      >
                        Kullanımı Sıfırla
                      </button>
                    )}
                  </div>
                )}

                <div className="text-[9px] text-slate-400 font-semibold leading-tight">
                  Kullanım limiti dolduğunda sistem yapay zeka analizlerini durdurur ve kotayı korur.
                </div>
              </div>

            </div>
          )}

          {/* Toggle Logs Button */}
          {apiUsage && apiUsage.recentLogs && apiUsage.recentLogs.length > 0 && (
            <div className="flex justify-start">
              <button 
                onClick={() => setShowLogs(!showLogs)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-150/40 text-[10px] font-extrabold px-3 py-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer bg-white"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                {showLogs ? "Sistem API Günlüklerini Gizle" : `Sistem API Günlüklerini Göster (${apiUsage.recentLogs.length})`}
              </button>
            </div>
          )}

          {/* Detailed Logs Panel */}
          {apiUsage && showLogs && apiUsage.recentLogs && (
            <div className="border border-slate-200 rounded-xl bg-white shadow-xs p-4 animate-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-extrabold text-slate-800 tracking-wide uppercase">DURUM İZLEME VE API LOGLARI (SON 50 İSTEK)</span>
              </div>
              
              <div className="overflow-y-auto max-h-64 border border-slate-100 rounded-lg">
                <table className="min-w-full divide-y divide-slate-150">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tarih / Saat</th>
                      <th scope="col" className="px-4 py-2 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Talep Eden DKT</th>
                      <th scope="col" className="px-4 py-2 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Modül</th>
                      <th scope="col" className="px-4 py-2 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white font-medium text-[10px]">
                    {apiUsage.recentLogs.map((log: any) => {
                      const modLabels: Record<string, string> = {
                        fluency: "Kekemelik / Akıcılık",
                        articulation: "Artikülasyon / IPA",
                        language: "Dil Gelişimi / MLU",
                        chat: "DKT Chat Asistanı"
                      };
                      const modColors: Record<string, string> = {
                        fluency: "bg-blue-50 text-blue-700 border-blue-150",
                        articulation: "bg-purple-50 text-purple-700 border-purple-150",
                        language: "bg-pink-50 text-pink-700 border-pink-150",
                        chat: "bg-indigo-50 text-indigo-700 border-indigo-150"
                      };
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-2 whitespace-nowrap text-slate-400 font-mono font-bold">
                            {new Date(log.timestamp).toLocaleString("tr-TR")}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-slate-705 font-semibold">
                            {log.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${modColors[log.module] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {modLabels[log.module] || log.module}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {log.status === "success" ? (
                              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-150 flex items-center gap-0.5 w-max">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Başarılı
                              </span>
                            ) : (
                              <span className="bg-rose-50 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-150 flex items-center gap-0.5 w-max">
                                <X className="w-3 h-3 text-rose-600" /> Hata
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="İsim, soyisim, e-posta veya kullanıcı adı ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9.5 pr-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold"
            />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Dil ve Konuşma Terapisti
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    E-Posta
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Kullanıcı Adı
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    Kayıt Tarihi
                  </th>
                  <th scope="col" className="px-5 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                     Yetki / İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-500 font-semibold leading-relaxed">
                      Eşleşen ya da kayıtlı herhangi bir DKT bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const ADMIN_EMAILS = ["mehmethanefibulduk@gmail.com", "aycayasar389@gmail.com"];
                    const isAdminUser = ADMIN_EMAILS.includes(user.email.toLowerCase());
                    const isConfirming = deleteConfirmId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold text-xs flex items-center justify-center">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-none">
                                {user.title ? `${user.title} ` : ""}{user.firstName} {user.lastName}
                              </p>
                              <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">
                                {isAdminUser ? "Süper Yönetici" : (user.title === "DKT" ? "Dil ve Konuşma Terapisti" : user.title === "Uzman DKT" ? "Uzman Dil ve Konuşma Terapisti" : `${user.title} / DKT`)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-705 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {user.email}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            @{user.username}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(user.createdAt).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isAdminUser ? (
                            <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-200">
                              Kurucu / Silinemez
                            </span>
                          ) : isConfirming ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[10px] text-rose-600 font-bold mr-1 animate-pulse">Emin misiniz?</span>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={deletingId === user.id}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-1 rounded flex items-center gap-0.5 shadow-sm hover:shadow-xs transition-colors cursor-pointer"
                                title="Evet, kullanıcıyı sistemden sil"
                              >
                                {deletingId === user.id ? (
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Evet
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1 rounded flex items-center gap-0.5 border border-slate-200 transition-colors cursor-pointer"
                                title="İptal et"
                              >
                                <X className="w-3.5 h-3.5" />
                                İptal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setActionMessage(null);
                                setDeleteConfirmId(user.id);
                              }}
                              className="bg-white hover:bg-rose-50 text-rose-600 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-rose-200 hover:border-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Kullanıcıyı sistemden tamamen sil ve üyeliğini sonlandır"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              Sistemden Çıkar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl p-3 text-[10px] text-slate-500 font-semibold leading-relaxed mt-2">
            <AlertCircle className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <span>
              Bu kayıtlar doğrudan sunucudaki güvenli disk depolamasından (<code>users.json</code>) okunmaktadır. Herhangi bir harici sızıntıyı engellemek için şifre bilgileri transkripsiyon dışında tutulmakta ve sadece kimlik doğrulamada kullanılmaktadır.
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
