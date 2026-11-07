import React from 'react';
import { 
  CheckCircle2, 
  Download, 
  RotateCcw, 
  ArrowLeft, 
  FileCheck,
  TrendingDown
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
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      {/* Success Icon */}
      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-5 border border-emerald-100">
        <CheckCircle2 size={30} />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
        Your file is ready
      </h1>
      <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
        Processed locally in your browser memory with zero server uploads.
      </p>

      {/* Compression Savings */}
      {hasSizeSavings && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
          <TrendingDown size={14} className="text-emerald-600" />
          <span>Reduced by {savingsPercent}% ({formatBytes(result.originalSize)} → {formatBytes(result.newSize)})</span>
        </div>
      )}

      {/* Download Box */}
      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium mb-5">
          <FileCheck size={18} className="text-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-900 truncate max-w-xs">{result.fileName}</span>
          {result.newSize && <span className="text-slate-400">({formatBytes(result.newSize)})</span>}
        </div>

        {/* Primary Download Button */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 text-sm sm:text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Download size={18} />
          <span>Download {result.isZip ? 'ZIP Archive' : 'PDF Document'}</span>
        </button>

        <p className="mt-2.5 text-[11px] text-slate-400">
          Click download to save the processed file to your device.
        </p>
      </div>

      {/* Secondary Actions */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
        <button
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors"
        >
          <RotateCcw size={14} />
          <span>Process another file</span>
        </button>
        <button
          onClick={onBackToHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to all tools</span>
        </button>
      </div>
    </div>
  );
};
