import React, { useState } from 'react';
import {
  Keyboard,
  X,
  Search,
  Monitor,
  PenTool,
  Files,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

interface ShortcutEntry {
  keys: string[];
  description: string;
  category: 'nav' | 'tools' | 'doc';
  badge?: string;
}

const ALL_SHORTCUTS: ShortcutEntry[] = [
  // Navigation & View
  { keys: ['Ctrl', 'L'], description: 'Fullscreen Presentation & Reading Mode', category: 'nav', badge: 'Popular' },
  { keys: ['F11'], description: 'Toggle Fullscreen Mode', category: 'nav' },
  { keys: ['Esc'], description: 'Exit Fullscreen / Close Dialogs', category: 'nav' },
  { keys: ['PageDown', 'or', '→'], description: 'Next Page', category: 'nav' },
  { keys: ['PageUp', 'or', '←'], description: 'Previous Page', category: 'nav' },
  { keys: ['Space'], description: 'Next Page (Fullscreen) / Hand Pan Drag', category: 'nav' },
  { keys: ['Ctrl', '+'], description: 'Zoom In (+15%)', category: 'nav' },
  { keys: ['Ctrl', '-'], description: 'Zoom Out (-15%)', category: 'nav' },
  { keys: ['Ctrl', '0'], description: 'Reset Zoom to 100%', category: 'nav' },
  { keys: ['Ctrl', 'K'], description: 'Open Command Palette (Quick Actions)', category: 'nav', badge: 'Pro' },
  { keys: ['Ctrl', 'F'], description: 'Full-Text Search in Document', category: 'nav' },
  { keys: ['Ctrl', 'B'], description: 'Bookmark Current Page', category: 'nav', badge: 'New' },
  { keys: ['Ctrl', 'Shift', 'U'], description: 'Toggle Read Aloud (Text-to-Speech)', category: 'nav', badge: 'AI' },
  { keys: ['L'], description: 'Toggle Glowing Laser Pointer (Presentation Mode)', category: 'nav', badge: 'Pro' },
  { keys: ['S'], description: 'Toggle Spotlight Reading Focus Beam', category: 'nav', badge: 'New' },

  // Annotation & Editing Tools
  { keys: ['V'], description: 'Selection Tool', category: 'tools' },
  { keys: ['H'], description: 'Hand Pan Tool', category: 'tools' },
  { keys: ['P'], description: 'Pen Tool (Pressure-Sensitive Freehand Drawing)', category: 'tools' },
  { keys: ['E'], description: 'Vector Stroke Eraser', category: 'tools' },
  { keys: ['T'], description: 'Text Placement Tool', category: 'tools' },
  { keys: ['M'], description: 'Precision Measure & Dimension Ruler', category: 'tools', badge: 'CAD' },
  { keys: ['R'], description: 'Safe Permanent Area Redaction', category: 'tools', badge: 'Security' },
  { keys: ['Ctrl', 'Shift', 'X'], description: 'Area Snip OCR (Extract Restricted Text)', category: 'tools', badge: 'OCR' },
  { keys: ['Click'], description: 'In-Place Text Editor (Edit Existing PDF Text)', category: 'tools', badge: 'Pro' },
  { keys: ['Esc'], description: 'Cancel Active Drawing / Annotation Drag', category: 'tools', badge: 'New' },
  { keys: ['Toolbar'], description: 'E-Sign & Transparent Signature Pad', category: 'tools', badge: 'New' },
  { keys: ['Toolbar'], description: 'Photo Studio & Indian ID Crop (3.5×4.5cm)', category: 'tools', badge: 'New' },
  { keys: ['Toolbar'], description: 'Extract Tables to Excel & CSV', category: 'tools', badge: 'New' },

  // Document & Operations
  { keys: ['Ctrl', 'O'], description: 'Open PDF File', category: 'doc' },
  { keys: ['Ctrl', 'S'], description: 'Save Document & Download Changes', category: 'doc' },
  { keys: ['Ctrl', 'P'], description: 'Smart Print Workflow Dialog', category: 'doc' },
  { keys: ['Ctrl', 'W'], description: 'Close Current Tab / Document', category: 'doc' },
  { keys: ['Ctrl', 'Z'], description: 'Undo Last Action', category: 'doc' },
  { keys: ['Ctrl', 'Y'], description: 'Redo Action', category: 'doc' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo Action (Alternative)', category: 'doc' },
  { keys: ['?', 'or', 'F1'], description: 'Open Keyboard Shortcuts Cheat Sheet', category: 'doc' },
];

export const ShortcutsDialog: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'nav' | 'tools' | 'doc'>('all');

  if (activeModal !== 'shortcuts') return null;

  const filteredShortcuts = ALL_SHORTCUTS.filter((sc) => {
    const matchesTab = activeTab === 'all' || sc.category === activeTab;
    if (!matchesTab) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      sc.description.toLowerCase().includes(q) ||
      sc.keys.some((k) => k.toLowerCase().includes(q)) ||
      (sc.badge && sc.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div
      onClick={() => setActiveModal(null)}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-swift-500/10 text-swift-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Keyboard Shortcuts & Power Controls</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Cheat Sheet
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Turbocharge your PDF workflow with pro desktop hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Tabs */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search shortcuts (e.g. zoom, pen, ocr)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-swift-500"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto bg-slate-800/60 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-swift-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({ALL_SHORTCUTS.length})
            </button>
            <button
              onClick={() => setActiveTab('nav')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'nav'
                  ? 'bg-swift-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Navigation</span>
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'bg-swift-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Tools</span>
            </button>
            <button
              onClick={() => setActiveTab('doc')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'doc'
                  ? 'bg-swift-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Files className="w-3 h-3" />
              <span>Document</span>
            </button>
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {filteredShortcuts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No shortcuts found matching "{filter}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-slate-300 font-medium truncate">
                      {sc.description}
                    </span>
                    {sc.badge && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-swift-500/20 text-swift-300 border border-swift-500/30 shrink-0">
                        {sc.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {sc.keys.map((k, kIdx) =>
                      k === 'or' ? (
                        <span key={kIdx} className="text-[10px] text-slate-500 px-0.5">
                          or
                        </span>
                      ) : (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 bg-slate-900/90 border border-slate-700 rounded text-[11px] font-mono font-semibold text-slate-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <span>Tip: Press <kbd className="font-mono text-slate-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">?</kbd> or <kbd className="font-mono text-slate-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">F1</kbd> anytime to open this guide</span>
          <button
            onClick={() => setActiveModal(null)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
