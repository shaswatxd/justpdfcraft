import React, { useEffect, useRef } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';
import { useUIStore } from '@/stores/uiStore';
import { AppHeader } from '@/components/app-shell/AppHeader';
import { MainToolbar } from '@/components/toolbars/MainToolbar';
import { ContextPropertiesBar } from '@/components/toolbars/ContextPropertiesBar';
import { HomeDashboard } from '@/components/home/HomeDashboard';
import { PDFViewer } from '@/components/viewer/PDFViewer';
import { PageOrganizer } from '@/components/organizer/PageOrganizer';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { CompressDialog } from '@/components/dialogs/CompressDialog';
import { OCRDialog } from '@/components/dialogs/OCRDialog';
import { PrintDialog } from '@/components/dialogs/PrintDialog';
import { ProtectDialog } from '@/components/dialogs/ProtectDialog';
import { CompareDialog } from '@/components/dialogs/CompareDialog';
import { MergeDialog } from '@/components/dialogs/MergeDialog';
import { SplitDialog } from '@/components/dialogs/SplitDialog';
import { SettingsDialog } from '@/components/dialogs/SettingsDialog';
import { SignDialog } from '@/components/dialogs/SignDialog';
import { ConvertDialog } from '@/components/dialogs/ConvertDialog';
import { WatermarkDialog } from '@/components/dialogs/WatermarkDialog';
import { ScanDialog } from '@/components/dialogs/ScanDialog';
import { BatesNumberingDialog } from '@/components/dialogs/BatesNumberingDialog';
import { SanitizeDialog } from '@/components/dialogs/SanitizeDialog';
import { BatchDialog } from '@/components/dialogs/BatchDialog';
import { CropDialog } from '@/components/dialogs/CropDialog';
import { TableExtractDialog } from '@/components/dialogs/TableExtractDialog';
import { ExtractImagesDialog } from '@/components/dialogs/ExtractImagesDialog';
import { PhotoEditorDialog } from '@/components/dialogs/PhotoEditorDialog';
import { StudentToolsDialog } from '@/components/dialogs/StudentToolsDialog';
import { StudentCalculatorsDialog } from '@/components/dialogs/StudentCalculatorsDialog';
import { HandwritingDialog } from '@/components/dialogs/HandwritingDialog';
import { ImageToolsDialog } from '@/components/dialogs/ImageToolsDialog';
import { AIToolsDialog } from '@/components/dialogs/AIToolsDialog';
import { LegalDialog } from '@/components/dialogs/LegalDialog';
import { PricingDialog } from '@/components/dialogs/PricingDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { DocumentTabBar } from '@/components/app-shell/DocumentTabBar';
import { ToastContainer } from '@/components/common/ToastContainer';
import { TTSPlayerHUD } from '@/components/viewer/TTSPlayerHUD';
import { useTTSStore } from '@/stores/ttsStore';
import { ChevronLeft, ChevronRight, Minimize2, Crosshair, Focus, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const {
    documentId,
    loadDocument,
    saveCurrentDocument,
    closeCurrentDocument,
    undo,
    redo,
    setZoom,
    viewMode,
    currentPage,
    pageCount,
    setCurrentPage,
    addUserBookmark,
  } = useDocumentStore();

  const {
    setActiveModal,
    setActivePhotoUrl,
    setSidebarTab,
    addToast,
    isFullscreen,
    toggleFullscreen,
    setFullscreen,
    isLaserPointerActive,
    toggleLaserPointer,
    isSpotlightActive,
    toggleSpotlight,
  } = useUIStore();

  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const { setTool } = useToolStore();
  const { toggleTTS } = useTTSStore();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        Boolean(target?.isContentEditable);

      const ctrl = e.ctrlKey || e.metaKey;

      // Never intercept single-key shortcuts while typing in input fields or text editors
      if (isInput && !ctrl) {
        return;
      }

      // Fullscreen navigation & escape
      if (isFullscreen && !isInput) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setFullscreen(false);
          return;
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          setCurrentPage(Math.min(pageCount, currentPage + 1));
          return;
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          setCurrentPage(Math.max(1, currentPage - 1));
          return;
        }
      }

      if (e.key === 'F11' || (ctrl && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        toggleFullscreen();
      } else if (ctrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        addUserBookmark(`Bookmark Page ${currentPage}`, currentPage - 1);
        addToast({
          type: 'success',
          title: 'Bookmark Added',
          message: `Page ${currentPage} bookmarked.`,
        });
      } else if (!ctrl && (e.key === '?' || e.key === 'F1') && !isInput) {
        e.preventDefault();
        setActiveModal('shortcuts');
      } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        setTool('snip_ocr');
      } else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        toggleTTS();
      } else if (ctrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        hiddenFileInputRef.current?.click();
      } else if (ctrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentDocument().then((bytes) => {
          const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'Saved_Document.pdf';
          a.click();
          URL.revokeObjectURL(url);
          addToast({ type: 'success', title: 'File Saved' });
        });
      } else if (ctrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActiveModal('print');
      } else if (ctrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSidebarTab('search');
      } else if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((ctrl && e.key.toLowerCase() === 'y') || (ctrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
      } else if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom((z) => z + 0.15);
      } else if (ctrl && e.key === '-') {
        e.preventDefault();
        setZoom((z) => z - 0.15);
      } else if (ctrl && e.key === '0') {
        e.preventDefault();
        setZoom(1.0);
      } else if (ctrl && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeCurrentDocument();
      } else if (!ctrl && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setTool('select');
        else if (key === 'h') setTool('hand');
        else if (key === 'p') setTool('draw');
        else if (key === 'e') setTool('eraser');
        else if (key === 't') setTool('text');
        else if (key === 'm') setTool('measure');
        else if (key === 'r') setTool('redact');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    saveCurrentDocument,
    closeCurrentDocument,
    undo,
    redo,
    setZoom,
    setActiveModal,
    setSidebarTab,
    setTool,
    toggleTTS,
    addToast,
    isFullscreen,
    toggleFullscreen,
    setFullscreen,
    currentPage,
    pageCount,
    setCurrentPage,
    addUserBookmark,
  ]);

  const [isWindowDragging, setIsWindowDragging] = React.useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounterRef.current += 1;
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const buffer = await file.arrayBuffer();
            await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);
            addToast({
              type: 'success',
              title: 'Document Opened',
              message: `${file.name} opened in JustPDFCraft.`,
            });
          } catch (err: any) {
            addToast({
              type: 'error',
              title: 'Failed to Open PDF',
              message: err?.message || 'Could not parse dropped PDF file.',
            });
          }
        } else if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
          const url = URL.createObjectURL(file);
          setActivePhotoUrl(url);
          setActiveModal('student-resizer');
          addToast({
            type: 'success',
            title: 'Image Loaded in Student Suite',
            message: `${file.name} opened. Ready to resize, compress KB, or format.`,
          });
        } else {
          addToast({
            type: 'error',
            title: 'Unsupported File',
            message: 'Please drop a valid .pdf document or image (JPG/PNG).',
          });
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadDocument, addToast, setActiveModal, setActivePhotoUrl]);

  const handleGlobalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden relative">
      {/* Global Window File Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none p-6 animate-fade-in select-none">
          <div className="w-full max-w-lg border-2 border-dashed border-swift-400 bg-swift-500/10 rounded-3xl p-10 flex flex-col items-center text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-swift-500/20 text-swift-400 flex items-center justify-center animate-bounce">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Drop PDF or Image to Open</h2>
              <p className="text-sm text-slate-300 mt-1">
                JustPDFCraft will open this file • 100% Offline & Private
              </p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={hiddenFileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleGlobalFile}
        className="hidden"
      />

      {/* Top Application Header (Hidden in Fullscreen) */}
      {!isFullscreen && <AppHeader />}

      {/* Multi-Tab Document Bar (Hidden in Fullscreen) */}
      {!isFullscreen && (
        <DocumentTabBar onOpenNewFile={() => hiddenFileInputRef.current?.click()} />
      )}

      {/* Primary Toolbar & Properties (when document is loaded, hidden in Fullscreen) */}
      {documentId && !isFullscreen && (
        <>
          <MainToolbar />
          <ContextPropertiesBar />
        </>
      )}

      {/* Center Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Fullscreen Floating Presentation HUD */}
        {isFullscreen && (
          <div className="fixed top-4 right-6 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-2xl animate-fade-in text-xs select-none">
            <span className="font-mono text-slate-300 font-medium">
              Page {currentPage} of {pageCount}
            </span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full text-slate-300"
              title="Previous page (Left Arrow / PageUp)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full text-slate-300"
              title="Next page (Right Arrow / PageDown / Space)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
            <button
              onClick={toggleLaserPointer}
              className={`p-1 rounded-full transition-colors flex items-center justify-center ${
                isLaserPointerActive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Glowing Laser Pointer (L)"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleSpotlight}
              className={`p-1 rounded-full transition-colors flex items-center justify-center ${
                isSpotlightActive
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Spotlight Reading Focus (S)"
            >
              <Focus className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-full font-medium transition-colors flex items-center gap-1"
              title="Exit Fullscreen (Esc or F11)"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Exit (Esc)</span>
            </button>
          </div>
        )}

        {!documentId ? (
          <HomeDashboard />
        ) : (
          <>
            {!isFullscreen && <Sidebar />}
            {viewMode === 'organize' ? <PageOrganizer /> : <PDFViewer />}
          </>
        )}
      </main>

      {/* Modals & Dialogs */}
      <CompressDialog />
      <OCRDialog />
      <PrintDialog />
      <ProtectDialog />
      <CompareDialog />
      <MergeDialog />
      <SplitDialog />
      <SignDialog />
      <ConvertDialog />
      <WatermarkDialog />
      <ScanDialog />
      <BatesNumberingDialog />
      <SanitizeDialog />
      <BatchDialog />
      <CropDialog />
      <TableExtractDialog />
      <ExtractImagesDialog />
      <PhotoEditorDialog />
      <StudentToolsDialog />
      <StudentCalculatorsDialog />
      <HandwritingDialog />
      <ImageToolsDialog />
      <AIToolsDialog />
      <LegalDialog />
      <PricingDialog />
      <SettingsDialog />
      <ShortcutsDialog />

      {/* Overlays */}
      <CommandPalette />
      <TTSPlayerHUD />
      <ToastContainer />
    </div>
  );
};
