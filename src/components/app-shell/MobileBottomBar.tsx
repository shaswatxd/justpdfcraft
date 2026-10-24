import React from 'react';
import { Home, LayoutGrid, Search, Sliders, PlusCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

/**
 * Mobile bottom navigation for the Home dashboard.
 * (While a document is open in the editor, MobileEditorToolbar renders instead.)
 */
export const MobileBottomBar: React.FC<{ onOpenFilePicker?: () => void }> = ({
  onOpenFilePicker,
}) => {
  const { setCommandPaletteOpen, setActiveModal, isFullscreen } = useUIStore();

  if (isFullscreen) return null;

  // Scroll the dashboard's own scroll container (it is NOT the browser window —
  // the dashboard lives in an overflow-y-auto flex child).
  const scrollHomeToTop = () => {
    const dash = document.getElementById('home-dashboard');
    if (dash) {
      dash.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToExplorer = () => {
    const el = document.getElementById('tool-explorer');
    if (el) {
      // The explorer section lives inside the same dashboard scroll container
      const dash = document.getElementById('home-dashboard');
      const top = dash ? dash.getBoundingClientRect().top : 0;
      const rect = el.getBoundingClientRect();
      dash?.scrollTo({ top: dash.scrollTop + (rect.top - top) - 72, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-gray-200 px-2 py-1.5 flex items-center justify-around select-none safe-area-bottom shadow-xl"
    >
      {/* Home */}
      <button
        onClick={scrollHomeToTop}
        className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] min-w-[56px] text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
        aria-label="Home Dashboard"
        title="Home Dashboard"
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Tools Catalog */}
      <button
        onClick={scrollToExplorer}
        className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] min-w-[56px] text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
        aria-label="Browse All Tools"
        title="Browse All Tools"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-[10px] font-medium">Tools</span>
      </button>

      {/* Floating Center (+) Action Button */}
      {onOpenFilePicker && (
        <button
          onClick={onOpenFilePicker}
          className="flex items-center justify-center -mt-5 bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full shadow-lg shadow-red-500/30 border-2 border-white transition-transform active:scale-95"
          title="Open or Upload File"
          aria-label="Open or Upload File"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      )}

      {/* Exam Suite */}
      <button
        onClick={() => setActiveModal('student-resizer')}
        className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] min-w-[56px] text-gray-500 hover:text-amber-600 transition-colors active:scale-95"
        aria-label="Exam Photo and Signature Suite"
        title="Student & Exam Suite"
      >
        <Sliders className="w-4 h-4" />
        <span className="text-[10px] font-medium">Exam</span>
      </button>

      {/* Search / Command Palette */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-0.5 py-1.5 px-3 min-h-[44px] min-w-[56px] text-gray-500 hover:text-red-600 transition-colors active:scale-95"
        aria-label="Search Tools and Commands"
        title="Search Tools & Actions"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-medium">Search</span>
      </button>
    </nav>
  );
};
