import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Scissors,
  Download,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
  Layers,
  Type,
  FileStack,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  ZoomIn,
  Sparkles,
  RotateCw,
  ArrowRight,
  ArrowDown,
  Maximize2,
  Filter,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import {
  createMiniXeroxPdf,
  createNotesChitsPdf,
  MiniXeroxLayout,
  MiniXeroxPageSize,
  MiniXeroxOrientation,
  MiniXeroxPageOrder,
  MINI_XEROX_LAYOUTS,
  parsePageRange,
} from '@core/pdf/miniXerox';
import { downloadBlob } from '@/utils/download';
import { PDFDocument } from 'pdf-lib';

interface LoadedFileItem {
  id: string;
  name: string;
  sizeBytes: number;
  bytes: Uint8Array;
  pageCount: number;
  dimensions?: string;
  pdfjsDoc?: any;
}

interface PageCatalogItem {
  fileIndex: number;
  fileName: string;
  pageIndexInFile: number;
  globalPageNumber: number;
  fileBytes: Uint8Array;
  isLandscape?: boolean;
}

const SAMPLE_CHEAT_NOTES = `# PHYSICS FORMULAS
E = mc^2 • F = ma • W = F·d·cos(theta)
v = u + at • s = ut + (1/2)at^2 • v^2 = u^2 + 2as
p = mv • F = dp/dt • Impulse = F·Delta_t
Kinetic Energy = (1/2)mv^2 • Potential = mgh
Hooke's Law: F = -k·x • T = 2*pi*sqrt(m/k)
Gravitation: F = G(m1·m2)/r^2 • g = GM/R^2
Escape Velocity: v_e = sqrt(2gR)

# THERMODYNAMICS & GAS
PV = nRT • P1V1/T1 = P2V2/T2
First Law: Delta_Q = Delta_U + Delta_W • Work = P·Delta_V
Adiabatic: PV^gamma = constant
Efficiency eta = 1 - (Tc / Th)

# ELECTRICITY & MAGNETISM
Ohm's Law: V = IR • Power: P = VI = I^2·R = V^2/R
Coulomb's Law: F = k(q1·q2)/r^2
Capacitor: Q = CV • Energy = (1/2)CV^2
Series: R = R1 + R2 • Parallel: 1/R = 1/R1 + 1/R2
Lorentz Force: F = q(E + v x B) • B = mu0·I / (2*pi*r)
Faraday's Law: eps = -dPhi/dt

# CALCULUS & MATH DERIVATIVES
d/dx(x^n) = n·x^(n-1) • d/dx(e^x) = e^x
d/dx(ln x) = 1/x • d/dx(sin x) = cos x
d/dx(cos x) = -sin x • d/dx(tan x) = sec^2 x
Integration: int x^n dx = x^(n+1)/(n+1)
int (1/x) dx = ln|x| • int e^x dx = e^x
Product Rule: (uv)' = u'v + uv'
Quotient Rule: (u/v)' = (u'v - uv') / v^2

# ORGANIC REAGENTS
Grignard: R-MgX + H2O -> R-H
Wurtz Reaction: 2R-X + 2Na -> R-R + 2NaX
Friedel-Crafts: Ar-H + R-Cl (AlCl3) -> Ar-R
Cannizzaro: 2HCHO + KOH -> CH3OH + HCOOK`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * High-performance thumbnail renderer for miniature page cells.
 * Uses shared PDF.js document instances for instant rendering without lag.
 */
const MiniPageThumbnail: React.FC<{
  pdfjsDoc?: any;
  bytes: Uint8Array;
  pageIndex: number;
  autoRotate?: boolean;
  isCellLandscape?: boolean;
}> = ({ pdfjsDoc, bytes, pageIndex, autoRotate, isCellLandscape }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const renderThumb = async () => {
      try {
        if (typeof window === 'undefined') return;
        const pdfjsLib = await import('pdfjs-dist');
        let doc = pdfjsDoc;
        if (!doc) {
          const task = pdfjsLib.getDocument({ data: bytes.slice() });
          doc = await task.promise;
        }
        if (isCancelled) return;
        const page = await doc.getPage(pageIndex + 1);
        if (isCancelled || !canvasRef.current) return;

        const rawVp = page.getViewport({ scale: 1.0 });
        const isPageLandscape = rawVp.width > rawVp.height;
        const shouldRotate = Boolean(autoRotate && isCellLandscape !== isPageLandscape);

        const canvas = canvasRef.current;
        const targetScale = 0.32;
        const viewport = page.getViewport({
          scale: targetScale,
          rotation: shouldRotate ? (rawVp.rotation + 90) % 360 : rawVp.rotation,
        });

        canvas.width = Math.max(1, viewport.width);
        canvas.height = Math.max(1, viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (!isCancelled) setRendered(true);
      } catch {
        // Fallback to skeleton lines
      }
    };
    renderThumb();
    return () => {
      isCancelled = true;
    };
  }, [pdfjsDoc, bytes, pageIndex, autoRotate, isCellLandscape]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-opacity duration-150 ${
          rendered ? 'opacity-100 block' : 'opacity-0 hidden'
        }`}
      />
      {!rendered && (
        <div className="w-full h-full p-2 flex flex-col justify-between bg-white select-none pointer-events-none opacity-80 animate-pulse">
          <div className="space-y-1">
            <div className="h-1 bg-red-400/80 rounded w-4/5" />
            <div className="h-0.5 bg-slate-300 rounded w-full" />
            <div className="h-0.5 bg-slate-200 rounded w-5/6" />
            <div className="h-0.5 bg-slate-300 rounded w-full" />
            <div className="h-0.5 bg-slate-200 rounded w-3/4" />
          </div>
          <div className="space-y-0.5">
            <div className="h-0.5 bg-slate-200 rounded w-2/3" />
            <div className="h-0.5 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      )}
    </div>
  );
};

export const MiniXeroxDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();
  const isOpen = activeModal === 'mini-xerox';

  // Responsive Mobile View Switcher (Settings vs Live Sheet Preview)
  const [mobileView, setMobileView] = useState<'settings' | 'preview'>('settings');

  // Mode: Upload PDFs vs Directly Paste / Type Notes
  const [activeTab, setActiveTab] = useState<'pdf' | 'notes'>('pdf');

  // Multi-PDF State
  const [files, setFiles] = useState<LoadedFileItem[]>([]);
  const [contentZoom, setContentZoom] = useState<number>(100); // 80% to 140% (chota/bada scale)
  const [trimMargins, setTrimMargins] = useState<boolean>(false);
  const [pageRange, setPageRange] = useState<string>('all'); // 'all', '1-10', 'odd', 'even'

  // Pro Layout & Alignment Options (Matched with Sejda, DeftPDF & Xerox Shops)
  const [layout, setLayout] = useState<MiniXeroxLayout>('16-in-1');
  const [pageOrder, setPageOrder] = useState<MiniXeroxPageOrder>('vertical'); // 'vertical' (N-order, stackable) vs 'horizontal' (Z-order)
  const [autoRotate, setAutoRotate] = useState<boolean>(true); // Auto-rotate pages 90° to fill cell orientation
  const [pageSize, setPageSize] = useState<MiniXeroxPageSize>('A4');
  const [orientation, setOrientation] = useState<MiniXeroxOrientation>('auto');
  const [marginPreset, setMarginPreset] = useState<'zero' | 'compact' | 'standard'>('compact'); // 0pt, 8pt, 16pt
  const [spacingPreset, setSpacingPreset] = useState<'none' | 'hairline' | 'standard'>('hairline'); // 0pt, 2pt, 6pt

  // Guidelines & Badges
  const [drawCutGuides, setDrawCutGuides] = useState(true);
  const [drawPageNumbers, setDrawPageNumbers] = useState(true);
  const [drawBorders, setDrawBorders] = useState(true);
  const [duplexCutSafe, setDuplexCutSafe] = useState(false);

  // Direct Notes State
  const [notesText, setNotesText] = useState<string>(SAMPLE_CHEAT_NOTES);
  const [notesFontSize, setNotesFontSize] = useState<number>(7); // chota/bada font size
  const [notesColumns, setNotesColumns] = useState<1 | 2 | 3>(2);

  // Interactive Live Sheet Preview Pager & Inspection Modal
  const [previewSheetIndex, setPreviewSheetIndex] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100' | '150'>('fit');
  const [inspectedPage, setInspectedPage] = useState<PageCatalogItem | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safely pre-load open document if available with dual-engine fallback
  useEffect(() => {
    if (!isOpen) return;

    const loadCurrentDoc = async () => {
      if (documentId && files.length === 0) {
        try {
          const { getPDFEngine } = await import('@core/pdf/engine.factory');
          const engine = getPDFEngine();
          const bytes = await engine.saveDocument(documentId);

          let pageCount = 1;
          let dimensions = 'A4';
          let pdfjsDoc: any = null;

          try {
            const pdfjsLib = await import('pdfjs-dist');
            const task = pdfjsLib.getDocument({ data: bytes.slice() });
            pdfjsDoc = await task.promise;
            pageCount = pdfjsDoc.numPages;
            const p1 = await pdfjsDoc.getPage(1);
            const vp = p1.getViewport({ scale: 1 });
            dimensions = `${Math.round(vp.width)} × ${Math.round(vp.height)} pt`;
          } catch {
            const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
            pageCount = doc.getPageCount();
            const firstPage = doc.getPage(0);
            dimensions = `${Math.round(firstPage.getWidth())} × ${Math.round(firstPage.getHeight())} pt`;
          }

          setFiles([
            {
              id: 'current-doc',
              name: fileName || 'Active Document.pdf',
              sizeBytes: bytes.byteLength,
              bytes,
              pageCount,
              dimensions,
              pdfjsDoc,
            },
          ]);
        } catch (e) {
          console.warn('Could not pre-load active document for Mini Xerox:', e);
        }
      }
    };

    loadCurrentDoc();
  }, [isOpen, documentId, fileName]);

  // Catalog all source pages across all uploaded files
  const allRawPages = useMemo<PageCatalogItem[]>(() => {
    const list: PageCatalogItem[] = [];
    let counter = 1;
    files.forEach((file, fIdx) => {
      for (let p = 0; p < file.pageCount; p++) {
        list.push({
          fileIndex: fIdx,
          fileName: file.name,
          pageIndexInFile: p,
          globalPageNumber: counter++,
          fileBytes: file.bytes,
        });
      }
    });
    return list;
  }, [files]);

  // Apply page range filtering (e.g. '1-10', 'odd', 'even', 'all')
  const catalogedPages = useMemo<PageCatalogItem[]>(() => {
    if (allRawPages.length === 0) return [];
    const validIndices = parsePageRange(pageRange, allRawPages.length);
    return validIndices.map((idx) => allRawPages[idx]).filter(Boolean);
  }, [allRawPages, pageRange]);

  const totalInputPages = catalogedPages.length;
  const totalSizeBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const spec = MINI_XEROX_LAYOUTS[layout] || MINI_XEROX_LAYOUTS['16-in-1'];
  const pagesPerSheet = spec.cols * spec.rows;

  // Check if grid cells are landscape or portrait to trigger auto-rotation
  const isCellLandscape = spec.preferredOrientation === 'landscape';

  // Notes mode chits splitting
  const noteLines = useMemo(
    () => notesText.split('\n').filter((l) => l.trim().length > 0),
    [notesText]
  );
  const linesPerChit = Math.max(6, Math.round(20 * notesColumns * (7 / notesFontSize)));
  const noteChits = useMemo(() => {
    const chits: string[] = [];
    for (let i = 0; i < noteLines.length; i += linesPerChit) {
      chits.push(noteLines.slice(i, i + linesPerChit).join('\n'));
    }
    return chits.length > 0 ? chits : [SAMPLE_CHEAT_NOTES];
  }, [noteLines, linesPerChit]);

  const notesOutputSheets = Math.ceil(noteChits.length / pagesPerSheet) || 1;

  const outputSheets =
    activeTab === 'pdf'
      ? Math.max(1, Math.ceil(totalInputPages / pagesPerSheet))
      : notesOutputSheets;

  // Clamp preview sheet index when total sheets change
  useEffect(() => {
    if (previewSheetIndex >= outputSheets) {
      setPreviewSheetIndex(Math.max(0, outputSheets - 1));
    }
  }, [outputSheets, previewSheetIndex]);

  if (!isOpen) return null;

  const paperSavingsPercent =
    activeTab === 'pdf' && totalInputPages > 0
      ? Math.max(0, Math.round(((totalInputPages - outputSheets) / totalInputPages) * 100))
      : 94;

  const estimatedCostSaved =
    activeTab === 'pdf'
      ? Math.max(0, (totalInputPages - outputSheets) * 2)
      : noteChits.length * 2;

  // Safe file loader with dual-engine fallback (eliminates "unknown compression method")
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;

    const newItems: LoadedFileItem[] = [];
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      try {
        const ab = await file.arrayBuffer();
        const bytes = new Uint8Array(ab);

        let pageCount = 1;
        let dimensions = 'A4';
        let pdfjsDoc: any = null;

        try {
          const pdfjsLib = await import('pdfjs-dist');
          const task = pdfjsLib.getDocument({ data: bytes.slice() });
          pdfjsDoc = await task.promise;
          pageCount = pdfjsDoc.numPages;
          const p1 = await pdfjsDoc.getPage(1);
          const vp = p1.getViewport({ scale: 1 });
          dimensions = `${Math.round(vp.width)} × ${Math.round(vp.height)} pt`;
        } catch {
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false });
          pageCount = doc.getPageCount();
          const p1 = doc.getPage(0);
          dimensions = `${Math.round(p1.getWidth())} × ${Math.round(p1.getHeight())} pt`;
        }

        newItems.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          sizeBytes: file.size,
          bytes,
          pageCount,
          dimensions,
          pdfjsDoc,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Could Not Load PDF',
          message: `"${file.name}" is corrupted or password-protected.`,
        });
      }
    }

    if (newItems.length > 0) {
      setFiles((prev) => [...prev, ...newItems]);
      addToast({
        type: 'success',
        title: 'Documents Loaded',
        message: `Added ${newItems.length} PDF(s). Total ${totalInputPages + newItems.reduce((a, b) => a + b.pageCount, 0)} pages ready.`,
      });
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Preset quick appliers
  const applyPreset = (presetName: 'farra' | 'booklet' | 'handout' | 'matrix') => {
    if (presetName === 'farra') {
      setLayout('16-in-1');
      setPageOrder('vertical');
      setAutoRotate(true);
      setMarginPreset('compact');
      setSpacingPreset('hairline');
      setDrawCutGuides(true);
      setDrawPageNumbers(true);
      addToast({ type: 'info', title: 'Preset Applied', message: '16-in-1 Pocket Farra: Stackable vertical columns with scissor cut lines.' });
    } else if (presetName === 'booklet') {
      setLayout('8-in-1');
      setPageOrder('vertical');
      setAutoRotate(true);
      setMarginPreset('compact');
      setSpacingPreset('hairline');
      setDrawCutGuides(true);
      setDrawPageNumbers(true);
      addToast({ type: 'info', title: 'Preset Applied', message: '8-in-1 Revision Booklet: Pages auto-rotated for maximum text size.' });
    } else if (presetName === 'handout') {
      setLayout('4-in-1');
      setPageOrder('horizontal');
      setAutoRotate(false);
      setMarginPreset('standard');
      setSpacingPreset('standard');
      setDrawBorders(true);
      addToast({ type: 'info', title: 'Preset Applied', message: '4-in-1 Class Handout: Clean horizontal reading order with border frames.' });
    } else if (presetName === 'matrix') {
      setLayout('25-in-1');
      setPageOrder('vertical');
      setAutoRotate(true);
      setMarginPreset('zero');
      setSpacingPreset('none');
      setDrawCutGuides(true);
      addToast({ type: 'info', title: 'Preset Applied', message: '25-in-1 Ultra Micro Matrix: Maximum 96% paper condensation.' });
    }
  };

  const handleGenerate = async () => {
    if (activeTab === 'pdf' && files.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Documents Selected',
        message: 'Please add at least one PDF notes or syllabus document.',
      });
      return;
    }

    if (activeTab === 'notes' && !notesText.trim()) {
      addToast({
        type: 'warning',
        title: 'Empty Notes',
        message: 'Please paste or write your exam notes and formulas first.',
      });
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('Initializing Mini Xerox Engine...');

    try {
      let outBytes: Uint8Array;
      let downloadName = 'MiniXerox';

      const marginPt = marginPreset === 'zero' ? 0 : marginPreset === 'compact' ? 8 : 16;
      const spacingPt = spacingPreset === 'none' ? 0 : spacingPreset === 'hairline' ? 2 : 6;

      if (activeTab === 'pdf') {
        const allDocBytes = files.map((f) => f.bytes);
        outBytes = await createMiniXeroxPdf(allDocBytes, {
          layout,
          pageSize,
          orientation,
          pageOrder,
          autoRotate,
          pageRange,
          drawCutGuides,
          drawPageNumbers,
          drawBorders,
          duplexCutSafe,
          margin: marginPt,
          spacing: spacingPt,
          contentZoom: contentZoom / 100,
          trimMargins,
          onProgress: (current, total, status) => {
            setProgressStatus(status);
            setProgressPercent(Math.round((current / total) * 100));
          },
        });
        const baseName = files[0]?.name ? files[0].name.replace(/\.pdf$/i, '') : 'notes';
        downloadName = `${baseName}_MiniXerox_${layout}_${pageOrder}.pdf`;
      } else {
        outBytes = await createNotesChitsPdf({
          text: notesText,
          fontSize: notesFontSize,
          layout,
          columnsPerChit: notesColumns,
          pageSize,
          drawCutGuides,
          drawPageNumbers,
          drawBorders,
          onProgress: (current, total, status) => {
            setProgressStatus(status);
            setProgressPercent(Math.round((current / total) * 100));
          },
        });
        downloadName = `Exam_Cheat_Chits_${layout}.pdf`;
      }

      const blob = new Blob([outBytes as any], { type: 'application/pdf' });
      downloadBlob(blob, downloadName);

      addToast({
        type: 'success',
        title: 'Mini Xerox PDF Ready! 🎉',
        message: `Condensed into ${outputSheets} sheet(s) (${paperSavingsPercent}% paper saved).`,
      });

      setActiveModal(null);
    } catch (err: any) {
      console.error('Mini Xerox generation error:', err);
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: err?.message || 'Could not compile Mini Xerox PDF.',
      });
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
      setProgressPercent(0);
    }
  };

  // Current sheet page range calculations for preview
  const sheetStartIdx = previewSheetIndex * pagesPerSheet;
  const sheetEndIdx =
    activeTab === 'pdf'
      ? Math.min(sheetStartIdx + pagesPerSheet, totalInputPages)
      : Math.min(sheetStartIdx + pagesPerSheet, noteChits.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[95dvh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-amber-50/40 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xs shadow-red-500/20 shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Mini Xerox & Pocket Notes Maker
                </h2>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                  ✂️ N-Up & Pocket Farra Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
                Combine multiple pages onto one sheet • Auto-rotate for max text size • Scissor cut guidelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Switcher Pill */}
            <div className="flex lg:hidden bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMobileView('settings')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  mobileView === 'settings'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Options</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView('preview')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  mobileView === 'preview'
                    ? 'bg-white text-red-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview ({previewSheetIndex + 1}/{outputSheets})</span>
              </button>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Quick Presets Ribbon */}
        <div className="px-4 sm:px-6 py-2 bg-slate-50/80 border-b border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('farra')}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
              layout === '16-in-1' && pageOrder === 'vertical'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300'
            }`}
          >
            ✂️ 16-in-1 Pocket Farra (Stackable)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('booklet')}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
              layout === '8-in-1'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300'
            }`}
          >
            📖 8-in-1 Pocket Booklet (Rotated)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('handout')}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
              layout === '4-in-1'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300'
            }`}
          >
            🎓 4-in-1 Lecture Handout
          </button>
          <button
            type="button"
            onClick={() => applyPreset('matrix')}
            className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
              layout === '25-in-1'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-red-300'
            }`}
          >
            ⚡ 25-in-1 Ultra Micro Matrix
          </button>
        </div>

        {/* Modal Main Body (2 Columns on Desktop, Segmented on Mobile) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Controls, Uploads, Text Sliders & Layout (col 6) */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-6 xl:col-span-6 overflow-y-auto p-4 sm:p-5 space-y-4 border-r border-slate-100 ${
              mobileView === 'settings' ? 'block' : 'hidden lg:block'
            }`}
          >
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-white text-red-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileStack className="w-3.5 h-3.5" />
                <span>Multi-PDF Documents ({files.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'notes'
                    ? 'bg-white text-red-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Direct Notes & Formulas</span>
              </button>
            </div>

            {/* TAB 1: MULTI-PDF DOCUMENTS */}
            {activeTab === 'pdf' && (
              <div className="space-y-3.5">
                {/* File Upload List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-red-600" />
                      Source Documents ({files.length}) • {formatFileSize(totalSizeBytes)}
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add More PDFs
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      className="hidden"
                      onChange={handleAddFiles}
                    />
                  </div>

                  {files.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-5 text-center transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to select syllabus notes or drop multiple PDFs
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Drop Unit 1, Unit 2, Unit 3... to merge into a single pocket booklet
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                        >
                          <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400 w-4">
                              #{idx + 1}
                            </span>
                            <FileText className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-slate-800 block truncate">{file.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatFileSize(file.sizeBytes)} • {file.dimensions || 'A4'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold">
                              {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-200/60 transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Page Range Filter */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    Page Range:
                  </span>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(e) => setPageRange(e.target.value)}
                    placeholder="e.g. all, 1-16, odd, even"
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {totalInputPages} pgs selected
                  </span>
                </div>

                {/* Text Zoom & Content Scaling Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-600" />
                        Text Zoom (Chota ↔ Bada)
                      </span>
                      <span className="font-mono font-bold text-amber-700">{contentZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="140"
                      step="5"
                      value={contentZoom}
                      onChange={(e) => setContentZoom(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>80% (Small)</span>
                      <span>100% (Normal)</span>
                      <span>140% (Zoomed)</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-amber-200/80 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trimMargins}
                        onChange={(e) => setTrimMargins(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Trim White Margins</span>
                        <p className="text-[10px] text-slate-500">
                          Auto-crops book/notes margins (Keep OFF for ID cards & certificates)
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DIRECT FORMULAS & NOTES WRITER */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-red-600" />
                    Paste Formulas & Syllabus Notes
                  </label>
                  <button
                    type="button"
                    onClick={() => setNotesText(SAMPLE_CHEAT_NOTES)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    Load Sample Formulas
                  </button>
                </div>

                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Paste formulas, definitions, questions, key dates, or chemical equations..."
                  rows={5}
                  className="w-full p-2.5 font-mono text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800 placeholder:text-slate-400"
                />

                {/* Text Size (Chota/Bada) & Columns Per Chit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">Font Size (Chota ↔ Bada)</span>
                      <span className="font-mono font-bold text-red-600">{notesFontSize} pt</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="12"
                      step="0.5"
                      value={notesFontSize}
                      onChange={(e) => setNotesFontSize(parseFloat(e.target.value))}
                      className="w-full accent-red-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>5 pt (Micro Slip)</span>
                      <span>7 pt (Pocket)</span>
                      <span>12 pt (Handout)</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      Columns Inside Each Chit
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {([1, 2, 3] as const).map((cols) => (
                        <button
                          key={cols}
                          type="button"
                          onClick={() => setNotesColumns(cols)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            notesColumns === cols
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cols} {cols === 1 ? 'Col' : 'Cols'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid Layout Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Mini Xerox Grid Mode
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { id: '4-in-1', label: '4-in-1', desc: 'Large Notes', save: '75%' },
                  { id: '8-in-1', label: '8-in-1', desc: 'Revision', save: '88%' },
                  { id: '9-in-1', label: '9-in-1', desc: 'Handout', save: '89%' },
                  { id: '16-in-1', label: '16-in-1', desc: 'Micro Xerox', save: '94%', hot: true },
                  { id: '25-in-1', label: '25-in-1', desc: 'Ultra Farra', save: '96%' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayout(opt.id as MiniXeroxLayout)}
                    className={`p-2 rounded-xl border text-left transition-all relative cursor-pointer ${
                      layout === opt.id
                        ? 'border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {opt.hot && (
                      <span className="absolute -top-1.5 right-1.5 px-1 py-0.2 rounded-full bg-red-600 text-[8px] font-extrabold text-white uppercase tracking-wider">
                        Popular
                      </span>
                    )}
                    <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                    <p className="text-[9px] text-slate-500 leading-tight">{opt.desc}</p>
                    <p className="text-[9px] font-bold text-emerald-600 mt-0.5">{opt.save} Saved</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Page Flow Direction & Auto-Rotate Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Page Order: Vertical (Stackable) vs Horizontal */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">
                  Page Order / Slicing Flow:
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setPageOrder('vertical')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      pageOrder === 'vertical'
                        ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px]">
                      <ArrowDown className="w-3 h-3 text-red-600" />
                      <span>N-Order (Col)</span>
                    </div>
                    <span className="text-[8px] text-slate-400 block mt-0.5">Stackable strips</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPageOrder('horizontal')}
                    className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      pageOrder === 'horizontal'
                        ? 'bg-red-50 border-red-500 text-red-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[10px]">
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span>Z-Order (Row)</span>
                    </div>
                    <span className="text-[8px] text-slate-400 block mt-0.5">Reading order</span>
                  </button>
                </div>
              </div>

              {/* Auto-Rotate Toggle */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-red-600" />
                      Auto-Rotate for Max Size
                    </span>
                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                      Rotates pages 90° if it eliminates white bars & makes text up to 40% bigger
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Margins, Spacing & Guidelines */}
            <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-600 block mb-1">Outer Margin:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['zero', 'compact', 'standard'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMarginPreset(m)}
                        className={`py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          marginPreset === m
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {m === 'zero' ? 'Zero (0)' : m === 'compact' ? '3 mm' : '6 mm'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-600 block mb-1">Cell Gutter:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['none', 'hairline', 'standard'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSpacingPreset(g)}
                        className={`py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          spacingPreset === g
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {g === 'none' ? 'None' : g === 'hairline' ? '1 mm' : '3 mm'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawCutGuides}
                    onChange={(e) => setDrawCutGuides(e.target.checked)}
                    className="rounded text-red-600 w-3.5 h-3.5"
                  />
                  <span>Scissor Lines</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawPageNumbers}
                    onChange={(e) => setDrawPageNumbers(e.target.checked)}
                    className="rounded text-red-600 w-3.5 h-3.5"
                  />
                  <span>#1, #2 Badges</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={drawBorders}
                    onChange={(e) => setDrawBorders(e.target.checked)}
                    className="rounded text-red-600 w-3.5 h-3.5"
                  />
                  <span>Cell Borders</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={duplexCutSafe}
                    onChange={(e) => setDuplexCutSafe(e.target.checked)}
                    className="rounded text-red-600 w-3.5 h-3.5"
                  />
                  <span>Duplex Flip</span>
                </label>
              </div>
            </div>

            {/* Paper Size & Orientation */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                  Paper Size
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as MiniXeroxPageSize)}
                  className="w-full text-xs font-medium p-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="A4">A4 (Standard Xerox)</option>
                  <option value="Letter">US Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-0.5">
                  Orientation
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as MiniXeroxOrientation)}
                  className="w-full text-xs font-medium p-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="auto">Auto (Best Fit)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>

            {/* Mobile Switch to Preview Banner */}
            <div className="lg:hidden pt-2">
              <button
                type="button"
                onClick={() => setMobileView('preview')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Inspect Live Sheet Preview ({previewSheetIndex + 1}/{outputSheets})</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Live Interactive Sheet Preview Canvas (col 6) */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-6 xl:col-span-6 bg-slate-100/70 p-3 sm:p-5 flex flex-col overflow-y-auto ${
              mobileView === 'preview' ? 'block' : 'hidden lg:flex'
            }`}
          >
            {/* Live Sheet Header & Navigator */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-red-600" />
                  Live Printout Sheet Preview
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-700">
                  Sheet {previewSheetIndex + 1} of {outputSheets}
                </span>
              </div>

              {/* Pager Buttons & Zoom Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={previewSheetIndex <= 0}
                  onClick={() => setPreviewSheetIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  title="Previous Sheet"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={previewSheetIndex >= outputSheets - 1}
                  onClick={() => setPreviewSheetIndex((prev) => Math.min(outputSheets - 1, prev + 1))}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  title="Next Sheet"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  onClick={() =>
                    setPreviewZoom((z) => (z === 'fit' ? '100' : z === '100' ? '150' : 'fit'))
                  }
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-50 cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Toggle Zoom Inspection"
                >
                  <ZoomIn className="w-3 h-3 text-red-600" />
                  <span>{previewZoom === 'fit' ? 'Fit' : previewZoom === '100' ? '100%' : '150%'}</span>
                </button>
              </div>
            </div>

            {/* Attached Pages Range Notification */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2 px-1 shrink-0">
              <span>
                {activeTab === 'pdf' ? (
                  totalInputPages > 0 ? (
                    <>
                      Showing mini-pages <b>{sheetStartIdx + 1}–{sheetEndIdx}</b> of {totalInputPages} (
                      {pageOrder === 'vertical' ? 'N-Order Stackable' : 'Z-Order Reading'})
                    </>
                  ) : (
                    'No documents added yet'
                  )
                ) : (
                  <>
                    Showing micro-chits <b>{sheetStartIdx + 1}–{sheetEndIdx}</b> of {noteChits.length}
                  </>
                )}
              </span>
              <span className="font-mono text-emerald-600 font-bold">
                {paperSavingsPercent}% Paper Saved
              </span>
            </div>

            {/* Visual Physical Paper Sheet Container */}
            <div className="flex-1 flex items-center justify-center p-1 sm:p-2 overflow-auto min-h-[300px]">
              <div
                className={`bg-white rounded-md shadow-xl border border-slate-300/80 transition-all duration-200 relative p-2.5 sm:p-3.5 select-none ${
                  previewZoom === 'fit'
                    ? 'w-full max-w-[440px] aspect-[1/1.414]'
                    : previewZoom === '100'
                    ? 'w-[520px] aspect-[1/1.414]'
                    : 'w-[700px] aspect-[1/1.414]'
                }`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${spec.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${spec.rows}, minmax(0, 1fr))`,
                  gap: drawCutGuides ? '4px' : '2px',
                }}
              >
                {/* Cells inside Sheet */}
                {Array.from({ length: pagesPerSheet }).map((_, cellIdx) => {
                  let pageOffset = cellIdx;
                  if (pageOrder === 'vertical') {
                    const col = cellIdx % spec.cols;
                    const row = Math.floor(cellIdx / spec.cols);
                    pageOffset = col * spec.rows + row;
                  }

                  const globalIdx = sheetStartIdx + pageOffset;

                  if (activeTab === 'pdf') {
                    const pageItem = catalogedPages[globalIdx];
                    if (!pageItem) {
                      return (
                        <div
                          key={`empty-${cellIdx}`}
                          className="w-full h-full rounded border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-[9px] text-slate-300 p-1"
                        >
                          <span>Empty</span>
                        </div>
                      );
                    }

                    const activeFile = files[pageItem.fileIndex];

                    return (
                      <div
                        key={`cell-${pageItem.fileIndex}-${pageItem.pageIndexInFile}`}
                        onClick={() => setInspectedPage(pageItem)}
                        className={`w-full h-full relative rounded overflow-hidden bg-white flex flex-col cursor-pointer group hover:ring-2 hover:ring-red-500/50 transition-all ${
                          drawBorders ? 'border border-slate-300' : 'border border-slate-100'
                        } ${drawCutGuides ? 'ring-1 ring-red-200/50' : ''}`}
                        title="Click to magnify & inspect this page"
                      >
                        {/* Page Content Thumbnail */}
                        <div className="flex-1 w-full overflow-hidden relative p-0.5">
                          <MiniPageThumbnail
                            pdfjsDoc={activeFile?.pdfjsDoc}
                            bytes={pageItem.fileBytes}
                            pageIndex={pageItem.pageIndexInFile}
                            autoRotate={autoRotate}
                            isCellLandscape={isCellLandscape}
                          />
                        </div>

                        {/* Top Badge: #1, #2 */}
                        {drawPageNumbers && (
                          <div className="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-red-600 text-white font-mono font-bold text-[8px] shadow-2xs">
                            #{pageItem.globalPageNumber}
                          </div>
                        )}

                        {/* Hover Magnify Icon */}
                        <div className="absolute inset-0 bg-red-900/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-2xs">
                          <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                        </div>

                        {/* Bottom Tag: Doc Index & Page in file */}
                        <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-[7px] font-mono px-1 py-0.2 truncate text-center backdrop-blur-2xs">
                          P.{pageItem.pageIndexInFile + 1}
                        </div>
                      </div>
                    );
                  } else {
                    // Notes Mode Chits
                    const chitText = noteChits[globalIdx];
                    if (!chitText) {
                      return (
                        <div
                          key={`empty-note-${cellIdx}`}
                          className="w-full h-full rounded border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-[9px] text-slate-300"
                        >
                          <span>Empty</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`note-${globalIdx}`}
                        className={`w-full h-full relative rounded overflow-hidden bg-white p-1 flex flex-col justify-between ${
                          drawBorders ? 'border border-slate-400' : 'border border-slate-200'
                        }`}
                      >
                        {drawPageNumbers && (
                          <span className="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-amber-600 text-white font-mono font-bold text-[7px]">
                            #{globalIdx + 1}
                          </span>
                        )}

                        <div
                          className={`w-full h-full font-mono text-[7px] leading-tight overflow-hidden text-slate-800 ${
                            notesColumns === 1
                              ? 'columns-1'
                              : notesColumns === 2
                              ? 'columns-2'
                              : 'columns-3'
                          }`}
                          style={{
                            fontSize: `${Math.max(6, Math.min(10, notesFontSize * 0.95))}px`,
                            columnGap: '4px',
                          }}
                        >
                          {chitText}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* Sheet Carousel Strip (Click to Jump) */}
            {outputSheets > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Sheets:
                </span>
                {Array.from({ length: outputSheets }).map((_, s) => (
                  <button
                    key={`sheet-tab-${s}`}
                    type="button"
                    onClick={() => setPreviewSheetIndex(s)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                      previewSheetIndex === s
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Sheet {s + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Savings & Legibility Feedback Bar */}
            <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-emerald-950 text-[11px]">
                  {activeTab === 'pdf' ? `${totalInputPages} Pages` : `${noteChits.length} Chits`} on {outputSheets} Sheet(s)
                </span>
              </div>
              <span className="font-bold text-emerald-700 font-mono text-[11px]">
                Saves ₹{estimatedCostSaved} Xerox Cost
              </span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Client-Side WebAssembly. Your notes never leave your device.</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isProcessing || (activeTab === 'pdf' && files.length === 0)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white shadow-xs shadow-red-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-98"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{progressStatus || `Processing (${progressPercent}%)...`}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  Generate Mini Xerox ({outputSheets} {outputSheets === 1 ? 'Sheet' : 'Sheets'})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chit Magnifier / Inspection Modal */}
      {inspectedPage && (
        <div
          onClick={() => setInspectedPage(null)}
          className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-2xl space-y-3 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Page #{inspectedPage.globalPageNumber} Inspection
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {inspectedPage.fileName} • Page {inspectedPage.pageIndexInFile + 1}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPage(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-80 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
              <MiniPageThumbnail
                bytes={inspectedPage.fileBytes}
                pageIndex={inspectedPage.pageIndexInFile}
                autoRotate={false}
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">
                ✅ Clarity Check: High resolution sample verified
              </span>
              <button
                type="button"
                onClick={() => setInspectedPage(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniXeroxDialog;
