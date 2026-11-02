import React, { useState } from 'react';
import {
  X,
  LayoutGrid,
  Download,
  FileCheck,
  ShieldCheck,
  Leaf,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { createNUpPdf, NUpLayout, NUpPageSize, NUpOrientation } from '@core/pdf/nup';
import { downloadBlob } from '@/utils/download';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const NUpDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName, pageCount } = useDocumentStore();
  const isOpen = activeModal === 'n-up';

  const [layout, setLayout] = useState<NUpLayout>('4-up');
  const [pageSize, setPageSize] = useState<NUpPageSize>('A4');
  const [orientation, setOrientation] = useState<NUpOrientation>('auto');
  const [drawBorder, setDrawBorder] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  if (!isOpen) return null;

  const pagesPerSheetMap: Record<NUpLayout, number> = {
    '2-up': 2,
    '4-up': 4,
    '6-up': 6,
    '8-up': 8,
    '9-up': 9,
  };
  const pagesPerSheet = pagesPerSheetMap[layout];
  const outputSheets = Math.ceil(pageCount / pagesPerSheet);
  const paperSavedPercent = Math.max(0, Math.round(((pageCount - outputSheets) / pageCount) * 100));

  const handleGenerate = async () => {
    if (!documentId) return;
    setIsProcessing(true);
    setProgress(null);

    try {
      const nupBytes = await createNUpPdf(documentId, {
        layout,
        pageSize,
        orientation,
        drawBorder,
        onProgress: (current, total) => setProgress({ current, total }),
      });

      const blob = new Blob([nupBytes as any], { type: 'application/pdf' });
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
      downloadBlob(blob, `${baseName}_${layout}.pdf`);

      addToast({
        type: 'success',
        title: 'N-Up PDF Ready',
        message: `Compiled ${pageCount} pages into ${outputSheets} printable sheets (${paperSavedPercent}% paper saved).`,
      });

      setActiveModal(null);
    } catch (err: any) {
      console.error('N-Up generation error:', err);
      addToast({
        type: 'error',
        title: 'N-Up Generation Failed',
        message: err?.message || 'Could not generate N-Up layout.',
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
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">N-Up (Multiple Pages per Sheet)</h2>
              <p className="text-xs text-slate-500">
                Fit 2, 4, 6, 8, or 9 pages on 1 sheet • Lecture slides & handouts
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
              toolName="N-Up (Multi-Page per Sheet)"
              description="Choose presentation slides, research papers, or lecture notes to compile multiple pages per sheet."
              icon={LayoutGrid}
              actionText="Select PDF to Layout"
            />
          ) : (
            <>
              {/* Document Info Card */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{fileName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 bg-slate-200/70 text-slate-600 rounded-md font-mono">
                    {pageCount} pages
                  </span>
                  <span className="text-purple-600 font-semibold flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-md">
                    <Leaf className="w-3 h-3" />
                    {paperSavedPercent}% paper saved
                  </span>
                </div>
              </div>

              {/* Layout Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Pages Per Sheet
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['2-up', '4-up', '6-up', '8-up', '9-up'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLayout(l)}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        layout === l
                          ? 'border-purple-600 bg-purple-50/40 text-purple-700 shadow-2xs font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-sm">{l}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {pagesPerSheetMap[l]} per page
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Page Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Sheet Size</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as NUpPageSize)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="A4">A4 (Standard 210 × 297 mm)</option>
                    <option value="Letter">Letter (US 8.5 × 11 in)</option>
                    <option value="Legal">Legal (US 8.5 × 14 in)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Orientation</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as NUpOrientation)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="auto">Auto (Best Fit)</option>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3.5 bg-slate-50/60 border border-slate-200/60 rounded-xl space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={drawBorder}
                    onChange={(e) => setDrawBorder(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Draw subtle frame border around each miniature slide</span>
                </label>
              </div>

              {/* Output Preview Card */}
              <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-purple-900">
                  <span>Output Preview:</span>
                  <span>{outputSheets} total sheets</span>
                </div>
                <p className="text-purple-700/80 text-[11px] leading-relaxed">
                  Your {pageCount} source pages will be laid out in a {layout} format onto {outputSheets} {pageSize} sheets.
                </p>
              </div>

              {/* Progress Bar */}
              {isProcessing && progress && (
                <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-purple-700 font-medium">
                    <span>Rendering N-Up sheets...</span>
                    <span>
                      {progress.current} of {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-1.5 transition-all duration-300 rounded-full"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Privacy Guarantee */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero server uploads. Rendering runs directly in local browser memory.</span>
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
              onClick={handleGenerate}
              disabled={isProcessing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Generating...' : `Download ${layout} PDF`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
