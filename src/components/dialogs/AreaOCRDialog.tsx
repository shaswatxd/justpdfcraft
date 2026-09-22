import React, { useState, useEffect } from 'react';
import { ScanText, Copy, Check, X, Download, Zap, Sparkles, Globe, RefreshCw, Volume2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useToolStore } from '@/stores/toolStore';
import { useTTSStore } from '@/stores/ttsStore';

interface AreaOCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedText: string;
  confidence?: number;
  wordCount?: number;
  isDigital?: boolean;
  language?: string;
  onReExtract?: (language: string) => Promise<void>;
  isReExtracting?: boolean;
}

const OCR_LANGUAGES = [
  { code: 'eng+hin', label: 'English + Hindi (हिंदी Bilingual)' },
  { code: 'hin', label: 'Hindi (हिंदी)' },
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish (Español)' },
  { code: 'fra', label: 'French (Français)' },
  { code: 'deu', label: 'German (Deutsch)' },
  { code: 'chi_sim', label: 'Chinese (简体中文)' },
  { code: 'jpn', label: 'Japanese (日本語)' },
];

export const AreaOCRDialog: React.FC<AreaOCRModalProps> = ({
  isOpen,
  onClose,
  extractedText,
  confidence,
  wordCount: initialWordCount,
  isDigital,
  language: initialLanguage,
  onReExtract,
  isReExtracting = false,
}) => {
  const { addToast } = useUIStore();
  const { ocrLanguage, setOcrLanguage } = useToolStore();
  const { playText, setTTSOpen } = useTTSStore();
  const [text, setText] = useState(extractedText);
  const [copied, setCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState(initialLanguage || ocrLanguage || 'eng+hin');

  const handleListen = () => {
    if (!text.trim()) return;
    setTTSOpen(true);
    playText(text);
    addToast({
      type: 'info',
      title: 'Reading OCR Text Aloud',
      message: 'Synthesizing voice playback for extracted text...',
    });
  };

  useEffect(() => {
    setText(extractedText);
  }, [extractedText]);

  useEffect(() => {
    if (initialLanguage) {
      setSelectedLang(initialLanguage);
    }
  }, [initialLanguage]);

  if (!isOpen) return null;

  const currentWordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : (initialWordCount ?? 0);
  const currentCharCount = text.length;

  const handleLanguageChange = async (newLang: string) => {
    setSelectedLang(newLang);
    setOcrLanguage(newLang);
    if (onReExtract) {
      await onReExtract(newLang);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Text Copied',
        message: 'Extracted text copied to system clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ type: 'error', title: 'Copy Failed' });
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Extracted_Text_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Downloaded',
      message: 'Saved text file to your downloads.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-swift-500/10 rounded-xl text-swift-400 border border-swift-500/20">
              <ScanText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">Area Text Extractor</h3>
                {isDigital ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <Zap className="w-2.5 h-2.5 text-emerald-400" />
                    100% Native Stream
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                    Neural OCR ({confidence ?? 95}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Hindi (हिंदी) & English bilingual text recognition with DRM bypass.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls: Language Selector + Quick Re-scan */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-swift-400" />
            <span className="text-slate-400 font-medium">OCR Language:</span>
            <select
              value={selectedLang}
              disabled={isReExtracting}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-swift-500 font-medium cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              {OCR_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {onReExtract && (
            <button
              onClick={() => onReExtract(selectedLang)}
              disabled={isReExtracting}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isReExtracting ? 'animate-spin text-swift-400' : ''}`} />
              <span>{isReExtracting ? 'Scanning...' : 'Re-scan'}</span>
            </button>
          )}
        </div>

        {/* Content Preview & Editor */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span>
                Words: <strong className="text-swift-400">{currentWordCount}</strong>
              </span>
              <span>
                Chars: <strong className="text-slate-300">{currentCharCount}</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-500">Editable preview (Devanagari + Latin supported)</span>
          </div>

          <div className="relative">
            <textarea
              value={text}
              disabled={isReExtracting}
              onChange={(e) => setText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="w-full h-52 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-sans resize-none focus:outline-none focus:border-swift-500 leading-relaxed selection:bg-swift-500/30 shadow-inner disabled:opacity-50"
            />
            {isReExtracting && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 rounded-xl text-xs text-swift-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>Recognizing Hindi & English characters...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleListen}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-swift-400 hover:text-swift-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
              title="Listen to extracted text read aloud"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Read Aloud</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 bg-swift-600 hover:bg-swift-500 rounded-xl text-xs font-medium text-white shadow-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
