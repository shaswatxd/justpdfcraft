import React, { useState, useRef, useEffect } from 'react';
import { GitCompare, X, ChevronLeft, ChevronRight, SplitSquareVertical, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { DocumentComparator, DocumentDiffResult } from '@core/compare/comparator';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const CompareDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();

  const [compareResult, setCompareResult] = useState<DocumentDiffResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [docBName, setDocBName] = useState<string>('');
  const [docBId, setDocBId] = useState<string | null>(null);

  // Split-View Swipe Slider State
  const [compareMode, setCompareMode] = useState<'swipe' | 'report'>('swipe');
  const [activeComparePage, setActiveComparePage] = useState<number>(0);
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefA = useRef<HTMLCanvasElement>(null);
  const canvasRefB = useRef<HTMLCanvasElement>(null);
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number } | null>(null);
  const [isRenderingPages, setIsRenderingPages] = useState(false);

  // Clean up Doc B from PDF engine memory when dialog closes or unmounts
  useEffect(() => {
    return () => {
      if (docBId) {
        try {
          getPDFEngine().closeDocument(docBId);
        } catch {}
      }
    };
  }, [docBId]);

  // Render both document pages when activeComparePage or docBId changes
  useEffect(() => {
    if (!documentId || !docBId || compareMode !== 'swipe') return;

    let isCancelled = false;
    const renderComparePages = async () => {
      setIsRenderingPages(true);
      try {
        const engine = getPDFEngine();
        const pageCountA = engine.getPageCount(documentId);
        const pageCountB = engine.getPageCount(docBId);

        // Render Version A
        if (activeComparePage < pageCountA && canvasRefA.current) {
          const resA = await engine.renderPage(documentId, activeComparePage, 0.9);
          if (!isCancelled && canvasRefA.current) {
            canvasRefA.current.width = resA.width;
            canvasRefA.current.height = resA.height;
            const ctxA = canvasRefA.current.getContext('2d');
            if (ctxA && resA.canvas) {
              ctxA.drawImage(resA.canvas, 0, 0);
            }
            setCanvasDims({ width: resA.width, height: resA.height });
          }
        } else if (canvasRefA.current) {
          const w = canvasDims?.width || 500;
          const h = canvasDims?.height || 700;
          canvasRefA.current.width = w;
          canvasRefA.current.height = h;
          const ctxA = canvasRefA.current.getContext('2d');
          if (ctxA) {
            ctxA.fillStyle = '#f8fafc';
            ctxA.fillRect(0, 0, w, h);
            ctxA.fillStyle = '#64748b';
            ctxA.font = 'bold 15px sans-serif';
            ctxA.textAlign = 'center';
            ctxA.fillText(`Page ${activeComparePage + 1} does not exist in Version A`, w / 2, h / 2 - 10);
            ctxA.font = '12px sans-serif';
            ctxA.fillText(`(Version A has ${pageCountA} page${pageCountA > 1 ? 's' : ''})`, w / 2, h / 2 + 15);
          }
        }

        // Render Version B
        if (activeComparePage < pageCountB && canvasRefB.current) {
          const resB = await engine.renderPage(docBId, activeComparePage, 0.9);
          if (!isCancelled && canvasRefB.current) {
            canvasRefB.current.width = resB.width;
            canvasRefB.current.height = resB.height;
            const ctxB = canvasRefB.current.getContext('2d');
            if (ctxB && resB.canvas) {
              ctxB.drawImage(resB.canvas, 0, 0);
            }
          }
        } else if (canvasRefB.current) {
          const w = canvasDims?.width || 500;
          const h = canvasDims?.height || 700;
          canvasRefB.current.width = w;
          canvasRefB.current.height = h;
          const ctxB = canvasRefB.current.getContext('2d');
          if (ctxB) {
            ctxB.fillStyle = '#f8fafc';
            ctxB.fillRect(0, 0, w, h);
            ctxB.fillStyle = '#64748b';
            ctxB.font = 'bold 15px sans-serif';
            ctxB.textAlign = 'center';
            ctxB.fillText(`Page ${activeComparePage + 1} does not exist in Version B`, w / 2, h / 2 - 10);
            ctxB.font = '12px sans-serif';
            ctxB.fillText(`(Version B has ${pageCountB} page${pageCountB > 1 ? 's' : ''})`, w / 2, h / 2 + 15);
          }
        }
      } catch (err) {
        console.warn('Compare render warning:', err);
      } finally {
        if (!isCancelled) setIsRenderingPages(false);
      }
    };

    renderComparePages();
    return () => {
      isCancelled = true;
    };
  }, [documentId, docBId, activeComparePage, compareMode]);

  if (activeModal !== 'compare') return null;

  const handlePickSecondFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !documentId) return;

    const file = e.target.files[0];
    setDocBName(file.name);
    setIsComparing(true);

    try {
      const buffer = await file.arrayBuffer();
      const engine = getPDFEngine();
      const { documentId: openedDocBId } = await engine.openDocument(new Uint8Array(buffer));
      setDocBId(openedDocBId);

      const comparator = new DocumentComparator(engine);
      const diff = await comparator.compareDocuments(
        documentId,
        openedDocBId,
        fileName || 'Current Document',
        file.name
      );

      setCompareResult(diff);
      setActiveComparePage(0);
      setCompareMode('swipe');
      addToast({
        type: 'info',
        title: 'Comparison Completed',
        message: `Found differences on ${diff.pagesWithDifferences} page(s). Use slider to inspect visual changes.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Comparison Failed',
        message: err?.message || 'Failed to compare PDFs.',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const updateSliderPosFromEvent = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSlider(true);
    updateSliderPosFromEvent(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      updateSliderPosFromEvent(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const maxPages = compareResult
    ? Math.max(compareResult.pageCountA, compareResult.pageCountB)
    : 1;

  const currentPageDiff = compareResult?.pageResults.find(
    (p) => p.pageNumber === activeComparePage + 1
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Compare Dialog">
      <div className="w-full max-w-4xl bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Compare Two PDFs</h3>
              <p className="text-xs text-slate-400">
                Interactive Before/After visual swipe comparison & text difference analysis
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (docBId) {
                try {
                  getPDFEngine().closeDocument(docBId);
                } catch {}
              }
              setCompareResult(null);
              setDocBName('');
              setDocBId(null);
              setActiveModal(null);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Compare PDFs"
            description="Please select the first PDF document (Version A) to begin side-by-side comparison."
            icon={GitCompare}
            actionText="Select Version A PDF"
          />
        ) : (
          <>
            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* File Selectors & Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="p-2.5 bg-slate-800/50 border border-slate-700/80 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">Version A (Original)</span>
                    <p className="text-xs font-semibold text-white truncate">{fileName || 'Current PDF'}</p>
                  </div>
                  <div className="p-2.5 bg-slate-800/50 border border-slate-700/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="overflow-hidden min-w-0">
                      <span className="text-[10px] uppercase font-bold text-purple-400 block mb-0.5">Version B (Revision)</span>
                      <p className="text-xs font-semibold text-white truncate">
                        {docBName || 'Select revision PDF...'}
                      </p>
                    </div>
                    <label className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0">
                      Browse
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handlePickSecondFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* View Mode Toggle */}
                {compareResult && (
                  <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
                    <button
                      onClick={() => setCompareMode('swipe')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                        compareMode === 'swipe'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <SplitSquareVertical className="w-3.5 h-3.5" />
                      <span>Visual Swipe</span>
                    </button>
                    <button
                      onClick={() => setCompareMode('report')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                        compareMode === 'report'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Text Diff Report</span>
                    </button>
                  </div>
                )}
              </div>

              {isComparing && (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium">Analyzing documents and generating visual diff layers...</p>
                </div>
              )}

              {/* Compare Results Display */}
              {compareResult && !isComparing && (
                <>
                  {/* Visual Swipe Mode */}
                  {compareMode === 'swipe' && (
                    <div className="space-y-3">
                      {/* Comparison Toolbar: Page Selector & Status */}
                      <div className="flex items-center justify-between bg-slate-850 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center gap-2 font-mono">
                          <button
                            onClick={() => setActiveComparePage((p) => Math.max(0, p - 1))}
                            disabled={activeComparePage <= 0}
                            className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                            title="Previous Page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-slate-200 font-semibold">
                            Page {activeComparePage + 1} of {maxPages}
                          </span>
                          <button
                            onClick={() => setActiveComparePage((p) => Math.min(maxPages - 1, p + 1))}
                            disabled={activeComparePage >= maxPages - 1}
                            className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                            title="Next Page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentPageDiff?.hasVisualDiff ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Changes detected on this page</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pages match identically</span>
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-mono">
                            Slider: {Math.round(sliderPos)}%
                          </span>
                        </div>
                      </div>

                      {/* Interactive Visual Swipe Viewport */}
                      <div className="bg-[#000000]/80 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center min-h-[380px] overflow-auto">
                        {isRenderingPages && (
                          <div className="py-12 flex items-center gap-2 text-slate-400 text-xs">
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <span>Rendering page comparison canvases...</span>
                          </div>
                        )}

                        <div
                          ref={containerRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className="relative rounded-lg border border-slate-700/80 overflow-hidden shadow-2xl bg-white select-none cursor-ew-resize"
                          style={{
                            width: canvasDims ? `${canvasDims.width}px` : '500px',
                            height: canvasDims ? `${canvasDims.height}px` : '700px',
                            maxWidth: '100%',
                          }}
                        >
                          {/* Layer A (Left Side: Version A) */}
                          <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                              clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                            }}
                          >
                            <canvas ref={canvasRefA} className="w-full h-full block object-contain" />
                            <div className="absolute top-2.5 left-2.5 bg-[#000000]/90 backdrop-blur text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-lg select-none pointer-events-none">
                              Version A (Original)
                            </div>
                          </div>

                          {/* Layer B (Right Side: Version B) */}
                          <div
                            className="absolute inset-0 overflow-hidden"
                            style={{
                              clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)`,
                            }}
                          >
                            <canvas ref={canvasRefB} className="w-full h-full block object-contain" />
                            <div className="absolute top-2.5 right-2.5 bg-[#000000]/90 backdrop-blur text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/40 shadow-lg select-none pointer-events-none">
                              Version B (Revision)
                            </div>
                          </div>

                          {/* Draggable Vertical Divider Handle */}
                          <div
                            className="absolute top-0 bottom-0 w-[2px] bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.9)] z-20 pointer-events-none"
                            style={{ left: `${sliderPos}%` }}
                          >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#000000] border-2 border-purple-400 flex items-center justify-center text-purple-300 shadow-2xl text-[10px] font-bold select-none">
                              ◀▶
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 mt-3 text-center">
                          Click & drag the vertical divider line horizontally across the page to reveal differences between Version A and Version B.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Text Diff Report Mode */}
                  {compareMode === 'report' && (
                    <div className="space-y-4 pt-1">
                      <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-300">
                          Total pages: <span className="font-mono text-white">{compareResult.pageCountA}</span> vs{' '}
                          <span className="font-mono text-white">{compareResult.pageCountB}</span>
                        </span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded ${
                            compareResult.pagesWithDifferences > 0
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          }`}
                        >
                          {compareResult.pagesWithDifferences === 0
                            ? 'Documents are identical'
                            : `${compareResult.pagesWithDifferences} page(s) changed`}
                        </span>
                      </div>

                      {/* Page Differences List */}
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {compareResult.pageResults.map((p) => (
                          <div
                            key={p.pageNumber}
                            className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-200">Page {p.pageNumber}</span>
                              <span className={p.hasVisualDiff ? 'text-amber-400' : 'text-slate-500'}>
                                {p.hasVisualDiff ? 'Difference detected' : 'No changes'}
                              </span>
                            </div>

                            {p.textChanges.added.length > 0 && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-[11px] text-emerald-300 space-y-1">
                                <span className="font-bold text-[10px] uppercase tracking-wider block">
                                  Added in Version B:
                                </span>
                                {p.textChanges.added.map((line, i) => (
                                  <p key={i} className="font-mono">+ {line}</p>
                                ))}
                              </div>
                            )}

                            {p.textChanges.removed.length > 0 && (
                              <div className="bg-rose-500/10 border border-rose-500/20 p-2 rounded text-[11px] text-rose-300 space-y-1">
                                <span className="font-bold text-[10px] uppercase tracking-wider block">
                                  Removed in Version B:
                                </span>
                                {p.textChanges.removed.map((line, i) => (
                                  <p key={i} className="font-mono">- {line}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-[#000000]/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {compareResult ? 'Comparison engine: 100% offline vector layout & pixel alignment' : ''}
              </span>
              <button
                onClick={() => {
                  if (docBId) {
                    try {
                      getPDFEngine().closeDocument(docBId);
                    } catch {}
                  }
                  setCompareResult(null);
                  setDocBName('');
                  setDocBId(null);
                  setActiveModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompareDialog;
