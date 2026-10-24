import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Download,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import {
  EXAM_PRESETS,
  ExamPreset,
  compressToTargetKb,
  CompressTargetResult,
} from '@core/image/student-resizer';

export const StudentToolsDialog: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    addToast,
    setActiveStudentTab,
    activePhotoUrl,
    setActivePhotoUrl,
  } = useUIStore();
  const isOpen = activeModal === 'student-resizer';

  const [resizerImage, setResizerImage] = useState<HTMLImageElement | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ssc-photo');
  const [targetMinKb, setTargetMinKb] = useState<number>(20);
  const [targetMaxKb, setTargetMaxKb] = useState<number>(50);
  const [customWidthPx, setCustomWidthPx] = useState<number>(200);
  const [customHeightPx, setCustomHeightPx] = useState<number>(230);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [resizerResult, setResizerResult] = useState<CompressTargetResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const resizerInputRef = useRef<HTMLInputElement>(null);

  // Load image from URL when provided by external store trigger
  useEffect(() => {
    if (activePhotoUrl && isOpen) {
      const urlToClean = activePhotoUrl;
      const img = new Image();
      img.onload = () => {
        setResizerImage(img);
        if (urlToClean.startsWith('blob:')) {
          URL.revokeObjectURL(urlToClean);
        }
        setActivePhotoUrl(null);
      };
      img.onerror = () => {
        if (urlToClean.startsWith('blob:')) {
          URL.revokeObjectURL(urlToClean);
        }
        setActivePhotoUrl(null);
      };
      img.src = urlToClean;
    }
  }, [activePhotoUrl, isOpen, setActivePhotoUrl]);

  // Helper to safely load an image from File object
  const loadImageFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'warning',
        title: 'Image File Required',
        message: 'Please select a valid image (JPG, PNG, WebP).',
      });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setResizerImage(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Handle Preset Change
  const handleSelectPreset = (preset: ExamPreset) => {
    setSelectedPresetId(preset.id);
    setTargetMinKb(preset.minKb);
    setTargetMaxKb(preset.maxKb);
    setCustomWidthPx(preset.widthPx);
    setCustomHeightPx(preset.heightPx);
  };

  // Process Resizer Compression
  const processResizer = useCallback(async () => {
    if (!resizerImage) return;
    setIsCompressing(true);

    try {
      const cvs = document.createElement('canvas');
      cvs.width = customWidthPx;
      cvs.height = customHeightPx;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, customWidthPx, customHeightPx);
        ctx.drawImage(resizerImage, 0, 0, customWidthPx, customHeightPx);

        const result = await compressToTargetKb(cvs, targetMinKb, targetMaxKb, 'image/jpeg');
        cvs.width = 0;
        cvs.height = 0;
        setResizerResult(result);
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err?.message || 'An unexpected error occurred while processing the image.',
      });
    } finally {
      setIsCompressing(false);
    }
  }, [resizerImage, customWidthPx, customHeightPx, targetMinKb, targetMaxKb, addToast]);

  // Auto-compress when image loads or dimensions/targets change
  useEffect(() => {
    if (resizerImage) {
      const timer = setTimeout(() => {
        processResizer();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [resizerImage, processResizer]);

  if (!isOpen) return null;

  const triggerDownload = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
    addToast({
      type: 'success',
      title: 'Downloaded Successfully',
      message: `Saved as ${filename}`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Photo & Signature Resizer Dialog"
    >
      <div className="bg-black border-0 sm:border border-slate-700/80 rounded-none sm:rounded-2xl w-full max-w-4xl h-[100dvh] sm:h-[90vh] max-h-[100dvh] sm:max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-black/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-swift-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-swift-900/30 shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Photo &amp; Signature Resizer
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full whitespace-nowrap">
                  Exact Target KB
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 truncate">
                Resize photo or signature to exact portal limits (20–50 KB, 10–20 KB) for SSC, UPSC, NEET, JEE.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveModal(null);
              setActiveStudentTab(null);
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 h-5" />
          </button>
        </div>

        {/* Main Body — natural scroll flow with NO nested overflow-hidden or fixed heights */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/40">
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Upload & Live Preview */}
            <div className="w-full lg:col-span-6 flex flex-col items-center">
              {!resizerImage ? (
                <div
                  onClick={() => resizerInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      loadImageFromFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="w-full min-h-[260px] sm:min-h-[300px] border-2 border-dashed border-slate-700 hover:border-swift-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group bg-black/40 hover:bg-black/80 p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-swift-500/10 text-swift-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drop Photo or Signature here, or <span className="text-swift-400 underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    JPG, PNG, WebP from phone camera or scanner.
                  </p>
                  <input
                    ref={resizerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        loadImageFromFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-3">
                  {/* Status Pill */}
                  {resizerResult && (
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded-xl">
                      {resizerResult.inRange ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{resizerResult.finalKb} KB — Passes Portal Check</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Current: {resizerResult.finalKb} KB (Target: {targetMinKb}–{targetMaxKb} KB)</span>
                        </div>
                      )}
                      <span className="text-xs text-slate-400 font-mono">
                        {resizerResult.width} × {resizerResult.height} px
                      </span>
                    </div>
                  )}

                  {/* Image Preview Container — scrollable if very tall, but natural size */}
                  <div className="w-full max-h-[360px] p-2 bg-black border border-slate-800 rounded-xl overflow-auto flex items-center justify-center">
                    {resizerResult?.dataUrl ? (
                      <img
                        src={resizerResult.dataUrl}
                        alt="Resized Preview"
                        className="max-h-[320px] w-auto rounded shadow-lg object-contain"
                      />
                    ) : (
                      <div className="py-12 text-xs text-slate-500 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-swift-400" />
                        <span>Compressing image...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Replace Button */}
                  <button
                    onClick={() => resizerInputRef.current?.click()}
                    className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/80 flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Replace Image
                  </button>
                  <input
                    ref={resizerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        loadImageFromFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Settings & Download */}
            <div className="w-full lg:col-span-6 space-y-4">
              {/* 1. Exam Preset Picker */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  1. Select Exam or Custom Format
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => {
                    const found = EXAM_PRESETS.find((p) => p.id === e.target.value);
                    if (found) handleSelectPreset(found);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-swift-500"
                >
                  {EXAM_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.minKb}–{p.maxKb} KB)
                    </option>
                  ))}
                </select>
                {selectedPresetId && (
                  <p className="text-[11px] text-slate-400 mt-1.5 bg-slate-800/60 p-2 rounded-lg border border-slate-800">
                    💡 {EXAM_PRESETS.find((p) => p.id === selectedPresetId)?.notes}
                  </p>
                )}
              </div>

              {/* 2. Target KB Limits */}
              <div className="bg-black/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Target File Size (KB)</span>
                  <span className="text-xs font-mono text-swift-400 bg-swift-950/60 px-2 py-0.5 rounded border border-swift-800">
                    {targetMinKb} KB – {targetMaxKb} KB
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Min Size (KB)</span>
                    <input
                      type="number"
                      min="2"
                      max={targetMaxKb}
                      value={targetMinKb}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setTargetMinKb(val);
                        if (val > targetMaxKb) setTargetMaxKb(val + 5);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Max Size (KB)</span>
                    <input
                      type="number"
                      min={targetMinKb}
                      max="2000"
                      value={targetMaxKb}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 50);
                        setTargetMaxKb(val);
                        if (val < targetMinKb) setTargetMinKb(Math.max(1, val - 5));
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Dimensions Controls */}
              <div className="bg-black/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Dimensions (Pixels)</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={keepAspect}
                      onChange={(e) => setKeepAspect(e.target.checked)}
                      className="rounded border-slate-700 text-swift-600 focus:ring-swift-500 bg-slate-800"
                    />
                    Lock Aspect Ratio
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Width (px)</span>
                    <input
                      type="number"
                      value={customWidthPx}
                      onChange={(e) => {
                        const w = parseInt(e.target.value, 10) || 100;
                        setCustomWidthPx(w);
                        if (keepAspect && resizerImage) {
                          const ratio = resizerImage.naturalHeight / resizerImage.naturalWidth;
                          setCustomHeightPx(Math.round(w * ratio));
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Height (px)</span>
                    <input
                      type="number"
                      value={customHeightPx}
                      onChange={(e) => {
                        const h = parseInt(e.target.value, 10) || 100;
                        setCustomHeightPx(h);
                        if (keepAspect && resizerImage) {
                          const ratio = resizerImage.naturalWidth / resizerImage.naturalHeight;
                          setCustomWidthPx(Math.round(h * ratio));
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                </div>
              </div>

              {/* Recalculate & Download Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={processResizer}
                  disabled={!resizerImage || isCompressing}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCompressing ? 'animate-spin' : ''}`} />
                  Recalculate Compression
                </button>

                <button
                  onClick={() => {
                    if (resizerResult) {
                      triggerDownload(resizerResult.dataUrl, `JustPDFCraft_${selectedPresetId}_${Date.now()}.jpg`);
                    }
                  }}
                  disabled={!resizerResult}
                  className="w-full py-3 bg-gradient-to-r from-swift-600 to-indigo-600 hover:from-swift-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-lg shadow-swift-900/30 flex items-center justify-center gap-2 min-h-[48px] transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download JPG ({resizerResult?.finalKb || 0} KB)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentToolsDialog;
