import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  FilePlus,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore, ModalType } from '@/stores/uiStore';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { ToolCategory } from '@/types/tools';
import { HeroSection } from '@/components/home/HeroSection';
import { ToolExplorer } from '@/components/home/ToolExplorer';
import { FAQSection } from '@/components/home/FAQSection';
import { HomeFooter } from '@/components/home/HomeFooter';
import { isNativeFSSupported } from '@core/storage/native-fs';

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export const HomeDashboard: React.FC = () => {
  const {
    loadDocument,
    setViewMode,
    availableDrafts,
    checkAndLoadAvailableDrafts,
    restoreDraft,
    discardDraft,
    clearAllDrafts,
    openWithNativePicker,
  } = useDocumentStore();
  const {
    setActiveModal,
    addToast,
    setActivePhotoUrl,
    setActiveConvertTab,
    setActiveStudentTab,
    setActiveLegalTab,
    setPendingImageFile,
    setActiveView,
  } = useUIStore();
  const { setTool } = useToolStore();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingWorkflowRef = useRef<{
    modal?: ModalType;
    viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
    tool?: ToolMode;
    label?: string;
    initialTab?: string;
  } | null>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');

  // Check for unsaved drafts on mount
  React.useEffect(() => {
    checkAndLoadAvailableDrafts();
  }, [checkAndLoadAvailableDrafts]);

  const handleOpenPdfClick = async () => {
    // If native File System Access API is supported, use modern dialog that keeps real file handle
    if (isNativeFSSupported()) {
      try {
        const opened = await openWithNativePicker();
        if (opened) {
          setActiveView('editor');
          return;
        }
      } catch (err: any) {
        // User cancelled or aborted picker
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback: standard file input
    pdfInputRef.current?.click();
  };

  const handleFilePicked = async (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
    const pending = pendingWorkflowRef.current;
    pendingWorkflowRef.current = null;

    if (isImage) {
      // 1. If convert tab was requested
      if (pending?.modal === 'convert' && pending.initialTab === 'img-to-pdf') {
        setPendingImageFile(file);
        setActiveConvertTab('img-to-pdf');
        setActiveModal('convert');
        addToast({
          type: 'success',
          title: 'Images to PDF',
          message: `${file.name} ready. Bundle more images or compile to PDF.`,
        });
        return;
      }

      // Pass image URL to activePhotoUrl for resizer dialog
      const photoUrl = URL.createObjectURL(file);
      setActivePhotoUrl(photoUrl);

      if (pending?.modal) {
        if (pending.modal === 'student-resizer' && pending.initialTab) {
          setActiveStudentTab(pending.initialTab);
        }
        setActiveModal(pending.modal);
        return;
      }

      setActiveModal('student-resizer');
      addToast({
        type: 'success',
        title: 'Photo Resizer Opened',
        message: `${file.name} loaded. Ready to resize to target KB.`,
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Unsupported File Type',
        message: 'Please select a valid .pdf document.',
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);

      if (pending) {
        const isPhotoOnlyModal = pending.modal === 'convert' && pending.initialTab === 'img-to-pdf';

        if (pending.modal && !isPhotoOnlyModal) {
          if (pending.modal === 'student-resizer' && pending.initialTab) {
            setActiveStudentTab(pending.initialTab);
          } else if (pending.modal === 'legal' && pending.initialTab) {
            setActiveLegalTab(pending.initialTab);
          } else if (pending.modal === 'convert' && pending.initialTab) {
            setActiveConvertTab(pending.initialTab);
          }
          setActiveModal(pending.modal);
          setActiveView('editor');
        } else if (pending.viewMode || pending.tool) {
          setActiveView('editor');
        }
        if (pending.viewMode) {
          setViewMode(pending.viewMode);
        }
        if (pending.tool) {
          setTool(pending.tool);
        }
        addToast({
          type: 'success',
          title: 'Document Opened',
          message: `${file.name} loaded. Opening ${pending.label || 'workflow'}...`,
        });
      } else {
        setActiveView('editor');
        addToast({
          type: 'success',
          title: 'Document Opened in Editor',
          message: `${file.name} loaded successfully.`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Open PDF',
        message: err?.message || 'Could not parse PDF.',
      });
    }
  };

  const triggerWorkflowWithFile = (workflow: {
    modal?: ModalType;
    viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
    tool?: ToolMode;
    label: string;
    initialTab?: string;
  }) => {
    pendingWorkflowRef.current = workflow;
    const isImageWorkflow =
      workflow.modal === 'student-resizer' ||
      (workflow.modal === 'convert' && workflow.initialTab === 'img-to-pdf');

    if (isImageWorkflow) {
      photoInputRef.current?.click();
    } else {
      pdfInputRef.current?.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  const createBlankDocument = async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]); // A4
    const bytes = await doc.save();
    await loadDocument(bytes, 'Untitled.pdf');
    setActiveView('editor');
    addToast({
      type: 'info',
      title: 'Blank Document Created',
      message: 'Created a new A4 PDF document in Editor.',
    });
  };

  const handleCategorySelect = (cat: ToolCategory | 'all') => {
    setSelectedCategory(cat);
    const explorerEl = document.getElementById('tool-explorer');
    if (explorerEl) {
      explorerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      id="home-dashboard"
      className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col items-center pb-28 md:pb-12"
    >
      {/* Hidden File Inputs: Document & Photo */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilePicked(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilePicked(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      <HeroSection>
        {/* Unsaved Session Crash Recovery Banner */}
        {availableDrafts && availableDrafts.length > 0 && (
          <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Unsaved session recovered
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-mono">
                    {availableDrafts.length} {availableDrafts.length === 1 ? 'draft' : 'drafts'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-700/80 dark:text-amber-200/70 mt-0.5">
                  <span className="text-amber-900 dark:text-amber-100 font-medium">{availableDrafts[0].fileName}</span> •{' '}
                  {(availableDrafts[0].byteLength / 1024).toFixed(0)} KB • auto-saved to this
                  browser {formatTimeAgo(availableDrafts[0].timestamp)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const restored = await restoreDraft(availableDrafts[0].id);
                  if (restored) {
                    setActiveView('editor');
                    addToast({
                      type: 'success',
                      title: 'Draft Restored',
                      message: `Restored ${availableDrafts[0].fileName} from crash recovery.`,
                    });
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
              {availableDrafts.length > 1 && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await clearAllDrafts();
                    addToast({
                      type: 'info',
                      title: 'All Drafts Discarded',
                      message: 'Cleaned up all recovery drafts.',
                    });
                  }}
                  className="px-2 py-1 rounded text-[11px] text-amber-700 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-100 transition-colors"
                  title="Discard all recovery drafts"
                >
                  Dismiss all
                </button>
              )}
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await discardDraft(availableDrafts[0].id);
                  addToast({
                    type: 'info',
                    title: 'Draft Discarded',
                    message: 'Unsaved draft removed from storage.',
                  });
                }}
                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-700 hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-100 transition-colors"
                title="Discard this draft"
                aria-label="Discard this draft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 1. Primary Action: iLovePDF-style Select PDF files button */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
          className={`relative w-full max-w-xl mx-auto border-2 border-dashed rounded-3xl p-6 sm:p-8 transition-all duration-200 ${
            isDraggingFile
              ? 'border-red-500 bg-red-500/[0.08]'
              : 'border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 hover:border-red-400 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenPdfClick()}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-red-500 hover:bg-red-600 active:scale-[0.99] text-white font-bold rounded-2xl text-base sm:text-lg shadow-lg shadow-red-500/25 transition-all min-h-[52px]"
            >
              <FolderOpen className="w-6 h-6" />
              <span>Select PDF files</span>
            </button>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-500">
              or drop PDFs here • 100% private, files never leave your browser
            </p>

            {/* Secondary row: blank document */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => createBlankDocument()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium transition-all"
              >
                <FilePlus className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span>New blank PDF</span>
              </button>
            </div>
          </div>
        </div>
      </HeroSection>

      {/* Complete catalogue: search, recents, favourites & every category */}
      <div className="w-full max-w-6xl xl:max-w-7xl px-3 py-4 space-y-8 my-4 sm:my-8 flex-1">
        <ToolExplorer
          activeCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onSelectWorkflowFile={triggerWorkflowWithFile}
        />

        {/* FAQ Accordion */}
        <FAQSection />
      </div>

      {/* Footer */}
      <HomeFooter onSelectCategory={handleCategorySelect} />
    </div>
  );
};
