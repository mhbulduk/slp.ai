import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert, Copy, Check, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      // Clear non-critical temporary session states to unblock rendering
      sessionStorage.clear();
      // Remove temporary transient state keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("viewing_session") || key.includes("quick_note") || key.includes("temp_"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn("Storage reset failed:", e);
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleCopyError = () => {
    const errorText = `DKT Sistem Hata Raporu:\nZaman: ${new Date().toISOString()}\nHata: ${this.state.error?.message || "Bilinmiyor"}\nStack: ${this.state.error?.stack || ""}\nComponent Stack: ${this.state.errorInfo?.componentStack || ""}`;
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 antialiased font-sans">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Klinik Sistem Güvenlik Koruması
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  Beklenmeyen bir görsel bileşen hatası yakalandı ve izole edildi.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 text-xs font-mono text-rose-300 space-y-2 overflow-x-auto max-h-48">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{this.state.error?.name || "Hata"}:</span>
              </div>
              <p className="text-slate-300 break-words">{this.state.error?.message || "Bilinmeyen bir çalışma zamanı hatası."}</p>
            </div>

            <div className="space-y-2 text-xs text-slate-400 leading-relaxed font-sans">
              <p>
                Kayıtlı danışan verileriniz ve oturum geçmişiniz koruma altındadır. Sayfayı yenileyerek veya güvenli modda sıfırlayarak çalışmaya devam edebilirsiniz.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md cursor-pointer select-none"
              >
                <RefreshCw className="w-4 h-4" />
                Sayfayı Yenile
              </button>

              <button
                type="button"
                onClick={this.handleResetState}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer select-none"
              >
                <Home className="w-4 h-4" />
                Güvenli Modda Başlat
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="flex items-center justify-center gap-1.5 bg-slate-750 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-3 px-4 rounded-xl border border-slate-650 transition-all cursor-pointer select-none"
                title="Hata metnini panoya kopyala"
              >
                {this.state.copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="sm:hidden">Kopyala</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
