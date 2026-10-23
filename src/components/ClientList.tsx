import { useState, FormEvent } from "react";
import { Client, Session } from "../types";
import { Plus, User, Search, FileText, Calendar, Trash2, TrendingDown, Clock, Smile } from "lucide-react";
import FluencyProgressTracker from "./FluencyProgressTracker";

interface ClientListProps {
  clients: Client[];
  sessions: Session[];
  onAddClient: (client: { name: string; age: number; notes: string; parentName?: string }) => void;
  onDeleteClient: (id: string) => void;
  onSelectClient: (client: Client) => void;
  selectedClient: Client | null;
  onViewSessionReport: (session: Session) => void;
}

export default function ClientList({
  clients,
  sessions,
  onAddClient,
  onDeleteClient,
  onSelectClient,
  selectedClient,
  onViewSessionReport
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [parentName, setParentName] = useState("");
  const [notes, setNotes] = useState("");

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientSessions = selectedClient
    ? sessions
        .filter((s) => s.clientId === selectedClient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;
    onAddClient({
      name,
      age: Number(age),
      notes,
      parentName: parentName || undefined
    });
    setName("");
    setAge("");
    setParentName("");
    setNotes("");
    setIsOpenAddModal(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
      {/* LEFT COLUMN: Client Roster */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Danışan Listesi
          </h2>
          <button
            onClick={() => setIsOpenAddModal(true)}
            id="btn-add-client-modal"
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Ekle
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="İsim ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:outline-hidden focus:border-indigo-550 rounded-lg pl-9 py-2 text-xs text-slate-800 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] lg:max-h-[500px] pr-1">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Eşleşen danışan bulunamadı.
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const activeSessionsCount = sessions.filter((s) => s.clientId === client.id).length;
              return (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-indigo-50/50 border-indigo-200 shadow-3xs"
                      : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isSelected ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-800"
                    }`}>
                      {client.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{client.name}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{client.age} yaşında {client.parentName ? "• Velili" : ""}</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-650 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {activeSessionsCount} Seans
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Client Diagnostics & Session History */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {selectedClient ? (
          <>
            {/* Selected Client Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 relative">
              <button
                onClick={() => onDeleteClient(selectedClient.id)}
                title="Danışanı sil"
                className="absolute top-6 right-6 p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-800 rounded-xl flex items-center justify-center text-md font-bold shrink-0">
                  {selectedClient.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800">{selectedClient.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                    <span><strong>Yaş:</strong> {selectedClient.age}</span>
                    {selectedClient.parentName && (
                      <>
                        <span>•</span>
                        <span><strong>Veli / İletişim:</strong> {selectedClient.parentName}</span>
                      </>
                    )}
                    <span>•</span>
                    <span><strong>Kayıt Tarihi:</strong> {new Date(selectedClient.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
              </div>

              {selectedClient.notes && (
                <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50 text-[11px] text-slate-705">
                  <h5 className="font-bold text-indigo-900 mb-1">DKT Özgeçmiş & Klinik Notlar:</h5>
                  <p className="italic leading-relaxed">{selectedClient.notes}</p>
                </div>
              )}

              {/* Interactive Fluency Progress Tracker (Recharts) */}
              <div className="mt-2">
                <FluencyProgressTracker
                  sessions={sessions}
                  clientId={selectedClient.id}
                  clientName={selectedClient.name}
                />
              </div>
            </div>
 
            {/* Session Records List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h4 className="text-xs font-bold text-slate-850 uppercase tracking-widest mb-4">
                Oturum Teşhis ve Rapor Geçmişi ({clientSessions.length})
              </h4>
 
              {clientSessions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 max-w-[280px] mx-auto font-medium">
                    Kayıtlı oturum bulunamadı. Yapay zeka analizi yapabilir veya manuel sayaç ile oturum ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 bg-white hover:bg-indigo-50/10 border border-slate-150 hover:border-indigo-200 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            session.type === "Reading" ? "bg-amber-100 text-amber-800" :
                            session.type === "Conversation" ? "bg-indigo-100 text-indigo-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {session.type === "Reading" ? "Okuma" :
                             session.type === "Conversation" ? "Karşılıklı Sohbet" :
                             session.type === "Monologue" ? "Monolog" : "Diğer Konuşma"}
                          </span>
                          <span className="text-slate-500 text-[11px] flex items-center gap-1 font-mono font-medium">
                            <Clock className="w-3 h-3" /> {Math.floor(session.duration / 60)} dk {session.duration % 60} sn
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            session.severity === "Hafif" ? "bg-emerald-100 text-emerald-800" :
                            session.severity === "Orta" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            SSI: {session.severity}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(session.date).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </h5>
                        {session.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-1">
                            "{session.notes}"
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-550 bg-slate-50 p-1 px-2 rounded-md font-mono self-start border border-slate-100">
                          <span><strong>Toplam Hece:</strong> {session.stats.totalSyllables}</span>
                          <span>•</span>
                          <span><strong>Blok:</strong> {session.stats.blocks}</span>
                          <span>•</span>
                          <span><strong>Tekrar:</strong> {session.stats.repetitions}</span>
                          <span>•</span>
                          <span><strong>Uzatma:</strong> {session.stats.prolongations}</span>
                          <span>•</span>
                          <span className="text-indigo-750 font-bold"><strong>%SS:</strong> {session.stats.percentSS.toFixed(1)}</span>
                        </div>
                      </div>
 
                      <div className="flex md:flex-col items-end gap-2 shrink-0">
                        {session.isManual ? (
                          <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-sm font-medium self-end">
                            Manuel Sayaç
                          </span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] px-2 py-0.5 rounded-sm font-semibold flex items-center gap-0.5 border border-indigo-100 self-end">
                            <Smile className="w-2.5 h-2.5" /> Yapay Zeka Raporlu
                          </span>
                        )}
                        <button
                          onClick={() => onViewSessionReport(session)}
                          className="w-full md:w-auto bg-indigo-50 hover:bg-indigo-150 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                        >
                          Raporu Görüntüle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-205 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">DKT Paneline Hoş Geldiniz</h4>
            <p className="text-xs text-slate-500 max-w-[320px] leading-relaxed font-semibold">
              Sol taraftan mevcut bir danışan seçerek seans gelişim çizgisine, kekemelik detaylarına ve AI raporlarına ulaşabilirsiniz. Yeni danışan eklemek için "Ekle" butonunu kullanın.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: Add Client */}
      {isOpenAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-650 p-4.5 text-white" style={{ backgroundColor: "#4f46e5" }}>
              <h3 className="text-md font-bold font-sans">Yeni Danışan Kayıt Formu</h3>
              <p className="text-[11px] text-indigo-100 mt-0.5 font-medium">Lütfen danışanın tıbbi/klinik özgeçmişini ve kimlik bilgilerini doldurun.</p>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    required
                    placeholder="örn: Canan Türk"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 focus:outline-hidden focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-900 font-bold transition-all placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">Yaş *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    placeholder="9"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-250 focus:outline-hidden focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-900 transition-all font-mono font-bold placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">Veli Adı & İletişim Notları (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="örn: Selim Türk (Baba) - 0555 Xxx Xx"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:outline-hidden focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-900 font-semibold transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">Klinik Notlar, Hikayesi & Hedefler</label>
                <textarea
                  placeholder="Hece/Ses uzatmaları ne kadar zamandır sürüyor? İkincil semptom veya çekinme durumu var mı?"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:outline-hidden focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-900 font-semibold transition-all resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: "#4f46e5" }}
                >
                  Danışanı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
