import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  FilePlus,
  Image as ImageIcon,
  GraduationCap,
  Layers,
  FileArchive,
  Sliders,
  PenTool,
  Scissors,
  Edit3,
  RefreshCw,
  ScanText,
  Shield,
  RotateCcw,
  X,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore, ModalType } from '@/stores/uiStore';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { ToolCategory } from '@/types/tools';
import { useRecentToolsStore } from '@/stores/recentToolsStore';
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

/** Compact, labelled starting actions. Deliberately short list (see quick-actions design). */
const QUICK_ACTIONS: Array<{
  toolId: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  workflow: {
    modal?: ModalType;
    viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
    tool?: ToolMode;
    label: string;
    initialTab?: string;
  } | null;
}> = [
  {
    toolId: 'merge-pdf',
    label: 'Merge PDF',
    icon: Layers,
    accent: 'text-blue-400 border-blue-500/25 bg-blue-500/[0.07] hover:bg-blue-500/15',
    // Merge collects its own inputs, so it can open the dialog directly
    workflow: null,
  },
  {
    toolId: 'compress-pdf',
    label: 'Compress PDF',
    icon: FileArchive,
    accent: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07] hover:bg-emerald-500/15',
    workflow: { modal: 'compress', label: 'Compress PDF' },
  },
  {
    toolId: 'split-pdf',
    label: 'Split PDF',
    icon: Scissors,
    accent: 'text-rose-400 border-rose-500/25 bg-rose-500/[0.07] hover:bg-rose-500/15',
    workflow: { modal: 'split', label: 'Split PDF' },
  },
  {
    toolId: 'convert-pdf',
    label: 'Convert PDF',
    icon: RefreshCw,
    accent: 'text-teal-400 border-teal-500/25 bg-teal-500/[0.07] hover:bg-teal-500/15',
    workflow: { modal: 'convert', label: 'Convert PDF' },
  },
  {
    toolId: 'sign-pdf',
    label: 'Sign PDF',
    icon: Edit3,
    accent: 'text-sky-400 border-sky-500/25 bg-sky-500/[0.07] hover:bg-sky-500/15',
    workflow: { modal: 'sign', label: 'Sign PDF' },
  },
  {
    toolId: 'target-kb-resizer',
    label: 'Photo 20–50 KB',
    icon: Sliders,
    accent: 'text-amber-400 border-amber-500/25 bg-amber-500/[0.07] hover:bg-amber-500/15',
    workflow: { modal: 'student-resizer', initialTab: 'resizer', label: 'Exam Photo Resizer' },
  },
];

/** Secondary starting points, below the quick actions. */
const SECONDARY_ACTIONS: Array<{
  toolId: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBox: string;
  hoverBorder: string;
  run: 'modal:student-calculators' | 'modal:handwriting' | 'modal:ocr' | 'modal:protect';
}> = [
  {
    toolId: 'student-quick-notes',
    title: 'Student Tools',
    subtitle: 'CGPA, attendance & more',
    icon: GraduationCap,
    iconBox: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
    hoverBorder: 'hover:border-amber-500/40',
    run: 'modal:student-calculators',
  },
  {
    toolId: 'handwriting-generator',
    title: 'Handwriting',
    subtitle: 'Assignment generator',
    icon: PenTool,
    iconBox: 'bg-purple-500/10 border-purple-500/25 text-purple-400',
    hoverBorder: 'hover:border-purple-500/40',
    run: 'modal:handwriting',
  },
  {
    toolId: 'ocr-pdf',
    title: 'Scan & OCR',
    subtitle: 'Extract text from scans',
    icon: ScanText,
    iconBox: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/40',
    run: 'modal:ocr',
  },
  {
    toolId: 'protect-pdf',
    title: 'Protect PDF',
    subtitle: 'Password & encryption',
    icon: Shield,
    iconBox: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
    hoverBorder: 'hover:border-rose-500/40',
    run: 'modal:protect',
  },
];

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
    setActiveImageTab,
    setActiveLegalTab,
    setPendingImageFile,
    setActiveView,
  } = useUIStore();
  const { setTool } = useToolStore();
  const { trackTool } = useRecentToolsStore();
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

  React.useEffect(() => {
    checkAndLoadAvailableDrafts();
  }, [checkAndLoadAvailableDrafts]);

  const handleOpenPdfClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isNativeFSSupported()) {
      try {
        const opened = await openWithNativePicker();
        if (opened) {
          setActiveView('editor');
          addToast({
            type: 'success',
            title: 'Document Opened',
            message: 'Direct disk save enabled via File System Access.',
          });
          return;
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Native open error:', err);
        }
      }
    }
    pdfInputRef.current?.click();
  };

  React.useEffect(() => {
    const handleCancel = () => {
      pendingWorkflowRef.current = null;
    };
    const p1 = pdfInputRef.current;
    const p2 = photoInputRef.current;
    p1?.addEventListener('cancel', handleCancel);
    p2?.addEventListener('cancel', handleCancel);
    return () => {
      p1?.removeEventListener('cancel', handleCancel);
      p2?.removeEventListener('cancel', handleCancel);
    };
  }, []);

  const handleFilePicked = async (file: File) => {
    const pending = pendingWorkflowRef.current;
    pendingWorkflowRef.current = null;

    // If user dropped or selected an image, route intelligently based on pending workflow
    if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
      const url = URL.createObjectURL(file);
      setActivePhotoUrl(url);

      if (pending?.modal === 'convert') {
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

      if (pending?.modal === 'photo-editor') {
        setActiveModal('photo-editor');
        addToast({
          type: 'success',
          title: 'Photo Opened in Studio',
          message: `${file.name} ready for cropping and adjustments.`,
        });
        return;
      }

      if (pending?.modal === 'image-tools') {
        setPendingImageFile(file);
        if (pending.initialTab) setActiveImageTab(pending.initialTab);
        setActiveModal('image-tools');
        addToast({
          type: 'success',
          title: 'Image Tools Ready',
          message: `${file.name} loaded.`,
        });
        return;
      }

      if (pending?.modal) {
        if ((pending.modal === 'student-calculators' || pending.modal === 'student-resizer') && pending.initialTab) {
          setActiveStudentTab(pending.initialTab);
        }
        setActiveModal(pending.modal);
        return;
      }

      // Default fallback when an image is directly dropped/picked on the home dropzone
      setActiveModal('student-resizer');
      addToast({
        type: 'success',
        title: 'Image Opened in Student Suite',
        message: `${file.name} loaded. Ready to compress KB, clean signature, or format.`,
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Unsupported File Type',
        message: 'Please select a valid .pdf document or photo (JPG/PNG).',
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);

      if (pending) {
        // Protect: Never route a PDF document to an image-only modal like photo-editor
        const isPhotoOnlyModal =
          pending.modal === 'photo-editor' ||
          (pending.modal === 'convert' && pending.initialTab === 'img-to-pdf');

        if (pending.modal && !isPhotoOnlyModal) {
          if ((pending.modal === 'student-calculators' || pending.modal === 'student-resizer') && pending.initialTab) {
            setActiveStudentTab(pending.initialTab);
          } else if (pending.modal === 'image-tools' && pending.initialTab) {
            setActiveImageTab(pending.initialTab);
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
      workflow.modal === 'photo-editor' ||
      workflow.modal === 'student-resizer' ||
      workflow.modal === 'image-tools' ||
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

  const runQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    trackTool(action.toolId);
    if (action.workflow) {
      triggerWorkflowWithFile(action.workflow);
    } else {
      // Merge manages its own multi-file input inside the dialog
      setActiveModal('merge');
    }
  };

  const openSecondary = (run: (typeof SECONDARY_ACTIONS)[number]['run'], toolId: string) => {
    trackTool(toolId);
    setActiveModal(run.replace('modal:', '') as ModalType);
  };

  return (
    <div
      id="home-dashboard"
      className="flex-1 overflow-y-auto bg-black flex flex-col items-center pb-28 md:pb-12"
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
          <div className="w-full mb-4 p-3.5 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-amber-100">
                    Unsaved session recovered
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                    {availableDrafts.length} {availableDrafts.length === 1 ? 'draft' : 'drafts'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-200/70 mt-0.5">
                  <span className="text-amber-100 font-medium">{availableDrafts[0].fileName}</span> •{' '}
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
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all"
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
                  className="px-2 py-1 rounded text-[11px] text-amber-200/70 hover:text-amber-100 transition-colors"
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
                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-200/70 hover:text-amber-100 transition-colors"
                title="Discard this draft"
                aria-label="Discard this draft"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 1. Primary Action: unified Open / Select file panel */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
          className={`relative w-full border-2 border-dashed rounded-2xl p-4 sm:p-6 transition-all duration-200 ${
            isDraggingFile
              ? 'border-swift-400 bg-swift-500/[0.08]'
              : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
          }`}
        >
          <div className="flex flex-col gap-3">
            {/* Primary row: open a PDF / photo */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenPdfClick()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-swift-600 hover:bg-swift-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-swift-950/40 transition-all min-h-[48px]"
              >
                <FolderOpen className="w-5 h-5" />
                <span>Open a PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingWorkflowRef.current = null;
                  photoInputRef.current?.click();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition-all min-h-[48px]"
              >
                <ImageIcon className="w-5 h-5" />
                <span>Select a photo</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              PDF, JPG, PNG, WebP, GIF, BMP — files are processed in your browser, nothing is
              uploaded. Drag &amp; drop works here too.
            </p>

            {/* Secondary row: blank document (desktop-labelled, available everywhere) */}
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => createBlankDocument()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-medium transition-all min-h-[44px]"
              >
                <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>New blank PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Quick Actions: one intentional row of common tasks (same on mobile & desktop) */}
        <div className="w-full mt-5 sm:mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 text-left px-1">
            Common tasks
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.toolId}
                  type="button"
                  onClick={() => runQuickAction(action)}
                  className={`inline-flex items-center justify-center gap-2 border rounded-xl px-3 py-3 text-xs font-semibold transition-all active:scale-[0.98] min-h-[48px] ${action.accent}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Secondary starting points */}
        <div className="w-full mt-4">
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {SECONDARY_ACTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.toolId}
                  type="button"
                  onClick={() => openSecondary(item.run, item.toolId)}
                  className={`p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/90 text-left transition-all active:scale-[0.98] flex flex-col justify-between gap-2 min-h-[76px] ${item.hoverBorder}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center ${item.iconBox}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100">{item.title}</div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
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
