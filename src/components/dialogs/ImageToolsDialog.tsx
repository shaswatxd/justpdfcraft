import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Sliders,
  Crop,
  RefreshCw,
  RotateCw,
  FlipHorizontal,
  Download,
  Upload,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { compressToTargetKb } from '@core/image/student-resizer';

type ImageTab =
  | 'compress'
  | 'resize'
  | 'crop'
  | 'convert'
  | 'passport'
  | 'rotate'
  | 'metadata';

export const ImageToolsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeImageTab, addToast, pendingImageFile, setPendingImageFile } = useUIStore();
  const isOpen = activeModal === 'image-tools';

  const [activeTab, setActiveTab] = useState<ImageTab>('compress');
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState<string>('image.png');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeImageTab) {
      setActiveTab(activeImageTab as ImageTab);
    }
  }, [activeImageTab]);

  // Load from pending dropped file if present
  useEffect(() => {
    if (pendingImageFile && isOpen) {
      loadFile(pendingImageFile);
      setPendingImageFile(null);
    }
  }, [pendingImageFile, isOpen, setPendingImageFile]);

  const loadFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast({ type: 'warning', title: 'Invalid File', message: 'Please select an image (JPG, PNG, WebP).' });
      return;
    }
    setFileName(file.name);
    setOriginalSize(file.size);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCurrentImage(img);
      setProcessedUrl(null);
      setProcessedSize(0);
    };
    img.src = url;
  };

  // 1. Compress controls
  const [targetKb, setTargetKb] = useState<number>(100);

  const runCompress = async () => {
    if (!currentImage) return;
    setIsProcessing(true);
    try {
      const cvs = document.createElement('canvas');
      cvs.width = currentImage.naturalWidth;
      cvs.height = currentImage.naturalHeight;
      const ctx = cvs.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      ctx.drawImage(currentImage, 0, 0);

      const res = await compressToTargetKb(cvs, Math.max(10, targetKb - 15), targetKb);
      setProcessedUrl(res.dataUrl);
      setProcessedSize(res.blob.size);
      addToast({ type: 'success', title: 'Image Compressed', message: `Size reduced to ${(res.blob.size / 1024).toFixed(1)} KB` });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Compression Failed', message: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Resize controls
  const [resizeWidth, setResizeWidth] = useState<number>(800);
  const [resizeHeight, setResizeHeight] = useState<number>(600);
  const [keepAspect, setKeepAspect] = useState<boolean>(true);

  useEffect(() => {
    if (currentImage) {
      setResizeWidth(currentImage.naturalWidth);
      setResizeHeight(currentImage.naturalHeight);
    }
  }, [currentImage]);

  const handleWidthChange = (w: number) => {
    setResizeWidth(w);
    if (keepAspect && currentImage && currentImage.naturalWidth) {
      setResizeHeight(Math.round((w / currentImage.naturalWidth) * currentImage.naturalHeight));
    }
  };

  const handleHeightChange = (h: number) => {
    setResizeHeight(h);
    if (keepAspect && currentImage && currentImage.naturalHeight) {
      setResizeWidth(Math.round((h / currentImage.naturalHeight) * currentImage.naturalWidth));
    }
  };

  const runResize = () => {
    if (!currentImage) return;
    const cvs = document.createElement('canvas');
    cvs.width = resizeWidth;
    cvs.height = resizeHeight;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(currentImage, 0, 0, resizeWidth, resizeHeight);
    cvs.toBlob((blob) => {
      if (blob) {
        setProcessedUrl(URL.createObjectURL(blob));
        setProcessedSize(blob.size);
        addToast({ type: 'success', title: 'Image Resized', message: `${resizeWidth}×${resizeHeight} px` });
      }
    }, 'image/jpeg', 0.9);
  };

  // 3. Format Converter controls
  const [targetFormat, setTargetFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/webp');
  const runConvert = () => {
    if (!currentImage) return;
    const cvs = document.createElement('canvas');
    cvs.width = currentImage.naturalWidth;
    cvs.height = currentImage.naturalHeight;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    if (targetFormat === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }
    ctx.drawImage(currentImage, 0, 0);
    cvs.toBlob((blob) => {
      if (blob) {
        setProcessedUrl(URL.createObjectURL(blob));
        setProcessedSize(blob.size);
        addToast({ type: 'success', title: 'Format Converted' });
      }
    }, targetFormat, 0.92);
  };

  // 4. Passport Photo Maker
  const [passportBg, setPassportBg] = useState<'white' | 'light-blue'>('white');
  const runPassport = () => {
    if (!currentImage) return;
    // Standard 2x2 inch at 300 DPI = 600x600 px
    const cvs = document.createElement('canvas');
    cvs.width = 600;
    cvs.height = 600;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = passportBg === 'white' ? '#ffffff' : '#e0f2fe';
    ctx.fillRect(0, 0, 600, 600);

    // Scale to fit center
    const aspect = currentImage.naturalWidth / currentImage.naturalHeight;
    let dw = 600;
    let dh = 600 / aspect;
    if (dh < 600) {
      dh = 600;
      dw = 600 * aspect;
    }
    const dx = (600 - dw) / 2;
    const dy = (600 - dh) / 2;
    ctx.drawImage(currentImage, dx, dy, dw, dh);

    cvs.toBlob((blob) => {
      if (blob) {
        setProcessedUrl(URL.createObjectURL(blob));
        setProcessedSize(blob.size);
        addToast({ type: 'success', title: 'Passport Photo Created', message: '600×600 px (2×2 inch)' });
      }
    }, 'image/jpeg', 0.95);
  };

  // 5. Rotation & Flip
  const [rotationDeg, setRotationDeg] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);

  const applyRotation = (deg: number) => {
    setRotationDeg((prev) => (prev + deg) % 360);
  };

  const runRotateExport = () => {
    if (!currentImage) return;
    const cvs = document.createElement('canvas');
    const rad = (rotationDeg * Math.PI) / 180;
    const isSideways = rotationDeg === 90 || rotationDeg === 270;
    cvs.width = isSideways ? currentImage.naturalHeight : currentImage.naturalWidth;
    cvs.height = isSideways ? currentImage.naturalWidth : currentImage.naturalHeight;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.translate(cvs.width / 2, cvs.height / 2);
    ctx.rotate(rad);
    if (isFlippedH) ctx.scale(-1, 1);
    ctx.drawImage(currentImage, -currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);

    cvs.toBlob((blob) => {
      if (blob) {
        setProcessedUrl(URL.createObjectURL(blob));
        setProcessedSize(blob.size);
        addToast({ type: 'success', title: 'Rotation Applied' });
      }
    }, 'image/png');
  };

  if (!isOpen) return null;

  const tabs: { id: ImageTab; label: string; icon: any }[] = [
    { id: 'compress', label: 'Image Compressor', icon: Sliders },
    { id: 'resize', label: 'Image Resizer', icon: Crop },
    { id: 'convert', label: 'Format Converter', icon: RefreshCw },
    { id: 'passport', label: 'Passport Photo', icon: UserCheck },
    { id: 'rotate', label: 'Rotate & Flip', icon: RotateCw },
    { id: 'metadata', label: 'Image Info', icon: FileCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Image Suite & Utilities</h2>
              <p className="text-xs text-slate-500 font-medium">Compress, Resize, Convert, Crop & Passport Photos</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Nav Bar */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-4 py-2 gap-1.5 bg-white shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                loadFile(e.target.files[0]);
              }
              e.target.value = '';
            }}
          />

          {!currentImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="max-w-xl mx-auto my-12 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all shadow-xs hover:shadow-md"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Select an Image File</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Drop your JPG, PNG, or WebP photo here. 100% private in-browser processing.
              </p>
              <button
                type="button"
                className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Choose Photo
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Image Previews Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Original ({currentImage.naturalWidth}×{currentImage.naturalHeight} px • {(originalSize / 1024).toFixed(1)} KB)
                  </span>
                  <div className="w-full h-56 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden p-2">
                    <img
                      src={currentImage.src}
                      alt="Original"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Change Image
                  </button>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Processed Result {processedSize > 0 && `(${(processedSize / 1024).toFixed(1)} KB)`}
                  </span>
                  <div className="w-full h-56 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden p-2">
                    {processedUrl ? (
                      <img
                        src={processedUrl}
                        alt="Processed"
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Configure parameters below and click process.</span>
                    )}
                  </div>
                  {processedUrl && (
                    <a
                      href={processedUrl}
                      download={`processed_${fileName}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Image</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Tool Parameters Bar */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                {activeTab === 'compress' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Target File Size Limit</h4>
                        <p className="text-xs text-slate-500">Shrink photo to target KB for exam and job portals</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {[20, 50, 100, 200].map((kb) => (
                          <button
                            key={kb}
                            onClick={() => setTargetKb(kb)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              targetKb === kb ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {kb} KB
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={targetKb}
                        onChange={(e) => setTargetKb(Number(e.target.value))}
                        className="w-28 text-xs p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-center"
                      />
                      <span className="text-xs text-slate-600 font-semibold">Max KB</span>
                      <button
                        onClick={runCompress}
                        disabled={isProcessing}
                        className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        {isProcessing ? 'Compressing...' : 'Compress Image'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'resize' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Dimensions in Pixels</h4>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={keepAspect}
                          onChange={(e) => setKeepAspect(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span>Maintain Aspect Ratio</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">W:</span>
                        <input
                          type="number"
                          value={resizeWidth}
                          onChange={(e) => handleWidthChange(Number(e.target.value))}
                          className="w-24 text-xs p-2 rounded-xl border border-slate-200 text-center font-bold"
                        />
                        <span className="text-xs text-slate-500">px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">H:</span>
                        <input
                          type="number"
                          value={resizeHeight}
                          onChange={(e) => handleHeightChange(Number(e.target.value))}
                          className="w-24 text-xs p-2 rounded-xl border border-slate-200 text-center font-bold"
                        />
                        <span className="text-xs text-slate-500">px</span>
                      </div>
                      <button
                        onClick={runResize}
                        className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Apply Resize
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'convert' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900">Choose Target Output Format</h4>
                    <div className="flex items-center gap-3">
                      {[
                        { id: 'image/webp', label: 'WebP (Modern & Small)' },
                        { id: 'image/png', label: 'PNG (Lossless & Alpha)' },
                        { id: 'image/jpeg', label: 'JPG / JPEG (Standard)' },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setTargetFormat(fmt.id as any)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            targetFormat === fmt.id ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                      <button
                        onClick={runConvert}
                        className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Convert Format
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'passport' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Standard 2×2 Inch Passport Size</h4>
                        <p className="text-xs text-slate-500">600×600 px high-resolution compliant for visa and passport submissions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPassportBg('white')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            passportBg === 'white' ? 'bg-blue-600 text-white' : 'bg-slate-100'
                          }`}
                        >
                          White Background
                        </button>
                        <button
                          onClick={() => setPassportBg('light-blue')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            passportBg === 'light-blue' ? 'bg-blue-600 text-white' : 'bg-slate-100'
                          }`}
                        >
                          Light Blue Tint
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={runPassport}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Generate Passport Photo
                    </button>
                  </div>
                )}

                {activeTab === 'rotate' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => applyRotation(90)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Rotate 90°</span>
                      </button>
                      <button
                        onClick={() => setIsFlippedH(!isFlippedH)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isFlippedH ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <FlipHorizontal className="w-3.5 h-3.5" />
                        <span>Flip Horizontal</span>
                      </button>
                      <span className="text-xs font-semibold text-slate-500 ml-2">Angle: {rotationDeg}°</span>
                      <button
                        onClick={runRotateExport}
                        className="ml-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Save Rotation
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'metadata' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Filename</span>
                      <span className="font-semibold text-slate-800 break-all">{fileName}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Width</span>
                      <span className="font-semibold text-slate-800">{currentImage.naturalWidth} px</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Height</span>
                      <span className="font-semibold text-slate-800">{currentImage.naturalHeight} px</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">File Size</span>
                      <span className="font-semibold text-slate-800">{(originalSize / 1024).toFixed(1)} KB</span>
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
