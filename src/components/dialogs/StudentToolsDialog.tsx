import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Download,
  GraduationCap,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Layers,
  Eraser,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import {
  EXAM_PRESETS,
  ExamPreset,
  compressToTargetKb,
  cleanPaperSignature,
  addNameAndDateBanner,
  combinePhotoAndSignature,
  CompressTargetResult,
} from '@core/image/student-resizer';

type StudentTab = 'resizer' | 'combiner' | 'clean-sign' | 'dop-banner';

export const StudentToolsDialog: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    addToast,
    activeStudentTab,
    setActiveStudentTab,
    activePhotoUrl,
    setActivePhotoUrl,
  } = useUIStore();
  const isOpen = activeModal === 'student-resizer';

  const [activeTab, setActiveTab] = useState<StudentTab>('resizer');

  useEffect(() => {
    if (activeStudentTab && ['resizer', 'combiner', 'clean-sign', 'dop-banner'].includes(activeStudentTab)) {
      setActiveTab(activeStudentTab as StudentTab);
    }
  }, [activeStudentTab]);

  useEffect(() => {
    if (activePhotoUrl && isOpen) {
      const urlToClean = activePhotoUrl;
      const img = new Image();
      img.onload = () => {
        if (activeTab === 'clean-sign') {
          setCleanSignImage(img);
        } else if (activeTab === 'combiner') {
          setCombinerPhoto(img);
        } else if (activeTab === 'dop-banner') {
          setDopPhoto(img);
        } else {
          setResizerImage(img);
        }
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
  }, [activePhotoUrl, isOpen, activeTab, setActivePhotoUrl]);

  // ==================== TAB 1: RESIZER & COMPRESSOR ====================
  const [resizerImage, setResizerImage] = useState<HTMLImageElement | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ssc-photo');
  const [targetMinKb, setTargetMinKb] = useState<number>(20);
  const [targetMaxKb, setTargetMaxKb] = useState<number>(50);
  const [customWidthPx, setCustomWidthPx] = useState<number>(200);
  const [customHeightPx, setCustomHeightPx] = useState<number>(230);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);
  const [resizerResult, setResizerResult] = useState<CompressTargetResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const resizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const resizerInputRef = useRef<HTMLInputElement>(null);

  // ==================== TAB 2: COMBINER ====================
  const [combinerPhoto, setCombinerPhoto] = useState<HTMLImageElement | null>(null);
  const [combinerSign, setCombinerSign] = useState<HTMLImageElement | null>(null);
  const [combinerLayout, setCombinerLayout] = useState<'stacked' | 'side-by-side' | 'bottom-box'>('stacked');
  const [combinerName, setCombinerName] = useState<string>('');
  const [combinerDOP, setCombinerDOP] = useState<string>('');
  const [combinerTargetMaxKb, setCombinerTargetMaxKb] = useState<number>(100);
  const [combinerResult, setCombinerResult] = useState<CompressTargetResult | null>(null);

  const combinerCanvasRef = useRef<HTMLCanvasElement>(null);
  const combinerPhotoInputRef = useRef<HTMLInputElement>(null);
  const combinerSignInputRef = useRef<HTMLInputElement>(null);

  // ==================== TAB 3: CLEAN SIGNATURE ====================
  const [cleanSignImage, setCleanSignImage] = useState<HTMLImageElement | null>(null);
  const [threshold, setThreshold] = useState<number>(185);
  const [transparentBg, setTransparentBg] = useState<boolean>(false);
  const [inkColor, setInkColor] = useState<'black' | 'blue' | 'preserve'>('black');
  const [autoCrop, setAutoCrop] = useState<boolean>(true);
  const [cleanSignDataUrl, setCleanSignDataUrl] = useState<string | null>(null);

  const cleanSignCanvasRef = useRef<HTMLCanvasElement>(null);
  const cleanSignInputRef = useRef<HTMLInputElement>(null);

  // ==================== TAB 4: NAME & DOP BANNER ====================
  const [dopPhoto, setDopPhoto] = useState<HTMLImageElement | null>(null);
  const [candidateName, setCandidateName] = useState<string>('');
  const [dateOfPhoto, setDateOfPhoto] = useState<string>(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [dopPrefix, setDopPrefix] = useState<'DOP: ' | 'DOB: ' | ''>('DOP: ');
  const [dopTargetMaxKb, setDopTargetMaxKb] = useState<number>(50);
  const [dopResult, setDopResult] = useState<CompressTargetResult | null>(null);

  const dopCanvasRef = useRef<HTMLCanvasElement>(null);
  const dopInputRef = useRef<HTMLInputElement>(null);

  // Helper to safely load an image from File object
  const loadImageFromFile = (file: File, callback: (img: HTMLImageElement) => void) => {
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
      callback(img);
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

  // ---------------- Process Resizer ----------------
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
  }, [resizerImage, customWidthPx, customHeightPx, targetMinKb, targetMaxKb]);

  useEffect(() => {
    if (resizerImage) {
      const timer = setTimeout(() => {
        processResizer();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [resizerImage, processResizer]);

  // ---------------- Process Combiner ----------------
  const processCombiner = useCallback(async () => {
    if (!combinerPhoto || !combinerSign) return;

    try {
      const pCvs = document.createElement('canvas');
      pCvs.width = combinerPhoto.naturalWidth || combinerPhoto.width;
      pCvs.height = combinerPhoto.naturalHeight || combinerPhoto.height;
      const pCtx = pCvs.getContext('2d');
      if (pCtx) pCtx.drawImage(combinerPhoto, 0, 0);

      const sCvs = document.createElement('canvas');
      sCvs.width = combinerSign.naturalWidth || combinerSign.width;
      sCvs.height = combinerSign.naturalHeight || combinerSign.height;
      const sCtx = sCvs.getContext('2d');
      if (sCtx) sCtx.drawImage(combinerSign, 0, 0);

      const combinedCvs = combinePhotoAndSignature(pCvs, sCvs, {
        layout: combinerLayout,
        candidateName: combinerName,
        dateOfPhoto: combinerDOP,
      });

      // Cleanup temp canvases
      pCvs.width = 0;
      pCvs.height = 0;
      sCvs.width = 0;
      sCvs.height = 0;

      const result = await compressToTargetKb(combinedCvs, 20, combinerTargetMaxKb, 'image/jpeg');
      setCombinerResult(result);

      const previewCvs = combinerCanvasRef.current;
      if (previewCvs) {
        previewCvs.width = combinedCvs.width;
        previewCvs.height = combinedCvs.height;
        const cCtx = previewCvs.getContext('2d');
        if (cCtx) {
          cCtx.drawImage(combinedCvs, 0, 0);
        }
      }
    } catch (err: any) {
      console.error(err);
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err?.message || 'An unexpected error occurred while processing the image.',
      });
    }
  }, [combinerPhoto, combinerSign, combinerLayout, combinerName, combinerDOP, combinerTargetMaxKb]);

  useEffect(() => {
    if (combinerPhoto && combinerSign) {
      const timer = setTimeout(() => {
        processCombiner();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [combinerPhoto, combinerSign, processCombiner]);

  // ---------------- Process Clean Signature ----------------
  const processCleanSignature = useCallback(() => {
    if (!cleanSignImage) return;

    try {
      const srcCvs = document.createElement('canvas');
      srcCvs.width = cleanSignImage.naturalWidth || cleanSignImage.width;
      srcCvs.height = cleanSignImage.naturalHeight || cleanSignImage.height;
      const sCtx = srcCvs.getContext('2d');
      if (!sCtx) return;
      sCtx.drawImage(cleanSignImage, 0, 0);

      const cleanedCvs = cleanPaperSignature(srcCvs, {
        threshold,
        transparentBg,
        inkEnhance: inkColor,
        autoCropPadding: autoCrop ? 16 : 0,
      });

      // Cleanup temp canvas
      srcCvs.width = 0;
      srcCvs.height = 0;

      const previewCvs = cleanSignCanvasRef.current;
      if (previewCvs) {
        previewCvs.width = cleanedCvs.width;
        previewCvs.height = cleanedCvs.height;
        const pCtx = previewCvs.getContext('2d');
        if (pCtx) {
          pCtx.clearRect(0, 0, cleanedCvs.width, cleanedCvs.height);
          pCtx.drawImage(cleanedCvs, 0, 0);
        }
      }
      const dataUrl = cleanedCvs.toDataURL(transparentBg ? 'image/png' : 'image/jpeg', 0.95);
      setCleanSignDataUrl(dataUrl);
    } catch (err: any) {
      console.error('Error cleaning signature:', err);
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err?.message || 'An unexpected error occurred while processing the image.',
      });
    }
  }, [cleanSignImage, threshold, transparentBg, inkColor, autoCrop]);

  useEffect(() => {
    if (cleanSignImage) {
      const timer = setTimeout(() => {
        processCleanSignature();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [cleanSignImage, processCleanSignature]);

  // ---------------- Process DOP Banner ----------------
  const processDopBanner = useCallback(async () => {
    if (!dopPhoto) return;

    try {
      const srcCvs = document.createElement('canvas');
      srcCvs.width = dopPhoto.naturalWidth || dopPhoto.width;
      srcCvs.height = dopPhoto.naturalHeight || dopPhoto.height;
      const sCtx = srcCvs.getContext('2d');
      if (!sCtx) return;
      sCtx.drawImage(dopPhoto, 0, 0);

      const bannerCvs = addNameAndDateBanner(srcCvs, {
        candidateName,
        dateOfPhoto,
        datePrefix: dopPrefix,
      });

      // Cleanup temp canvas
      srcCvs.width = 0;
      srcCvs.height = 0;

      const result = await compressToTargetKb(bannerCvs, 20, dopTargetMaxKb, 'image/jpeg');
      setDopResult(result);

      const previewCvs = dopCanvasRef.current;
      if (previewCvs) {
        previewCvs.width = bannerCvs.width;
        previewCvs.height = bannerCvs.height;
        const pCtx = previewCvs.getContext('2d');
        if (pCtx) {
          pCtx.drawImage(bannerCvs, 0, 0);
        }
      }
    } catch (err: any) {
      console.error('Error generating DOP banner:', err);
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err?.message || 'An unexpected error occurred while processing the image.',
      });
    }
  }, [dopPhoto, candidateName, dateOfPhoto, dopPrefix, dopTargetMaxKb]);

  useEffect(() => {
    if (dopPhoto) {
      const timer = setTimeout(() => {
        processDopBanner();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [dopPhoto, processDopBanner]);

  if (!isOpen) return null;

  // File download helper
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Student Tools Dialog">
      <div className="bg-black border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-black/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-swift-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-swift-900/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Student & Exam Admission Suite</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Exam Portal Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exact target KB resizer, signature cleaner, photo+sign combiner & Name/DOP generator for UPSC, SSC, NEET, JEE, IBPS.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveModal(null);
              setActiveStudentTab(null);
            }}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-black/50">
          {[
            { id: 'resizer' as const, label: 'Target KB & Dimensions Resizer', icon: Sliders },
            { id: 'combiner' as const, label: 'Photo + Sign Combiner', icon: Layers },
            { id: 'clean-sign' as const, label: 'Paper Signature Cleaner', icon: Eraser },
            { id: 'dop-banner' as const, label: 'Name & Date (DOP) Strip', icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-swift-500 text-swift-400 bg-swift-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/40">
          {/* ======================================================== */}
          {/* TAB 1: RESIZER & COMPRESSOR */}
          {/* ======================================================== */}
          {activeTab === 'resizer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-5 flex flex-col">
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
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
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
                        onChange={(e) => setTargetMinKb(Math.max(1, parseInt(e.target.value, 10) || 1))}
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
                        onChange={(e) => setTargetMaxKb(Math.max(targetMinKb, parseInt(e.target.value, 10) || 50))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Dimensions Controls */}
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
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

                {/* Recalculate Button */}
                <button
                  onClick={processResizer}
                  disabled={!resizerImage || isCompressing}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCompressing ? 'animate-spin' : ''}`} />
                  Recalculate Compression & Dimensions
                </button>
              </div>

              {/* Right Preview & Export (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
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
                        loadImageFromFile(e.dataTransfer.files[0], setResizerImage);
                      }
                    }}
                    className="w-full h-80 border-2 border-dashed border-slate-700 hover:border-swift-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group bg-black/40 hover:bg-black/80 p-6 text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-swift-500/10 text-swift-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drop Photo or Signature here, or <span className="text-swift-400 underline">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Supports JPG, PNG, WebP from phone camera or scanner.
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
                          loadImageFromFile(e.target.files[0], setResizerImage);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-4">
                    {/* Status Pill */}
                    {resizerResult && (
                      <div className="flex items-center gap-2">
                        {resizerResult.inRange ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {resizerResult.finalKb} KB — Passes Portal Check ({targetMinKb}–{targetMaxKb} KB)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold">
                            <AlertCircle className="w-4 h-4" />
                            <span>Current: {resizerResult.finalKb} KB (Target: {targetMinKb}–{targetMaxKb} KB)</span>
                          </div>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          {resizerResult.width} x {resizerResult.height} px
                        </span>
                      </div>
                    )}

                    {/* Preview (Persistent img prevents black box on tab switch) */}
                    <div className="max-h-[380px] p-2 bg-black border border-slate-800 rounded-xl overflow-auto shadow-inner flex items-center justify-center">
                      {resizerResult?.dataUrl ? (
                        <img
                          src={resizerResult.dataUrl}
                          alt="Resized Preview"
                          className="max-h-[340px] w-auto rounded shadow-lg object-contain"
                        />
                      ) : (
                        <canvas ref={resizerCanvasRef} className="max-h-[340px] w-auto rounded shadow-lg object-contain" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full max-w-md pt-2">
                      <button
                        onClick={() => resizerInputRef.current?.click()}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replace Image
                      </button>
                      <button
                        onClick={() => {
                          if (resizerResult) {
                            triggerDownload(resizerResult.dataUrl, `JustPDFCraft_${selectedPresetId}_${Date.now()}.jpg`);
                          }
                        }}
                        disabled={!resizerResult}
                        className="flex-1 py-2.5 bg-gradient-to-r from-swift-600 to-indigo-600 hover:from-swift-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-swift-900/30 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download JPG ({resizerResult?.finalKb || 0} KB)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PHOTO + SIGN COMBINER */}
          {/* ======================================================== */}
          {activeTab === 'combiner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Settings (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    1. Upload Photo & Signature
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => combinerPhotoInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          loadImageFromFile(e.dataTransfer.files[0], setCombinerPhoto);
                        }
                      }}
                      className={`p-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                        combinerPhoto ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-swift-500 bg-slate-800/40'
                      }`}
                    >
                      <FileImage className="w-5 h-5 text-swift-400 mb-1" />
                      <span className="text-xs font-medium text-slate-200">
                        {combinerPhoto ? 'Photo Uploaded ✓' : 'Upload Photo'}
                      </span>
                    </button>
                    <input
                      ref={combinerPhotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          loadImageFromFile(e.target.files[0], setCombinerPhoto);
                        }
                      }}
                    />

                    <button
                      onClick={() => combinerSignInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          loadImageFromFile(e.dataTransfer.files[0], setCombinerSign);
                        }
                      }}
                      className={`p-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                        combinerSign ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-swift-500 bg-slate-800/40'
                      }`}
                    >
                      <Eraser className="w-5 h-5 text-swift-400 mb-1" />
                      <span className="text-xs font-medium text-slate-200">
                        {combinerSign ? 'Signature Uploaded ✓' : 'Upload Signature'}
                      </span>
                    </button>
                    <input
                      ref={combinerSignInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          loadImageFromFile(e.target.files[0], setCombinerSign);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Layout Selector */}
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    2. Layout Style
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'stacked' as const, label: 'Photo Top, Sign Bottom' },
                      { id: 'side-by-side' as const, label: 'Side by Side' },
                      { id: 'bottom-box' as const, label: 'Bottom Overlay' },
                    ].map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setCombinerLayout(l.id)}
                        className={`p-2 rounded-lg text-[11px] font-semibold text-center border transition-all ${
                          combinerLayout === l.id
                            ? 'border-swift-500 bg-swift-500/20 text-swift-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Candidate Information on Photo */}
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    3. Candidate Details (Optional)
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Candidate Full Name</span>
                    <input
                      type="text"
                      placeholder="e.g. SHASWAT SHARMA"
                      value={combinerName}
                      onChange={(e) => setCombinerName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-swift-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Date of Photo / Roll No</span>
                    <input
                      type="text"
                      placeholder="e.g. 22/09/2026 or Roll No"
                      value={combinerDOP}
                      onChange={(e) => setCombinerDOP(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Target Max Size (KB)</span>
                    <input
                      type="number"
                      value={combinerTargetMaxKb}
                      onChange={(e) => setCombinerTargetMaxKb(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 border border-slate-800 rounded-2xl p-6">
                {!combinerPhoto || !combinerSign ? (
                  <div className="text-center text-slate-400 space-y-2">
                    <Layers className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">Upload both Photo and Signature to generate card</p>
                    <p className="text-xs text-slate-500">Perfect for Gate, University Admissions, and SSC/UPSC joint forms.</p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                        Combined Card Ready ({combinerResult?.finalKb || 0} KB)
                      </span>
                    </div>

                    <div className="max-h-[380px] p-2 bg-black border border-slate-800 rounded-xl overflow-auto shadow-inner flex items-center justify-center">
                      {combinerResult?.dataUrl ? (
                        <img
                          src={combinerResult.dataUrl}
                          alt="Combined Preview"
                          className="max-h-[340px] w-auto rounded shadow-lg object-contain bg-white"
                        />
                      ) : (
                        <canvas ref={combinerCanvasRef} className="max-h-[340px] w-auto rounded shadow-lg object-contain bg-white" />
                      )}
                    </div>

                    <div className="w-full max-w-sm pt-2">
                      <button
                        onClick={() => {
                          if (combinerResult) {
                            triggerDownload(combinerResult.dataUrl, `JustPDFCraft_Combined_${Date.now()}.jpg`);
                          }
                        }}
                        disabled={!combinerResult}
                        className="w-full py-2.5 bg-gradient-to-r from-swift-600 to-indigo-600 hover:from-swift-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-swift-900/30 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Joint Card JPG ({combinerResult?.finalKb || 0} KB)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: CLEAN SIGNATURE */}
          {/* ======================================================== */}
          {activeTab === 'clean-sign' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    1. Upload Mobile Photo of Signature
                  </span>
                  <button
                    onClick={() => cleanSignInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        loadImageFromFile(e.dataTransfer.files[0], setCleanSignImage);
                      }
                    }}
                    className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      cleanSignImage ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-swift-500 bg-slate-800/40'
                    }`}
                  >
                    <Eraser className="w-6 h-6 text-swift-400 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-200">
                      {cleanSignImage ? 'Change Signature Photo' : 'Select Signature from Phone/Computer'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Works even if paper has shadows, yellow tint, or room glare.
                    </span>
                  </button>
                  <input
                    ref={cleanSignInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        loadImageFromFile(e.target.files[0], setCleanSignImage);
                      }
                    }}
                  />
                </div>

                {/* Cleaner Sliders & Settings */}
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Paper Whitening Sensitivity</span>
                      <span className="font-mono text-swift-400">{threshold}</span>
                    </div>
                    <input
                      type="range"
                      min="120"
                      max="240"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                      className="w-full accent-swift-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Increase if paper still has dark shadows; decrease if ink lines get too thin.</p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-300 font-medium block mb-1.5">Ink Color Enhancement</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'black' as const, label: 'Dark Black' },
                        { id: 'blue' as const, label: 'Royal Blue' },
                        { id: 'preserve' as const, label: 'Preserve Original' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setInkColor(item.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                            inkColor === item.id
                              ? 'border-swift-500 bg-swift-500/20 text-swift-300'
                              : 'border-slate-700 bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={transparentBg}
                        onChange={(e) => setTransparentBg(e.target.checked)}
                        className="rounded border-slate-700 text-swift-600 bg-slate-800"
                      />
                      <span>Transparent Background (PNG format)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCrop}
                        onChange={(e) => setAutoCrop(e.target.checked)}
                        className="rounded border-slate-700 text-swift-600 bg-slate-800"
                      />
                      <span>Auto-Crop Surrounding Paper Borders</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Preview */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 border border-slate-800 rounded-2xl p-6">
                {!cleanSignImage ? (
                  <div className="text-center text-slate-400 space-y-2">
                    <Eraser className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">Upload signature to remove background paper shadows</p>
                    <p className="text-xs text-slate-500">Makes signature accepted on all government & college portals.</p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                        Clean White Paper Signature
                      </span>
                    </div>

                    <div className="max-h-[380px] p-4 bg-black border border-slate-800 rounded-xl overflow-auto shadow-inner flex items-center justify-center">
                      {cleanSignDataUrl ? (
                        <img
                          src={cleanSignDataUrl}
                          alt="Clean Signature Preview"
                          className={`max-h-[300px] w-auto rounded border border-slate-800 shadow-md ${
                            transparentBg ? 'bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]' : 'bg-white'
                          }`}
                        />
                      ) : (
                        <canvas
                          ref={cleanSignCanvasRef}
                          className={`max-h-[300px] w-auto rounded border border-slate-800 shadow-md ${
                            transparentBg ? 'bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]' : 'bg-white'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full max-w-sm pt-2">
                      <button
                        onClick={() => {
                          const dataUrl = cleanSignDataUrl || cleanSignCanvasRef.current?.toDataURL(transparentBg ? 'image/png' : 'image/jpeg', 0.95);
                          if (dataUrl) {
                            triggerDownload(dataUrl, `JustPDFCraft_CleanSign_${Date.now()}.${transparentBg ? 'png' : 'jpg'}`);
                          }
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-swift-600 to-indigo-600 hover:from-swift-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-swift-900/30 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Clean Signature
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: NAME & DATE OF PHOTO (DOP) */}
          {/* ======================================================== */}
          {activeTab === 'dop-banner' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Left Controls */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    1. Upload Passport Photo
                  </span>
                  <button
                    onClick={() => dopInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        loadImageFromFile(e.dataTransfer.files[0], setDopPhoto);
                      }
                    }}
                    className={`w-full p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-all ${
                      dopPhoto ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-swift-500 bg-slate-800/40'
                    }`}
                  >
                    <Tag className="w-6 h-6 text-swift-400 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-200">
                      {dopPhoto ? 'Photo Uploaded ✓' : 'Select Passport Photo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Adds official name and date box required for SSC, UPSC, and State Exams.
                    </span>
                  </button>
                  <input
                    ref={dopInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        loadImageFromFile(e.target.files[0], setDopPhoto);
                      }
                    }}
                  />
                </div>

                {/* Form Fields */}
                <div className="bg-black/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    2. Candidate Details on Banner
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Candidate Full Name (in Capitals)</span>
                    <input
                      type="text"
                      placeholder="e.g. AMIT KUMAR"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white uppercase font-semibold focus:outline-none focus:border-swift-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Date Prefix</span>
                      <select
                        value={dopPrefix}
                        onChange={(e) => setDopPrefix(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500"
                      >
                        <option value="DOP: ">DOP: (Date of Photo)</option>
                        <option value="DOB: ">DOB: (Date of Birth)</option>
                        <option value="">None (Just Date)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Date (DD/MM/YYYY)</span>
                      <input
                        type="text"
                        value={dateOfPhoto}
                        onChange={(e) => setDateOfPhoto(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-swift-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Target File Size (KB)</span>
                    <input
                      type="number"
                      value={dopTargetMaxKb}
                      onChange={(e) => setDopTargetMaxKb(parseInt(e.target.value, 10) || 50)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-swift-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Preview */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/60 border border-slate-800 rounded-2xl p-6">
                {!dopPhoto ? (
                  <div className="text-center text-slate-400 space-y-2">
                    <Tag className="w-12 h-12 text-slate-600 mx-auto" />
                    <p className="text-sm font-semibold text-slate-300">Upload photo to add official Name & Date banner</p>
                    <p className="text-xs text-slate-500">Mandatory rule for SSC CGL, CHSL, UPSC, and Police Bharti exams.</p>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                        Official DOP Photo Generated ({dopResult?.finalKb || 0} KB)
                      </span>
                    </div>

                    <div className="max-h-[380px] p-2 bg-black border border-slate-800 rounded-xl overflow-auto shadow-inner flex items-center justify-center">
                      {dopResult?.dataUrl ? (
                        <img
                          src={dopResult.dataUrl}
                          alt="DOP Photo Preview"
                          className="max-h-[340px] w-auto rounded shadow-lg object-contain bg-white"
                        />
                      ) : (
                        <canvas ref={dopCanvasRef} className="max-h-[340px] w-auto rounded shadow-lg object-contain bg-white" />
                      )}
                    </div>

                    <div className="w-full max-w-sm pt-2">
                      <button
                        onClick={() => {
                          if (dopResult) {
                            triggerDownload(dopResult.dataUrl, `JustPDFCraft_DOP_Photo_${Date.now()}.jpg`);
                          }
                        }}
                        disabled={!dopResult}
                        className="w-full py-2.5 bg-gradient-to-r from-swift-600 to-indigo-600 hover:from-swift-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-swift-900/30 flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download DOP Photo JPG ({dopResult?.finalKb || 0} KB)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
