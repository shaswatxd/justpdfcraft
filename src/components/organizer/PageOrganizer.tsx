import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  RotateCw,
  Trash2,
  Copy,
  Plus,
  ArrowUpDown,
  Download,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  Eraser,
  Crop,
  Grid,
  Eye,
  Undo2,
  Redo2
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

interface OrganizerPageThumbnailProps {
  documentId: string | null;
  pageIndex: number;
  rotation: number;
  isLandscape: boolean;
}

const OrganizerPageThumbnail: React.FC<OrganizerPageThumbnailProps> = ({
  documentId,
  pageIndex,
  rotation,
  isLandscape,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(pageIndex < 12);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !documentId || !canvasRef.current) return;
    let isCancelled = false;
    setIsLoading(true);

    const renderThumb = async () => {
      try {
        const engine = getPDFEngine();
        // Scale 0.35 renders crisp, high-fidelity PDF vector text and images
        const res = await engine.renderPage(documentId, pageIndex, 0.35);
        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d');
        if (ctx && res.canvas) {
          ctx.drawImage(res.canvas, 0, 0);
          setIsRendered(true);
        }
      } catch (err) {
        console.warn(`PageOrganizer thumb render error for page ${pageIndex}:`, err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    renderThumb();
    return () => {
      isCancelled = true;
    };
  }, [isVisible, documentId, pageIndex, rotation]);

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-lg shadow-md flex items-center justify-center relative overflow-hidden transition-all duration-150 group-hover:shadow-xl group-hover:scale-[1.02] border border-slate-700/50 ${
        isLandscape ? 'w-36 h-24 sm:w-44 sm:h-32' : 'w-24 h-36 sm:w-32 sm:h-44'
      }`}
    >
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full w-auto h-auto object-contain block transition-opacity duration-200 select-none ${
          isRendered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!isRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-400 select-none">
          {isLoading ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-4 h-4 border-2 border-swift-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-[10px] text-slate-500 font-medium">Page {pageIndex + 1}</span>
            </div>
          ) : (
            <div className="p-2 text-center text-slate-400 font-mono text-[10px]">
              Page {pageIndex + 1}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PageOrganizer: React.FC = () => {
  const {
    documentId,
    pageCount,
    selectedPageIndices,
    togglePageSelection,
    setSelectedPages,
    selectAllPages,
    clearPageSelection,
    rotateSelectedPages,
    deleteSelectedPages,
    duplicateSelectedPages,
    insertBlankPageAt,
    reverseAllPages,
    pageDimensions,
    reorderPages,
    fileName,
    filePath,
    loadDocument,
    rotatePage,
    currentPage,
    setCurrentPage,
    setViewMode,
    undo,
    redo,
    undoStack,
    redoStack
  } = useDocumentStore();

  const { addToast, setActiveModal } = useUIStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Smoothly scroll active page card into view when currentPage changes (e.g. from header arrows or sidebar)
  useEffect(() => {
    if (currentPage >= 1 && currentPage <= pageCount) {
      const pageIdx = currentPage - 1;
      const el = document.getElementById(`organizer-page-${pageIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentPage, pageCount]);

  const handleSelectOdd = () => {
    const oddIndices = Array.from({ length: pageCount }, (_, i) => i).filter((i) => i % 2 === 0);
    setSelectedPages(oddIndices);
  };

  const handleSelectEven = () => {
    const evenIndices = Array.from({ length: pageCount }, (_, i) => i).filter((i) => i % 2 !== 0);
    setSelectedPages(evenIndices);
  };

  const handleRemoveBlank = async () => {
    if (!documentId) return;
    try {
      const engine = getPDFEngine();
      const removed = await engine.removeBlankPages(documentId);
      if (removed.length === 0) {
        addToast({
          type: 'info',
          title: 'No Blank Pages Found',
          message: 'All pages in this document contain text or content.',
        });
        return;
      }
      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }
      addToast({
        type: 'success',
        title: 'Blank Pages Removed',
        message: `Removed ${removed.length} blank page(s) (${removed.map((i) => i + 1).join(', ')}).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Remove Blank Pages', message: err?.message });
    }
  };

  const handleRotate = async (deg: number) => {
    try {
      await rotateSelectedPages(deg);
      addToast({
        type: 'success',
        title: 'Pages Rotated',
        message: `Rotated selected pages by ${deg}°.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Rotation Failed', message: err?.message });
    }
  };

  const handleDelete = async () => {
    if (selectedPageIndices.length === 0) return;
    if (selectedPageIndices.length >= pageCount) {
      addToast({
        type: 'warning',
        title: 'Cannot Delete All Pages',
        message: 'A PDF document must have at least one page.',
      });
      return;
    }

    try {
      await deleteSelectedPages();
      addToast({
        type: 'success',
        title: 'Pages Deleted',
        message: `Removed ${selectedPageIndices.length} page(s).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete Failed', message: err?.message });
    }
  };

  const handleDuplicate = async () => {
    if (selectedPageIndices.length === 0) return;
    try {
      await duplicateSelectedPages();
      addToast({
        type: 'success',
        title: 'Pages Duplicated',
        message: `Cloned ${selectedPageIndices.length} page(s).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Duplicate Failed', message: err?.message });
    }
  };

  const handleInsertBlank = async () => {
    const at = selectedPageIndices.length > 0 ? Math.max(...selectedPageIndices) + 1 : pageCount;
    try {
      await insertBlankPageAt(at);
      addToast({
        type: 'success',
        title: 'Blank Page Inserted',
        message: `Inserted new page at index ${at + 1}.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Insert Failed', message: err?.message });
    }
  };

  const handleReverseAll = async () => {
    try {
      await reverseAllPages();
      addToast({
        type: 'success',
        title: 'Pages Reversed',
        message: `Inverted the order of all ${pageCount} pages.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reverse Failed', message: err?.message });
    }
  };

  const handleExtract = async () => {
    if (!documentId || selectedPageIndices.length === 0) return;
    try {
      const engine = getPDFEngine();
      const extractedBytes = await engine.extractPages(documentId, selectedPageIndices);
      const blob = new Blob([extractedBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'JustPDFCraft';
      const suffix =
        selectedPageIndices.length <= 4
          ? `Pages_${selectedPageIndices.map((i) => i + 1).join('-')}`
          : `${selectedPageIndices.length}_Selected_Pages`;
      a.download = `${baseName}_${suffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Pages Extracted',
        message: `Downloaded new PDF with ${selectedPageIndices.length} page(s).`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Extraction Failed', message: err?.message });
    }
  };

  const handleMovePage = async (fromIdx: number, direction: 'left' | 'right') => {
    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= pageCount) return;

    const order = Array.from({ length: pageCount }, (_, i) => i);
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, fromIdx);

    try {
      await reorderPages(order);
      setCurrentPage(toIdx + 1);
      setSelectedPages([toIdx]);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reorder Failed', message: err?.message });
    }
  };

  // Keyboard shortcuts in Organize mode
  useEffect(() => {
    const handleOrganizerKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) { redo(); } else { undo(); }
      } else if (ctrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllPages();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearPageSelection();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPageIndices.length > 0) {
        e.preventDefault();
        handleDelete();
      } else if (!ctrl && e.key.toLowerCase() === 'r' && selectedPageIndices.length > 0) {
        e.preventDefault();
        handleRotate(e.shiftKey ? -90 : 90);
      }
    };

    window.addEventListener('keydown', handleOrganizerKeyDown);
    return () => window.removeEventListener('keydown', handleOrganizerKeyDown);
  }, [selectedPageIndices, pageCount]);

  return (
    <div className="flex-1 flex flex-col bg-black text-slate-200 overflow-hidden">
      {/* Top Action Ribbon */}
      <div className="h-12 bg-black border-b border-slate-800 px-4 flex items-center justify-between gap-4">
        {/* Selection summary & toggles */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-300">
            {selectedPageIndices.length} of {pageCount} Selected
          </span>
          <button
            onClick={selectAllPages}
            className="text-xs text-swift-400 hover:text-swift-300 transition-colors flex items-center gap-1"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            All
          </button>
          <button
            onClick={handleSelectOdd}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Odd
          </button>
          <button
            onClick={handleSelectEven}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Even
          </button>
          <button
            onClick={clearPageSelection}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Batch Operations */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRotate(-90)}
            disabled={selectedPageIndices.length === 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Rotate 90° Left"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate Left</span>
          </button>
          <button
            onClick={() => handleRotate(90)}
            disabled={selectedPageIndices.length === 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Rotate 90° Right"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate Right</span>
          </button>
          <button
            onClick={handleDuplicate}
            disabled={selectedPageIndices.length === 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Duplicate Selected Pages"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>
          <button
            onClick={handleExtract}
            disabled={selectedPageIndices.length === 0}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Extract to New PDF"
          >
            <Download className="w-3.5 h-3.5 text-swift-400" />
            <span className="hidden sm:inline">Extract</span>
          </button>
          <button
            onClick={handleInsertBlank}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Insert Blank Page"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Add Blank</span>
          </button>
          <button
            onClick={handleRemoveBlank}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Scan and Remove Blank Pages"
          >
            <Eraser className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Remove Blank</span>
          </button>
          <button
            onClick={handleReverseAll}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Reverse Page Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reverse All</span>
          </button>
          <button
            onClick={() => setActiveModal('crop')}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            title="Crop Margins on Document Pages"
          >
            <Crop className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Crop</span>
          </button>
          <button
            onClick={() => undo()} disabled={undoStack.length === 0} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors" title="Undo"><Undo2 className="w-3.5 h-3.5" /></button><button onClick={() => redo()} disabled={redoStack.length === 0} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs flex items-center gap-1 transition-colors" title="Redo"><Redo2 className="w-3.5 h-3.5" /></button><div className="w-[1px] h-5 bg-slate-800 mx-1" /><button onClick={handleDelete}
            disabled={selectedPageIndices.length === 0}
            className="p-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 disabled:opacity-40 text-xs flex items-center gap-1 transition-colors"
            title="Delete Selected Pages"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-1" />

          <button
            onClick={() => setViewMode('continuous')}
            className="p-1.5 px-2.5 rounded bg-swift-600 hover:bg-swift-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Done organizing: Open current page in PDF Viewer & Editor"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open in Editor</span>
          </button>
        </div>
      </div>

      {/* Thumbnails Grid */}
      {!documentId || pageCount === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <NoDocumentState
            toolName="Page Organizer"
            description="Please select a PDF document first to view page thumbnails, reorder, rotate, extract, or delete pages."
            icon={Grid}
            actionText="Select PDF to Organize"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.from({ length: pageCount }, (_, i) => {
              const isSelected = selectedPageIndices.includes(i);
              const isCurrent = currentPage === i + 1;
              const dims = pageDimensions[i] || { width: 595, height: 842, rotation: 0 };
              const isLandscape = (dims.rotation % 180 !== 0 ? dims.height : dims.width) > (dims.rotation % 180 !== 0 ? dims.width : dims.height);

              return (
                <div
                  key={i}
                  id={`organizer-page-${i}`}
                  draggable
                  onDragStart={(e) => {
                    setDraggedIndex(i);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (draggedIndex === null || draggedIndex === i) return;
                    const order = Array.from({ length: pageCount }, (_, idx) => idx);
                    order.splice(draggedIndex, 1);
                    order.splice(i, 0, draggedIndex);
                    setDraggedIndex(null);
                    await reorderPages(order);
                    setCurrentPage(i + 1);
                    setSelectedPages([i]);
                  }}
                  onClick={(e) => {
                    setCurrentPage(i + 1);
                    togglePageSelection(i, e.ctrlKey || e.metaKey || e.shiftKey);
                  }}
                  className={`group relative flex flex-col items-center p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                    draggedIndex === i
                      ? 'opacity-40 border-dashed border-swift-400 scale-95'
                      : isSelected
                      ? 'bg-swift-500/10 border-swift-500 shadow-lg ring-2 ring-swift-500/40'
                      : isCurrent
                      ? 'bg-slate-850 border-swift-500/60 ring-1 ring-swift-500/30'
                      : 'bg-black border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {/* Page Number & Checkbox */}
                  <div className="w-full flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-swift-400' : isCurrent ? 'text-white' : 'text-slate-400'}`}>
                        #{i + 1}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-swift-500/20 text-swift-400 border border-swift-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <div className={`p-0.5 rounded ${isSelected ? 'text-swift-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Real Rendered PDF Page Thumbnail */}
                  <OrganizerPageThumbnail
                    key={`${documentId}_p${i}_r${dims.rotation}`}
                    documentId={documentId}
                    pageIndex={i}
                    rotation={dims.rotation}
                    isLandscape={isLandscape}
                  />

                  {/* Hover / Selected Reordering, Viewing & Rotation Controls */}
                  <div
                    className={`flex items-center gap-1.5 mt-2.5 transition-opacity ${
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(i, 'left');
                      }}
                      disabled={i === 0}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 transition-colors"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(i + 1);
                        setViewMode('continuous');
                      }}
                      className="p-1 rounded bg-swift-600 hover:bg-swift-500 text-white transition-colors"
                      title="Open Page in Viewer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (isSelected && selectedPageIndices.length > 1) {
                          await rotateSelectedPages(90);
                        } else {
                          await rotatePage(i, 90);
                        }
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(i, 'right');
                      }}
                      disabled={i === pageCount - 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 transition-colors"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};




