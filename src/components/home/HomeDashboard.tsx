import React, { useRef, useState } from 'react';
import {
  FolderOpen,
  FilePlus,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Flame,
  Layers,
  FileArchive,
  Sliders,
  PenTool,
  Scissors,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore, ModalType } from '@/stores/uiStore';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { ToolCategory } from '@/types/tools';
import { HeroSection } from '@/components/home/HeroSection';
import { ToolExplorer } from '@/components/home/ToolExplorer';
import { FAQSection } from '@/components/home/FAQSection';
import { HomeFooter } from '@/components/home/HomeFooter';

export const HomeDashboard: React.FC = () => {
  const { loadDocument, setViewMode } = useDocumentStore();
  const {
    setActiveModal,
    addToast,
    setActivePhotoUrl,
    setActiveConvertTab,
    setActiveStudentTab,
    setActiveImageTab,
    setActiveLegalTab,
    setPendingImageFile,
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

  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');

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

      // Default fallback when an image is directly dropped/picked on home dropzone
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
        addToast({
          type: 'success',
          title: 'Document Opened',
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

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPdf(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (!pendingWorkflowRef.current) {
        pendingWorkflowRef.current = { modal: 'photo-editor', label: 'Photo Studio' };
      }
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  const createBlankDocument = async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage([595.28, 841.89]); // A4
    const bytes = await doc.save();
    await loadDocument(bytes, 'Untitled.pdf');
    addToast({
      type: 'info',
      title: 'Blank Document Created',
      message: 'Created a new A4 PDF document.',
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
    <div className="flex-1 overflow-y-auto bg-black flex flex-col items-center pb-24 sm:pb-12">
      {/* Hidden File Inputs: Document & Photo */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
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

      {/* Hero Section with Dedicated Document & Photo Workspaces */}
      <HeroSection
        onSelectCategory={handleCategorySelect}
        onOpenExamSuite={() => setActiveModal('student-resizer')}
      >
        {/* Two Separate Workspaces: Document (PDF) & Photo (Images) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full">
          {/* Card 1: PDF Document */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPdf(true);
            }}
            onDragLeave={() => setIsDraggingPdf(false)}
            onDrop={handlePdfDrop}
            onClick={() => pdfInputRef.current?.click()}
            className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all duration-300 flex flex-col justify-between ${
              isDraggingPdf
                ? 'border-blue-400 bg-blue-500/10 dropzone-dragging scale-[1.01]'
                : 'border-zinc-800 hover:border-blue-500/50 bg-zinc-950/70 hover:bg-zinc-900/40 shadow-xl'
            }`}
          >
            <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                  PDF Documents
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-normal mt-0.5">
                  Drop your PDF here, or <span className="text-blue-400 underline underline-offset-2">browse files</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pdfInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl shadow-md shadow-blue-950/50 flex items-center justify-center gap-1.5 text-xs transition-all hover:-translate-y-0.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Browse Document</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    createBlankDocument();
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-medium rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all hover:-translate-y-0.5"
                >
                  <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New Blank PDF</span>
                </button>
              </div>
            </div>

            {/* Quick action triggers for PDF */}
            <div className="pt-3 mt-3 border-t border-zinc-900 flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400">
              <span className="text-zinc-500 font-medium">Quick PDF:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerWorkflowWithFile({ modal: 'compress', label: 'PDF Compress' });
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                Compress
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerWorkflowWithFile({ modal: 'sign', label: 'Sign PDF' });
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                Sign
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal('merge');
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                Merge
              </button>
            </div>
          </div>

          {/* Card 2: Photo & Images */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(true);
            }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={handlePhotoDrop}
            onClick={() => {
              pendingWorkflowRef.current = { modal: 'photo-editor', label: 'Photo Studio' };
              photoInputRef.current?.click();
            }}
            className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all duration-300 flex flex-col justify-between ${
              isDraggingPhoto
                ? 'border-emerald-400 bg-emerald-500/10 dropzone-dragging scale-[1.01]'
                : 'border-zinc-800 hover:border-emerald-500/50 bg-zinc-950/70 hover:bg-zinc-900/40 shadow-xl'
            }`}
          >
            <div className="flex flex-col items-center space-y-2.5 sm:space-y-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight">
                  Photos & Images
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-normal mt-0.5">
                  Drop JPG, PNG, WebP here, or <span className="text-emerald-400 underline underline-offset-2">browse photo</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5 w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    pendingWorkflowRef.current = { modal: 'photo-editor', label: 'Photo Studio' };
                    photoInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-md shadow-emerald-950/50 flex items-center justify-center gap-1.5 text-xs transition-all hover:-translate-y-0.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Browse Photo</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModal('student-resizer');
                  }}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-medium rounded-xl flex items-center justify-center gap-1.5 text-xs transition-all hover:-translate-y-0.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exam Resizer</span>
                </button>
              </div>
            </div>

            {/* Quick action triggers for Photo */}
            <div className="pt-3 mt-3 border-t border-zinc-900 flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400">
              <span className="text-zinc-500 font-medium">Quick Photo:</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal('student-resizer');
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                20–50 KB
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerWorkflowWithFile({ modal: 'convert', initialTab: 'img-to-pdf', label: 'Image to PDF' });
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                To PDF
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  pendingWorkflowRef.current = { modal: 'photo-editor', label: 'Photo Studio' };
                  photoInputRef.current?.click();
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              >
                Passport Crop
              </button>
            </div>
          </div>
        </div>

        {/* Top Line: Most Important & Popular Tools */}
        <div className="mt-4 sm:mt-5 w-full flex flex-col items-center">
          <div className="w-full flex items-center justify-start lg:justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 shadow-xs">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">Important Tools:</span>
              <span className="sm:hidden">Top:</span>
            </span>

            <button
              type="button"
              onClick={() => setActiveModal('merge')}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-blue-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Merge PDF</span>
            </button>

            <button
              type="button"
              onClick={() => triggerWorkflowWithFile({ modal: 'compress', label: 'Compress PDF' })}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compress PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStudentTab('resizer');
                setActiveModal('student-resizer');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>20–50 KB Resizer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('handwriting')}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-purple-300 border border-purple-500/30 hover:border-purple-500/60 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-400" />
              <span>Handwritten Notes</span>
            </button>

            <button
              type="button"
              onClick={() => triggerWorkflowWithFile({ modal: 'split', label: 'Split PDF' })}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-rose-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <Scissors className="w-3.5 h-3.5 text-rose-400" />
              <span>Split PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveConvertTab('img-to-pdf');
                setActiveModal('convert');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-teal-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <FilePlus className="w-3.5 h-3.5 text-teal-400" />
              <span>Image to PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStudentTab('attendance');
                setActiveModal('student-calculators');
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-green-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span>Attendance Bunk</span>
            </button>

            <button
              type="button"
              onClick={() => triggerWorkflowWithFile({ modal: 'sign', label: 'Sign PDF' })}
              className="px-3 py-1.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800/90 hover:border-sky-500/50 transition-all flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shadow-xs hover:-translate-y-0.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Sign PDF</span>
            </button>
          </div>
        </div>
      </HeroSection>

      {/* Main Container */}
      <div className="w-full max-w-6xl xl:max-w-7xl px-3 sm:px-6 lg:px-8 space-y-8 sm:space-y-12 my-4 sm:my-8">


        {/* Master Tool Explorer with Search, Category Tabs, Recents & Favorites */}
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
