import React, { useRef, useState, useEffect } from 'react';
import {
  FolderOpen,
  FilePlus,
  Clock,
  Star,
  Trash2,
  GraduationCap,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore, ModalType } from '@/stores/uiStore';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { localDb, RecentDocRecord } from '@core/db/database';
import { ToolCategory } from '@/types/tools';
import { HeroSection } from '@/components/home/HeroSection';
import { ToolExplorer } from '@/components/home/ToolExplorer';
import { FeatureHighlights } from '@/components/home/FeatureHighlights';
import { FAQSection } from '@/components/home/FAQSection';
import { HomeFooter } from '@/components/home/HomeFooter';

export const HomeDashboard: React.FC = () => {
  const { loadDocument, setViewMode } = useDocumentStore();
  const { setActiveModal, addToast, setActivePhotoUrl } = useUIStore();
  const { setTool } = useToolStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingWorkflowRef = useRef<{
    modal?: ModalType;
    viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
    tool?: ToolMode;
    label?: string;
  } | null>(null);

  const [recents, setRecents] = useState<RecentDocRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');

  useEffect(() => {
    setRecents(localDb.getRecentDocuments());
  }, []);

  const handleFilePicked = async (file: File) => {
    // If user dropped or selected an image, route to Student & Exam Suite or Photo Editor
    if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
      const url = URL.createObjectURL(file);
      setActivePhotoUrl(url);
      setActiveModal('student-resizer');
      addToast({
        type: 'success',
        title: 'Image Opened in Student Suite',
        message: `${file.name} loaded. Ready to compress KB, clean signature, or format.`,
      });
      pendingWorkflowRef.current = null;
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Unsupported File Type',
        message: 'Please select a valid .pdf document or photo (JPG/PNG).',
      });
      pendingWorkflowRef.current = null;
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);

      const pending = pendingWorkflowRef.current;
      pendingWorkflowRef.current = null;

      if (pending) {
        if (pending.modal) {
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
      pendingWorkflowRef.current = null;
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
  }) => {
    pendingWorkflowRef.current = workflow;
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
    addToast({
      type: 'info',
      title: 'Blank Document Created',
      message: 'Created a new A4 PDF document.',
    });
  };

  const toggleFavorite = (filePath: string) => {
    localDb.toggleFavorite(filePath);
    setRecents(localDb.getRecentDocuments());
  };

  const removeRecent = (filePath: string) => {
    localDb.removeRecentDocument(filePath);
    setRecents(localDb.getRecentDocuments());
  };

  const handleCategorySelect = (cat: ToolCategory | 'all') => {
    setSelectedCategory(cat);
    const explorerEl = document.getElementById('tool-explorer');
    if (explorerEl) {
      explorerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilePicked(e.target.files[0]);
          }
        }}
      />

      {/* Hero Section */}
      <HeroSection
        onSelectCategory={handleCategorySelect}
        onOpenPdfUploader={() => fileInputRef.current?.click()}
      />

      {/* Main Container */}
      <div className="w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 my-8">
        {/* Universal Drag & Drop Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative cursor-pointer border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 ${
            isDragging
              ? 'border-swift-400 bg-swift-500/10 scale-[1.01]'
              : 'border-slate-800 hover:border-swift-500/50 bg-slate-900/40 hover:bg-slate-900/70 shadow-md hover:shadow-2xl hover:shadow-black/30'
          }`}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-swift-500/10 border border-swift-500/20 text-swift-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FolderOpen className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold text-slate-100 tracking-tight">
                Drop your PDF or image here, or{' '}
                <span className="text-swift-400 underline underline-offset-4 hover:text-swift-300 transition-colors">browse files</span>
              </p>
              <p className="text-xs text-slate-400 mt-1.5 font-normal">
                Fast & private in-browser document editor • Zero cloud uploads
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2.5 bg-swift-600 hover:bg-swift-500 text-white font-medium rounded-xl shadow-md shadow-swift-900/30 flex items-center gap-2 text-xs transition-all hover:-translate-y-0.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse Document
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  createBlankDocument();
                }}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-medium rounded-xl flex items-center gap-2 text-xs transition-all hover:-translate-y-0.5"
              >
                <FilePlus className="w-3.5 h-3.5" />
                New Blank PDF
              </button>
            </div>
          </div>
        </div>

        {/* Student & Exam Admission Suite Banner */}
        <div
          onClick={() => setActiveModal('student-resizer')}
          className="relative overflow-hidden cursor-pointer rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 p-6 shadow-md transition-all group hover:-translate-y-0.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-swift-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-950/50 group-hover:scale-105 transition-transform shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Student & Exam Admission Suite
                  </h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-medium tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full">
                    SSC • UPSC • NEET • JEE • IBPS
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                  Exact Target KB Resizer (20–50 KB), Paper Signature Cleaner, Photo+Sign Combiner, and Name & Date (DOP) Strip.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-4 py-2 bg-swift-600 group-hover:bg-swift-500 text-white font-medium rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5">
                Open Exam Suite →
              </span>
            </div>
          </div>
        </div>

        {/* Master Tool Explorer with Search, Category Tabs, Recents & Favorites */}
        <ToolExplorer
          activeCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onSelectWorkflowFile={triggerWorkflowWithFile}
        />

        {/* Recent Documents History (if any) */}
        {recents.length > 0 && (
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Recent Documents History
              </h2>
              <button
                onClick={() => {
                  localDb.clearRecentDocuments();
                  setRecents([]);
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear History
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recents.map((doc) => (
                <div
                  key={doc.id}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-800/60 rounded-lg group transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button
                      onClick={() => toggleFavorite(doc.filePath)}
                      className={`p-1 rounded ${
                        doc.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={doc.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-200 truncate">{doc.fileName}</p>
                      <p className="text-xs text-slate-500 truncate">{doc.filePath}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="hidden sm:inline">{doc.pageCount} pages</span>
                    <span className="hidden sm:inline">
                      {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      onClick={() => removeRecent(doc.filePath)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                      title="Remove from recents"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights: Why JustPDFCraft */}
        <FeatureHighlights />

        {/* FAQ Accordion */}
        <FAQSection />
      </div>

      {/* Footer */}
      <HomeFooter onSelectCategory={handleCategorySelect} />
    </div>
  );
};
