import React, { useState } from 'react';
import { RefreshCw, X, Download, Image as ImageIcon, Plus, Trash2, FileText, Copy, Check } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { PDFDocument } from 'pdf-lib';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const ConvertDialog: React.FC = () => {
  const {
    activeModal,
    setActiveModal,
    addToast,
    activeConvertTab,
    setActiveConvertTab,
    pendingImageFile,
    setPendingImageFile,
    activeView,
    setActiveView,
  } = useUIStore();
  const { documentId, pageCount, currentPage, fileName, loadDocument, closeCurrentDocument } = useDocumentStore();

  const [mode, setMode] = useState<'pdf-to-img' | 'pdf-to-txt' | 'img-to-pdf'>('pdf-to-img');
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [textFormat, setTextFormat] = useState<'txt' | 'md'>('txt');
  const [resolutionScale, setResolutionScale] = useState<number>(2.0);
  const [imageQuality, setImageQuality] = useState<number>(0.92); // 2x for sharp export
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync mode with activeConvertTab when opened from a tool action
  React.useEffect(() => {
    if (activeConvertTab && ['pdf-to-img', 'pdf-to-txt', 'img-to-pdf'].includes(activeConvertTab)) {
      setMode(activeConvertTab as any);
    }
  }, [activeConvertTab]);

  // Images to PDF state
  const [imageFiles, setImageFiles] = useState<Array<{ name: string; buffer: Uint8Array; mime: string; previewUrl?: string }>>([]);

  const handleClose = () => {
    imageFiles.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });
    setActiveModal(null);
    setActiveConvertTab(null);
    if (activeView === 'home' && mode !== 'img-to-pdf') {
      closeCurrentDocument();
    }
  };

  // Consume any pending image file dropped on home dashboard
  React.useEffect(() => {
    if (pendingImageFile && activeModal === 'convert') {
      setMode('img-to-pdf');
      const fileToProcess = pendingImageFile;
      setPendingImageFile(null);
      (async () => {
        try {
          const buffer = await fileToProcess.arrayBuffer();
          const previewUrl = URL.createObjectURL(fileToProcess);
          setImageFiles((prev) => [
            ...prev,
            {
              name: fileToProcess.name,
              buffer: new Uint8Array(buffer),
              mime: fileToProcess.type || 'image/png',
              previewUrl,
            },
          ]);
        } catch {}
      })();
    }
  }, [pendingImageFile, activeModal, setPendingImageFile]);

  if (activeModal !== 'convert') return null;

  const handleExportImages = async () => {
    if (!documentId) return;
    setIsProcessing(true);

    try {
      const engine = getPDFEngine();
      const targetIndices = scope === 'current'
        ? [currentPage - 1]
        : Array.from({ length: pageCount }, (_, i) => i);

      const mimeType = imageFormat === 'png' ? 'image/png' : imageFormat === 'jpeg' ? 'image/jpeg' : 'image/webp';
      const ext = imageFormat === 'png' ? 'png' : imageFormat === 'jpeg' ? 'jpg' : 'webp';

      for (let i = 0; i < targetIndices.length; i++) {
        const pIdx = targetIndices[i];
        const renderRes = await engine.renderPage(documentId, pIdx, resolutionScale);
        if (renderRes.canvas) {
          const dataUrl = renderRes.canvas.toDataURL(mimeType, imageQuality);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `JustPDFCraft_${fileName ? fileName.replace(/\.pdf$/i, '') : 'Page'}_Page_${pIdx + 1}.${ext}`;
          a.click();
          if (i < targetIndices.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 220));
          }
        }
      }

      addToast({
        type: 'success',
        title: 'Conversion Complete',
        message: `Exported ${targetIndices.length} page(s) as ${imageFormat.toUpperCase()} image(s).`,
      });
      handleClose();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Export Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractText = async (downloadToFile: boolean) => {
    if (!documentId) return;
    setIsProcessing(true);

    try {
      const engine = getPDFEngine();
      const targetIndices = scope === 'current'
        ? [currentPage - 1]
        : Array.from({ length: pageCount }, (_, i) => i);

      let aggregatedText = '';
      for (const pIdx of targetIndices) {
        const pageText = await engine.extractPageText(documentId, pIdx);
        const text = pageText.text || '';
        if (textFormat === 'md') {
          aggregatedText += `## Page ${pIdx + 1}\n\n${text}\n\n---\n\n`;
        } else {
          aggregatedText += `--- Page ${pIdx + 1} ---\n${text}\n\n`;
        }
      }

      const cleanText = aggregatedText.trim();
      if (!cleanText) {
        addToast({
          type: 'warning',
          title: 'No Text Found',
          message: 'Document pages appear to contain only scanned graphics or vector shapes.',
        });
        return;
      }

      if (downloadToFile) {
        const blob = new Blob([cleanText], {
          type: textFormat === 'md' ? 'text/markdown;charset=utf-8;' : 'text/plain;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName ? fileName.replace('.pdf', '') : 'Document'}_Text.${textFormat}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        addToast({
          type: 'success',
          title: 'Text Exported',
          message: `Saved ${textFormat.toUpperCase()} file to downloads.`,
        });
        handleClose();
      } else {
        await navigator.clipboard.writeText(cleanText);
        setCopied(true);
        addToast({
          type: 'success',
          title: 'Text Copied',
          message: `Copied ${cleanText.length} characters from ${targetIndices.length} page(s).`,
        });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Text Extraction Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    const items: Array<{ name: string; buffer: Uint8Array; mime: string; previewUrl?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) {
        continue;
      }
      const buffer = await f.arrayBuffer();
      const previewUrl = URL.createObjectURL(f);
      items.push({
        name: f.name,
        buffer: new Uint8Array(buffer),
        mime: f.type || 'image/png',
        previewUrl,
      });
    }

    if (items.length > 0) {
      setImageFiles((prev) => [...prev, ...items]);
    }
  };

  const handleSelectImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await addFiles(e.target.files);
  };

  const transcodeToPngBuffer = async (buffer: Uint8Array, mime: string): Promise<Uint8Array> => {
    // If standard JPG or PNG, return buffer as-is
    if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png') {
      return buffer;
    }

    // For WebP, BMP, GIF, SVG: transcode via canvas to PNG Uint8Array
    return new Promise((resolve) => {
      const blob = new Blob([buffer as unknown as BlobPart], { type: mime });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(buffer);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (b) => {
          if (!b) {
            resolve(buffer);
            return;
          }
          const ab = await b.arrayBuffer();
          resolve(new Uint8Array(ab));
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(buffer);
      };
      img.src = url;
    });
  };

  const handleConvertImagesToPdf = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const doc = await PDFDocument.create();

      for (const imgItem of imageFiles) {
        const isJpg =
          imgItem.mime === 'image/jpeg' ||
          imgItem.mime === 'image/jpg' ||
          imgItem.name.toLowerCase().endsWith('.jpg') ||
          imgItem.name.toLowerCase().endsWith('.jpeg');

        let embedded;
        if (isJpg) {
          try {
            embedded = await doc.embedJpg(imgItem.buffer);
          } catch {
            // Fallback transcode if JPG was malformed
            const transcoded = await transcodeToPngBuffer(imgItem.buffer, imgItem.mime);
            embedded = await doc.embedPng(transcoded);
          }
        } else if (imgItem.mime === 'image/png' || imgItem.name.toLowerCase().endsWith('.png')) {
          try {
            embedded = await doc.embedPng(imgItem.buffer);
          } catch {
            const transcoded = await transcodeToPngBuffer(imgItem.buffer, imgItem.mime);
            embedded = await doc.embedPng(transcoded);
          }
        } else {
          // WebP, BMP, GIF, etc.
          const transcoded = await transcodeToPngBuffer(imgItem.buffer, imgItem.mime);
          embedded = await doc.embedPng(transcoded);
        }

        const { width, height } = embedded.scale(1.0);
        const page = doc.addPage([width, height]);
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await doc.save();
      await loadDocument(pdfBytes, 'Converted_Images.pdf');

      setActiveView('editor');
      handleClose();
      addToast({
        type: 'success',
        title: 'PDF Created from Images',
        message: `Compiled ${imageFiles.length} image(s) into a new PDF document.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Convert Dialog">
      <div className="w-full max-w-lg bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Convert Formats</h3>
              <p className="text-xs text-slate-400">Export PDF as high-res images, plain text, or bundle photos into PDF</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-800 bg-[#000000]/40 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setMode('pdf-to-img')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
              mode === 'pdf-to-img'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PDF to Images</span>
          </button>
          <button
            onClick={() => setMode('pdf-to-txt')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
              mode === 'pdf-to-txt'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF to Text / MD</span>
          </button>
          <button
            onClick={() => setMode('img-to-pdf')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
              mode === 'img-to-pdf'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Images to PDF</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {mode === 'pdf-to-img' && (
            <div className="space-y-4">
              {!documentId ? (
                <NoDocumentState
                  toolName="PDF to Images"
                  description="Please select a PDF document first to export high-resolution PNG, JPEG, or WebP pages."
                  icon={ImageIcon}
                  actionText="Select PDF to Convert"
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Image Format</label>
                      <select
                        value={imageFormat}
                        onChange={(e) => setImageFormat(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="png">PNG (Lossless & Sharp)</option>
                        <option value="jpeg">JPEG (Compressed)</option>
                        <option value="webp">WebP (Modern Web)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">DPI / Resolution</label>
                      <select
                        value={resolutionScale}
                        onChange={(e) => setResolutionScale(parseFloat(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="1.0">Standard 72 DPI (1x)</option>
                        <option value="2.0">High-Res 144 DPI (2x)</option>
                        <option value="3.0">Ultra-Sharp 216 DPI (3x)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Quality</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={imageQuality}
                        onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                        className="w-full accent-teal-500"
                        disabled={imageFormat === 'png'}
                      />
                      <div className="text-right text-[10px] text-slate-400">{Math.round(imageQuality * 100)}%</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Export Range</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setScope('current')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                          scope === 'current'
                            ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Current Page ({currentPage})
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope('all')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                          scope === 'all'
                            ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        All Pages ({pageCount})
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'pdf-to-txt' && (
            <div className="space-y-4">
              {!documentId ? (
                <NoDocumentState
                  toolName="PDF to Text"
                  description="Please select a PDF document first to extract clean digital text or markdown content."
                  icon={FileText}
                  actionText="Select PDF to Extract"
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Output Format</label>
                      <select
                        value={textFormat}
                        onChange={(e) => setTextFormat(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="txt">Plain Text (.txt)</option>
                        <option value="md">Markdown (.md with Page Headers)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">Scope</label>
                      <div className="flex gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setScope('current')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            scope === 'current'
                              ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Page {currentPage}
                        </button>
                        <button
                          type="button"
                          onClick={() => setScope('all')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            scope === 'all'
                              ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          All ({pageCount})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#000000]/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                    <span>Extracts text coordinates without uploading any file to external servers.</span>
                    <button
                      type="button"
                      onClick={() => handleExtractText(false)}
                      disabled={isProcessing}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'img-to-pdf' && (
            <div className="space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    addFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-teal-500/50 bg-slate-800/40 p-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 transition-all"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Select or Drop Images (JPG, PNG, WEBP, BMP, GIF)...</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/bmp, image/gif"
                  multiple
                  onChange={handleSelectImages}
                  className="hidden"
                />
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {imageFiles.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-4">No images selected yet.</p>
                ) : (
                  imageFiles.map((img, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-800/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[320px]">
                        {img.previewUrl && (
                          <img src={img.previewUrl} alt="thumb" className="w-6 h-6 object-cover rounded" />
                        )}
                        <span className="truncate text-slate-200">{img.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
                          setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-slate-500 hover:text-rose-400"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#000000]/60 flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          {mode === 'pdf-to-img' ? (
            documentId ? (
              <button
                onClick={handleExportImages}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-teal-900/30 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isProcessing ? 'Exporting...' : 'Export Images'}
              </button>
            ) : null
          ) : mode === 'pdf-to-txt' ? (
            documentId ? (
              <button
                onClick={() => handleExtractText(true)}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-teal-900/30 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isProcessing ? 'Extracting...' : `Download ${textFormat.toUpperCase()}`}
              </button>
            ) : null
          ) : (
            <button
              onClick={handleConvertImagesToPdf}
              disabled={isProcessing || imageFiles.length === 0}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-teal-900/30 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isProcessing ? 'Creating PDF...' : 'Convert to PDF'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConvertDialog;
