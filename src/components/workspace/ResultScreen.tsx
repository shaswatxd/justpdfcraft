import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  Home, 
  FileCheck, 
  Sparkles
} from 'lucide-react';
import { ProcessResult, ToolDefinition, ToolId } from '../../types/pdf';

interface ResultScreenProps {
  tool: ToolDefinition;
  result: ProcessResult;
  onReset: () => void;
  onBackToHome: () => void;
  onSelectTool: (id: ToolId) => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  tool,
  result,
  onReset,
  onBackToHome,
}) => {
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasSizeSavings =
    result.originalSize &&
    result.newSize &&
    result.originalSize > result.newSize &&
    tool.id === 'compress-pdf';

  const savingsPercent = hasSizeSavings
    ? Math.round(((result.originalSize! - result.newSize!) / result.originalSize!) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      {/* Success Badge */}
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-6 border border-emerald-100 animate-in zoom-in-50">
        <CheckCircle2 size={40} />
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
        Document Crafted Successfully!
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Processed locally in your browser memory with zero data transmission.
      </p>

      {/* Savings badge if compression */}
      {hasSizeSavings && (
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold shadow-sm">
          <Sparkles size={15} className="text-emerald-600" />
          <span>Reduced by {savingsPercent}% ({formatBytes(result.originalSize)} → {formatBytes(result.newSize)})</span>
        </div>
      )}

      {/* Download Box */}
      <div className="mt-8 bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-slate-600 font-semibold mb-6">
          <FileCheck size={20} className="text-indigo-600" />
          <span className="font-bold text-slate-900 truncate max-w-xs">{result.fileName}</span>
          {result.newSize && <span className="text-slate-400">({formatBytes(result.newSize)})</span>}
        </div>

        {/* Big Download Button */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-3 py-4 sm:py-5 px-8 text-base sm:text-lg font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-2xl shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
        >
          <Download size={22} />
          <span>Download {result.isZip ? 'ZIP Package' : 'PDF Document'}</span>
        </button>

        <p className="mt-3 text-[11px] text-slate-400">
          Click the button above to save your file directly.
        </p>
      </div>

      {/* Next Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors"
        >
          <RotateCcw size={15} />
          <span>Craft Another File</span>
        </button>
        <button
          onClick={onBackToHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-colors"
        >
          <Home size={15} />
          <span>Back to Studio Catalog</span>
        </button>
      </div>
    </div>
  );
};
