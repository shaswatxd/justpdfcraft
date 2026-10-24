import React, { useState } from 'react';
import { FileArchive, CheckCircle2, Download, X, Sparkles, Sliders, Target } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { CompressPreset, CompressResult } from '@core/pdf/engine.interface';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const CompressDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeView, setActiveView, addToast } = useUIStore();
  const { documentId, fileName, fileBytes, loadDocument, closeCurrentDocument, filePath } = useDocumentStore();

  const [compressMode, setCompressMode] = useState<'preset' | 'target-kb'>('preset');
  const [preset, setPreset] = useState<CompressPreset>('balanced');
  const [targetKb, setTargetKb] = useState<number>(200);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);

  if (activeModal !== 'compress') return null;

  const currentSizeBytes = fileBytes ? fileBytes.byteLength : 0;
  const currentSizeMB = (currentSizeBytes / (1024 * 1024)).toFixed(2);
  const currentSizeKB = Math.round(currentSizeBytes / 1024);

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
      const options =
        compressMode === 'target-kb'
          ? {
              preset: targetKb <= 150 ? ('extreme' as CompressPreset) : targetKb <= 350 ? ('small_file' as CompressPreset) : ('balanced' as CompressPreset),
              stripMetadata,
              targetSizeMB: targetKb / 1024,
            }
          : {
              preset,
              stripMetadata,
            };

      const res = await engine.compressDocument(
        documentId,
        options,
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
    <div className="fixed inset-0 z-50 bg-gray-50/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Compress Dialog">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Smart Compression</h3>
              <p className="text-xs text-gray-500">Reduce PDF file size locally without cloud uploads</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-white"
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
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Current Size Card */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Current File Size</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {currentSizeKB > 1024 ? `${currentSizeMB} MB` : `${currentSizeKB} KB`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Estimated Target</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {compressMode === 'target-kb' ? `~${targetKb} KB limit` : estimates[preset].ratio}
                  </p>
                </div>
              </div>

              {/* Mode Switch: Presets vs Target KB */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Compression Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCompressMode('preset')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      compressMode === 'preset'
                        ? 'bg-emerald-500/10 border-emerald-500/80 text-white font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Optimization Presets</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompressMode('target-kb')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                      compressMode === 'target-kb'
                        ? 'bg-emerald-500/10 border-emerald-500/80 text-white font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Exact Target Size (KB)</span>
                  </button>
                </div>
              </div>

              {/* Preset Selector */}
              {compressMode === 'preset' ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Compression Preset</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'max_quality', label: 'Max Quality', sub: 'Minimal loss' },
                      { id: 'balanced', label: 'Balanced', sub: 'Recommended' },
                      { id: 'small_file', label: 'Small File', sub: 'Email friendly' },
                      { id: 'extreme', label: 'Extreme', sub: 'Maximum shrink' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPreset(p.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          preset === p.id
                            ? 'bg-emerald-500/10 border-emerald-500/80 text-white ring-1 ring-emerald-500/40'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <p className="text-xs font-bold">{p.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{p.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Target KB Mode Controls */
                <div className="space-y-3 bg-gray-50/60 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-800">Desired Maximum File Size</label>
                    <span className="text-xs font-mono font-bold text-emerald-400">{targetKb} KB</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 200, 500, 1000].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setTargetKb(size)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono transition-all border ${
                          targetKb === size
                            ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                            : 'bg-gray-50 border-gray-300/60 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {size >= 1000 ? `${size / 1000} MB` : `${size} KB`}
                      </button>
                    ))}
                  </div>

                  {/* Custom Number Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-gray-500">Custom Limit:</span>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="20"
                        max="50000"
                        value={targetKb}
                        onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value, 10) || 10))}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono">
                        KB
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Engine will automatically tune raster resolution and object streams to reach or stay under {targetKb} KB.
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={stripMetadata}
                    onChange={(e) => setStripMetadata(e.target.checked)}
                    className="rounded bg-gray-100 border-gray-300 text-emerald-500 focus:ring-0"
                  />
                  <span>Strip document metadata (Author, Producer, Creation Date)</span>
                </label>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Compressing stream objects & raster data...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  <div className="flex justify-between text-xs text-gray-700">
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
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Apply in Editor
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!result && (
              <div className="px-6 py-4 border-t border-gray-200 bg-white/60 flex justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white transition-colors"
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
