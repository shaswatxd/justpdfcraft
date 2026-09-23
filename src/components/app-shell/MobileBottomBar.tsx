import React from 'react';
import { Home, LayoutGrid, Search, Sliders, PlusCircle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';

export const MobileBottomBar: React.FC<{ onOpenFilePicker?: () => void }> = ({
  onOpenFilePicker,
}) => {
  const { setCommandPaletteOpen, setActiveModal, isFullscreen } = useUIStore();
  const { documentId, closeCurrentDocument } = useDocumentStore();

  if (isFullscreen) return null;

  const handleHomeClick = () => {
    if (documentId) {
      closeCurrentDocument();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleToolsClick = () => {
    if (documentId) {
      closeCurrentDocument();
    }
    setTimeout(() => {
      const el = document.getElementById('tool-explorer');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around select-none">
      {/* Home */}
      <button
        onClick={handleHomeClick}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-zinc-400 hover:text-white transition-colors"
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px] font-medium">Home</span>
      </button>

      {/* Tools Catalog */}
      <button
        onClick={handleToolsClick}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-zinc-400 hover:text-white transition-colors"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-[10px] font-medium">Tools</span>
      </button>

      {/* Floating Center (+) Action Button */}
      {onOpenFilePicker && (
        <button
          onClick={onOpenFilePicker}
          className="flex flex-col items-center -mt-4 bg-swift-600 hover:bg-swift-500 text-white p-2.5 rounded-full shadow-lg shadow-swift-950/80 border-2 border-black transition-transform active:scale-95"
          title="Open or Upload File"
        >
          <PlusCircle className="w-5 h-5" />
        </button>
      )}

      {/* Exam Suite */}
      <button
        onClick={() => setActiveModal('student-resizer')}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-zinc-400 hover:text-amber-400 transition-colors"
      >
        <Sliders className="w-4 h-4" />
        <span className="text-[10px] font-medium">Exam Suite</span>
      </button>

      {/* Search / Command Palette */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-zinc-400 hover:text-sky-400 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-medium">Search</span>
      </button>
    </nav>
  );
};
