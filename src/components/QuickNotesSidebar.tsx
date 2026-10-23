import { useState, useEffect, useRef } from "react";
import { NotebookPen, X, Clipboard, Trash2, Check, Clock, Plus, ChevronRight, PenTool } from "lucide-react";

export default function QuickNotesSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const clearTimerRef = useRef<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("dkt_quick_notes");
    if (saved) {
      setNotes(saved);
    }
  }, []);

  // Save to localStorage on change
  const handleChange = (val: string) => {
    setNotes(val);
    localStorage.setItem("dkt_quick_notes", val);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
      clearTimerRef.current = window.setTimeout(() => {
        setIsConfirmingClear(false);
      }, 3000);
    } else {
      handleChange("");
      setIsConfirmingClear(false);
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    }
  };

  // Prepend or inject current time
  const handleInsertTimestamp = () => {
    const now = new Date();
    const timeStr = `[⏱️ ${now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}] `;
    
    injectTextAtCursor(timeStr);
  };

  // Inject clinical tag
  const handleInsertTag = (tag: string) => {
    injectTextAtCursor(`[${tag}] `);
  };

  const injectTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback if textarea not focused/rendered
      const updatedNotes = notes + (notes.endsWith(" ") || notes === "" ? "" : " ") + textToInsert;
      handleChange(updatedNotes);
      return;
    }

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = 
      currentVal.substring(0, startPos) + 
      textToInsert + 
      currentVal.substring(endPos, currentVal.length);

    handleChange(newVal);

    // Reposition cursor and refocus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = startPos + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const charCount = notes.length;

  return (
    <>
      {/* FLOATING TOGGLE BUTTON */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 print:hidden">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            title="Hızlı Notları Aç"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-2xl shadow-xl p-3 py-5 flex flex-col items-center gap-2 border-y border-l border-indigo-500 cursor-pointer transition-all hover:pl-4 group focus:outline-hidden"
          >
            <div className="relative">
              <NotebookPen className="w-5 h-5 animate-bounce" />
              {charCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest [writing-mode:vertical-lr] select-none text-indigo-100 group-hover:text-white">
              HIZLI NOTLAR
            </span>
          </button>
        ) : null}
      </div>

      {/* QUICK OBSERVATIONS DRAWER */}
      <div
        className={`fixed top-24 right-4 z-50 print:hidden w-80 sm:w-96 h-[calc(100vh-140px)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 transform ${
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        {/* HEADER */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-700">
              <NotebookPen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hızlı Klinik Gözlemler</h3>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Aktif Seans Sırasında Notlar</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-450 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TIMESTAMP & INSERT BAR */}
        <div className="p-3 bg-indigo-50/50 border-b border-indigo-100/30 flex flex-wrap gap-1.5 items-center justify-between">
          <button
            onClick={handleInsertTimestamp}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1.5 rounded-md shadow-xs transition-colors cursor-pointer"
            title="Şu anki saati not alanına ekler"
          >
            <Clock className="w-3 h-3" /> Zaman Damgası Ekle
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Terapist Ek Açıklama Kısayolları (Tıkla - Ekle):</span>
          </div>
        </div>

        {/* CLINICAL TAG QUICK PICKER */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1">
          {["Blok", "Uzatma", "Tekrar", "Gerilim", "İkincil Gözlem", "Göz Teması Kaçırma", "Baş Hareketi", "Nefes Bitti"].map((tag) => (
            <button
              key={tag}
              onClick={() => handleInsertTag(tag)}
              className="bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 hover:border-indigo-200 text-[9px] font-semibold px-2 py-1 rounded border border-slate-200 transition-all cursor-pointer shadow-3xs"
            >
              +{tag}
            </button>
          ))}
        </div>

        {/* NOTE-PAD TEXTAREA */}
        <div className="flex-1 p-3 flex flex-col relative bg-slate-50/20">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Seans esnasında, ses analizini veya kronometreyi aksatmadan dilediğiniz gözlem ve klinik notu buraya kaydedebilirsiniz. Otomatik olarak tarayıcınızda saklanır ve sekmeler arasında kalıcıdır..."
            className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none shadow-3xs font-medium leading-relaxed"
          />
        </div>

        {/* WORD/CHAR METERS */}
        <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-200 flex justify-between text-[9px] text-slate-400 font-mono font-bold">
          <span>Kelimeler: {wordCount}</span>
          <span>Karakterler: {charCount}</span>
        </div>

        {/* ACTION FOOTER BAR */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between gap-2">
          <button
            onClick={handleClear}
            disabled={!notes}
            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
              notes 
                ? isConfirmingClear
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
                  : "bg-slate-100 hover:bg-rose-50 text-slate-650 hover:text-rose-700 border-slate-200 hover:border-rose-200" 
                : "opacity-40 cursor-not-allowed bg-slate-50 text-slate-350 border-slate-100"
            }`}
            title="Tüm Notları Temizle"
          >
            <Trash2 className="w-3.5 h-3.5" /> {isConfirmingClear ? "Emin misiniz? (Tıklayın)" : "Temizle"}
          </button>

          <button
            onClick={handleCopy}
            disabled={!notes}
            className={`flex items-center gap-1.5 text-[10px] font-bold px-4 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer ${
              notes
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "opacity-45 cursor-not-allowed bg-slate-300 text-slate-550"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-200" /> Kopyalandı!
              </>
            ) : (
              <>
                <Clipboard className="w-3.5 h-3.5" /> Pano Kopyala
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
