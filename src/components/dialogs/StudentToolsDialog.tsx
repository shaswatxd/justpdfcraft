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
  compressToTargetKb,
  CompressTargetResult,
} from '@core/image/student-resizer';

export const StudentToolsDialog: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    addToast,
    activePhotoUrl,
    setActivePhotoUrl,
  } = useUIStore();
  const isOpen = activeModal === 'student-resizer';

  const [resizerImage, setResizerImage] = useState<HTMLImageElement | null>(null);
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
      const url = activePhotoUrl;
      const img = new Image();
      img.onload = () => {
        setResizerImage(img);
        setActivePhotoUrl(null);
      };
      img.onerror = () => {
        setActivePhotoUrl(null);
      };
      img.src = url;
    }
  }, [activePhotoUrl, isOpen, setActivePhotoUrl]);

  // Helper to safely load an image from File object
  const loadImageFromFile = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
    if (!isImage) {
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
      setResizerImage(img);
    };
    img.onerror = () => {
      addToast({
        type: 'error',
        title: 'Failed to Load Image',
        message: 'Could not decode the selected image.',
      });
    };
    img.src = url;
  };

  // Process Resizer Compression
  const processResizer = useCallback(async () => {
    if (!resizerImage) return;
    setIsCompressing(true);

    try {
      const cvs = document.createElement('canvas');
      let w = customWidthPx;
      let h = customHeightPx;

      if (keepAspect && resizerImage.naturalWidth && resizerImage.naturalHeight) {
        const aspect = resizerImage.naturalWidth / resizerImage.naturalHeight;
        if (w / h > aspect) {
          w = Math.round(h * aspect);
        } else {
          h = Math.round(w / aspect);
        }
      }

      cvs.width = w;
      cvs.height = h;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(resizerImage, 0, 0, w, h);

      const res = await compressToTargetKb(cvs, targetMinKb, targetMaxKb, 'image/jpeg');
      cvs.width = 0;
      cvs.height = 0;
      setResizerResult(res);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Compression Failed',
        message: err?.message || 'Error resizing image.',
      });
    } finally {
      setIsCompressing(false);
    }
  }, [
    resizerImage,
    targetMinKb,
    targetMaxKb,
    customWidthPx,
    customHeightPx,
    keepAspect,
    addToast,
  ]);

  // Trigger compression automatically when parameters or image changes
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-gray-50/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="Photo & Signature Resizer Dialog"
    >
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl h-[92dvh] sm:h-[88vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-gray-800 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight truncate">
                  Photo &amp; Signature Resizer
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">
                  Exact Target KB
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-500 truncate mt-0.5">
                Resize any photo or signature to your exact target file size (KB) and pixel dimensions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white">
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
                  className="w-full min-h-[300px] border-2 border-dashed border-gray-300 hover:border-red-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group bg-gray-50 hover:bg-red-50/10 p-6 text-center shadow-2xs"
                >
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-red-100">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Drop Photo or Signature here, or <span className="text-red-600 underline font-bold">browse</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
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
                    <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                      {resizerResult.inRange ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{resizerResult.finalKb} KB — Passes Portal Check</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Current: {resizerResult.finalKb} KB (Target: {targetMinKb}–{targetMaxKb} KB)</span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-mono">
                        {resizerResult.width} × {resizerResult.height} px
                      </span>
                    </div>
                  )}

                  {/* Image Preview Container */}
                  <div className="w-full max-h-[360px] p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-auto flex items-center justify-center">
                    {resizerResult?.dataUrl ? (
                      <img
                        src={resizerResult.dataUrl}
                        alt="Resized Preview"
                        className="max-h-[300px] w-auto rounded shadow-sm object-contain"
                      />
                    ) : (
                      <div className="py-12 text-xs text-gray-500 flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                        <span>Compressing image...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Replace Button */}
                  <button
                    onClick={() => resizerInputRef.current?.click()}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-medium border border-gray-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
              {/* Target KB Limits */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">Target File Size (KB)</span>
                  <span className="text-xs font-mono font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {targetMinKb} KB – {targetMaxKb} KB
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1 font-medium">Min Size (KB)</span>
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
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1 font-medium">Max Size (KB)</span>
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
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions Controls */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">Dimensions (Pixels)</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={keepAspect}
                      onChange={(e) => setKeepAspect(e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    Lock Aspect Ratio
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1 font-medium">Width (px)</span>
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
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block mb-1 font-medium">Height (px)</span>
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
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Recalculate & Download Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={processResizer}
                  disabled={!resizerImage || isCompressing}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px] cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCompressing ? 'animate-spin' : ''}`} />
                  Recalculate Compression
                </button>

                <button
                  onClick={() => {
                    if (resizerResult) {
                      triggerDownload(resizerResult.dataUrl, `JustPDFCraft_resized_${Date.now()}.jpg`);
                    }
                  }}
                  disabled={!resizerResult}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 active:scale-[0.99] disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 flex items-center justify-center gap-2 min-h-[48px] transition-all cursor-pointer"
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
