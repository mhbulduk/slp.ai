import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Shield, Sparkles, UserPlus, LogIn, Mail, Lock, UserCheck, AlertCircle } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: User, password?: string) => void;
  initialError?: string | null;
  onClearError?: () => void;
}

export default function AuthScreen({ onLoginSuccess, initialError, onClearError }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("DKT");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setTitle("DKT");
    setError(null);
    if (onClearError) {
      onClearError();
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    if (error) {
      setError(null);
      if (onClearError) {
        onClearError();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
    const payload = isSignUp 
      ? { firstName, lastName, username, email, password, title }
      : { identifier: email || username, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bir hata oluştu.");
      }

      // Success!
      onLoginSuccess(data.user, password);
    } catch (err: any) {
      setError(err?.message || "Sunucu ile bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 left-4 flex items-center gap-2 text-indigo-700 select-none">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs">
          <Shield className="w-4 h-4 fill-indigo-100/20 text-indigo-100" />
        </div>
        <span className="text-xs font-bold tracking-wider font-mono">DKT ASSISTANT v2.0</span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-150 relative">
            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-b from-white/10 to-transparent rounded-2xl" />
            <Shield className="w-8 h-8 stroke-[2]" />
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900 font-sans">
          {isSignUp ? "Dil ve Konuşma Terapisti Üyeliği" : "Terapist Giriş Paneli"}
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
          {isSignUp 
            ? "Dil ve konuşma terapistleri (DKT) için akıllı kekemelik şiddeti ölçümleme ve klinik raporlama asistanı." 
            : "Hoş geldiniz. Oturum açarak danışan dosyalarınıza ve ses analizi kayıtlarınıza erişebilirsiniz."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-100/60 border border-slate-150 rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1.5 duration-155">
              <AlertCircle className="w-4.5 h-4.5 mt-0.5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="first_name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ad
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    placeholder="Ahmet"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Soyad
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    placeholder="Yılmaz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="title" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Terapist Unvanı / Akademik Derece
                </label>
                <select
                  id="title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                >
                  <option value="DKT">DKT (Dil ve Konuşma Terapisti)</option>
                  <option value="Uzman DKT">Uzman DKT (Uzman Dil ve Konuşma Terapisti)</option>
                  <option value="Arş. Gör.">Arş. Gör. (Araştırma Görevlisi)</option>
                  <option value="Öğr. Gör.">Öğr. Gör. (Araştırma Görevlisi Doktor)</option>
                  <option value="Dr.">Dr. (Doktor)</option>
                  <option value="Doç. Dr.">Doç. Dr. (Doçent Doktor)</option>
                  <option value="Prof. Dr.">Prof. Dr. (Profesör Doktor)</option>
                  <option value="Öğr. DKT">Öğr. DKT (Öğrenci Dil ve Konuşma Terapisti)</option>
                </select>
              </div>
            )}

            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kullanıcı Adı
                </label>
                <div className="relative rounded-xl shadow-3xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="dkt_ahmet"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9.5 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isSignUp ? "E-Posta Adresi" : "Kullanıcı Adı veya E-Posta"}
              </label>
              <div className="relative rounded-xl shadow-3xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  {isSignUp ? <Mail className="h-4 w-4 text-slate-400" /> : <UserCheck className="h-4 w-4 text-slate-400" />}
                </div>
                <input
                  id="email"
                  name="email"
                  type={isSignUp ? "email" : "text"}
                  required
                  placeholder={isSignUp ? "ahmet@gmail.com" : "E-posta veya kullanıcı adı girin"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9.5 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Şifre
              </label>
              <div className="relative rounded-xl shadow-3xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9.5 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden transition-all font-semibold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
                    İşlem yapılıyor...
                  </span>
                ) : isSignUp ? (
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" /> Üye Hesabı Aç
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <LogIn className="w-4 h-4" /> Giriş Yap
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {isSignUp ? "Zaten bir hesabınız var mı?" : "Henüz bir hesabınız yok mu?"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                resetForm();
              }}
              className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
            >
              {isSignUp ? "Giriş Yap" : "Hemen Kayıt Ol"}
            </button>
          </div>
        </div>
      </div>
      

    </div>
  );
}
