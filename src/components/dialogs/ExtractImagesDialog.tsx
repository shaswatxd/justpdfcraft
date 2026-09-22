import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Download,
  Edit,
  Copy,
  Check,
  X,
  FolderOpen,
  Upload,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { ExtractedImageItem } from '@core/pdf/engine.interface';

export const ExtractImagesDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast, setActivePhotoUrl } = useUIStore();
  const { documentId, currentPage } = useDocumentStore();

  const [images, setImages] = useState<ExtractedImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPage, setFilterPage] = useState<'all' | 'current'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeModal === 'extract-images' && documentId) {
      loadExtractedImages();
    }
  }, [activeModal, documentId]);

  if (activeModal !== 'extract-images') return null;

  const loadExtractedImages = async () => {
    if (!documentId) return;
    setLoading(true);
    try {
      const engine = getPDFEngine();
      const extracted = await engine.extractImages(documentId);
      setImages(extracted);
      if (extracted.length === 0) {
        addToast({
          type: 'info',
          title: 'No Images Found',
          message: 'No embedded photos found in this document.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Extraction Failed',
        message: err?.message || 'Could not extract images from this document.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = (img: ExtractedImageItem) => {
    try {
      const a = document.createElement('a');
      a.href = img.dataUrl;
      const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
      a.download = img.name || `Photo_Page${img.pageIndex + 1}_${Date.now()}.${ext}`;
      a.click();
      addToast({
        type: 'success',
        title: 'Image Downloaded',
        message: `Saved ${a.download}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Download Failed',
        message: err?.message || 'Failed to download image.',
      });
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    setIsDownloadingAll(true);
    addToast({
      type: 'info',
      title: 'Downloading All Images',
      message: `Saving ${images.length} photos sequentially...`,
    });

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const a = document.createElement('a');
      a.href = img.dataUrl;
      const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
      a.download = img.name || `Extracted_Photo_${i + 1}_Page${img.pageIndex + 1}.${ext}`;
      a.click();
      // Small delay between programmatic downloads to avoid browser block
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsDownloadingAll(false);
    addToast({
      type: 'success',
      title: 'Download Complete',
      message: `All ${images.length} photos have been downloaded.`,
    });
  };

  const handleCopy = async (img: ExtractedImageItem) => {
    try {
      const res = await fetch(img.dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopiedId(img.id);
      addToast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: 'Image ready to paste anywhere (Ctrl+V).',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not copy image to clipboard.',
      });
    }
  };

  const handleEditPhoto = (img: ExtractedImageItem) => {
    setActivePhotoUrl(img.dataUrl);
    setActiveModal('photo-editor');
  };

  const handleUploadExternal = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setActivePhotoUrl(reader.result);
          setActiveModal('photo-editor');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const displayedImages = filterPage === 'current'
    ? images.filter((img) => img.pageIndex === currentPage - 1)
    : images;

  const totalSize = displayedImages.reduce((acc, img) => acc + (img.sizeBytes || 0), 0);
  const formattedSize =
    totalSize > 1024 * 1024
      ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(totalSize / 1024)} KB`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Hidden file input for external photo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadExternal}
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base">
                  Extract Photos & Images from PDF
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                  फ़ोटो निकालें व संपादित करें
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extract high-res embedded graphics, logos, document scans & edit them with Passport/ID crop.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
              <button
                onClick={() => setFilterPage('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterPage === 'all'
                    ? 'bg-swift-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All Pages ({images.length})
              </button>
              <button
                onClick={() => setFilterPage('current')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filterPage === 'current'
                    ? 'bg-swift-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Current Page (P. {currentPage})
              </button>
            </div>

            {images.length > 0 && (
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                Total size: <strong className="text-slate-200">{formattedSize}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition-colors text-xs"
              title="Upload photo from computer to edit or crop / फ़ोटो अपलोड करें"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload Photo to Edit</span>
            </button>

            {images.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-swift-600 hover:bg-swift-500 disabled:opacity-50 text-white font-medium transition-colors text-xs shadow-md shadow-swift-900/30"
                title="Download all extracted images / सभी फ़ोटो डाउनलोड करें"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingAll ? 'Downloading...' : `Download All (${displayedImages.length})`}</span>
              </button>
            )}

            <button
              onClick={loadExtractedImages}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
              title="Re-scan PDF for Images / दोबारा स्कैन करें"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-swift-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-200">
                Extracting high-resolution graphics and photos from PDF pages...
              </p>
              <p className="text-xs text-slate-400">
                Scanning lossless image streams, JPEG frames, and document scans.
              </p>
            </div>
          ) : !documentId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <FolderOpen className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">No PDF Document Open</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Open a PDF document first to extract photos, or upload an external photo directly to start editing.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-swift-600 hover:bg-swift-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Upload Photo to Edit
              </button>
            </div>
          ) : displayedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">No Photos Found on This Page</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {filterPage === 'current'
                    ? `Page ${currentPage} does not contain any embedded images. Switch to 'All Pages' or upload a photo.`
                    : 'This PDF does not contain embedded image streams or photos.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {filterPage === 'current' && (
                  <button
                    onClick={() => setFilterPage('all')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors"
                  >
                    View All Pages
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-swift-600 hover:bg-swift-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo to Edit
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedImages.map((img, idx) => {
                const isPng = img.mimeType.includes('png');
                const isCopied = copiedId === img.id;
                const sizeKb = Math.round((img.sizeBytes || 0) / 1024);

                return (
                  <div
                    key={img.id || idx}
                    className="group bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/20 transition-all"
                  >
                    {/* Image Preview Container */}
                    <div className="relative aspect-square w-full bg-slate-900/90 flex items-center justify-center overflow-hidden p-2 border-b border-slate-800/80 group-hover:bg-slate-900 transition-colors">
                      <img
                        src={img.dataUrl}
                        alt={img.name || `Photo ${idx + 1}`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                        loading="lazy"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-200 text-[10px] font-bold border border-slate-700/80 shadow-sm backdrop-blur-xs">
                          P. {img.pageIndex + 1}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isPng ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isPng ? 'PNG' : 'JPG'}
                        </span>
                      </div>

                      {/* Dimensions Badge */}
                      <div className="absolute bottom-2 right-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-black/75 text-slate-300 text-[10px] font-mono backdrop-blur-xs">
                          {img.width} × {img.height}
                        </span>
                      </div>
                    </div>

                    {/* Meta & Actions */}
                    <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-slate-900/50">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[140px] font-mono text-slate-300">
                          {img.name || `Photo_${idx + 1}`}
                        </span>
                        <span className="font-medium text-slate-400">{sizeKb} KB</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => handleDownloadSingle(img)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-[11px] border border-slate-700/60 transition-colors"
                          title="Save photo to computer / डाउनलोड करें"
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>Save</span>
                        </button>

                        <button
                          onClick={() => handleCopy(img)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-[11px] border border-slate-700/60 transition-colors"
                          title="Copy image to clipboard (Ctrl+C) / कॉपी करें"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-sky-400" />
                          )}
                          <span>{isCopied ? 'Done' : 'Copy'}</span>
                        </button>

                        <button
                          onClick={() => handleEditPhoto(img)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition-colors shadow-sm"
                          title="Edit Photo (Crop Passport 3.5×4.5cm, Filter, Rotate, Place in PDF) / फ़ोटो एडिट करें"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hint / Help Bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong className="text-slate-200">User Tip:</strong> Click{' '}
              <strong className="text-purple-300">"Edit"</strong> on any photo to crop to Indian Passport
              format (3.5 × 4.5 cm), apply Document Scanner filters, or insert back into any page.
            </span>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
