import React, { useState, useRef } from 'react';
import {
  Layers,
  X,
  Plus,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileArchive,
  Stamp,
  ShieldCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import {
  BatchItem,
  BatchOperationType,
  CompressPreset,
} from '@core/pdf/engine.interface';

export const BatchDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [operation, setOperation] = useState<BatchOperationType>('compress');
  const [compressPreset, setCompressPreset] = useState<CompressPreset>('balanced');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [watermarkFontSize, setWatermarkFontSize] = useState(48);

  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (activeModal !== 'batch') return null;

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: BatchItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await f.arrayBuffer();
        newItems.push({
          id: `batch_item_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          fileName: f.name,
          fileSizeBytes: f.size,
          fileBytes: new Uint8Array(buffer),
          status: 'idle',
          progress: 0,
        });
      }
    }

    if (newItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No PDF Files',
        message: 'Please select valid .pdf documents.',
      });
      return;
    }

    setItems((prev) => [...prev, ...newItems]);
    addToast({
      type: 'info',
      title: 'Files Added',
      message: `Added ${newItems.length} file${newItems.length > 1 ? 's' : ''} to batch queue.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
  };

  const downloadFile = (bytes: Uint8Array, fileName: string) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const completedItems = items.filter((it) => it.status === 'completed' && it.outputBytes);
    if (completedItems.length === 0) return;

    completedItems.forEach((item, index) => {
      setTimeout(() => {
        downloadFile(item.outputBytes!, item.outputFileName || `processed_${item.fileName}`);
      }, index * 250);
    });

    addToast({
      type: 'success',
      title: 'Downloading Batch',
      message: `Exporting ${completedItems.length} processed files...`,
    });
  };

  const handleStartBatch = async () => {
    if (items.length === 0) {
      addToast({
        type: 'warning',
        title: 'Queue Empty',
        message: 'Add at least one PDF file to start batch processing.',
      });
      return;
    }

    setIsProcessing(true);
    const engine = getPDFEngine();

    try {
      const updated = await engine.processBatch(items, {
        operation,
        compressOptions: { preset: compressPreset },
        watermarkOptions: {
          text: watermarkText,
          opacity: watermarkOpacity,
          rotationDegrees: watermarkRotation,
          fontSize: watermarkFontSize,
        },
        onProgress: (itemId, progress) => {
          setItems((prev) =>
            prev.map((it) => (it.id === itemId ? { ...it, progress } : it))
          );
        },
      });

      setItems(updated);

      const succeededCount = updated.filter((it) => it.status === 'completed').length;
      const failedCount = updated.filter((it) => it.status === 'error').length;

      if (failedCount === 0) {
        addToast({
          type: 'success',
          title: 'Batch Completed',
          message: `Successfully processed all ${succeededCount} files!`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Batch Completed with Issues',
          message: `${succeededCount} files succeeded, ${failedCount} files failed.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Batch Processing Failed',
        message: err?.message || 'An unexpected error occurred during batch processing.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const completedCount = items.filter((it) => it.status === 'completed').length;
  const totalQueueSize = items.reduce((acc, it) => acc + it.fileSizeBytes, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                Batch Processing Automation Hub
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  Multi-File Engine
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Execute compression, watermarking, or document sanitization across multiple files in seconds.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Operation Selector Tabs */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
              Select Batch Operation
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOperation('compress')}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  operation === 'compress'
                    ? 'bg-purple-600/15 border-purple-500/60 text-white shadow-lg shadow-purple-900/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    operation === 'compress' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FileArchive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-200">Batch Compress</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reduce file sizes across all documents with smart quality presets.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOperation('watermark')}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  operation === 'watermark'
                    ? 'bg-purple-600/15 border-purple-500/60 text-white shadow-lg shadow-purple-900/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    operation === 'watermark' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Stamp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-200">Batch Watermark</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stamp confidentiality or status text across every page uniformly.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOperation('sanitize')}
                disabled={isProcessing}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  operation === 'sanitize'
                    ? 'bg-purple-600/15 border-purple-500/60 text-white shadow-lg shadow-purple-900/20'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    operation === 'sanitize' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-200">Batch Sanitize</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Purge author info, device IDs, and raw XMP catalog streams.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Operation Configuration Options */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
            {operation === 'compress' && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Compression Preset
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'balanced', label: 'Balanced', desc: 'Good size reduction with crisp text' },
                      { id: 'small_file', label: 'Small File', desc: 'Maximum compression for emailing' },
                      { id: 'max_quality', label: 'Max Quality', desc: 'Preserve high fidelity visual assets' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCompressPreset(opt.id)}
                      disabled={isProcessing}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        compressPreset === opt.id
                          ? 'bg-slate-800 border-purple-500/60 text-purple-300'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold block">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {operation === 'watermark' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    disabled={isProcessing}
                    placeholder="e.g. CONFIDENTIAL"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    disabled={isProcessing}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Font Size ({watermarkFontSize}pt)
                  </label>
                  <input
                    type="number"
                    min="14"
                    max="96"
                    value={watermarkFontSize}
                    onChange={(e) => setWatermarkFontSize(parseInt(e.target.value) || 36)}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Rotation ({watermarkRotation}°)
                  </label>
                  <select
                    value={watermarkRotation}
                    onChange={(e) => setWatermarkRotation(parseInt(e.target.value) || 0)}
                    disabled={isProcessing}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value={45}>45° Diagonal</option>
                    <option value={0}>0° Horizontal</option>
                    <option value={90}>90° Vertical</option>
                    <option value={-45}>-45° Reverse</option>
                  </select>
                </div>
              </div>
            )}

            {operation === 'sanitize' && (
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  All identifying metadata (Author, Subject, Creator, Timestamps) and raw catalog XMP XML stream packets will be stripped from every queued document.
                </span>
              </div>
            )}
          </div>

          {/* Drag & Drop Queue Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                Batch File Queue ({items.length})
                {totalQueueSize > 0 && (
                  <span className="text-slate-500 lowercase font-normal">
                    · {formatBytes(totalQueueSize)}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs rounded-lg border border-purple-500/30 font-medium flex items-center gap-1 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add PDFs
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Drop PDF files here, or <span className="text-purple-400 underline">browse files</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select multiple documents to process in a single automated pass
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-200 truncate">{item.fileName}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {formatBytes(item.fileSizeBytes)}
                          </span>
                        </div>
                        {item.status === 'processing' && (
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-purple-500 h-full transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.status === 'error' && (
                          <p className="text-[10px] text-rose-400 truncate mt-0.5">
                            {item.errorMessage || 'Processing error'}
                          </p>
                        )}
                        {item.status === 'completed' && item.savingsBytes !== undefined && (
                          <p className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
                            <span>Saved {formatBytes(item.savingsBytes)}</span>
                            {item.outputBytes && (
                              <span className="text-slate-500 font-mono">
                                (New: {formatBytes(item.outputBytes.length)})
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'idle' && (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-md font-medium">
                          Queued
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          Processing
                        </span>
                      )}
                      {item.status === 'completed' && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Done
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] rounded-md font-medium flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Error
                        </span>
                      )}

                      {item.status === 'completed' && item.outputBytes && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(item.outputBytes!, item.outputFileName || `processed_${item.fileName}`)
                          }
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-300 rounded transition-colors"
                          title="Download Processed PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.status === 'idle' && (
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {completedCount > 0 && (
              <span className="text-emerald-400 font-medium">
                ✓ {completedCount} of {items.length} completed
              </span>
            )}
            {completedCount === 0 && (
              <span>{items.length} document{items.length === 1 ? '' : 's'} in queue</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {completedCount > 0 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Save All Files
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleStartBatch}
              disabled={isProcessing || items.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Batch Operation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
