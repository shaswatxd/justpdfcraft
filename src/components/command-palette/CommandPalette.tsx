import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RotateCw,
  RotateCcw,
  Trash2,
  FileArchive,
  ScanText,
  Shield,
  Grid,
  Save,
  Plus,
  ArrowUpDown,
  ZoomIn,
  ZoomOut,
  X,
  Volume2,
  PenTool,
  RefreshCw,
  Scissors,
  Files,
  GraduationCap,
  Expand,
  Printer,
  Image as ImageIcon,
  FileText,
  Code2,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
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
    addToast,
  } = useUIStore();
  const {
    currentPage,
    documentId,
    rotateSelectedPages,
    deletePage,
    insertBlankPageAt,
    reverseAllPages,
    setZoom,
    setViewMode,
    saveDirectly,
    closeCurrentDocument,
    fileHandle,
    fileName,
  } = useDocumentStore();
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
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands: CommandItem[] = [
    {
      id: 'merge',
      title: 'Merge Multiple PDFs into One Document',
      category: 'Tools',
      icon: Files,
      action: () => setActiveModal('merge'),
    },
    {
      id: 'split',
      title: 'Split & Extract Pages from PDF',
      category: 'Tools',
      icon: Scissors,
      action: () => setActiveModal('split'),
    },
    {
      id: 'compress',
      title: 'Smart PDF Compression (Reduce File Size)',
      category: 'Tools',
      icon: FileArchive,
      action: () => setActiveModal('compress'),
    },
    {
      id: 'ocr',
      title: 'OCR & Text Recognition (Convert Scans to Searchable)',
      category: 'Tools',
      icon: ScanText,
      action: () => setActiveModal('ocr'),
    },
    {
      id: 'convert',
      title: 'Convert Document Format (PDF ↔ Images, Word, Text)',
      category: 'Tools',
      icon: RefreshCw,
      action: () => setActiveModal('convert'),
    },
    {
      id: 'protect',
      title: 'Password Protect & Encrypt PDF (AES-256)',
      category: 'Tools',
      icon: Shield,
      action: () => setActiveModal('protect'),
    },
    {
      id: 'sign',
      title: 'E-Sign Document (Digital Signature)',
      category: 'Tools',
      icon: PenTool,
      action: () => setActiveModal('sign'),
    },
    {
      id: 'student_resizer',
      title: 'Exam Photo & Signature Resizer (Exact Target KB)',
      category: 'Tools',
      icon: GraduationCap,
      action: () => setActiveModal('student-resizer'),
    },
    {
      id: 'image_tools',
      title: 'Image Tools Suite (Compress, Resize, Crop, Passport, Convert)',
      category: 'Tools',
      icon: ImageIcon,
      action: () => setActiveModal('image-tools'),
    },
    {
      id: 'document_tools',
      title: 'Document Tools Suite (Word, Excel, Text, Markdown to PDF)',
      category: 'Tools',
      icon: FileText,
      action: () => setActiveModal('document-tools'),
    },
    {
      id: 'student_tools',
      title: 'Student Productivity Suite (Resume, CGPA, GPA, Calculator, Timetable)',
      category: 'Tools',
      icon: GraduationCap,
      action: () => setActiveModal('student-tools'),
    },
    {
      id: 'developer_tools',
      title: 'Developer Utilities Suite (JSON, Regex, Diff, QR Code, Base64, JWT)',
      category: 'Tools',
      icon: Code2,
      action: () => setActiveModal('developer-tools'),
    },
    {
      id: 'ai_tools',
      title: 'AI Document Assistant (Summarize, Q&A, Translate, Resume Review)',
      category: 'Tools',
      icon: Sparkles,
      action: () => setActiveModal('ai-tools'),
    },
    {
      id: 'save',
      title: 'Save Current Document',
      category: 'Document',
      icon: Save,
      shortcut: 'Ctrl+S',
      action: () => {
        saveDirectly().then((saved) => {
          if (saved) {
            addToast({
              type: 'success',
              title: fileHandle ? 'Saved Directly to Disk' : 'File Saved',
              message: fileHandle
                ? `Saved directly to ${fileName}`
                : 'File saved and downloaded successfully.',
            });
          }
        });
      },
    },
    ...(documentId
      ? [
          {
            id: 'print',
            title: 'Print Document (PDF Pages Only)',
            category: 'Document' as const,
            icon: Printer,
            shortcut: 'Ctrl+P',
            action: () => window.print(),
          },
        ]
      : []),
    {
      id: 'view_organize',
      title: 'Switch to Visual Page Organizer Grid',
      category: 'Pages',
      icon: Grid,
      action: () => setViewMode('organize'),
    },
    {
      id: 'rotate_cw',
      title: 'Rotate Page 90° Clockwise',
      category: 'Pages',
      icon: RotateCw,
      shortcut: 'R',
      action: () => rotateSelectedPages(90),
    },
    {
      id: 'rotate_ccw',
      title: 'Rotate Page 90° Counter-Clockwise',
      category: 'Pages',
      icon: RotateCcw,
      shortcut: 'Shift+R',
      action: () => rotateSelectedPages(-90),
    },
    {
      id: 'delete_page',
      title: `Delete Page ${currentPage}`,
      category: 'Pages',
      icon: Trash2,
      shortcut: 'Del',
      action: () => deletePage(currentPage - 1),
    },
    {
      id: 'insert_blank',
      title: 'Insert Blank Page After Current',
      category: 'Pages',
      icon: Plus,
      action: () => insertBlankPageAt(currentPage),
    },
    {
      id: 'reverse_pages',
      title: 'Reverse Page Order of Entire Document',
      category: 'Pages',
      icon: ArrowUpDown,
      action: () => reverseAllPages(),
    },
    {
      id: 'tts_read',
      title: 'Read Aloud with Text-to-Speech (TTS)',
      category: 'View',
      icon: Volume2,
      shortcut: 'Ctrl+Shift+U',
      action: () => toggleTTS(),
    },
    {
      id: 'fullscreen',
      title: 'Toggle Fullscreen Presentation Mode',
      category: 'View',
      icon: Expand,
      shortcut: 'F11',
      action: () => toggleFullscreen(),
    },
    {
      id: 'search_doc',
      title: 'Search in Document',
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
      title: 'Close Document',
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
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      data-command-palette="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-100 gap-3 bg-white">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search action (e.g. compress, merge, ocr)..."
            aria-label="Search commands"
            className="flex-1 bg-transparent border-none text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
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
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                    <span>{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`text-[10px] font-mono px-1 py-0.5 rounded border ${
                          isSelected
                            ? 'border-blue-400 bg-blue-700 text-white'
                            : 'border-gray-200 bg-gray-100 text-gray-500'
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
