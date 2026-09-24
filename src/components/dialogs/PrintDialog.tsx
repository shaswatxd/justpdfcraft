import React, { useState } from 'react';
import {
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { NoDocumentState } from '@/components/common/NoDocumentState';
import {
  printLayoutEngine,
  PrintSettings,
  PagesPerSheet,
  PrintOrientation,
  PageRangeOption,
} from '@core/print/print-layout';

export const PrintDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, pageCount, currentPage, pageDimensions, viewMode, setViewMode, fileBytes } = useDocumentStore();

  const [settings, setSettings] = useState<PrintSettings>({
    copies: 1,
    duplex: true,
    orientation: 'auto',
    paperSize: 'Letter',
    pagesPerSheet: 1,
    isBooklet: false,
    grayscale: false,
    fitToPage: true,
    rangeOption: 'all',
    customRangeString: '',
  });

  if (activeModal !== 'print') return null;

  const pageIndices = printLayoutEngine.calculatePageIndices(
    pageCount,
    currentPage,
    settings
  );

  const safeCheck = printLayoutEngine.runPrinterSafeCheck(pageDimensions, settings);

  const handleExecutePrint = () => {
    if (!fileBytes) {
      addToast({
        type: 'error',
        title: 'Print Error',
        message: 'No document loaded to print.',
      });
      return;
    }

    setActiveModal(null);
    if (settings.rangeOption !== 'current' && viewMode === 'single') {
      setViewMode('continuous');
    }
    
    addToast({
      type: 'info',
      title: 'Preparing Print Job',
      message: `Sending ${pageIndices.length} page(s) to system printer dialog.`,
    });

    try {
      const blob = new Blob([fileBytes as any], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      
      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
          // Cleanup after print dialog
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(blobUrl);
          }, 300000); // 5 minute cleanup timeout
        }, 150);
      };

      document.body.appendChild(iframe);
    } catch (e) {
      addToast({
        type: 'error',
        title: 'Print Failed',
        message: 'Failed to prepare the print job.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Print Dialog">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Smart Print Workflow</h3>
              <p className="text-xs text-slate-400">
                Configure layout, pages-per-sheet, booklet folding, and preflight safety checks
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Print"
            description="Please select a PDF document first to configure layout, orientation, and printer checks."
            icon={Printer}
            actionText="Select PDF to Print"
          />
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Printer Safe Check Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              safeCheck.isSafe
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}
          >
            {safeCheck.isSafe ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold">
                {safeCheck.isSafe ? 'Printer Safe Check Passed' : 'Printer Safe Check Warnings'}
              </p>
              {safeCheck.warnings.map((w, i) => (
                <p key={i} className="text-slate-300">• {w}</p>
              ))}
              {safeCheck.recommendations.map((r, i) => (
                <p key={i} className="text-slate-400 italic">Tip: {r}</p>
              ))}
            </div>
          </div>

          {/* Form Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Copies & Duplex */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Copies</label>
              <input
                type="number"
                min={1}
                max={99}
                value={settings.copies}
                onChange={(e) =>
                  setSettings({ ...settings, copies: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Orientation</label>
              <select
                value={settings.orientation}
                onChange={(e) =>
                  setSettings({ ...settings, orientation: e.target.value as PrintOrientation })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="auto">Auto (Match page orientation)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Page Range Options */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Page Range</label>
              <select
                value={settings.rangeOption}
                onChange={(e) =>
                  setSettings({ ...settings, rangeOption: e.target.value as PageRangeOption })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="all">All Pages ({pageCount})</option>
                <option value="current">Current Page ({currentPage})</option>
                <option value="odd">Odd Pages Only</option>
                <option value="even">Even Pages Only</option>
                <option value="custom">Custom Range (e.g. 1-3, 5)</option>
              </select>
            </div>

            {/* Pages per Sheet (N-Up) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Pages Per Sheet (N-Up)</label>
              <select
                value={settings.pagesPerSheet}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    pagesPerSheet: parseInt(e.target.value) as PagesPerSheet,
                  })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="1">1 page per sheet (Standard)</option>
                <option value="2">2 pages per sheet (2-Up)</option>
                <option value="4">4 pages per sheet (4-Up)</option>
                <option value="6">6 pages per sheet (6-Up)</option>
              </select>
            </div>
          </div>

          {/* Custom Range String */}
          {settings.rangeOption === 'custom' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Enter Page Numbers & Ranges</label>
              <input
                type="text"
                value={settings.customRangeString}
                onChange={(e) => setSettings({ ...settings, customRangeString: e.target.value })}
                placeholder="e.g. 1-4, 7, 9-12"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
              />
            </div>
          )}

          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={settings.duplex}
                onChange={(e) => setSettings({ ...settings, duplex: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500"
              />
              <span>Two-Sided (Duplex) Printing</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={settings.isBooklet}
                onChange={(e) => setSettings({ ...settings, isBooklet: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500"
              />
              <span>Booklet Folding Order</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={settings.grayscale}
                onChange={(e) => setSettings({ ...settings, grayscale: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500"
              />
              <span>Grayscale / Monochrome Only</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={settings.fitToPage}
                onChange={(e) => setSettings({ ...settings, fitToPage: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500"
              />
              <span>Fit to Printable Margins</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {pageIndices.length} page{pageIndices.length !== 1 ? 's' : ''} to be sent
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecutePrint}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Document
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrintDialog;
