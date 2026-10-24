import React, { useState, useRef, useEffect } from 'react';
import {
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  BookOpen,
  Volume2,
  Expand,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sun,
  AlignJustify,
  FileText,
    Sliders,
  Menu,
  X,
  ChevronDown,
  HardDrive,
  MoreVertical,
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
    saveDirectly,
    saveAsNativePicker,
    isDirty,
    fileHandle,
    isAutoSavingDraft,
  } = useDocumentStore();

  const [pageInput, setPageInput] = useState<string>(String(currentPage));
  const [toneOpen, setToneOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mobileDocMenuOpen, setMobileDocMenuOpen] = useState<boolean>(false);
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
    activeView,
    setActiveView,
    toggleSidebar,
  } = useUIStore();

  const isDocumentOpen = Boolean(documentId) && activeView === 'editor';

  const { isTTSOpen, toggleTTS } = useTTSStore();

  const handleGoHome = () => {
    setActiveView('home');
  };

  const handleSave = async () => {
    try {
      const ok = await saveDirectly();
      if (ok) {
        addToast({
          type: 'success',
          title: fileHandle ? 'Saved Directly to Disk' : 'Document Saved',
          message: fileHandle
            ? `Changes written directly to ${fileName}`
            : 'Changes committed and file downloaded successfully.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save PDF.',
      });
    }
  };

  const handleSaveAs = async () => {
    try {
      const ok = await saveAsNativePicker();
      if (ok) {
        addToast({
          type: 'success',
          title: 'Document Saved As',
          message: 'Saved to chosen file.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err?.message || 'Could not save PDF.',
      });
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between text-gray-800 select-none z-30 gap-3 sticky top-0 shadow-2xs">
      {/* ======================================================== */}
      {/* Left: Home / Back, Brand Logo & Undo/Redo */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 shrink-0">
        {/* On Mobile when doc is open: Clean Back Arrow + Truncated Doc Name with Page count */}
        {isDocumentOpen ? (
          <div className="flex md:hidden items-center gap-2 max-w-[190px] xs:max-w-[240px]">
            <button
              onClick={handleGoHome}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white shrink-0"
              title="Back to Home Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-swift-400" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate leading-tight">
                {fileName || 'Document'}
              </span>
              <button
                onClick={toggleSidebar}
                className="text-[10px] text-slate-400 hover:text-swift-400 font-mono text-left transition-colors flex items-center gap-1 py-1.5 -my-1.5"
                title="Tap to toggle page thumbnails"
              >
                <span>Page {currentPage}/{pageCount}</span>
                <span className="text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400">Pages</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Desktop or Home Brand Logo (BillGenHai Theme) */}
        <button
          onClick={handleGoHome}
          className={`${isDocumentOpen ? 'hidden lg:flex' : 'flex'} items-center gap-2.5 hover:opacity-95 transition-opacity select-none focus:outline-none`}
          title={isDocumentOpen ? 'Back to Home Dashboard' : 'JustPDFCraft'}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
            <SwiftLogo className="w-5 h-5 shrink-0 text-white fill-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-gray-900 tracking-tight">
              Just<span className="text-red-600">PDFCraft</span>
            </span>
            <span className="hidden sm:inline-block bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              100% Free
            </span>
          </div>
        </button>

        {isDocumentOpen && (
          <button
            onClick={handleGoHome}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold border border-gray-200 transition-all group shrink-0 shadow-2xs"
            title="Back to Home Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-red-600" />
            <span>Home</span>
          </button>
        )}

        {documentId && activeView === 'home' && (
          <button
            onClick={() => setActiveView('editor')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Return to your active document in the editor"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Resume Editor</span>
          </button>
        )}

        {isDocumentOpen && (
          <>
            <div className="w-[1px] h-4 bg-gray-200 mx-0.5 hidden md:block" />
            {/* Desktop Undo / Redo */}
            <div className="hidden md:flex items-center bg-gray-100/90 p-0.5 rounded-lg border border-gray-200">
              <button
                onClick={() => undo()}
                disabled={undoStack.length === 0}
                className="p-1 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-600 hover:text-gray-900 transition-colors"
                title={`Undo (Ctrl+Z) - ${undoStack.length} states`}
                aria-label="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => redo()}
                disabled={redoStack.length === 0}
                className="p-1 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-600 hover:text-gray-900 transition-colors"
                title={`Redo (Ctrl+Y) - ${redoStack.length} states`}
                aria-label="Redo"
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
      {isDocumentOpen && (
        <div className="hidden md:flex items-center gap-2">
          {/* Segmented View Mode Picker */}
          <div className="flex items-center bg-gray-100/90 p-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'continuous'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
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
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
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
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
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
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/80'
              }`}
              title="Visual Page Organizer Grid"
            >
              <Grid className="w-3 h-3" />
              <span className="hidden xl:inline">Organize</span>
            </button>
          </div>

          {/* Quick Page Jump Controls */}
          <div className="flex items-center bg-gray-100/90 px-1 py-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-600 hover:text-gray-900 transition-colors"
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
                className="w-7 bg-white border border-gray-300 rounded px-1 py-0.5 text-center text-xs text-gray-900 focus:outline-none focus:border-red-500 font-mono shadow-2xs"
                title="Type page number and press Enter"
              />
              <span className="text-gray-400 font-sans text-[11px]">/</span>
              <span className="text-gray-600 min-w-[12px] text-center text-xs">{pageCount}</span>
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
              className="p-1 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-600 hover:text-gray-900 transition-colors"
              title="Next Page (Right Arrow / PageDown)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-gray-100/90 p-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              title="Zoom Out (Ctrl+-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-medium px-1.5 text-gray-700 min-w-[42px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.15))}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 transition-colors"
              title="Zoom In (Ctrl++)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors"
              title="Reset Zoom to 100%"
              aria-label="Reset zoom"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* When in Home Dashboard: Top Navigation Links (BillGenHai Theme) */}
      {!isDocumentOpen && (
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold select-none">
          <button
            onClick={() => setActiveModal('merge')}
            className="px-3.5 py-2 rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50/70 transition-colors uppercase tracking-wide cursor-pointer"
          >
            Merge PDF
          </button>
          <button
            onClick={() => setActiveModal('split')}
            className="px-3.5 py-2 rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50/70 transition-colors uppercase tracking-wide cursor-pointer"
          >
            Split PDF
          </button>
          <button
            onClick={() => setActiveModal('compress')}
            className="px-3.5 py-2 rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50/70 transition-colors uppercase tracking-wide cursor-pointer"
          >
            Compress PDF
          </button>
          <button
            onClick={() => setActiveModal('convert')}
            className="px-3.5 py-2 rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50/70 transition-colors uppercase tracking-wide cursor-pointer"
          >
            Convert PDF
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('tool-explorer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3.5 py-2 rounded-xl text-gray-700 hover:text-red-600 hover:bg-red-50/70 transition-colors uppercase tracking-wide cursor-pointer"
          >
            All PDF Tools
          </button>
        </nav>
      )}

      {/* ======================================================== */}
      {/* Right: Actions, Reading Comfort, Save & Controls */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isDocumentOpen && (
          <>
            {/* Mobile Document Actions (Undo, Redo, 1-Tap Save, Menu) */}
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={() => undo()}
                disabled={undoStack.length === 0}
                className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-25"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => redo()}
                disabled={redoStack.length === 0}
                className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-25"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              {/* Mobile Direct Save Button */}
              <button
                onClick={handleSave}
                className="flex items-center gap-1 py-2 px-3 bg-swift-600 hover:bg-swift-500 text-white rounded-xl text-xs font-bold transition-all relative shadow-sm"
                title="Save Document"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ring-1 ring-black" title="Unsaved changes" />
                )}
              </button>

              {/* Mobile Options Drawer Toggle */}
              <button
                onClick={() => setMobileDocMenuOpen((o) => !o)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Document Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Only Actions on Right */}
            <div className="hidden md:flex items-center gap-1.5">
              {/* Paper Tone Dropdown Button */}
              <div className="relative hidden xl:block" ref={toneDropdownRef}>
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
                className={`hidden xl:flex items-center gap-1.5 ${
                  isTTSOpen
                    ? 'bg-swift-600 text-white border-swift-500 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                title="Read Aloud / Text-to-Speech (Ctrl+Shift+U)"
              >
                <Volume2 className="w-3.5 h-3.5 text-swift-400" />
                <span className="hidden xl:inline font-medium">Read</span>
              </button>

              {/* Direct Disk / OPFS Draft status indicators */}
              {isAutoSavingDraft && (
                <span className="hidden xl:flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-swift-400 animate-ping" />
                  Auto-saving draft...
                </span>
              )}

              {fileHandle && !isAutoSavingDraft && (
                <span
                  className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium"
                  title={`Native File System Access: In-place direct saving enabled to ${fileName}`}
                >
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  <span>Direct Save</span>
                </span>
              )}

              {/* Split Save Button (Save / Save As) */}
              <div className="flex items-center rounded-lg shadow-md shadow-swift-900/30">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-l-lg text-xs font-bold transition-all relative shadow-xs"
                  title={fileHandle ? `Direct in-place save to ${fileName} (Ctrl+S)` : "Save changes to file (Ctrl+S)"}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                  {isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
                  )}
                </button>
                <button
                  onClick={handleSaveAs}
                  className="px-1.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-r-lg border-l border-red-500/40 text-xs transition-all flex items-center justify-center"
                  title="Save As... (Ctrl+Shift+S)"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors hidden xl:block"
                title="Fullscreen Presentation Mode (F11 / Ctrl+L)"
              >
                <Expand className="w-4 h-4" />
              </button>
            </div>
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


        

        {/* Mobile Navigation Menu Toggle */}
        {!documentId && (
          <button
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="lg:hidden p-2.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors -mr-1.5"
            title="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {!documentId && mobileMenuOpen && (
        <div className="lg:hidden absolute top-14 left-0 right-0 bg-white border-b border-gray-200 p-4 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150 text-gray-800">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              const el = document.getElementById('tool-explorer');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            All Tools & Suite Explorer
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setActiveModal('student-resizer');
            }}
            className="w-full py-2 px-3 text-left rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5" />
            Exam Photo & Signature Suite (20–50 KB)
          </button>
          
        </div>
      )}
      {/* Mobile Document Action Drawer Sheet */}
      {isDocumentOpen && mobileDocMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="w-full bg-white border-t border-gray-200 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-200 text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 truncate max-w-[240px]">{fileName || 'Document Options'}</h3>
                <p className="text-[11px] text-gray-500">{pageCount} Pages • {paperTone} Mode</p>
              </div>
              <button
                onClick={() => setMobileDocMenuOpen(false)}
                className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reading Tone Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Reading Tone</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'default' as const, label: 'White', color: 'bg-white border-slate-300' },
                  { id: 'sepia' as const, label: 'Sepia', color: 'bg-[#f4ecd8] border-amber-400' },
                  { id: 'dark' as const, label: 'Night', color: 'bg-slate-950 border-slate-700' },
                  { id: 'mint' as const, label: 'Mint', color: 'bg-[#e8f5e9] border-emerald-400' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPaperTone(t.id);
                    }}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
                      paperTone === t.id
                        ? 'bg-red-50 border-red-500 text-red-700 font-semibold'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border shrink-0 ${t.color}`} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setMobileDocMenuOpen(false);
                  toggleTTS();
                }}
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left flex items-center gap-2.5 text-xs text-gray-800 shadow-2xs"
              >
                <Volume2 className="w-4 h-4 text-swift-400" />
                <span>{isTTSOpen ? 'Stop TTS' : 'Read Aloud'}</span>
              </button>

              <button
                onClick={() => {
                  setMobileDocMenuOpen(false);
                  handleSaveAs();
                }}
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left flex items-center gap-2.5 text-xs text-gray-800 shadow-2xs"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>Save Copy As...</span>
              </button>

              <button
                onClick={() => {
                  setMobileDocMenuOpen(false);
                  toggleFullscreen();
                }}
                className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-left flex items-center gap-2.5 text-xs text-gray-800 shadow-2xs"
              >
                <Expand className="w-4 h-4 text-amber-400" />
                <span>Fullscreen</span>
              </button>

              
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
