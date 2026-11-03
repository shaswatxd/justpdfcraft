import React, { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Download,
  Check,
  Archive,
  RefreshCw,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { extractImagesFromDocument } from '@core/pdf/image-extractor';
import { ExtractedImageItem } from '@core/pdf/engine.interface';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { PDFDocument } from 'pdf-lib';
import { createZip } from '@/utils/zip';
import { downloadBlob } from '@/utils/download';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const ExtractImagesDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();
  const isOpen = activeModal === 'extract-images';

  const [images, setImages] = useState<ExtractedImageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      loadImages();
    } else {
      setImages([]);
      setSelectedIds(new Set());
    }
  }, [isOpen, documentId]);

  const loadImages = async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const engine = getPDFEngine();
      const rawBytes = await engine.saveDocument(documentId);
      const pdfLibDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });
      const extracted = await extractImagesFromDocument(pdfLibDoc, engine, documentId);

      setImages(extracted);
      // Select all by default
      setSelectedIds(new Set(extracted.map((img) => img.id)));

      if (extracted.length === 0) {
        addToast({
          type: 'info',
          title: 'No Images Found',
          message: 'This document does not contain any embedded image objects.',
        });
      }
    } catch (err: any) {
      console.error('Extract images error:', err);
      addToast({
        type: 'error',
        title: 'Image Extraction Failed',
        message: err?.message || 'Could not extract images from this document.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDownloadSingle = (img: ExtractedImageItem) => {
    const blob = new Blob([img.buffer as any], { type: img.mimeType });
    downloadBlob(blob, img.name || `image_${img.id}.${img.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`);
  };

  const handleDownloadZip = async () => {
    const targets = images.filter((img) => selectedIds.has(img.id));
    if (targets.length === 0) return;

    setIsDownloading(true);
    try {
      const zipFiles = targets.map((img, idx) => ({
        name: img.name || `image_${idx + 1}.${img.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`,
        data: img.buffer,
      }));

      const zipBytes = createZip(zipFiles);
      const blob = new Blob([zipBytes as any], { type: 'application/zip' });
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
      downloadBlob(blob, `${baseName}_extracted_images.zip`);

      addToast({
        type: 'success',
        title: 'ZIP Downloaded',
        message: `Extracted ${targets.length} images into ZIP archive.`,
      });
    } catch (err: any) {
      console.error('ZIP creation error:', err);
      addToast({
        type: 'error',
        title: 'ZIP Failed',
        message: 'Could not generate ZIP archive.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={() => setActiveModal(null)}
      role="dialog"
      aria-modal="true"
      aria-label="Extract Images from PDF"
    >
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] max-h-[85dvh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Extract Images from PDF</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extract high-res photos & figures into ZIP • 100% Client-Side
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!documentId ? (
            <NoDocumentState
              toolName="Extract Images from PDF"
              description="Choose any document with embedded photos, illustrations, or diagrams."
              icon={ImageIcon}
              actionText="Select PDF to Extract"
            />
          ) : isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Scanning document for embedded images...</p>
              <p className="text-xs text-slate-400">Inspecting XObject streams locally in browser memory</p>
            </div>
          ) : images.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Embedded Images Detected</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                This PDF seems to contain only vector text and vector graphics.
              </p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {images.length} {images.length === 1 ? 'image' : 'images'} found
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {selectedIds.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectedIds.size === images.length ? deselectAll : selectAll}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer"
                  >
                    {selectedIds.size === images.length ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Select All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Grid of Images */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => {
                  const isSelected = selectedIds.has(img.id);
                  const kbSize = (img.sizeBytes / 1024).toFixed(1);

                  return (
                    <div
                      key={img.id}
                      onClick={() => toggleSelect(img.id)}
                      className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/50 ${
                        isSelected
                          ? 'border-amber-500 shadow-xs ring-2 ring-amber-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Checkbox overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs border border-slate-300 dark:border-slate-600 text-transparent group-hover:text-slate-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Download single button overlay */}
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSingle(img);
                          }}
                          className="p-1.5 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-amber-600 rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Download this image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      <div className="aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        <img
                          src={img.dataUrl}
                          alt={img.name || 'Extracted Image'}
                          className="w-full h-full object-contain p-1"
                          loading="lazy"
                        />
                      </div>

                      {/* Metadata footer */}
                      <div className="p-2 bg-white dark:bg-slate-800 text-[11px] border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {img.width}×{img.height}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{kbSize} KB</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lossless raw extraction directly in browser memory. 100% private.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {documentId && images.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedIds.size} of {images.length} selected
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors min-h-[44px] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={selectedIds.size === 0 || isDownloading}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px] disabled:opacity-50 cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>
                  {isDownloading
                    ? 'Packaging ZIP...'
                    : `Download ${selectedIds.size} as ZIP`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
