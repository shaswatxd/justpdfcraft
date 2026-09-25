import React from 'react';
import {
  Home,
  LayoutGrid,
  Search,
  Sliders,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Grid,
  AlignJustify,
  Save,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';

export const MobileBottomBar: React.FC<{ onOpenFilePicker?: () => void }> = ({
  onOpenFilePicker,
}) => {
  const { setCommandPaletteOpen, setActiveModal, isFullscreen, setActiveView } = useUIStore();
  const {
    documentId,
    currentPage,
    pageCount,
    setCurrentPage,
    viewMode,
    setViewMode,
    saveDirectly,
    isDirty,
    setZoom,
  } = useDocumentStore();

  if (isFullscreen) return null;

  // 1. MOBILE BOTTOM BAR FOR ACTIVE DOCUMENT (EDITOR MODE)
  if (documentId) {
    return (
      <nav
        aria-label="Mobile Document Controls"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-slate-800 px-3 py-1.5 flex items-center justify-between select-none safe-area-bottom shadow-2xl"
      >
        {/* Back to Home Dashboard */}
        <button
          onClick={() => setActiveView('home')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-white active:scale-95 transition-all"
          title="Home Dashboard"
          aria-label="Home Dashboard"
        >
          <Home className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Home</span>
        </button>

        {/* Page Navigation Stepper */}
        <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono font-semibold text-slate-200 px-1 min-w-[50px] text-center">
            {currentPage} <span className="text-slate-500 font-sans">/</span> {pageCount}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Page Grid / Organizer */}
        <button
          onClick={() => setViewMode(viewMode === 'organize' ? 'continuous' : 'organize')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
            viewMode === 'organize'
              ? 'text-indigo-400 bg-indigo-500/15'
              : 'text-slate-400 hover:text-white'
          }`}
          title={viewMode === 'organize' ? 'Switch to Reader' : 'Visual Page Grid'}
          aria-label="Toggle Page Grid"
        >
          {viewMode === 'organize' ? <AlignJustify className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          <span className="text-[9.5px] font-medium mt-0.5">
            {viewMode === 'organize' ? 'Reader' : 'Grid'}
          </span>
        </button>

        {/* Zoom Quick Stepper */}
        <div className="flex items-center bg-slate-900/90 rounded-xl border border-slate-800 p-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1 text-slate-400 hover:text-white active:scale-90 transition-transform"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
            className="p-1 text-slate-400 hover:text-white active:scale-90 transition-transform"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={() => saveDirectly()}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all relative"
          title="Save Document"
          aria-label="Save Document"
        >
          <div className="relative">
            <Save className="w-4 h-4" />
            {isDirty && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[9.5px] font-medium mt-0.5">Save</span>
        </button>
      </nav>
    );
  }

  // 2. MOBILE BOTTOM BAR FOR HOME DASHBOARD
  const handleHomeClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToolsClick = () => {
    setTimeout(() => {
      const el = document.getElementById('tool-explorer');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-slate-800 px-3 py-1.5 flex items-center justify-around select-none safe-area-bottom shadow-2xl"
    >
      {/* Home */}
      <button
        onClick={handleHomeClick}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400 hover:text-white transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Tools Catalog */}
      <button
        onClick={handleToolsClick}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400 hover:text-white transition-colors"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-[10px] font-medium">Tools</span>
      </button>

      {/* Floating Center (+) Action Button */}
      {onOpenFilePicker && (
        <button
          onClick={onOpenFilePicker}
          className="flex flex-col items-center -mt-4 bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-full shadow-lg shadow-indigo-950/80 border-2 border-black transition-transform active:scale-95"
          title="Open or Upload File"
          aria-label="Open or Upload File"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      )}

      {/* Exam Suite */}
      <button
        onClick={() => setActiveModal('student-resizer')}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400 hover:text-amber-400 transition-colors"
      >
        <Sliders className="w-4 h-4" />
        <span className="text-[10px] font-medium">Exam Suite</span>
      </button>

      {/* Search / Command Palette */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-slate-400 hover:text-sky-400 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-medium">Search</span>
      </button>
    </nav>
  );
};
