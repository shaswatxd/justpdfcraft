import React, { useState } from 'react';
import {
  Crop,
  X,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const CropDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const {
    documentId,
    currentPage,
    pageCount,
    pageDimensions,
    fileName,
    filePath,
    loadDocument,
    pushHistory,
  } = useDocumentStore();

  const [trimTop, setTrimTop] = useState(36); // Default 0.5 inch (36 pt)
  const [trimBottom, setTrimBottom] = useState(36);
  const [trimLeft, setTrimLeft] = useState(36);
  const [trimRight, setTrimRight] = useState(36);

  const [scope, setScope] = useState<'current' | 'all' | 'custom'>('current');
  const [customRange, setCustomRange] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (activeModal !== 'crop') return null;

  const curDims = pageDimensions[currentPage - 1] || { width: 595.28, height: 841.89 };
  const origWidth = Math.round(curDims.width);
  const origHeight = Math.round(curDims.height);

  const croppedWidth = Math.max(20, origWidth - (trimLeft + trimRight));
  const croppedHeight = Math.max(20, origHeight - (trimTop + trimBottom));

  const origArea = origWidth * origHeight;
  const croppedArea = croppedWidth * croppedHeight;
  const areaReductionPercent = Math.max(0, Math.round(((origArea - croppedArea) / origArea) * 100));

  const parseCustomPageIndices = (rangeStr: string): number[] => {
    const indices: Set<number> = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const low = Math.min(start, end);
          const high = Math.max(start, end);
          for (let p = low; p <= high; p++) {
            if (p >= 1 && p <= pageCount) indices.add(p - 1);
          }
        }
      } else {
        const page = parseInt(trimmed, 10);
        if (!isNaN(page) && page >= 1 && page <= pageCount) {
          indices.add(page - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const handleApply = async () => {
    if (!documentId) return;
    if (croppedWidth <= 20 || croppedHeight <= 20) {
      addToast({
        type: 'error',
        title: 'Invalid Crop Dimensions',
        message: 'Margins exceed page boundaries. Please reduce margin values.',
      });
      return;
    }

    let targetIndices: number[] | undefined = undefined;
    if (scope === 'current') {
      targetIndices = [currentPage - 1];
    } else if (scope === 'all') {
      targetIndices = undefined; // engine handles all pages
    } else {
      targetIndices = parseCustomPageIndices(customRange);
      if (targetIndices.length === 0) {
        addToast({
          type: 'warning',
          title: 'Invalid Page Range',
          message: 'Please provide valid page numbers (e.g. 1-3, 5).',
        });
        return;
      }
    }

    setIsApplying(true);
    try {
      await pushHistory(`Crop Margins (T:${trimTop}, B:${trimBottom}, L:${trimLeft}, R:${trimRight})`);
      const engine = getPDFEngine();

      await engine.trimMargins(documentId, {
        top: trimTop,
        bottom: trimBottom,
        left: trimLeft,
        right: trimRight,
        pageIndices: targetIndices,
      });

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Crop Applied Successfully',
        message: `Cropped ${targetIndices ? targetIndices.length : pageCount} page${(targetIndices ? targetIndices.length : pageCount) > 1 ? 's' : ''} to ${croppedWidth} × ${croppedHeight} pt.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Crop Failed',
        message: err?.message || 'Could not crop document pages.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = () => {
    setTrimTop(0);
    setTrimBottom(0);
    setTrimLeft(0);
    setTrimRight(0);
  };

  const applyPreset = (t: number, b: number, l: number, r: number) => {
    setTrimTop(t);
    setTrimBottom(b);
    setTrimLeft(l);
    setTrimRight(r);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Crop Dialog">
      <div className="bg-[#000000] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#000000]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                Page Cropping & Margin Trimmer
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  ISO 32000 Box Engine
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Trim unwanted printer margins, remove scanner edge bleed, or adjust page dimensions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            disabled={isApplying}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Crop Margins"
            description="Please select a PDF document first to trim margins or adjust page boundaries."
            icon={Crop}
            actionText="Select PDF to Crop"
          />
        ) : (
          <>
            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Visual Preview & Coordinate Simulation */}
          <div className="bg-[#000000]/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Visual Mini Page Box */}
            <div className="relative w-36 h-48 bg-slate-800/80 border-2 border-slate-700 rounded-lg p-2 flex flex-col justify-between overflow-hidden shadow-inner shrink-0">
              {/* Dummy page content lines */}
              <div className="space-y-1.5 opacity-30">
                <div className="h-1.5 bg-slate-300 rounded w-3/4" />
                <div className="h-1.5 bg-slate-400 rounded w-full" />
                <div className="h-1.5 bg-slate-400 rounded w-5/6" />
                <div className="h-1.5 bg-slate-400 rounded w-2/3" />
              </div>

              {/* Dynamic Crop Rectangle Overlay */}
              <div
                className="absolute border-2 border-dashed border-cyan-400 bg-cyan-500/15 rounded transition-all duration-200 flex items-center justify-center"
                style={{
                  top: `${Math.min(45, (trimTop / origHeight) * 100)}%`,
                  bottom: `${Math.min(45, (trimBottom / origHeight) * 100)}%`,
                  left: `${Math.min(45, (trimLeft / origWidth) * 100)}%`,
                  right: `${Math.min(45, (trimRight / origWidth) * 100)}%`,
                }}
              >
                <span className="text-[9px] font-mono font-bold text-cyan-300 bg-[#000000]/90 px-1 py-0.5 rounded shadow">
                  {croppedWidth} × {croppedHeight}
                </span>
              </div>

              <div className="space-y-1.5 opacity-30">
                <div className="h-1.5 bg-slate-400 rounded w-full" />
                <div className="h-1.5 bg-slate-400 rounded w-4/5" />
              </div>
            </div>

            {/* Metrics & Dimension Comparisons */}
            <div className="flex-1 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Page Dimensions:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-1 bg-slate-800 rounded-md font-mono text-slate-300">
                    Original: {origWidth} × {origHeight} pt
                  </span>
                  <span className="text-slate-500">➔</span>
                  <span className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-md font-mono text-cyan-300 font-bold">
                    Cropped: {croppedWidth} × {croppedHeight} pt
                  </span>
                </div>
              </div>

              {areaReductionPercent > 0 && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Trimming {areaReductionPercent}% of outer border area</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Updates both <code className="text-slate-300">/MediaBox</code> and <code className="text-slate-300">/CropBox</code> dictionaries according to ISO 32000 specifications so all PDF viewers render the cropped view.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Quick Margin Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(36, 36, 36, 36)}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-200 block">0.5 inch (36 pt)</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Uniform outer trim</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(72, 72, 72, 72)}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-200 block">1.0 inch (72 pt)</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Heavy border trim</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(28, 28, 28, 28)}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-200 block">10 mm (28 pt)</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Metric clean trim</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(40, 40, 0, 0)}
                className="px-3 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl text-left transition-colors"
              >
                <span className="text-xs font-semibold text-slate-200 block">Header / Footer</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Trim top & bottom only</span>
              </button>
            </div>
          </div>

          {/* Numerical Margin Adjusters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Custom Margin Trims (PDF Points)
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset (0 pt)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#000000]/40 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Top Trim (pt)
                </label>
                <input
                  type="number"
                  min={0}
                  max={Math.floor(origHeight / 2 - 10)}
                  value={trimTop}
                  onChange={(e) => setTrimTop(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Bottom Trim (pt)
                </label>
                <input
                  type="number"
                  min={0}
                  max={Math.floor(origHeight / 2 - 10)}
                  value={trimBottom}
                  onChange={(e) => setTrimBottom(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Left Trim (pt)
                </label>
                <input
                  type="number"
                  min={0}
                  max={Math.floor(origWidth / 2 - 10)}
                  value={trimLeft}
                  onChange={(e) => setTrimLeft(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Right Trim (pt)
                </label>
                <input
                  type="number"
                  min={0}
                  max={Math.floor(origWidth / 2 - 10)}
                  value={trimRight}
                  onChange={(e) => setTrimRight(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Page Scope Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Apply Scope
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('current')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  scope === 'current'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-bold block flex items-center justify-between">
                  Current Page
                  {scope === 'current' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Page {currentPage} only</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  scope === 'all'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-bold block flex items-center justify-between">
                  All Pages
                  {scope === 'all' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">All {pageCount} pages</span>
              </button>

              <button
                type="button"
                onClick={() => setScope('custom')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  scope === 'custom'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xs font-bold block flex items-center justify-between">
                  Custom Range
                  {scope === 'custom' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 1-3, 5</span>
              </button>
            </div>

            {scope === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder={`Enter page numbers (1 to ${pageCount}), e.g. 1-3, 5`}
                  className="w-full bg-[#000000] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#000000]/70 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Action is reversible via <kbd className="bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+Z</kbd>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Cropping Pages...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Crop & Trim</span>
                </>
              )}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CropDialog;
