import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import {
  createMiniXeroxPdf,
  createNotesChitsPdf,
  MiniXeroxLayout,
  MiniXeroxPageSize,
  MiniXeroxOrientation,
  MINI_XEROX_LAYOUTS,
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
}

const SAMPLE_CHEAT_NOTES = `# PHYSICS FORMULAS
E = mc^2 • F = ma • W = F·d·cos(θ)
v = u + at • s = ut + (1/2)at^2 • v^2 = u^2 + 2as
p = mv • F = dp/dt • Impulse = F·Δt
Kinetic Energy = (1/2)mv^2 • Potential = mgh
Hooke's Law: F = -k·x • T = 2π√(m/k)
Gravitation: F = G(m1·m2)/r^2 • g = GM/R^2
Escape Velocity: v_e = √(2gR)

# THERMODYNAMICS & GAS
PV = nRT • P1V1/T1 = P2V2/T2
First Law: ΔQ = ΔU + ΔW • Work = P·ΔV
Adiabatic: PV^γ = constant
Efficiency η = 1 - (Tc / Th)

# ELECTRICITY & MAGNETISM
Ohm's Law: V = IR • Power: P = VI = I^2·R = V^2/R
Coulomb's Law: F = k(q1·q2)/r^2
Capacitor: Q = CV • Energy = (1/2)CV^2
Series: R = R1 + R2 • Parallel: 1/R = 1/R1 + 1/R2
Lorentz Force: F = q(E + v × B) • B = μ0·I / (2πr)
Faraday's Law: ε = -dΦ/dt

# CALCULUS & MATH DERIVATIVES
d/dx(x^n) = n·x^(n-1) • d/dx(e^x) = e^x
d/dx(ln x) = 1/x • d/dx(sin x) = cos x
d/dx(cos x) = -sin x • d/dx(tan x) = sec^2 x
Integration: ∫ x^n dx = x^(n+1)/(n+1)
∫ (1/x) dx = ln|x| • ∫ e^x dx = e^x
Product Rule: (uv)' = u'v + uv'
Quotient Rule: (u/v)' = (u'v - uv') / v^2

# ORGANIC REAGENTS
Grignard: R-MgX + H2O → R-H
Wurtz Reaction: 2R-X + 2Na → R-R + 2NaX
Friedel-Crafts: Ar-H + R-Cl (AlCl3) → Ar-R
Cannizzaro: 2HCHO + KOH → CH3OH + HCOOK`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MiniXeroxDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();
  const isOpen = activeModal === 'mini-xerox';

  // Mode: Upload PDFs vs Directly Paste / Type Notes
  const [activeTab, setActiveTab] = useState<'pdf' | 'notes'>('pdf');

  // Multi-PDF State
  const [files, setFiles] = useState<LoadedFileItem[]>([]);
  const [contentZoom, setContentZoom] = useState<number>(100); // 80% to 150% (chota/bada scale)
  const [trimMargins, setTrimMargins] = useState<boolean>(true);

  // Direct Notes State
  const [notesText, setNotesText] = useState<string>(SAMPLE_CHEAT_NOTES);
  const [notesFontSize, setNotesFontSize] = useState<number>(7); // chota/bada font size
  const [notesColumns, setNotesColumns] = useState<1 | 2 | 3>(2);

  // Shared Print Options
  const [layout, setLayout] = useState<MiniXeroxLayout>('16-in-1');
  const [pageSize, setPageSize] = useState<MiniXeroxPageSize>('A4');
  const [orientation, setOrientation] = useState<MiniXeroxOrientation>('auto');
  const [drawCutGuides, setDrawCutGuides] = useState(true);
  const [drawPageNumbers, setDrawPageNumbers] = useState(true);
  const [drawBorders, setDrawBorders] = useState(true);
  const [duplexCutSafe, setDuplexCutSafe] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically pre-load open document if available
  useEffect(() => {
    if (!isOpen) return;

    const loadCurrentDoc = async () => {
      if (documentId && files.length === 0) {
        try {
          const { getPDFEngine } = await import('@core/pdf/engine.factory');
          const engine = getPDFEngine();
          const bytes = await engine.saveDocument(documentId);
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const firstPage = doc.getPage(0);
          setFiles([
            {
              id: 'current-doc',
              name: fileName || 'Active Document.pdf',
              sizeBytes: bytes.byteLength,
              bytes,
              pageCount: doc.getPageCount(),
              dimensions: `${Math.round(firstPage.getWidth())} × ${Math.round(firstPage.getHeight())} pt`,
            },
          ]);
        } catch (e) {
          console.warn('Could not pre-load active document for Mini Xerox:', e);
        }
      }
    };

    loadCurrentDoc();
  }, [isOpen, documentId, fileName]);

  if (!isOpen) return null;

  const totalInputPages = files.reduce((acc, f) => acc + f.pageCount, 0);
  const totalSizeBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const spec = MINI_XEROX_LAYOUTS[layout] || MINI_XEROX_LAYOUTS['16-in-1'];
  const pagesPerSheet = spec.cols * spec.rows;

  // Approximate sheet count for notes mode
  const estNotesLines = notesText.split('\n').filter((l) => l.trim().length > 0).length;
  const estChitsForNotes = Math.max(1, Math.ceil(estNotesLines / (22 * notesColumns)));
  const notesOutputSheets = Math.ceil(estChitsForNotes / pagesPerSheet);

  const outputSheets =
    activeTab === 'pdf'
      ? Math.ceil(totalInputPages / pagesPerSheet) || 1
      : notesOutputSheets;

  const paperSavingsPercent =
    activeTab === 'pdf' && totalInputPages > 0
      ? Math.max(0, Math.round(((totalInputPages - outputSheets) / totalInputPages) * 100))
      : 93;
  const estimatedCostSaved =
    activeTab === 'pdf'
      ? Math.max(0, (totalInputPages - outputSheets) * 2)
      : estChitsForNotes * 2;

  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;

    const newItems: LoadedFileItem[] = [];
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      try {
        const ab = await file.arrayBuffer();
        const bytes = new Uint8Array(ab);
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const p1 = doc.getPage(0);
        newItems.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          sizeBytes: file.size,
          bytes,
          pageCount: doc.getPageCount(),
          dimensions: `${Math.round(p1.getWidth())} × ${Math.round(p1.getHeight())} pt`,
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

      if (activeTab === 'pdf') {
        const allDocBytes = files.map((f) => f.bytes);
        outBytes = await createMiniXeroxPdf(allDocBytes, {
          layout,
          pageSize,
          orientation,
          drawCutGuides,
          drawPageNumbers,
          drawBorders,
          duplexCutSafe,
          contentZoom: contentZoom / 100,
          trimMargins,
          onProgress: (current, total, status) => {
            setProgressStatus(status);
            setProgressPercent(Math.round((current / total) * 100));
          },
        });
        const baseName = files[0]?.name ? files[0].name.replace(/\.pdf$/i, '') : 'notes';
        downloadName = `${baseName}_MiniXerox_${layout}.pdf`;
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
        message: `Condensed into ${outputSheets} sheets (${paperSavingsPercent}% paper saved).`,
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-amber-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xs shadow-red-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Mini Xerox & Pocket Notes Maker</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                  Exam Revision / Micro Chit
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fit 4, 8, 16, or 25 micro slips on 1 sheet with scissor cut lines • Adjustable text size & zoom
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Multi-PDF vs Direct Notes Writer */}
        <div className="flex items-center px-4 pt-2 border-b border-slate-100 bg-slate-50/50 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileStack className="w-4 h-4" />
            <span>Multi-PDF Documents ({files.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notes'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Type / Paste Notes & Formulas (Micro Chits)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* TAB 1: MULTI-PDF DOCUMENTS */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              {/* File Upload List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    Source PDF Documents ({files.length}) • Total: {formatFileSize(totalSizeBytes)}
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
                    className="border-2 border-dashed border-slate-200 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-6 text-center transition-all cursor-pointer space-y-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800">
                        Click to select syllabus notes or drop multiple PDFs here
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Drop Unit 1, Unit 2, Unit 3... to merge into a single compact mini xerox
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 w-4">
                            #{idx + 1}
                          </span>
                          <FileText className="w-4 h-4 text-red-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-slate-800 block truncate">{file.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatFileSize(file.sizeBytes)} • {file.dimensions || 'A4'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
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

              {/* Text Zoom / Content Scaling & Whitespace Trimming Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70">
                {/* Content Zoom Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      Text & Content Zoom (Chota ↔ Bada)
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
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>80% (Extra Small)</span>
                    <span>100% (Normal)</span>
                    <span>140% (Zoomed & Bigger Text)</span>
                  </div>
                </div>

                {/* Auto-Crop Margins */}
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-amber-200/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={trimMargins}
                      onChange={(e) => setTrimMargins(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Trim White Margins</span>
                      <p className="text-[10px] text-slate-500">
                        Crops empty borders so text expands to fill the entire chit cell
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT FORMULAS & NOTES WRITER */}
          {activeTab === 'notes' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-red-600" />
                  Paste Formulas, Questions & Syllabus Notes
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
                placeholder="Paste your formulas, definitions, questions, key dates, or chemical equations here..."
                rows={6}
                className="w-full p-3 font-mono text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800 placeholder:text-slate-400"
              />

              {/* Text Size (Chota/Bada) & Columns Per Chit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {/* Font Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Font Size (Text Chota ↔ Bada)
                    </span>
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
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>5 pt (Micro Slip)</span>
                    <span>7 pt (Pocket Notes)</span>
                    <span>12 pt (Readable Handout)</span>
                  </div>
                </div>

                {/* Columns per Chit */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1.5">
                    Columns Inside Each Chit
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([1, 2, 3] as const).map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => setNotesColumns(cols)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          notesColumns === cols
                            ? 'bg-red-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cols} {cols === 1 ? 'Column' : 'Columns'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Grid Layout Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Mini Xerox Grid Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: '4-in-1', label: '4-in-1', desc: 'Large Notes', save: '75% Saved' },
                { id: '8-in-1', label: '8-in-1', desc: 'Revision Cards', save: '88% Saved' },
                { id: '9-in-1', label: '9-in-1', desc: 'Handout Grid', save: '89% Saved' },
                { id: '16-in-1', label: '16-in-1', desc: 'Micro Xerox', save: '94% Saved', hot: true },
                { id: '25-in-1', label: '25-in-1', desc: 'Ultra Micro Farra', save: '96% Saved' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLayout(opt.id as MiniXeroxLayout)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    layout === opt.id
                      ? 'border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  {opt.hot && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-red-600 text-[9px] font-extrabold text-white uppercase tracking-wider shadow-2xs">
                      Popular
                    </span>
                  )}
                  <p className="text-sm font-bold text-slate-900">{opt.label}</p>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{opt.desc}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">{opt.save}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Savings Scoreboard Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                {paperSavingsPercent}%
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  {activeTab === 'pdf' ? `${totalInputPages} Pages` : `${estChitsForNotes} Micro Chits`} condensed into {outputSheets} A4 {outputSheets === 1 ? 'Sheet' : 'Sheets'}!
                </p>
                <p className="text-[11px] text-emerald-700">
                  Saves ~{paperSavingsPercent}% paper & estimated ₹{estimatedCostSaved} in photocopy printing
                </p>
              </div>
            </div>
          </div>

          {/* Cutting Guidelines & Printing Helpers */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-red-600" />
              Scissor Lines & Slicing Options
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawCutGuides}
                  onChange={(e) => setDrawCutGuides(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Scissor Cut Guidelines</span>
                  <p className="text-[10px] text-slate-400">Dashed lines for straight paper-cutter slicing</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawPageNumbers}
                  onChange={(e) => setDrawPageNumbers(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Page Number Badges (#1, #2)</span>
                  <p className="text-[10px] text-slate-400">Keeps sliced mini pages in exact order</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawBorders}
                  onChange={(e) => setDrawBorders(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Outer Frame Borders</span>
                  <p className="text-[10px] text-slate-400">Clean border outline around each chit</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={duplexCutSafe}
                  onChange={(e) => setDuplexCutSafe(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Duplex Back-to-Back Cut</span>
                  <p className="text-[10px] text-slate-400">Mirrors reverse side for double-sided print</p>
                </div>
              </label>
            </div>
          </div>

          {/* Paper Size & Orientation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Paper Size (Printout)
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value as MiniXeroxPageSize)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="A4">A4 (Standard Indian Xerox)</option>
                <option value="Letter">US Letter</option>
                <option value="Legal">Legal (Extra Height for 16 & 25-in-1)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Page Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as MiniXeroxOrientation)}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              >
                <option value="auto">Auto (Best Grid Fit)</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Client-Side. Your notes never leave your device.</span>
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
    </div>
  );
};

export default MiniXeroxDialog;
