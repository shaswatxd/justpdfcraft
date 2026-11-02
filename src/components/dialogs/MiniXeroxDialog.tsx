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
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import {
  createMiniXeroxPdf,
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
  bytes: Uint8Array;
  pageCount: number;
}

export const MiniXeroxDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();
  const isOpen = activeModal === 'mini-xerox';

  const [files, setFiles] = useState<LoadedFileItem[]>([]);
  const [layout, setLayout] = useState<MiniXeroxLayout>('16-in-1');
  const [pageSize, setPageSize] = useState<MiniXeroxPageSize>('A4');
  const [orientation, setOrientation] = useState<MiniXeroxOrientation>('auto');
  const [drawCutGuides, setDrawCutGuides] = useState(true);
  const [drawPageNumbers, setDrawPageNumbers] = useState(true);
  const [drawBorders, setDrawBorders] = useState(true);
  const [duplexCutSafe, setDuplexCutSafe] = useState(false);

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
          setFiles([
            {
              id: 'current-doc',
              name: fileName || 'Active Document.pdf',
              bytes,
              pageCount: doc.getPageCount(),
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
  const spec = MINI_XEROX_LAYOUTS[layout] || MINI_XEROX_LAYOUTS['16-in-1'];
  const pagesPerSheet = spec.cols * spec.rows;
  const outputSheets = Math.ceil(totalInputPages / pagesPerSheet) || 1;
  const paperSavingsPercent =
    totalInputPages > 0
      ? Math.max(0, Math.round(((totalInputPages - outputSheets) / totalInputPages) * 100))
      : 93;
  const estimatedCostSaved = Math.max(0, (totalInputPages - outputSheets) * 2); // avg ₹2 per xerox side

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
        newItems.push({
          id: `${file.name}-${Date.now()}-${i}`,
          name: file.name,
          bytes,
          pageCount: doc.getPageCount(),
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
        title: 'Files Added',
        message: `Added ${newItems.length} document(s). Total ${totalInputPages + newItems.reduce((a, b) => a + b.pageCount, 0)} pages ready.`,
      });
    }

    if (e.target) e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Documents Selected',
        message: 'Please add at least one PDF notes or syllabus document.',
      });
      return;
    }

    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('Initializing Mini Xerox Engine...');

    try {
      const allDocBytes = files.map((f) => f.bytes);
      const outBytes = await createMiniXeroxPdf(allDocBytes, {
        layout,
        pageSize,
        orientation,
        drawCutGuides,
        drawPageNumbers,
        drawBorders,
        duplexCutSafe,
        onProgress: (current, total, status) => {
          setProgressStatus(status);
          setProgressPercent(Math.round((current / total) * 100));
        },
      });

      const blob = new Blob([outBytes as any], { type: 'application/pdf' });
      const baseName = files[0]?.name ? files[0].name.replace(/\.pdf$/i, '') : 'notes';
      const outName = `${baseName}_MiniXerox_${layout}.pdf`;
      downloadBlob(blob, outName);

      addToast({
        type: 'success',
        title: 'Mini Xerox PDF Generated! 🎉',
        message: `${totalInputPages} pages condensed into ${outputSheets} sheets (${paperSavingsPercent}% paper saved).`,
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
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50/60 via-amber-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 text-white shadow-xs shadow-red-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Mini Xerox / Pocket Notes Maker</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                  Student Special
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Fit 4, 8, or 16 pages per A4 sheet with scissor cut-lines for pocket revision booklets
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* File Upload & Source Documents List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-600" />
                Source Notes & PDFs ({files.length})
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
                    Add 1 or multiple PDF chapters to merge into one pocket booklet
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
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px]">
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

          {/* Savings Scoreboard Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                {paperSavingsPercent}%
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  {totalInputPages} Pages condensed into {outputSheets} A4 {outputSheets === 1 ? 'Sheet' : 'Sheets'}!
                </p>
                <p className="text-[11px] text-emerald-700">
                  Saves ~{paperSavingsPercent}% paper & estimated ₹{estimatedCostSaved} in photocopy printing
                </p>
              </div>
            </div>
          </div>

          {/* Layout Grid Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Mini Xerox Grid Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: '4-in-1', label: '4-in-1', desc: 'Large Pocket Notes', save: '75% Saved' },
                { id: '8-in-1', label: '8-in-1', desc: 'Revision Cards', save: '88% Saved' },
                { id: '9-in-1', label: '9-in-1', desc: 'Handout Grid', save: '89% Saved' },
                { id: '16-in-1', label: '16-in-1', desc: 'Micro Xerox (Formula)', save: '94% Saved', hot: true },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLayout(opt.id as MiniXeroxLayout)}
                  className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
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
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{opt.desc}</p>
                  <p className="text-[10px] font-bold text-emerald-600 mt-1">{opt.save}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cutting & Photocopy Assembly Helpers */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-red-600" />
              Photocopy & Paper-Cutter Options
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Scissor Cut Lines */}
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawCutGuides}
                  onChange={(e) => setDrawCutGuides(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Scissor Cut Guidelines</span>
                  <p className="text-[10px] text-slate-400">Dashed lines for easy paper-cutter slicing</p>
                </div>
              </label>

              {/* Page Numbering Badges */}
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
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

              {/* Cell Bounding Borders */}
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={drawBorders}
                  onChange={(e) => setDrawBorders(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800">Outer Frame Borders</span>
                  <p className="text-[10px] text-slate-400">Clean border outline around each mini page</p>
                </div>
              </label>

              {/* Duplex Flip Alignment */}
              <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/60 cursor-pointer select-none">
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

          {/* Sheet Size & Orientation */}
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
                <option value="Legal">Legal (Extra Height for 16-in-1)</option>
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
            disabled={isProcessing || files.length === 0}
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
