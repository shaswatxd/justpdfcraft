import React, { useState, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  RefreshCw,
  FileArchive,
  Download,
  Upload,
  Sliders,
  Trash2,
  Crop,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface ImageFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  convertedUrl?: string;
  convertedSize?: number;
}

export const ImageToolsDialog: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    activeImageTab,
    setActiveImageTab,
    addToast,
  } = useUIStore();
  const isOpen = activeModal === 'image-tools';

  const [activeTab, setActiveTab] = useState<'converter' | 'bulk-compress'>('converter');
  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(0.85);
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (activeImageTab === 'bulk-compress') {
      setActiveTab('bulk-compress');
    } else if (activeImageTab === 'converter') {
      setActiveTab('converter');
    }
  }, [activeImageTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    images.forEach(img => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setActiveModal(null);
    setActiveImageTab(null);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: ImageFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
        newItems.push({
          id: `${Date.now()}_${i}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
        });
      }
    }

    if (newItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Images Selected',
        message: 'Please select valid image files (JPG, PNG, WebP).',
      });
      return;
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find(i => i.id === id);
      if (img && img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setImages([]);
  };

  const processImages = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const mime = targetFormat === 'jpeg' ? 'image/jpeg' : targetFormat === 'png' ? 'image/png' : 'image/webp';

      const updated = [...images];

      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        const img = new Image();
        img.src = item.previewUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (targetFormat === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);

          const dataUrl = canvas.toDataURL(mime, quality);
          item.convertedUrl = dataUrl;

          // Estimate byte size from base64
          const byteLength = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
          item.convertedSize = byteLength;
        }
      }

      setImages(updated);
      addToast({
        type: 'success',
        title: 'Processing Complete',
        message: `Successfully processed ${updated.length} image(s).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Processing Failed',
        message: err?.message || 'Could not process images.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = () => {
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    images.forEach((img, idx) => {
      if (img.convertedUrl) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = img.convertedUrl!;
          const baseName = img.name.replace(/\.[^/.]+$/, '');
          a.download = `${baseName}_converted.${ext}`;
          a.click();
        }, idx * 180);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none" role="dialog" aria-modal="true" aria-label="Image Tools Dialog">
      <div className="w-full max-w-3xl h-[85vh] max-h-[760px] bg-black border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Image Suite</h2>
              <p className="text-[11px] text-slate-400">High-speed format conversion & batch compression</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Launchers to specialized image suites */}
        <div className="bg-black/80 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Jump to:</span>
          <button
            onClick={() => setActiveModal('student-resizer')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-medium flex items-center gap-1 shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            Exact Target KB Resizer (20–50 KB)
          </button>
          <button
            onClick={() => setActiveModal('photo-editor')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg font-medium flex items-center gap-1 shrink-0"
          >
            <Crop className="w-3.5 h-3.5" />
            Cropper & Filters
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-black/60 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'converter'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Format Converter (JPG/PNG/WebP)
          </button>
          <button
            onClick={() => setActiveTab('bulk-compress')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bulk-compress'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            Batch Quality Compressor
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/bmp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target Format</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as any)}
                  className="bg-black border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                >
                  <option value="png">PNG (Lossless)</option>
                  <option value="jpeg">JPG / JPEG</option>
                  <option value="webp">WebP (Modern Web)</option>
                </select>
              </div>

              {activeTab === 'bulk-compress' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase">
                    <span>Quality</span>
                    <span className="text-pink-400">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-32 accent-pink-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Upload className="w-3.5 h-3.5" />
                Add Photos
              </button>

              {images.length > 0 && (
                <button
                  onClick={processImages}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-pink-900/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Processing...' : 'Convert / Compress'}
                </button>
              )}
            </div>
          </div>

          {/* Files List or Drop Area */}
          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-pink-500/50 rounded-2xl p-10 text-center cursor-pointer bg-black/40 hover:bg-slate-800/40 transition-colors space-y-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Click to select images or drag and drop photos here
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Supports JPG, PNG, and WebP formats</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Selected Photos ({images.length})</span>
                <button onClick={clearAll} className="hover:text-rose-400 transition-colors">
                  Clear All
                </button>
              </div>

              <div className="divide-y divide-slate-800 bg-black/60 rounded-xl border border-slate-800 max-h-[300px] overflow-y-auto">
                {images.map((img) => (
                  <div key={img.id} className="p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={img.previewUrl}
                        alt="Thumbnail"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-white truncate">{img.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Original: {(img.size / 1024).toFixed(1)} KB
                          {img.convertedSize && (
                            <span className="text-emerald-400 ml-2 font-bold">
                              → {(img.convertedSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {images.some((i) => i.convertedUrl) && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={downloadAll}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All Converted Files
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageToolsDialog;
