import React, { useState } from 'react';
import {
  X,
  Layers,
  ShieldCheck,
  FileCheck,
  Download,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { flattenPdfDocument, FlattenMode } from '@core/pdf/flatten';
import { downloadBlob } from '@/utils/download';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const FlattenDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName, pageCount } = useDocumentStore();
  const isOpen = activeModal === 'flatten';

  const [mode, setMode] = useState<FlattenMode>('forms-only');
  const [dpi, setDpi] = useState<150 | 200 | 300>(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleFlatten = async () => {
    if (!documentId) return;
    setIsProcessing(true);
    setProgress(null);

    try {
      const flattenedBytes = await flattenPdfDocument(documentId, {
        mode,
        dpi,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      const blob = new Blob([flattenedBytes as any], { type: 'application/pdf' });
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
      const suffix = mode === 'full-rasterize' ? '_flattened_readonly.pdf' : '_flattened.pdf';
      downloadBlob(blob, `${baseName}${suffix}`);

      addToast({
        type: 'success',
        title: 'PDF Flattened Successfully',
        message:
          mode === 'full-rasterize'
            ? 'Document converted to 100% tamper-proof read-only PDF.'
            : 'Form fields and signatures permanently baked into the document.',
      });

      setActiveModal(null);
    } catch (err: any) {
      console.error('Flatten PDF error:', err);
      addToast({
        type: 'error',
        title: 'Flatten Failed',
        message: err?.message || 'Could not flatten PDF document.',
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Flatten PDF</h2>
              <p className="text-xs text-slate-500">
                Lock form fields, signatures & annotations • 100% Client-Side
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {!documentId ? (
            <NoDocumentState
              toolName="Flatten PDF"
              description="Choose a document with form fields, stamps, or annotations to lock permanently."
              icon={Layers}
              actionText="Select PDF to Flatten"
            />
          ) : (
            <>
              {/* Document Info Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{fileName}</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-md font-mono shrink-0">
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </span>
              </div>

              {/* Mode Options */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Flattening Level
                </label>

                {/* Option 1: Forms & Annotations */}
                <div
                  onClick={() => setMode('forms-only')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'forms-only'
                      ? 'border-indigo-600 bg-indigo-50/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        mode === 'forms-only'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {mode === 'forms-only' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          Smart Flatten (Forms & Signatures)
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Bakes interactive AcroForm text fields, checkboxes, and digital signatures into static vector content.
                        Text stays razor-sharp while preventing any future input alteration.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Full Rasterize */}
                <div
                  onClick={() => setMode('full-rasterize')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    mode === 'full-rasterize'
                      ? 'border-indigo-600 bg-indigo-50/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                        mode === 'full-rasterize'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {mode === 'full-rasterize' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          Complete Tamper-Proof Flatten (Read-Only)
                        </span>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Converts each page into high-resolution images. Text becomes 100% non-selectable,
                        preventing copying, scraping, or metadata extraction. Ideal for legal filings and contracts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rasterize DPI Configuration */}
              {mode === 'full-rasterize' && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">Image Resolution (DPI)</label>
                    <span className="text-xs font-mono text-slate-500">{dpi} DPI</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([150, 200, 300] as const).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDpi(val)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          dpi === val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val === 150 && '150 (Compact)'}
                        {val === 200 && '200 (Standard)'}
                        {val === 300 && '300 (Archival)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {isProcessing && progress && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-indigo-700 font-medium">
                    <span>Flattening pages...</span>
                    <span>
                      {progress.current} of {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 transition-all duration-300 rounded-full"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Privacy Guarantee */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Files are processed locally in your browser memory. Zero cloud uploads.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {documentId && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFlatten}
              disabled={isProcessing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Flattening...' : 'Flatten & Download PDF'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
