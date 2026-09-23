import React, { useState } from 'react';
import { Scissors, X } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const SplitDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, pageCount } = useDocumentStore();

  const [splitMode, setSplitMode] = useState<'individual' | 'ranges'>('ranges');
  const [rangeInput, setRangeInput] = useState('1-2, 3-4');
  const [isSplitting, setIsSplitting] = useState(false);

  if (activeModal !== 'split') return null;

  const handleExecuteSplit = async () => {
    if (!documentId) return;
    setIsSplitting(true);

    try {
      const engine = getPDFEngine();
      let ranges: Array<[number, number]> = [];

      if (splitMode === 'individual') {
        ranges = Array.from({ length: pageCount }, (_, i) => [i, i]);
      } else {
        const parts = rangeInput.split(',').map((p) => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (p.includes('-')) {
            const [s, e] = p.split('-').map((v) => parseInt(v.trim(), 10));
            if (!isNaN(s) && !isNaN(e)) {
              ranges.push([Math.max(0, s - 1), Math.min(pageCount - 1, e - 1)]);
            }
          } else {
            const n = parseInt(p, 10);
            if (!isNaN(n)) {
              ranges.push([Math.max(0, n - 1), Math.min(pageCount - 1, n - 1)]);
            }
          }
        }
      }

      if (ranges.length === 0) {
        throw new Error('Please specify valid page ranges to split.');
      }

      const results = await engine.splitDocument(documentId, ranges);

      if (results.length === 1) {
        // Single file download
        const bytes = results[0];
        const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const [start, end] = ranges[0];
        a.download = `JustPDFCraft_Part_1_Pages_${start + 1}_to_${end + 1}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        // Create ZIP for multiple files
        const { createZip } = await import('@/utils/zip');
        const filesToZip = results.map((bytes, idx) => {
          const [start, end] = ranges[idx];
          return {
            name: `JustPDFCraft_Part_${idx + 1}_Pages_${start + 1}_to_${end + 1}.pdf`,
            data: bytes,
          };
        });
        
        const zipBytes = createZip(filesToZip);
        const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JustPDFCraft_Split_${results.length}_Parts.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Split Completed',
        message: `Generated ${results.length} separate PDF files.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Split Failed',
        message: err?.message || 'Failed to split document.',
      });
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Split Dialog">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Split PDF</h3>
              <p className="text-xs text-slate-400">Extract pages or split into multiple PDF files</p>
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
            toolName="Split"
            description="Please select a PDF document first to split into separate pages or ranges."
            icon={Scissors}
            actionText="Select PDF to Split"
          />
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Split Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMode('ranges')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      splitMode === 'ranges'
                        ? 'bg-amber-500/10 border-amber-500/80 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    Custom Ranges
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('individual')}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      splitMode === 'individual'
                        ? 'bg-amber-500/10 border-amber-500/80 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    Every Single Page
                  </button>
                </div>
              </div>

              {splitMode === 'ranges' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Enter Page Ranges</label>
                  <input
                    type="text"
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder="e.g. 1-2, 3-5"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <p className="text-[10px] text-slate-400">
                    Document contains {pageCount} pages. Each comma-separated range creates a new PDF.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSplit}
                disabled={isSplitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-amber-900/30 flex items-center gap-1.5 transition-all"
              >
                <Scissors className="w-3.5 h-3.5" />
                {isSplitting ? 'Splitting...' : 'Split & Download'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
