import React, { useState } from 'react';
import { FileArchive, CheckCircle2, Download, X, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { CompressPreset, CompressResult } from '@core/pdf/engine.interface';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const CompressDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeView, setActiveView, addToast } = useUIStore();
  const { documentId, fileName, fileBytes, loadDocument, closeCurrentDocument, filePath } = useDocumentStore();

  const [preset, setPreset] = useState<CompressPreset>('balanced');
  const [stripMetadata, setStripMetadata] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);

  if (activeModal !== 'compress') return null;

  const currentSizeMB = fileBytes ? (fileBytes.byteLength / (1024 * 1024)).toFixed(2) : '0';

  const estimates: Record<CompressPreset, { ratio: string; quality: string }> = {
    max_quality: { ratio: '~10-15% reduction', quality: 'Original Visual Fidelity' },
    balanced: { ratio: '~30-50% reduction', quality: 'High (Optimized streams & objects)' },
    small_file: { ratio: '~50-70% reduction', quality: 'Standard (Ideal for email)' },
    extreme: { ratio: '~70-85% reduction', quality: 'Aggressive (Screen viewing)' },
  };

  const handleCompress = async () => {
    if (!documentId) return;
    setIsProcessing(true);
    setProgress(10);

    try {
      const engine = getPDFEngine();
      const res = await engine.compressDocument(
        documentId,
        {
          preset,
          stripMetadata,
        },
        (p) => setProgress(p)
      );

      setResult(res);
      addToast({
        type: 'success',
        title: 'Compression Completed',
        message: `Saved ${res.compressionRatio}% of file size.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compression Failed',
        message: err?.message || 'Could not compress document.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    if (activeView === 'home') {
      closeCurrentDocument();
    }
  };

  const handleDownloadCompressed = () => {
    if (!result) return;
    const blob = new Blob([result.data as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Compressed_${fileName || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleApplyToActive = async () => {
    if (!result || !fileName) return;
    await loadDocument(result.data, fileName, filePath || undefined);
    setActiveView('editor');
    setActiveModal(null);
    addToast({
      type: 'info',
      title: 'Compressed Version Applied',
      message: 'Active document has been replaced with the compressed version.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Compress Dialog">
      <div className="w-full max-w-lg bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Smart Compression</h3>
              <p className="text-xs text-slate-400">Reduce PDF file size locally without cloud uploads</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Compression"
            description="Please select a PDF document first to inspect its size and apply compression presets."
            icon={FileArchive}
            actionText="Select PDF to Compress"
          />
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current Size Card */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Current File Size</p>
              <p className="text-xl font-bold font-mono text-white">{currentSizeMB} MB</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Estimated Target</p>
              <p className="text-sm font-semibold text-emerald-400">{estimates[preset].ratio}</p>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Compression Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'max_quality', label: 'Max Quality', sub: 'Minimal loss' },
                { id: 'balanced', label: 'Balanced', sub: 'Recommended' },
                { id: 'small_file', label: 'Small File', sub: 'Email friendly' },
                { id: 'extreme', label: 'Extreme', sub: 'Maximum shrink' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    preset === p.id
                      ? 'bg-emerald-500/10 border-emerald-500/80 text-white ring-1 ring-emerald-500/40'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <p className="text-xs font-bold">{p.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{p.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
              <input
                type="checkbox"
                checked={stripMetadata}
                onChange={(e) => setStripMetadata(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>Strip document metadata (Author, Producer, Creation Date)</span>
            </label>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Compressing stream objects...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Compression Complete!</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Before: {(result.originalBytes / 1024).toFixed(1)} KB</span>
                <span className="font-bold text-emerald-400">
                  After: {(result.newBytes / 1024).toFixed(1)} KB (-{result.compressionRatio}%)
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleDownloadCompressed}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Compressed PDF
                </button>
                <button
                  onClick={handleApplyToActive}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Apply in Editor
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-slate-800 bg-[#000000]/60 flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCompress}
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isProcessing ? 'Processing...' : 'Start Compression'}
            </button>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompressDialog;
