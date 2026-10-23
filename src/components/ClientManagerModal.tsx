import { useState, FormEvent, useEffect } from "react";
import { Client } from "../types";
import { Users, UserPlus, Search, Trash2, Check, X, User, Phone, FileText } from "lucide-react";

interface ClientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  onAddClient: (client: { name: string; age: number; notes: string; parentName?: string }) => Client | void;
  onDeleteClient: (id: string) => void;
  initialTab?: "list" | "add";
  titleContext?: string; // e.g. "KSB (IPA) Modülü" or "Dil / OSU Modülü"
}

export default function ClientManagerModal({
  isOpen,
  onClose,
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  onDeleteClient,
  initialTab = "list",
  titleContext
}: ClientManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "add">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  
  // New client form state
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [parentName, setParentName] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchTerm("");
      setFormError(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.parentName && c.parentName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Danışan adı soyadı zorunludur.");
      return;
    }
    if (age === "" || isNaN(Number(age)) || Number(age) <= 0) {
      setFormError("Geçerli bir yaş giriniz.");
      return;
    }

    const created = onAddClient({
      name: name.trim(),
      age: Number(age),
      parentName: parentName.trim() || undefined,
      notes: notes.trim()
    });

    if (created && created.id) {
      onSelectClient(created.id);
    }

    setName("");
    setAge("");
    setParentName("");
    setNotes("");
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Danışan Yönetim Merkezi</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {titleContext ? `${titleContext} • ` : ""}Toplam {clients.length} Kayıtlı Danışan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB TOGGLES */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-1.5 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "list"
                ? "bg-white text-indigo-600 shadow-3xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Danışan Listesi ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "add"
                ? "bg-white text-indigo-600 shadow-3xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            + Yeni Danışan Ekle
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: CLIENT LIST & REMOVAL */}
          {activeTab === "list" && (
            <div className="space-y-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Danışan adı veya veli bilgisi ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              {/* Roster Cards */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-3">
                    <User className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-medium">
                      {searchTerm ? "Aramaya uygun danışan bulunamadı." : "Henüz danışan kaydı bulunmuyor."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("add")}
                      className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Yeni Danışan Oluştur
                    </button>
                  </div>
                ) : (
                  filteredClients.map((client) => {
                    const isSelected = selectedClientId === client.id;
                    return (
                      <div
                        key={client.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-50/40 border-indigo-300 shadow-3xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {client.name}
                            </h4>
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              {client.age} Yaş
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-md tracking-wider uppercase flex items-center gap-1">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                Seçili
                              </span>
                            )}
                          </div>
                          
                          {client.parentName && (
                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {client.parentName}
                            </p>
                          )}
                          
                          {client.notes && (
                            <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 font-medium mt-1">
                              {client.notes}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          {!isSelected ? (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectClient(client.id);
                                onClose();
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
                            >
                              Seç
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/60 px-2.5 py-1.5 rounded-lg">
                              Aktif
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onDeleteClient(client.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Danışanı Sistemden Sil / Çıkar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW CLIENT */}
          {activeTab === "add" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Danışan Adı Soyadı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Eren Kaya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Yaş <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={120}
                    placeholder="Örn: 6"
                    value={age}
                    onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Veli / İletişim Bilgisi
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Zeynep Kaya (Anne)"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Klinik Ön Not / Tanı Bilgisi</span>
                  <span className="text-[10px] text-slate-400 font-normal">İsteğe bağlı</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Örn: Akıcı konuşma ve artikülasyon /r/ sesi gecikmesi çalışılacak..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Listeye Dön
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Danışanı Kaydet ve Seç
                </button>
              </div>
            </form>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[10px] font-semibold text-slate-400">
            Eklenen danışanlar tüm modüllerde otomatik senkronize edilir.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
