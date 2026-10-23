import { useState, useEffect } from "react";
import { getStoredClients, saveStoredClients, getStoredSessions, saveStoredSessions } from "./utils/storage";
import { Client, Session, ActiveTab, User } from "./types";
import { BookOpen, Mic, Keyboard, Users, Shield, GraduationCap, ArrowRight, Sparkles, LogOut, CheckCircle, AudioLines, AlertTriangle, BarChart2, LayoutGrid, HeartPulse, Activity, ShieldCheck, Wrench } from "lucide-react";
import ClientList from "./components/ClientList";
import SessionTracker from "./components/SessionTracker";
import SessionRecorder from "./components/SessionRecorder";
import ReportViewer from "./components/ReportViewer";
import InfoHub from "./components/InfoHub";
import QuickNotesSidebar from "./components/QuickNotesSidebar";
import AuthScreen from "./components/AuthScreen";
import AdminPanel from "./components/AdminPanel";
import ArticulationAnalyzer from "./components/ArticulationAnalyzer";
import LanguageAnalyzer from "./components/LanguageAnalyzer";
import VoiceDisorderAnalyzer from "./components/VoiceDisorderAnalyzer";
import DktChatAssistant from "./components/DktChatAssistant";
import AccuracyBenchmarkModal from "./components/AccuracyBenchmarkModal";
import SystemDiagnosticModal from "./components/SystemDiagnosticModal";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("dkt_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Sync currentUser to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("dkt_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("dkt_current_user");
    }
  }, [currentUser]);

  const [clients, setClients] = useState<Client[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedModule, setSelectedModule] = useState<"fluency" | "articulation" | "language" | "voice" | "admin" | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"assistant" | "portal">("assistant");
  const [activeTab, setActiveTab] = useState<ActiveTab>("clients");
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);

  // Load baseline client data and restore previous session context from user-scoped localStorage on mount or login
  useEffect(() => {
    if (!currentUser) return;
    
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    const storedClientsData = localStorage.getItem(`dkt_clients_${emailKey}`);
    const storedSessionsData = localStorage.getItem(`dkt_sessions_${emailKey}`);

    let loadedClients: Client[] = [];
    let loadedSessions: Session[] = [];

    if (storedClientsData) {
      loadedClients = JSON.parse(storedClientsData);
    } else {
      loadedClients = getStoredClients();
      localStorage.setItem(`dkt_clients_${emailKey}`, JSON.stringify(loadedClients));
    }

    if (storedSessionsData) {
      loadedSessions = JSON.parse(storedSessionsData);
    } else {
      loadedSessions = getStoredSessions();
      localStorage.setItem(`dkt_sessions_${emailKey}`, JSON.stringify(loadedSessions));
    }

    setClients(loadedClients);
    setSessions(loadedSessions);
    
    // Restore previous selected client
    const storedClientId = localStorage.getItem(`dkt_selected_client_id_${emailKey}`);
    const clientToSelect = loadedClients.find(c => c.id === storedClientId);
    if (clientToSelect) {
      setSelectedClient(clientToSelect);
    } else if (loadedClients.length > 0) {
      setSelectedClient(loadedClients[0]);
    } else {
      setSelectedClient(null);
    }

    // Restore previous selected module (fluency, articulation, language, etc.)
    const storedModule = localStorage.getItem(`dkt_selected_module_${emailKey}`);
    if (storedModule) {
      setSelectedModule(storedModule as any);
    } else {
      setSelectedModule(null);
    }

    // Restore previous active tab
    const storedActiveTab = localStorage.getItem(`dkt_active_tab_${emailKey}`);
    if (storedActiveTab) {
      setActiveTab(storedActiveTab as any);
    } else {
      setActiveTab("clients");
    }

    // Restore previous viewing session
    const storedViewingSessionId = localStorage.getItem(`dkt_viewing_session_id_${emailKey}`);
    const sToView = loadedSessions.find(s => s.id === storedViewingSessionId);
    if (sToView) {
      setViewingSession(sToView);
    } else {
      setViewingSession(null);
    }
  }, [currentUser]);

  // Sync selectedClient to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    if (selectedClient) {
      localStorage.setItem(`dkt_selected_client_id_${emailKey}`, selectedClient.id);
    } else {
      localStorage.removeItem(`dkt_selected_client_id_${emailKey}`);
    }
  }, [selectedClient, currentUser]);

  // Sync selectedModule to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    if (selectedModule) {
      localStorage.setItem(`dkt_selected_module_${emailKey}`, selectedModule);
    } else {
      localStorage.removeItem(`dkt_selected_module_${emailKey}`);
    }
  }, [selectedModule, currentUser]);

  // Sync activeTab to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    localStorage.setItem(`dkt_active_tab_${emailKey}`, activeTab);
  }, [activeTab, currentUser]);

  // Sync viewingSession to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    if (viewingSession) {
      localStorage.setItem(`dkt_viewing_session_id_${emailKey}`, viewingSession.id);
    } else {
      localStorage.removeItem(`dkt_viewing_session_id_${emailKey}`);
    }
  }, [viewingSession, currentUser]);

  const saveUserClients = (updated: Client[]) => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    setClients(updated);
    localStorage.setItem(`dkt_clients_${emailKey}`, JSON.stringify(updated));
  };

  const saveUserSessions = (updated: Session[]) => {
    if (!currentUser) return;
    const emailKey = currentUser.email.replace(/[@.]/g, "_");
    setSessions(updated);
    localStorage.setItem(`dkt_sessions_${emailKey}`, JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.removeItem("dkt_current_user");
    setCurrentUser(null);
    setActiveTab("clients");
    setViewingSession(null);
    setSelectedModule(null);
  };

  const [authError, setAuthError] = useState<string | null>(null);

  // Periodic user status check (deleted users get restored if possible, banned users get instantly kicked out)
  useEffect(() => {
    if (!currentUser) return;

    const checkUserStatus = async () => {
      try {
        const response = await fetch(`/api/auth/check-status?email=${encodeURIComponent(currentUser.email)}&id=${currentUser.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "banned") {
            handleLogout();
            setAuthError("Bu hesap sistem yöneticisi tarafından sistemden kaldırıldı. Girişiniz sonlandırıldı.");
          } else if (data.status === "deleted") {
            // Server was redeployed and users.json was deleted. Try auto-restore!
            const emailKey = currentUser.email.replace(/[@.]/g, "_");
            const cachedPassword = localStorage.getItem(`dkt_user_pwd_${emailKey}`);
            
            // Check if we have cached credentials
            if (cachedPassword) {
              console.log("Restoring therapist session on server redeployment...");
              const regResponse = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  firstName: currentUser.firstName,
                  lastName: currentUser.lastName,
                  username: currentUser.username,
                  email: currentUser.email,
                  password: cachedPassword,
                  title: currentUser.title || "DKT"
                })
              });
              if (!regResponse.ok) {
                // If restore fails, then log them out
                handleLogout();
                setAuthError("Oturumunuz geçerliliğini yitirdi. Lütfen tekrar giriş yapın.");
              } else {
                console.log("Therapist account restored successfully!");
              }
            } else {
              // No cached password (unrepairable), logout
              handleLogout();
              setAuthError("Oturumunuz geçerliliğini yitirdi. Lütfen tekrar giriş yapın.");
            }
          }
        }
      } catch (err) {
        console.error("User status check failed", err);
      }
    };

    checkUserStatus(); // Immediate check on mount/login

    const intervalId = setInterval(checkUserStatus, 5000); // Check every 5 seconds for immediate sign-out
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Handle Client Add
  const handleAddClient = (newClientData: { name: string; age: number; notes: string; parentName?: string }): Client => {
    const newClient: Client = {
      id: "c" + Date.now(),
      name: newClientData.name,
      age: newClientData.age,
      notes: newClientData.notes,
      parentName: newClientData.parentName,
      createdAt: new Date().toISOString()
    };
    const updated = [newClient, ...clients];
    saveUserClients(updated);
    setSelectedClient(newClient);
    return newClient;
  };

  // Handle Client Delete Trigger
  const handleDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      setClientToDelete(client);
    }
  };

  const handleConfirmDeleteClient = () => {
    if (!clientToDelete) return;
    const id = clientToDelete.id;
    const filteredClients = clients.filter(c => c.id !== id);
    const filteredSessions = sessions.filter(s => s.clientId !== id);
    
    saveUserClients(filteredClients);
    saveUserSessions(filteredSessions);

    if (selectedClient?.id === id) {
      setSelectedClient(filteredClients.length > 0 ? filteredClients[0] : null);
    }
    setClientToDelete(null);
  };

  // Handle saving completed session
  const handleAddNewSession = (sessionData: any) => {
    const newSession: Session = {
      id: "s" + Date.now(),
      clientId: sessionData.clientId,
      clientName: sessionData.clientName,
      date: new Date().toISOString(),
      type: sessionData.type,
      duration: sessionData.duration,
      stats: sessionData.stats,
      severity: sessionData.severity,
      isManual: sessionData.isManual,
      notes: sessionData.notes,
      transcription: sessionData.transcription,
      analysisDetails: sessionData.analysisDetails,
      recommendations: sessionData.recommendations,
      isSimulated: sessionData.isSimulated
    };

    const updated = [newSession, ...sessions];
    saveUserSessions(updated);

    // After saving, view the completed report immediately
    setViewingSession(newSession);
  };

  return (
    <>
      {!currentUser ? (
        <AuthScreen 
          onLoginSuccess={(user, password) => {
            setAuthError(null);
            setCurrentUser(user);
            if (password) {
              const emailKey = user.email.replace(/[@.]/g, "_");
              localStorage.setItem(`dkt_user_pwd_${emailKey}`, password);
            }
          }} 
          initialError={authError}
          onClearError={() => setAuthError(null)}
        />
      ) : (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
          
          {/* PROFESSIONAL APP HEADER */}
          <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="group relative w-11 h-11 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100/80 transition-all duration-300 hover:shadow-indigo-200/80 hover:-translate-y-0.5 select-none overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
                  <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-400/20 to-violet-300/20 rounded-xl blur-xs group-hover:opacity-100 transition-opacity" />
                  <AudioLines className="w-5.5 h-5.5 text-white stroke-[2.5] relative z-10 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-800 leading-none flex items-center gap-1.5 flex-wrap">
                    {selectedModule === "articulation" 
                      ? "Konuşma Sesi Bozuklukları (IPA) Analizörü" 
                      : selectedModule === "fluency" 
                        ? "Kekemelik Analiz ve Akıcılık Takip Sistemi" 
                        : selectedModule === "language"
                          ? "Dil Bozuklukları ve Ortalama Sözce Uzunluğu (OSU) Analizörü"
                          : "DKT Klinik Portal ve Analiz Sistemleri"}
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-indigo-100">
                      {["mehmethanefibulduk@gmail.com", "aycayasar389@gmail.com"].includes(currentUser.email.toLowerCase()) ? "Yönetici Sürümü" : "DKT Sürümü"}
                    </span>
                  </h1>
                  {selectedModule && (
                    <button
                      onClick={() => {
                        setSelectedModule(null);
                        setViewingSession(null);
                      }}
                      className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-slate-100 p-1 px-2.5 rounded-lg transition-all uppercase cursor-pointer border border-indigo-100 mt-1 select-none"
                    >
                      ← Ana Klasör / Modül Seçimine Dön
                    </button>
                  )}
                  {!selectedModule && (
                    <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Yapay Zeka Destekli Otomatik & Manuel Klinik Seans Değerlendirmeleri</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {/* CALIBRATION / ACCURACY BENCHMARK SUITE BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsBenchmarkModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold transition-all duration-150 shadow-3xs cursor-pointer select-none text-xs"
                  title="Sistem Doğruluk & Tutarlılık Kalibrasyon Test Laboratuvarı"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Doğruluk Testi</span>
                  <span className="sm:hidden">Kalibrasyon</span>
                </button>

                {/* SYSTEM DIAGNOSTIC & AUTO FIX BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsDiagnosticModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-250 font-bold transition-all duration-150 shadow-3xs cursor-pointer select-none text-xs"
                  title="Sistem Hata Teşhis & Canlı Sağlık Paneli"
                >
                  <Wrench className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Hata Teşhis</span>
                  <span className="sm:hidden">Teşhis</span>
                </button>

                <div className="hidden sm:block text-right">
                  <span className="block font-semibold text-slate-700">
                    {currentUser.title ? `${currentUser.title} ` : ""}{currentUser.firstName} {currentUser.lastName}
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {["mehmethanefibulduk@gmail.com", "aycayasar389@gmail.com"].includes(currentUser.email.toLowerCase()) ? "Süper Admin" : `@${currentUser.username}`} • Aktif
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold tracking-tight uppercase border border-indigo-150">
                  {currentUser.firstName[0]}{currentUser.lastName[0]}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-150 font-bold transition-all duration-150 shadow-3xs cursor-pointer select-none text-xs"
                  title="Oturumu Kapat"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Çıkış Yap
                </button>
              </div>
            </div>
          </header>

          {/* PRIMARY WORKSPACE */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
            
            {/* WORKSPACE SLIDING SWITCHER */}
            <div className="bg-slate-200/50 p-1.5 rounded-2xl shadow-3xs flex items-center gap-1.5 max-w-2xl mx-auto w-full print:hidden">
              <button
                type="button"
                onClick={() => setWorkspaceMode("assistant")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl cursor-pointer transition-all text-xs font-bold leading-none ${
                  workspaceMode === "assistant"
                    ? "bg-slate-900 text-white shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Sparkles className={`w-4 h-4 ${workspaceMode === "assistant" ? "text-yellow-300" : "text-slate-550"}`} />
                <span>1. Klinik Yapay Zeka DKT Asistanı</span>
              </button>
              
              <button
                type="button"
                onClick={() => setWorkspaceMode("portal")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl cursor-pointer transition-all text-xs font-bold leading-none ${
                  workspaceMode === "portal"
                    ? "bg-slate-900 text-white shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <LayoutGrid className={`w-4 h-4 ${workspaceMode === "portal" ? "text-indigo-400" : "text-slate-550"}`} />
                <span>2. Detaylı Klinik Analizörler</span>
              </button>
            </div>

            {/* DYNAMIC VIEW CONTAINER */}
            <div className="flex-1">
              {workspaceMode === "assistant" ? (
                <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight font-sans">
                      Uzman Yapay Zeka DKT Tanı & Tarama Sistemi
                    </h2>
                    <p className="text-slate-500 text-xs font-medium max-w-lg mx-auto leading-relaxed">
                      Soru-cevap yapabileceğiniz, vaka belirtilerini yazarak öncül tarama raporları alabileceğiniz ve klinik DKT teorisi isteyebileceğiniz özel yapay zeka asistanı.
                    </p>
                  </div>
                  <DktChatAssistant currentUserEmail={currentUser.email} />
                </div>
              ) : (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  {selectedModule === null && (
              /* SELECTION SCENARIOS */
              <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="text-center space-y-3">
                  <div className="inline-flex bg-indigo-50 border border-indigo-100 p-2 px-3.5 rounded-xl text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider mb-2">
                    Klinik Portal & Yapay Zeka Çözümleme Sistemleri
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight font-sans">
                    Hoş Geldiniz, {currentUser.title ? `${currentUser.title} ` : ""}{currentUser.firstName} {currentUser.lastName}
                  </h2>
                  <p className="text-slate-500 text-xs font-semibold max-w-lg mx-auto leading-relaxed">
                    Lütfen çalışmak istediğiniz değerlendirme, takip ve yapay zeka analiz modülünü seçerek klinik seansı başlatın.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 pt-4">
                  
                  {/* CARD 1: AKICILIK BOZUKLUKLARI (KEKEMELİK) */}
                  <button
                    onClick={() => setSelectedModule("fluency")}
                    className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs hover:shadow-lg hover:border-indigo-400 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100/80">
                        <AudioLines className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                          Akıcılık Bozuklukları (Kekemelik) Modülü
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Kekemelik ölçümü, hece sayım kronometresi ve DKT yapay zeka ses analiz raporlaması sistemi.
                        </p>
                      </div>

                      <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold border-t border-slate-100 pt-3 flex-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Yapay Zeka Ses Analizi (%SS Değeri & Şiddet Seviyesi)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Canlı Manuel Hece Sayaçlı Seans Kronometresi
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Danışan Profili, Gelişim Grafikleri ve PDF Rapor
                        </li>
                      </ul>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:gap-2.5 transition-all pt-2">
                        Modüle Giriş Yap
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* CARD 2: KONUŞMA SESİ BOZUKLUKLARI (IPA) */}
                  <button
                    onClick={() => setSelectedModule("articulation")}
                    className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs hover:shadow-lg hover:border-violet-400 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-violet-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-violet-100/80">
                        <Mic className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-violet-600 transition-colors">
                            Konuşma Sesi Bozuklukları (IPA) Modülü
                          </h3>
                          <span className="bg-violet-100 text-violet-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Yeni</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Yapay zeka asistanıyla sesten Uluslararası Fonetik Alfabe (IPA) transkripsiyonu ve hata analizi.
                        </p>
                      </div>

                      <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold border-t border-slate-100 pt-3 flex-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Yapay Zeka Ses Kaydıyla IPA Transkripsiyon (Phonetic Output)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Artikülasyon Analizi (Yer Değiştirme, Düşürme, Sapma)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Fonolojik Süreçler & Klinik Öneriler (R-Y, S-T Testleri)
                        </li>
                      </ul>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 group-hover:gap-2.5 transition-all pt-2">
                        Modüle Giriş Yap
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* CARD 3: DİL BOZUKLUKLARI (MLU/OSU) */}
                  <button
                    onClick={() => setSelectedModule("language")}
                    className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs hover:shadow-lg hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-100/80">
                        <BarChart2 className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors">
                            Dil Bozuklukları (OSU/MLU) Modülü
                          </h3>
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Yeni</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Sözlü seans kaydından morfolojik, sözdizimsel analiz ve Ortalama Sözce Uzunluğu (MLU) tespiti.
                        </p>
                      </div>

                      <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold border-t border-slate-100 pt-3 flex-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Yapay Zeka Destekli Türkçe Otomatik Sözce Bölme (Transcription)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Sözcük ve Kök Eklerini Tahlil Eden MLU (OSU-s & OSU-b)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Ek Düşmeleri, Sözdizim Sapmaları ve Leksikal Çeşitlilik (TTR)
                        </li>
                      </ul>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2">
                        Modüle Giriş Yap
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* CARD 4: SES BOZUKLUKLARI (DİSFONİ & AKUSTİK) */}
                  <button
                    onClick={() => setSelectedModule("voice")}
                    className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs hover:shadow-lg hover:border-teal-400 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer select-none"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 bg-gradient-to-tr from-teal-600 to-cyan-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-teal-100/80">
                        <Activity className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
                            Ses Bozuklukları (Disfoni & Akustik)
                          </h3>
                          <span className="bg-teal-100 text-teal-800 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Yeni</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                          Jitter, Shimmer, NHR, F0, altın standart CPPS, DSI, MPT ve s/z oranı ile GRBAS ses analizi.
                        </p>
                      </div>

                      <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold border-t border-slate-100 pt-3 flex-1">
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          Jitter (Local, RAP, PPQ5) & Shimmer (Local, dB, APQ)
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          Altın Standart Kepstral CPPS, DSI ve NHR/HNR Oranları
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          s/z Oranı, MPT Kronometresi & GRBAS Algısal Skalası
                        </li>
                      </ul>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 group-hover:gap-2.5 transition-all pt-2">
                        Modüle Giriş Yap
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* CARD 5: YÖNETİCİ & TERAPİST KONTROL PANELİ */}
                  {["mehmethanefibulduk@gmail.com", "aycayasar389@gmail.com"].includes(currentUser.email.toLowerCase()) && (
                    <button
                      onClick={() => setSelectedModule("admin")}
                      className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-left shadow-xs hover:shadow-lg hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer select-none"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                      
                      <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-amber-600 to-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-100/80">
                          <Shield className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-amber-700 transition-colors">
                              Yönetici & Terapist Kontrol Paneli
                            </h3>
                            <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">Kontrol</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 font-semibold leading-relaxed">
                            Sisteme kayıtlı olan Dil ve Konuşma Terapisti profillerini ve erişim yetkilerini canlı olarak inceleyin.
                          </p>
                        </div>

                        <ul className="space-y-1.5 text-[10px] text-slate-550 font-semibold border-t border-slate-100 pt-3 flex-1">
                          <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Kayıtlı Tüm Terapistlerin Listesi
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Yeni Kayıt Olan Hesapları Onaylama & Kısıtlama
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Kullanıcı E-Posta ve Profil Tespiti
                          </li>
                        </ul>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 group-hover:gap-2.5 transition-all pt-2">
                          Yönetici Paneline Giriş Yap
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  )}

                </div>

                {/* CALIBRATION & ACCURACY BENCHMARK BANNER */}
                <div className="mt-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                      <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">Sistem Doğruluk & Tutarlılık Kalibrasyon Laboratuvarı</h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border border-emerald-200">
                          10/10 Test Paketi
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Tüm modüllerin (Akustik Jitter/Shimmer/CPPS, Türkçe IPA Fonetik, OSU/MLU Morfoloji, SSI-4 ve Frekans Filtreleme) matematiksel doğruluğunu tek tıkla test edin.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBenchmarkModalOpen(true)}
                    className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow cursor-pointer select-none"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Doğruluk Testini Başlat
                  </button>
                </div>
              </div>
            )}

            {selectedModule === "admin" && (
              <AdminPanel adminEmail={currentUser.email} />
            )}

            {selectedModule === "articulation" && (
              <ArticulationAnalyzer 
                clients={clients} 
                currentUserEmail={currentUser.email} 
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
              />
            )}

            {selectedModule === "language" && (
              <LanguageAnalyzer 
                clients={clients} 
                currentUserEmail={currentUser.email} 
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
              />
            )}

            {selectedModule === "voice" && (
              <VoiceDisorderAnalyzer 
                clients={clients} 
                currentUserEmail={currentUser.email} 
                onAddClient={handleAddClient}
                onDeleteClient={handleDeleteClient}
              />
            )}

            {selectedModule === "fluency" && (
              <>
                {viewingSession ? (
                  <ReportViewer 
                    session={viewingSession} 
                    onBack={() => setViewingSession(null)} 
                    currentUser={currentUser}
                    allSessions={sessions}
                  />
                ) : (
                  <div className="space-y-6">
                    
                    {/* WORKSPACE NAVIGATION TABS */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold gap-1">
                        <button
                          onClick={() => setActiveTab("clients")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                            activeTab === "clients" ? "bg-white text-indigo-600 shadow-sm border border-slate-150 font-bold" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          Danışan Profilleri & Gelişim
                        </button>
                        <button
                          onClick={() => setActiveTab("ai-analyzer")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                            activeTab === "ai-analyzer" ? "bg-white text-indigo-600 shadow-sm border border-slate-150 font-bold" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                          Yapay Zeka Ses Analiz Raporlama
                        </button>
                        <button
                          onClick={() => setActiveTab("manual-tracker")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                            activeTab === "manual-tracker" ? "bg-white text-indigo-600 shadow-sm border border-slate-150 font-bold" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Keyboard className="w-4 h-4" />
                          Manuel Hece Sayım Kronometresi
                        </button>
                        <button
                          onClick={() => setActiveTab("education")}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
                            activeTab === "education" ? "bg-white text-indigo-600 shadow-sm border border-slate-150 font-bold" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          Klinik Bilgi Rehberi
                        </button>
                      </div>

                      {/* Quick Status Pill */}
                      <div className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-250 p-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-slate-600 font-medium">Sistem Hazır</span>
                      </div>
                    </div>

                    {/* TAB CONTENT DISTRIBUTION */}
                    <div className="animate-in fade-in duration-200">
                      {activeTab === "clients" && (
                        <ClientList
                          clients={clients}
                          sessions={sessions}
                          onAddClient={handleAddClient}
                          onDeleteClient={handleDeleteClient}
                          onSelectClient={setSelectedClient}
                          selectedClient={selectedClient}
                          onViewSessionReport={setViewingSession}
                        />
                      )}

                      {activeTab === "ai-analyzer" && (
                        <SessionRecorder
                          clients={clients}
                          currentUserEmail={currentUser.email}
                          onAnalysisComplete={handleAddNewSession}
                          onAddClient={handleAddClient}
                          onDeleteClient={handleDeleteClient}
                        />
                      )}

                      {activeTab === "manual-tracker" && (
                        <SessionTracker
                          clients={clients}
                          onSaveSession={handleAddNewSession}
                          onAddClient={handleAddClient}
                          onDeleteClient={handleDeleteClient}
                        />
                      )}

                      {activeTab === "education" && <InfoHub />}
                    </div>
                  </div>
                )}
              </>
            )}
                </div>
              )}
            </div>
          </main>

          {/* FOOTER */}
          <footer className="bg-white border-t border-slate-200 py-6 mt-12 print:hidden text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
              <p className="font-semibold text-slate-500">Kekemelik Analiz ve Raporlama Sistemi © 2026</p>
              <p>Dil, Konuşma ve Akıcılık Bozuklukları Terapisi Destek Ekipmanı.</p>
            </div>
          </footer>

          {/* FLOATING PERSISTENT QUICK NOTES SIDEBAR */}
          <QuickNotesSidebar />

          {/* CUSTOM IN-APP CONFIRM CLIENT DELETE MODAL */}
          {clientToDelete && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-55">
              <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="bg-rose-50 border-b border-rose-100 p-4 shrink-0 flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-950 font-sans">Kayıt Silme Onayı</h3>
                    <p className="text-[10px] text-rose-800 font-medium">Bu işlem geri alınamaz.</p>
                  </div>
                </div>
                <div className="p-5 text-xs text-slate-700 leading-relaxed font-semibold">
                  <p>
                    <strong className="text-slate-900 font-bold">{clientToDelete.name}</strong> isimli danışanı ve tüm seans rapor geçmişini tamamen silmek istediğinize emin misiniz?
                  </p>
                </div>
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClientToDelete(null)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteClient}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    Evet, Tümünü Sil
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACCURACY & CONSISTENCY BENCHMARK SUITE MODAL */}
          <AccuracyBenchmarkModal
            isOpen={isBenchmarkModalOpen}
            onClose={() => setIsBenchmarkModalOpen(false)}
            currentUserEmail={currentUser.email}
          />

          {/* SYSTEM DIAGNOSTIC & AUTO RECOVERY MODAL */}
          <SystemDiagnosticModal
            isOpen={isDiagnosticModalOpen}
            onClose={() => setIsDiagnosticModalOpen(false)}
            currentUserEmail={currentUser.email}
          />
        </div>
      )}
    </>
  );
}

