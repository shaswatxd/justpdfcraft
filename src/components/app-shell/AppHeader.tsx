import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Settings,
  BookOpen,
  Volume2,
  Expand,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sun,
  AlignJustify,
  FileText,
  GraduationCap,
  Sliders,
  Menu,
  X,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { useTTSStore } from '@/stores/ttsStore';
import { SwiftLogo } from '@/components/common/SwiftLogo';

export const AppHeader: React.FC = () => {
  const {
    documentId,
    fileName,
    zoom,
    setZoom,
    viewMode,
    setViewMode,
    currentPage,
    pageCount,
    setCurrentPage,
    undoStack,
    redoStack,
    undo,
    redo,
    saveCurrentDocument,
  } = useDocumentStore();

  const [pageInput, setPageInput] = useState<string>(String(currentPage));
  const [toneOpen, setToneOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const toneDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Close tone dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toneDropdownRef.current && !toneDropdownRef.current.contains(e.target as Node)) {
        setToneOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCommitPage = () => {
    const val = parseInt(pageInput, 10);
    if (!isNaN(val)) {
      const clamped = Math.max(1, Math.min(val, pageCount || 1));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
    } else {
      setPageInput(String(currentPage));
    }
  };

  const {
    setActiveModal,
    addToast,
    paperTone,
    setPaperTone,
    toggleFullscreen,
  } = useUIStore();

  const { isTTSOpen, toggleTTS } = useTTSStore();

  const handleGoHome = async () => {
    const { tabs, closeTab } = useDocumentStore.getState();
    if (tabs.length > 0) {
      for (const t of [...tabs]) {
        await closeTab(t.id);
      }
    }
    useDocumentStore.setState({ documentId: null, activeTabId: null, tabs: [] });
  };

  const handleSave = async () => {
    try {
      const bytes = await saveCurrentDocument();
      // Trigger download or native save
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'JustPDFCraft_Document.pdf';
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Document Saved',
        message: 'Changes committed and file saved successfully.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save PDF.',
      });
    }
  };

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between text-slate-200 select-none z-30 gap-3 sticky top-0">
      {/* ======================================================== */}
      {/* Left: Home / Back, Brand Logo & Undo/Redo */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 shrink-0">
        {documentId && (
          <button
            onClick={handleGoHome}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-xs font-semibold border border-slate-700/80 transition-all group shrink-0 shadow-xs"
            title="Back to Home Dashboard (होम डैशबोर्ड पर वापस जाएं)"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-swift-400" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}

        <button
          onClick={handleGoHome}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity select-none focus:outline-none"
          title={documentId ? 'Back to Home Dashboard' : 'JustPDFCraft'}
        >
          <SwiftLogo className="w-6 h-6 shrink-0" />
          <span className="font-bold text-sm tracking-tight text-slate-100">
            Just<span className="text-swift-400">PDFCraft</span>
          </span>
        </button>

        {documentId && (
          <>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5 hidden sm:block" />
            {/* Undo / Redo */}
            <div className="flex items-center bg-slate-800/60 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => undo()}
                disabled={undoStack.length === 0}
                className="p-1 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-300 transition-colors"
                title={`Undo (Ctrl+Z) - ${undoStack.length} states`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => redo()}
                disabled={redoStack.length === 0}
                className="p-1 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-300 transition-colors"
                title={`Redo (Ctrl+Y) - ${redoStack.length} states`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* Center: Clean Segmented View Modes, Page Nav & Zoom */}
      {/* ======================================================== */}
      {documentId && (
        <div className="hidden md:flex items-center gap-2">
          {/* Segmented View Mode Picker */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'continuous'
                  ? 'bg-swift-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              title="Continuous Vertical Scrolling"
            >
              <AlignJustify className="w-3 h-3" />
              <span className="hidden xl:inline">Continuous</span>
            </button>
            <button
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'single'
                  ? 'bg-swift-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              title="Single Page View"
            >
              <FileText className="w-3 h-3" />
              <span className="hidden xl:inline">Single</span>
            </button>
            <button
              onClick={() => setViewMode('spread')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'spread'
                  ? 'bg-swift-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              title="Dual-Page Spread (Book Mode)"
            >
              <BookOpen className="w-3 h-3" />
              <span className="hidden xl:inline">Spread</span>
            </button>
            <button
              onClick={() => setViewMode('organize')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'organize'
                  ? 'bg-swift-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
              title="Visual Page Organizer Grid"
            >
              <Grid className="w-3 h-3" />
              <span className="hidden xl:inline">Organize</span>
            </button>
          </div>

          {/* Quick Page Jump Controls */}
          <div className="flex items-center bg-slate-800/80 px-1 py-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-300 transition-colors"
              title="Previous Page (Left Arrow / PageUp)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 font-mono px-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handleCommitPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitPage();
                  if (e.key === 'Escape') setPageInput(String(currentPage));
                }}
                className="w-7 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-slate-100 focus:outline-none focus:border-swift-500 font-mono"
                title="Type page number and press Enter"
              />
              <span className="text-slate-500 font-sans text-[11px]">/</span>
              <span className="text-slate-400 min-w-[12px] text-center text-xs">{pageCount}</span>
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
              className="p-1 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-300 transition-colors"
              title="Next Page (Right Arrow / PageDown)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              title="Zoom Out (Ctrl+-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-medium px-1.5 text-slate-300 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              title="Zoom In (Ctrl++)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Zoom to 100%"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* When in Home Dashboard: Top Navigation Category Links */}
      {!documentId && (
        <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold select-none">
          <button
            onClick={() => {
              const el = document.getElementById('tool-explorer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            All Tools
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('tool-explorer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            PDF Suite
          </button>
          <button
            onClick={() => setActiveModal('student-resizer')}
            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Exam Photo & Sign
          </button>
          <button
            onClick={() => setActiveModal('student-calculators')}
            className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
          >
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            Student Tools
          </button>
        </nav>
      )}

      {/* ======================================================== */}
      {/* Right: Actions, Reading Comfort, Save & Controls */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {documentId && (
          <>
            {/* Paper Tone Dropdown Button */}
            <div className="relative" ref={toneDropdownRef}>
              <button
                onClick={() => setToneOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  toneOpen
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                title="Ergonomic Reading Tone (White, Sepia, Dark, Mint)"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Tone</span>
                <span
                  className={`w-2 h-2 rounded-full border ${
                    paperTone === 'sepia'
                      ? 'bg-amber-500 border-amber-300'
                      : paperTone === 'dark'
                      ? 'bg-slate-900 border-slate-600'
                      : paperTone === 'mint'
                      ? 'bg-emerald-500 border-emerald-300'
                      : 'bg-white border-slate-300'
                  }`}
                />
              </button>

              {toneOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 w-44 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                  <span className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Reading Tone
                  </span>
                  {[
                    { id: 'default' as const, label: 'Default White', color: 'bg-white border-slate-300', desc: 'Standard clean' },
                    { id: 'sepia' as const, label: 'Warm Sepia', color: 'bg-[#f4ecd8] border-amber-400', desc: 'Relaxes eyes' },
                    { id: 'dark' as const, label: 'Night Dark', color: 'bg-slate-950 border-slate-700', desc: 'Inverted mode' },
                    { id: 'mint' as const, label: 'Eye-Care Mint', color: 'bg-[#e8f5e9] border-emerald-400', desc: 'Soft calming' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setPaperTone(t.id);
                        setToneOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all text-left ${
                        paperTone === t.id
                          ? 'bg-swift-600/20 text-swift-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${t.color}`} />
                      <div>
                        <div className="font-medium leading-none">{t.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{t.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Read Aloud (TTS) */}
            <button
              onClick={toggleTTS}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 border rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                isTTSOpen
                  ? 'bg-swift-600 text-white border-swift-500 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Read Aloud / Text-to-Speech (Ctrl+Shift+U)"
            >
              <Volume2 className="w-3.5 h-3.5 text-swift-400" />
              <span className="hidden xl:inline font-medium">Read</span>
            </button>

            {/* Save Button (Primary) */}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-swift-600 hover:bg-swift-500 text-white rounded-lg text-xs font-bold shadow-md shadow-swift-900/30 transition-all"
              title="Save changes to file (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
              title="Fullscreen Presentation Mode (F11 / Ctrl+L)"
            >
              <Expand className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Offline local-mode pill */}
        {isOffline && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-medium animate-fade-in"
            title="All tools run 100% locally in your browser. No internet needed!"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Offline Mode</span>
            <span className="sm:hidden">Offline</span>
          </div>
        )}


        {/* Settings */}
        <button
          onClick={() => setActiveModal('settings')}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Mobile Navigation Menu Toggle */}
        {!documentId && (
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {!documentId && mobileMenuOpen && (
        <div className="lg:hidden absolute top-12 left-0 right-0 bg-slate-900/95 border-b border-slate-800 p-4 shadow-2xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              const el = document.getElementById('tool-explorer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            All Tools & Suite Explorer
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveModal('student-resizer');
            }}
            className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-amber-300 hover:bg-slate-800 flex items-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5" />
            Exam Photo & Signature Suite (20–50 KB)
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveModal('student-calculators');
            }}
            className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-amber-300 hover:bg-slate-800 flex items-center gap-2"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student Calculators (CGPA, Attendance, Age)
          </button>
        </div>
      )}
    </header>
  );
};
