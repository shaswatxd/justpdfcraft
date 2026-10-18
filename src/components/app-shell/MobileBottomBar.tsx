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

  // Shared button style for consistent 44px touch targets (WCAG 2.5.5)
  const navBtnCls = "flex flex-col items-center justify-center gap-0.5 min-w-[38px] sm:min-w-[44px] min-h-[44px] px-1 sm:px-2 text-slate-400 hover:text-white active:scale-95 transition-all rounded-xl";
  const navBtnActiveCls = "flex flex-col items-center justify-center gap-0.5 min-w-[38px] sm:min-w-[44px] min-h-[44px] px-1 sm:px-2 active:scale-95 transition-all rounded-xl";

  // Common inline style for safe-area padding
  const safeAreaStyle = { paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))', paddingTop: '0.375rem' };

  // 1. MOBILE BOTTOM BAR FOR ACTIVE DOCUMENT (EDITOR MODE)
  if (documentId) {
    return (
      <nav
        aria-label="Mobile Document Controls"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/97 backdrop-blur-2xl border-t border-slate-800 px-1.5 sm:px-2 gap-1 sm:gap-2 justify-between w-full max-w-full overflow-hidden flex items-center select-none shadow-2xl"
        style={safeAreaStyle}
      >
        {/* Back to Home Dashboard */}
        <button
          onClick={() => setActiveView('home')}
          className={navBtnCls}
          title="Home Dashboard"
          aria-label="Home Dashboard"
        >
          <Home className="w-5 h-5" />
          <span className="text-[9.5px] font-medium">Home</span>
        </button>

        {/* Page Navigation Stepper */}
        <div className="flex items-center gap-0.5 bg-slate-900/90 px-1 py-0.5 sm:px-1.5 sm:py-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-200 px-0.5 sm:px-1 min-w-[38px] sm:min-w-[50px] text-center">
            {currentPage} <span className="text-slate-500 font-sans">/</span> {pageCount}
          </span>

          <button
            onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-transform min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Page Grid / Organizer */}
        <button
          onClick={() => setViewMode(viewMode === 'organize' ? 'continuous' : 'organize')}
          className={`${navBtnActiveCls} ${
            viewMode === 'organize'
              ? 'text-indigo-400 bg-indigo-500/15'
              : 'text-slate-400 hover:text-white'
          }`}
          title={viewMode === 'organize' ? 'Switch to Reader' : 'Visual Page Grid'}
          aria-label="Toggle Page Grid"
        >
          {viewMode === 'organize' ? <AlignJustify className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          <span className="text-[9.5px] font-medium">
            {viewMode === 'organize' ? 'Reader' : 'Grid'}
          </span>
        </button>

        {/* Zoom Quick Stepper */}
        <div className="hidden min-[360px]:flex items-center bg-slate-900/90 rounded-xl border border-slate-800 p-0.5 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition-transform min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
            className="p-1.5 text-slate-400 hover:text-white active:scale-90 transition-transform min-w-[30px] min-h-[30px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={() => saveDirectly()}
          className={`${navBtnActiveCls} ${isDirty ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'}`}
          title="Save Document"
          aria-label="Save Document"
        >
          <div className="relative">
            <Save className="w-5 h-5" />
            {isDirty && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[9.5px] font-medium">Save</span>
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/97 backdrop-blur-2xl border-t border-slate-800 px-1.5 sm:px-2 w-full max-w-full overflow-hidden flex items-center justify-around select-none shadow-2xl"
      style={safeAreaStyle}
    >
      {/* Home */}
      <button
        onClick={handleHomeClick}
        className={navBtnCls}
        aria-label="Scroll to top"
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Tools Catalog */}
      <button
        onClick={handleToolsClick}
        className={navBtnCls}
        aria-label="Browse tools"
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px] font-medium">Tools</span>
      </button>

      {/* Floating Center (+) Action Button */}
      {onOpenFilePicker && (
        <button
          onClick={onOpenFilePicker}
          className="flex flex-col items-center -mt-5 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-full shadow-lg shadow-indigo-950/80 border-2 border-black transition-transform active:scale-95 min-w-[52px] min-h-[52px] justify-center"
          title="Open or Upload File"
          aria-label="Open or Upload File"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      )}

      {/* Exam Suite */}
      <button
        onClick={() => setActiveModal('student-resizer')}
        className={`${navBtnCls} hover:text-amber-400`}
        aria-label="Open Exam Suite"
      >
        <Sliders className="w-5 h-5" />
        <span className="text-[10px] font-medium">Exam Suite</span>
      </button>

      {/* Search / Command Palette */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className={`${navBtnCls} hover:text-sky-400`}
        aria-label="Open Search"
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] font-medium">Search</span>
      </button>
    </nav>
  );
};
