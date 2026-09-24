import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  Type,
  X,
  Trash2,
  Stamp,
  Upload,
  GraduationCap,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { localDb, SavedSignatureRecord } from '@core/db/database';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export type SignaturePlacement = 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right';

export const SignDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const {
    documentId,
    currentPage,
    pageDimensions,
    fileName,
    filePath,
    loadDocument,
    pushHistory,
  } = useDocumentStore();

  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload' | 'saved'>('draw');
  const [typedName, setTypedName] = useState('');
  const [typedFont, setTypedFont] = useState('cursive');
  const [savedSignatures, setSavedSignatures] = useState<SavedSignatureRecord[]>([]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Upload Signature state
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(true);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Signature Placement preset
  const [placement, setPlacement] = useState<SignaturePlacement>('bottom-right');

  useEffect(() => {
    if (activeModal === 'sign') {
      setSavedSignatures(localDb.getSavedSignatures());
    }
  }, [activeModal]);

  if (activeModal !== 'sign') return null;

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = e.pressure && e.pressure > 0.1 ? 1.5 + e.pressure * 2.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0C8DE9';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (e.pressure && e.pressure > 0.1) {
      ctx.lineWidth = 1.5 + e.pressure * 2.5;
    }
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const processUploadedImage = (file: File, stripWhite: boolean) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        if (stripWhite) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            // If near white/light background, make transparent
            if (r > 200 && g > 200 && b > 200) {
              d[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        setUploadDataUrl(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processUploadedImage(e.target.files[0], removeBg);
  };

  const getSignatureDataUrl = (): string | null => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL('image/png');
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return null;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;
      ctx.font = `italic 36px ${typedFont}`;
      ctx.fillStyle = '#0C8DE9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 200, 60);
      return tempCanvas.toDataURL('image/png');
    } else if (activeTab === 'upload') {
      return uploadDataUrl;
    }
    return null;
  };

  const calculateCoordinates = () => {
    const pageDim = pageDimensions[currentPage - 1] || { width: 595.28, height: 841.89 };
    const sigW = 180;
    const sigH = 60;
    let sigX = 350;
    let sigY = 80;

    if (placement === 'bottom-right') {
      sigX = Math.max(24, pageDim.width - sigW - 48);
      sigY = 64;
    } else if (placement === 'bottom-left') {
      sigX = 48;
      sigY = 64;
    } else if (placement === 'bottom-center') {
      sigX = Math.max(24, (pageDim.width - sigW) / 2);
      sigY = 64;
    } else if (placement === 'top-right') {
      sigX = Math.max(24, pageDim.width - sigW - 48);
      sigY = Math.max(48, pageDim.height - sigH - 64);
    }

    return { x: sigX, y: sigY, width: sigW, height: sigH };
  };

  const handleApplySignature = async () => {
    if (!documentId) return;
    const dataUrl = getSignatureDataUrl();
    if (!dataUrl) {
      addToast({
        type: 'warning',
        title: 'Signature Required',
        message: 'Please draw, type, or upload your signature.',
      });
      return;
    }

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      await pushHistory('Add signature to document');
      const engine = getPDFEngine();
      const coords = calculateCoordinates();

      await engine.insertImage(documentId, {
        pageIndex: currentPage - 1,
        imageBuffer,
        mimeType: 'image/png',
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
      });

      // Save signature to local database
      localDb.saveSignature({
        title:
          activeTab === 'type'
            ? typedName.trim()
            : activeTab === 'upload'
            ? 'Uploaded Signature'
            : 'Drawn Signature',
        type: activeTab === 'type' ? 'typed' : 'drawn',
        dataUrl,
      });

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Signature Applied',
        message: `Signature placed on Page ${currentPage} (${placement}).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Signature Failed', message: err?.message });
    }
  };

  const handleApplySaved = async (sig: SavedSignatureRecord) => {
    if (!documentId) return;
    try {
      const res = await fetch(sig.dataUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      await pushHistory(`Stamp saved signature: ${sig.title}`);
      const engine = getPDFEngine();
      const coords = calculateCoordinates();

      await engine.insertImage(documentId, {
        pageIndex: currentPage - 1,
        imageBuffer,
        mimeType: 'image/png',
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
      });

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Signature Applied',
        message: `Placed saved signature "${sig.title}" on Page ${currentPage}.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Signature Failed', message: err?.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign Dialog">
      <div className="w-full max-w-lg bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">E-Sign Document</h3>
              <p className="text-xs text-slate-400">
                {documentId
                  ? `Draw, type, upload, or stamp saved signatures on Page ${currentPage}`
                  : 'Open a PDF document to sign and stamp'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('student-resizer')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-semibold border border-indigo-700/60 transition-colors"
              title="Clean paper signature or format for Exam Forms"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Exam Sign Cleaner</span>
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="E-Sign"
            description="Please select a PDF document first to apply your handwritten, typed, or uploaded signature."
            icon={PenTool}
            actionText="Select PDF to Sign"
          />
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="flex border-b border-slate-800 bg-[#000000]/40 px-6 pt-2 gap-2 text-xs">
              {[
                { id: 'draw', label: 'Draw', icon: PenTool },
                { id: 'type', label: 'Type', icon: Type },
                { id: 'upload', label: 'Upload', icon: Upload },
                { id: 'saved', label: `Saved (${savedSignatures.length})`, icon: Stamp },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
                      isActive
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="p-6 space-y-4">
              {/* Draw Tab */}
              {activeTab === 'draw' && (
                <div className="space-y-3">
                  <div className="border border-slate-700 rounded-xl bg-[#000000] overflow-hidden relative shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={460}
                      height={160}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerCancel={stopDrawing}
                      onPointerLeave={stopDrawing}
                      className="w-full h-40 cursor-crosshair touch-none select-none"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-600 pointer-events-none text-xs">
                        Sign here with your mouse or stylus
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Ink: Swift Blue (#0C8DE9)</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Pad
                    </button>
                  </div>
                </div>
              )}

              {/* Type Tab */}
              {activeTab === 'type' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Type your full name</label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Handwriting Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'cursive', label: 'Classic Script' },
                        { id: 'Caveat, cursive', label: 'Casual Flow' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTypedFont(f.id)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            typedFont === f.id
                              ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                              : 'border-slate-800 bg-slate-800/40 text-slate-400'
                          }`}
                        >
                          <span className="text-lg italic font-serif" style={{ fontFamily: f.id }}>
                            {typedName || 'Sample Signature'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  {!uploadDataUrl ? (
                    <div
                      onClick={() => uploadInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-800/40 p-8 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Upload className="w-6 h-6 text-sky-400" />
                      <span className="text-xs font-semibold text-slate-200">Upload Signature Image</span>
                      <span className="text-[11px] text-slate-500">Supports PNG, JPG, or WEBP photo of signature</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border border-slate-700 rounded-xl bg-[#000000] p-4 flex items-center justify-center min-h-[120px] relative">
                        <img
                          src={uploadDataUrl}
                          alt="Uploaded Signature"
                          className="max-h-24 max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={removeBg}
                            onChange={(e) => setRemoveBg(e.target.checked)}
                            className="rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0"
                          />
                          <span>Remove white background (transparent stamp)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadDataUrl(null);
                            if (uploadInputRef.current) uploadInputRef.current.value = '';
                          }}
                          className="text-slate-400 hover:text-rose-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Saved Tab */}
              {activeTab === 'saved' && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {savedSignatures.length === 0 ? (
                    <p className="text-center text-slate-500 text-xs py-8">
                      No saved signatures yet. Create a signature in Draw, Type, or Upload to save it locally.
                    </p>
                  ) : (
                    savedSignatures.map((sig) => (
                      <div
                        key={sig.id}
                        className="p-3 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center justify-between hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img src={sig.dataUrl} alt="Signature" className="h-10 bg-white/90 rounded px-2" />
                          <span className="text-xs font-semibold text-slate-200">{sig.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplySaved(sig)}
                            className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg"
                          >
                            Stamp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              localDb.deleteSignature(sig.id);
                              setSavedSignatures(localDb.getSavedSignatures());
                            }}
                            className="p-1 hover:text-rose-400 text-slate-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Placement Selector */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Page Placement Position
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'top-right', label: 'Top Right' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlacement(p.id as SignaturePlacement)}
                      className={`py-1.5 px-2 rounded-lg border text-center text-[11px] transition-colors ${
                        placement === p.id
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300 font-semibold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            {activeTab !== 'saved' && (
              <div className="px-6 py-4 border-t border-slate-800 bg-[#000000]/60 flex justify-end gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySignature}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-900/30 flex items-center gap-1.5"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  Stamp Signature
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SignDialog;
