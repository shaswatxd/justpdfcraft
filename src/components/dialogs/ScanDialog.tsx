import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Upload, CheckCircle2, RotateCcw, Plus, Trash2, VideoOff } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { PDFDocument } from 'pdf-lib';

export type ScanFilterMode = 'original' | 'document' | 'grayscale';

export const ScanDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { loadDocument } = useDocumentStore();

  const [inputMode, setInputMode] = useState<'camera' | 'upload'>('upload');
  const [filterMode, setFilterMode] = useState<ScanFilterMode>('document');
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: { ideal: 'environment' },
        },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(err?.message || 'Could not access webcam or document camera.');
    }
  }, [stopCameraStream]);

  // Clean stream when modal closes or inputMode switches
  useEffect(() => {
    if (activeModal === 'scan') {
      if (inputMode === 'camera' && !currentSnapshot) {
        startCameraStream();
      } else {
        stopCameraStream();
      }
    } else {
      stopCameraStream();
      setCurrentSnapshot(null);
      setScannedPages([]);
    }
    return () => {
      stopCameraStream();
    };
  }, [activeModal, inputMode, currentSnapshot, startCameraStream, stopCameraStream]);

  if (activeModal !== 'scan') return null;

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setCurrentSnapshot(dataUrl);
    stopCameraStream();
  };

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCurrentSnapshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImageToFilteredBuffer = async (src: string, mode: ScanFilterMode): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas 2d context'));

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;

        if (mode === 'grayscale' || mode === 'document') {
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (mode === 'document') {
              // High contrast binarization for clean document scan look
              const val = gray > 140 ? 255 : (gray < 80 ? 0 : gray * 0.7);
              d[i] = val;
              d[i + 1] = val;
              d[i + 2] = val;
            } else {
              d[i] = gray;
              d[i + 1] = gray;
              d[i + 2] = gray;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error('Blob creation failed'));
          const ab = await blob.arrayBuffer();
          resolve(new Uint8Array(ab));
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleAddPageToBatch = () => {
    if (!currentSnapshot) return;
    setScannedPages((prev) => [...prev, currentSnapshot]);
    setCurrentSnapshot(null);
    if (inputMode === 'camera') {
      startCameraStream();
    }
    addToast({
      type: 'info',
      title: 'Page Added to Batch',
      message: `Total pages in queue: ${scannedPages.length + 1}`,
    });
  };

  const handleSaveScanToPdf = async () => {
    const pagesToCompile = currentSnapshot
      ? [...scannedPages, currentSnapshot]
      : scannedPages;

    if (pagesToCompile.length === 0) return;
    setIsProcessing(true);

    try {
      const doc = await PDFDocument.create();

      for (const pageSrc of pagesToCompile) {
        const imageBuffer = await processImageToFilteredBuffer(pageSrc, filterMode);
        const embedded = await doc.embedPng(imageBuffer);
        const { width, height } = embedded.scale(1.0);
        const page = doc.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await doc.save();
      await loadDocument(pdfBytes, `Scanned_Doc_${Date.now()}.pdf`);

      setActiveModal(null);
      stopCameraStream();
      addToast({
        type: 'success',
        title: 'Document Scanned',
        message: `Created PDF with ${pagesToCompile.length} scanned page(s).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Scan Error', message: err?.message || 'Could not process scan.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Smart Document Scanner</h3>
              <p className="text-xs text-slate-400">Scan via live camera or photos with auto-contrast binarization</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              setActiveModal(null);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setInputMode('upload');
              stopCameraStream();
            }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
              inputMode === 'upload'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInputMode('camera');
              if (!currentSnapshot) startCameraStream();
            }}
            className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
              inputMode === 'camera'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Webcam / Camera</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelected}
            className="hidden"
          />

          {/* Current Capture / Video Viewport */}
          {inputMode === 'camera' && !currentSnapshot ? (
            <div className="space-y-3">
              <div className="border border-slate-800 rounded-xl bg-black overflow-hidden relative min-h-[220px] flex items-center justify-center">
                {cameraError ? (
                  <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
                    <VideoOff className="w-8 h-8 text-rose-400" />
                    <p className="font-semibold text-rose-300">Camera Unavailable</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setInputMode('upload')}
                      className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                    >
                      Switch to File Upload
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-56 object-cover"
                    />
                    {/* Viewfinder Target Frame Overlay */}
                    <div className="absolute inset-4 border-2 border-dashed border-orange-500/60 pointer-events-none rounded-lg flex items-center justify-center">
                      <div className="text-[10px] text-orange-300/80 bg-black/60 px-2 py-0.5 rounded font-mono">
                        Align document within guide
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!cameraError && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleCaptureFrame}
                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/40 flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                </div>
              )}
            </div>
          ) : !currentSnapshot ? (
            /* Upload Mode Selection */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-orange-500/50 bg-slate-800/40 hover:bg-slate-800/80 p-8 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            >
              <div className="p-3 bg-orange-500/10 rounded-full text-orange-400">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-200">Select Document Photo or Receipt</p>
              <p className="text-[11px] text-slate-400">Supports JPG, PNG, WEBP camera images</p>
            </div>
          ) : (
            /* Snapshot Preview with Filter */
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-xl bg-slate-950 p-2 flex items-center justify-center max-h-60 overflow-hidden relative">
                <img
                  src={currentSnapshot}
                  alt="Scan Preview"
                  className={`max-h-56 object-contain rounded transition-all ${
                    filterMode === 'grayscale'
                      ? 'grayscale'
                      : filterMode === 'document'
                      ? 'contrast-150 grayscale'
                      : ''
                  }`}
                />
                <button
                  onClick={() => {
                    setCurrentSnapshot(null);
                    if (inputMode === 'camera') startCameraStream();
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 flex items-center gap-1 text-[11px]"
                  title="Retake or change photo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>

              {/* Filter Mode Selector */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Enhancement Filter</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'document', label: 'Document (B&W)', sub: 'Clean Crisp Text' },
                    { id: 'grayscale', label: 'Grayscale', sub: 'Balanced' },
                    { id: 'original', label: 'Original Color', sub: 'No Filter' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFilterMode(m.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        filterMode === m.id
                          ? 'bg-orange-500/10 border-orange-500 text-orange-300'
                          : 'bg-slate-800/40 border-slate-800 text-slate-400'
                      }`}
                    >
                      <p className="font-bold">{m.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-page queue trigger */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddPageToBatch}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-400" />
                  <span>Queue as Page & Scan Next</span>
                </button>
              </div>
            </div>
          )}

          {/* Scanned Pages Batch Tray */}
          {scannedPages.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <label className="font-semibold text-slate-300 block mb-1.5">
                Batch Pages ({scannedPages.length})
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {scannedPages.map((pg, idx) => (
                  <div key={idx} className="relative shrink-0 border border-slate-700 rounded-lg p-1 bg-slate-950">
                    <img src={pg} alt={`Page ${idx + 1}`} className="w-14 h-18 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setScannedPages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 hover:bg-rose-500 rounded-full text-white"
                      title="Remove page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5 font-mono">P.{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex justify-end gap-2">
          <button
            onClick={() => {
              stopCameraStream();
              setActiveModal(null);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveScanToPdf}
            disabled={(!currentSnapshot && scannedPages.length === 0) || isProcessing}
            className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-orange-900/30 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isProcessing ? 'Enhancing...' : 'Create Scanned PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
