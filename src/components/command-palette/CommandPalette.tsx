import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RotateCw,
  RotateCcw,
  Trash2,
  FileArchive,
  ScanText,
  Shield,
  Printer,
  Grid,
  Save,
  Plus,
  ArrowUpDown,
  GitCompare,
  ZoomIn,
  ZoomOut,
  X,
  FileText,
  Lock,
  Hash,
  ShieldCheck,
  Layers,
  Crop,
  Edit3,
  Unlock,
  Expand,
  Bookmark,
  HelpCircle,
  Ruler,
  Volume2,
  Crosshair,
  Focus,
  Image as ImageIcon,
  Sparkles,
  PenTool,
  RefreshCw,
  Camera,
  Scissors,
  Files,
  Table,
  Droplets,
  GraduationCap,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';
import { useTTSStore } from '@/stores/ttsStore';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Document' | 'Pages' | 'Tools' | 'View';
  icon: any;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveModal,
    setSidebarTab,
    toggleFullscreen,
    toggleLaserPointer,
    toggleSpotlight,
  } = useUIStore();
  const {
    currentPage,
    rotateSelectedPages,
    deleteSelectedPages,
    insertBlankPageAt,
    reverseAllPages,
    setZoom,
    setViewMode,
    saveCurrentDocument,
    closeCurrentDocument,
    flattenDocumentForms,
    clearAllForms,
    addUserBookmark,
  } = useDocumentStore();
  const { setTool } = useToolStore();
  const { toggleTTS } = useTTSStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'fullscreen_presentation',
      title: 'Fullscreen Presentation & Reading Mode',
      category: 'View',
      icon: Expand,
      shortcut: 'F11 / Ctrl+L',
      action: () => toggleFullscreen(),
    },
    {
      id: 'laser_pointer',
      title: 'Glowing Laser Pointer (Presentation Mode)',
      category: 'View',
      icon: Crosshair,
      shortcut: 'L',
      action: () => toggleLaserPointer(),
    },
    {
      id: 'spotlight_focus',
      title: 'Spotlight Reading Focus Beam',
      category: 'View',
      icon: Focus,
      shortcut: 'S',
      action: () => toggleSpotlight(),
    },
    {
      id: 'add_user_bookmark',
      title: `Bookmark Page ${currentPage} (My Study Bookmarks)`,
      category: 'Document',
      icon: Bookmark,
      shortcut: 'Ctrl+B',
      action: () => addUserBookmark(`Bookmark Page ${currentPage}`, currentPage - 1),
    },
    {
      id: 'keyboard_shortcuts_modal',
      title: 'Keyboard Shortcuts Cheat Sheet & Power Controls',
      category: 'Document',
      icon: HelpCircle,
      shortcut: '? / F1',
      action: () => setActiveModal('shortcuts'),
    },
    {
      id: 'measure_tool',
      title: 'Measure & Dimension Ruler Tool (CAD-grade precision)',
      category: 'Tools',
      icon: Ruler,
      shortcut: 'M',
      action: () => setTool('measure'),
    },
    {
      id: 'read_aloud_tts',
      title: 'Read Aloud / Text-to-Speech (TTS Audio Playback)',
      category: 'Tools',
      icon: Volume2,
      shortcut: 'Ctrl+Shift+U',
      action: () => toggleTTS(),
    },
    {
      id: 'edit_text_inplace',
      title: 'Edit Existing PDF Text (Direct In-Place Editing)',
      category: 'Tools',
      icon: Edit3,
      action: () => setTool('edit_text'),
    },
    {
      id: 'universal_unlock',
      title: 'Unlock PDF & Strip Permissions (Bypass Owner/Copy/Print Locks)',
      category: 'Tools',
      icon: Unlock,
      action: () => setActiveModal('protect'),
    },
    {
      id: 'save',
      title: 'Save Document (Ctrl+S)',
      category: 'Document',
      icon: Save,
      shortcut: 'Ctrl+S',
      action: () => saveCurrentDocument(),
    },
    {
      id: 'compress',
      title: 'Compress PDF under target size',
      category: 'Tools',
      icon: FileArchive,
      action: () => setActiveModal('compress'),
    },
    {
      id: 'ocr',
      title: 'OCR Document — Extract searchable text (Hindi + English)',
      category: 'Tools',
      icon: ScanText,
      action: () => setActiveModal('ocr'),
    },
    {
      id: 'extract_photos',
      title: 'Extract Photos & Images from PDF (lossless JPEG, PNG & scans)',
      category: 'Tools',
      icon: ImageIcon,
      action: () => setActiveModal('extract-images'),
    },
    {
      id: 'photo_studio',
      title: 'Photo Studio & Passport/ID Crop (3.5×4.5cm, Filters, Place in PDF)',
      category: 'Tools',
      icon: Sparkles,
      action: () => setActiveModal('photo-editor'),
    },
    {
      id: 'e_sign',
      title: 'E-Sign & Digital Signatures (Draw, Type, Upload)',
      category: 'Tools',
      icon: PenTool,
      action: () => setActiveModal('sign'),
    },
    {
      id: 'convert_format',
      title: 'Convert PDF to Images / Text & Images to PDF',
      category: 'Tools',
      icon: RefreshCw,
      action: () => setActiveModal('convert'),
    },
    {
      id: 'camera_scan',
      title: 'Camera Document Scanner (Webcam / Document Camera)',
      category: 'Tools',
      icon: Camera,
      action: () => setActiveModal('scan'),
    },
    {
      id: 'student_suite',
      title: 'Student & Exam Suite (Target KB Resizer, Sign Cleaner, DOP)',
      category: 'Tools',
      icon: GraduationCap,
      action: () => setActiveModal('student-resizer'),
    },
    {
      id: 'extract_table_data',
      title: 'Extract PDF Tables to Excel (TSV) & CSV',
      category: 'Tools',
      icon: Table,
      action: () => setActiveModal('extract-table'),
    },
    {
      id: 'watermark_doc',
      title: 'Watermark Document (Confidential, Draft, Custom)',
      category: 'Tools',
      icon: Droplets,
      action: () => setActiveModal('watermark'),
    },
    {
      id: 'merge_docs',
      title: 'Merge Multiple PDFs into Single Document',
      category: 'Tools',
      icon: Files,
      action: () => setActiveModal('merge'),
    },
    {
      id: 'split_doc',
      title: 'Split & Extract Pages from Document',
      category: 'Tools',
      icon: Scissors,
      action: () => setActiveModal('split'),
    },
    {
      id: 'protect',
      title: 'Protect Document with Password',
      category: 'Tools',
      icon: Shield,
      action: () => setActiveModal('protect'),
    },
    {
      id: 'print',
      title: 'Print Document (Ctrl+P)',
      category: 'Document',
      icon: Printer,
      shortcut: 'Ctrl+P',
      action: () => setActiveModal('print'),
    },
    {
      id: 'compare',
      title: 'Compare with another PDF',
      category: 'Tools',
      icon: GitCompare,
      action: () => setActiveModal('compare'),
    },
    {
      id: 'forms_panel',
      title: 'Open Interactive Forms Panel',
      category: 'Tools',
      icon: FileText,
      action: () => setSidebarTab('forms'),
    },
    {
      id: 'flatten_forms',
      title: 'Flatten Form Fields (Permanently Burn Values)',
      category: 'Tools',
      icon: Lock,
      action: () => flattenDocumentForms(),
    },
    {
      id: 'clear_forms',
      title: 'Clear All Form Fields',
      category: 'Tools',
      icon: RotateCcw,
      action: () => clearAllForms(),
    },
    {
      id: 'bates_numbering',
      title: 'Add Bates Numbering (Legal Indexing & Sequencing)',
      category: 'Tools',
      icon: Hash,
      action: () => setActiveModal('bates'),
    },
    {
      id: 'header_footer',
      title: 'Insert Page Numbers & Headers/Footers ("Page X of Y")',
      category: 'Tools',
      icon: FileText,
      action: () => setActiveModal('bates'),
    },
    {
      id: 'sanitize_doc',
      title: 'Sanitize Document (Purge All Metadata & Hidden Streams)',
      category: 'Tools',
      icon: ShieldCheck,
      action: () => setActiveModal('sanitize'),
    },
    {
      id: 'batch_process',
      title: 'Batch Processing Hub (Compress, Watermark, Sanitize Multiple Files)',
      category: 'Tools',
      icon: Layers,
      action: () => setActiveModal('batch'),
    },
    {
      id: 'crop_pages',
      title: 'Crop Pages & Trim Margins (Adjust Page Dimensions)',
      category: 'Tools',
      icon: Crop,
      action: () => setActiveModal('crop'),
    },
    {
      id: 'organize',
      title: 'Open Page Organizer Grid',
      category: 'View',
      icon: Grid,
      action: () => setViewMode('organize'),
    },
    {
      id: 'rotate_cw',
      title: `Rotate Page ${currentPage} Clockwise (90°)`,
      category: 'Pages',
      icon: RotateCw,
      action: () => rotateSelectedPages(90),
    },
    {
      id: 'rotate_ccw',
      title: `Rotate Page ${currentPage} Counter-Clockwise (-90°)`,
      category: 'Pages',
      icon: RotateCcw,
      action: () => rotateSelectedPages(-90),
    },
    {
      id: 'insert_blank',
      title: `Insert Blank Page after Page ${currentPage}`,
      category: 'Pages',
      icon: Plus,
      action: () => insertBlankPageAt(currentPage),
    },
    {
      id: 'reverse_pages',
      title: 'Reverse Page Order of All Pages',
      category: 'Pages',
      icon: ArrowUpDown,
      action: () => reverseAllPages(),
    },
    {
      id: 'delete_page',
      title: `Delete Page ${currentPage}`,
      category: 'Pages',
      icon: Trash2,
      action: () => deleteSelectedPages(),
    },
    {
      id: 'search_doc',
      title: 'Search in Document (Ctrl+F)',
      category: 'Document',
      icon: Search,
      shortcut: 'Ctrl+F',
      action: () => setSidebarTab('search'),
    },
    {
      id: 'zoom_in',
      title: 'Zoom In',
      category: 'View',
      icon: ZoomIn,
      shortcut: 'Ctrl++',
      action: () => setZoom((z) => z + 0.25),
    },
    {
      id: 'zoom_out',
      title: 'Zoom Out',
      category: 'View',
      icon: ZoomOut,
      shortcut: 'Ctrl+-',
      action: () => setZoom((z) => z - 0.25),
    },
    {
      id: 'close_doc',
      title: 'Close Document (Ctrl+W)',
      category: 'Document',
      icon: X,
      shortcut: 'Ctrl+W',
      action: () => closeCurrentDocument(),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const executeCommand = (cmd: CommandItem) => {
    setCommandPaletteOpen(false);
    cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        executeCommand(filtered[selectedIndex]);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-swift-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search action (e.g. compress, rotate, ocr)..."
            className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-swift-600 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-swift-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1 py-0.5 rounded border ${
                          isSelected
                            ? 'border-swift-400 bg-swift-700 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-400'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
