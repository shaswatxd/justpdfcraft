import React, { useRef, useEffect } from 'react';
import { 
  SortAsc, 
  SortDesc, 
  Sliders, 
  Eye, 
  EyeOff,
  FileText,
  Shield,
  Wrench,
  Search,
  GitCompare
} from 'lucide-react';
import { 
  ToolDefinition, 
  SplitOptions, 
  CompressOptions, 
  WatermarkOptions, 
  PageNumberOptions, 
  ProtectOptions, 
  UnlockOptions, 
  JpgToPdfOptions, 
  PdfToJpgOptions,
  SignPdfOptions,
  EditPdfOptions,
  HtmlToPdfOptions,
  RedactOptions
} from '../../types/pdf';

interface OptionsSidebarProps {
  tool: ToolDefinition;
  filesCount: number;
  totalPageCount?: number;
  splitOptions: SplitOptions;
  setSplitOptions: React.Dispatch<React.SetStateAction<SplitOptions>>;
  compressOptions: CompressOptions;
  setCompressOptions: React.Dispatch<React.SetStateAction<CompressOptions>>;
  watermarkOptions: WatermarkOptions;
  setWatermarkOptions: React.Dispatch<React.SetStateAction<WatermarkOptions>>;
  pageNumberOptions: PageNumberOptions;
  setPageNumberOptions: React.Dispatch<React.SetStateAction<PageNumberOptions>>;
  protectOptions: ProtectOptions;
  setProtectOptions: React.Dispatch<React.SetStateAction<ProtectOptions>>;
  unlockOptions: UnlockOptions;
  setUnlockOptions: React.Dispatch<React.SetStateAction<UnlockOptions>>;
  jpgToPdfOptions: JpgToPdfOptions;
  setJpgToPdfOptions: React.Dispatch<React.SetStateAction<JpgToPdfOptions>>;
  pdfToJpgOptions: PdfToJpgOptions;
  setPdfToJpgOptions: React.Dispatch<React.SetStateAction<PdfToJpgOptions>>;
  signOptions: SignPdfOptions;
  setSignOptions: React.Dispatch<React.SetStateAction<SignPdfOptions>>;
  editOptions: EditPdfOptions;
  setEditOptions: React.Dispatch<React.SetStateAction<EditPdfOptions>>;
  htmlOptions: HtmlToPdfOptions;
  setHtmlOptions: React.Dispatch<React.SetStateAction<HtmlToPdfOptions>>;
  redactOptions: RedactOptions;
  setRedactOptions: React.Dispatch<React.SetStateAction<RedactOptions>>;
  onSortFiles?: (order: 'asc' | 'desc') => void;
  onRotateAll?: (direction: 'left' | 'right') => void;
  onExecute: () => void;
  isProcessing: boolean;
  isValid: boolean;
}

export const OptionsSidebar: React.FC<OptionsSidebarProps> = ({
  tool,
  filesCount,
  totalPageCount,
  splitOptions,
  setSplitOptions,
  compressOptions,
  setCompressOptions,
  watermarkOptions,
  setWatermarkOptions,
  pageNumberOptions,
  setPageNumberOptions,
  protectOptions,
  setProtectOptions,
  unlockOptions,
  setUnlockOptions,
  jpgToPdfOptions,
  setJpgToPdfOptions,
  pdfToJpgOptions,
  setPdfToJpgOptions,
  signOptions,
  setSignOptions,
  editOptions,
  setEditOptions,
  htmlOptions,
  setHtmlOptions,
  redactOptions,
  setRedactOptions,
  onSortFiles,
  onRotateAll,
  onExecute,
  isProcessing,
  isValid,
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [signMode, setSignMode] = React.useState<'draw' | 'type'>('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Digital Signature Pad Logic
  useEffect(() => {
    if (tool.id !== 'sign-pdf' || signMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#002B49';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDraw = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      const dataUrl = canvas.toDataURL('image/png');
      setSignOptions(prev => ({ ...prev, signatureDataUrl: dataUrl }));
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [tool.id, signMode]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignOptions(prev => ({ ...prev, signatureDataUrl: '' }));
    }
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            <Sliders size={14} />
            <span>Options</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 mt-1">{tool.title}</h2>
        </div>

        {/* 1. Merge */}
        {tool.id === 'merge-pdf' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Files will be merged in the order shown on the left.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSortFiles?.('asc')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 border border-gray-200"
              >
                <SortAsc size={14} /> Sort A-Z
              </button>
              <button
                onClick={() => onSortFiles?.('desc')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 border border-gray-200"
              >
                <SortDesc size={14} /> Sort Z-A
              </button>
            </div>
            <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-xs text-red-700 font-medium">
              {filesCount} {filesCount === 1 ? 'file' : 'files'} ready to combine
            </div>
          </div>
        )}

        {/* 2. Split */}
        {tool.id === 'split-pdf' && (
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Split Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSplitOptions(prev => ({ ...prev, mode: 'range' }))}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  splitOptions.mode === 'range' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 border'
                }`}
              >
                Custom Ranges
              </button>
              <button
                onClick={() => setSplitOptions(prev => ({ ...prev, mode: 'extract-all' }))}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  splitOptions.mode === 'extract-all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 border'
                }`}
              >
                Extract All
              </button>
            </div>

            {splitOptions.mode === 'range' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 block">
                  Page Ranges {totalPageCount ? `(Total: ${totalPageCount} pages)` : ''}
                </label>
                <input
                  type="text"
                  value={splitOptions.ranges}
                  onChange={(e) => setSplitOptions(prev => ({ ...prev, ranges: e.target.value }))}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        )}

        {/* 3. Compress */}
        {tool.id === 'compress-pdf' && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Compression Level
            </label>
            <div className="space-y-2">
              <div
                onClick={() => setCompressOptions({ level: 'extreme' })}
                className={`p-3.5 rounded-xl border cursor-pointer ${
                  compressOptions.level === 'extreme' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Extreme Compression</div>
                <div className="text-xs text-gray-500">Maximum size reduction</div>
              </div>
              <div
                onClick={() => setCompressOptions({ level: 'recommended' })}
                className={`p-3.5 rounded-xl border cursor-pointer ${
                  compressOptions.level === 'recommended' ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between font-bold text-sm text-gray-900">
                  <span>Recommended</span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded-full">POPULAR</span>
                </div>
                <div className="text-xs text-gray-500">Good quality, high compression</div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Sign PDF */}
        {tool.id === 'sign-pdf' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSignMode('draw')}
                className={`py-2 rounded-xl text-xs font-bold ${
                  signMode === 'draw' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 border'
                }`}
              >
                Draw Signature
              </button>
              <button
                onClick={() => setSignMode('type')}
                className={`py-2 rounded-xl text-xs font-bold ${
                  signMode === 'type' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 border'
                }`}
              >
                Type Name
              </button>
            </div>

            {signMode === 'draw' ? (
              <div className="space-y-2">
                <div className="border border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner relative">
                  <canvas ref={canvasRef} width={320} height={130} className="w-full h-32 cursor-crosshair" />
                  <button
                    onClick={clearSignature}
                    className="absolute top-2 right-2 text-[10px] font-bold text-gray-400 hover:text-red-500 bg-gray-50 px-2 py-1 rounded border"
                  >
                    Clear
                  </button>
                </div>
                <span className="text-[11px] text-gray-400 block text-center">Draw with your mouse or finger</span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 block">Signer Full Name</label>
                <input
                  type="text"
                  value={signOptions.signerName}
                  onChange={e => setSignOptions(prev => ({ ...prev, signerName: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm italic font-serif"
                />
              </div>
            )}
          </div>
        )}

        {/* 5. Edit PDF */}
        {tool.id === 'edit-pdf' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Add Text / Comment</label>
              <textarea
                rows={3}
                value={editOptions.addedText}
                onChange={e => setEditOptions(prev => ({ ...prev, addedText: e.target.value }))}
                placeholder="Enter text to stamp on document..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hl"
                checked={editOptions.highlightText}
                onChange={e => setEditOptions(prev => ({ ...prev, highlightText: e.target.checked }))}
                className="accent-[#e5322d] w-4 h-4"
              />
              <label htmlFor="hl" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Highlight text box (Yellow)
              </label>
            </div>
          </div>
        )}

        {/* 6. HTML to PDF */}
        {tool.id === 'html-to-pdf' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">HTML Code or Text</label>
              <textarea
                rows={5}
                value={htmlOptions.htmlInput}
                onChange={e => setHtmlOptions(prev => ({ ...prev, htmlInput: e.target.value }))}
                placeholder="Paste HTML or raw text..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* 7. PDF to Word / Excel / PPT Informational Callouts */}
        {(tool.id === 'pdf-to-word' || tool.id === 'pdf-to-excel' || tool.id === 'pdf-to-powerpoint') && (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <FileText size={16} /> Ready for Conversion
            </div>
            <p>
              Extracts text streams and layout tables client-side into authentic Microsoft Office format.
            </p>
          </div>
        )}

        {/* 8. PDF/A Callout */}
        {tool.id === 'pdf-to-pdfa' && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-700 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-gray-900">
              <Shield size={16} /> ISO 19005-1 Standard
            </div>
            <p>Embeds PDF/A-1b archiving metadata dictionary for long-term document preservation.</p>
          </div>
        )}

        {/* 9. Repair PDF Callout */}
        {tool.id === 'repair-pdf' && (
          <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl text-xs text-teal-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Wrench size={16} /> Fault-Tolerant Engine
            </div>
            <p>Scans and rebuilds damaged cross-reference xref streams and recovers dangling objects.</p>
          </div>
        )}

        {/* 10. Extract Text Callout */}
        {tool.id === 'ocr-pdf' && (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Search size={16} /> Text Transcript Extraction
            </div>
            <p>Extracts all selectable text content page by page and exports as a clean text document.</p>
          </div>
        )}

        {/* 11. Compare PDF Callout */}
        {tool.id === 'compare-pdf' && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <GitCompare size={16} /> Document Comparison
            </div>
            <p>Upload at least 2 documents to generate an analytical comparison summary.</p>
          </div>
        )}

        {/* 12. Sanitize PDF Callout */}
        {tool.id === 'redact-pdf' && (
          <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-2xl text-xs text-zinc-800 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <EyeOff size={16} /> Document Sanitization
            </div>
            <p>Removes all hidden author metadata, revision timestamps, software producer tags, and keywords from the PDF file.</p>
          </div>
        )}

        {/* 13. Protect Options */}
        {tool.id === 'protect-pdf' && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Set Document Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={protectOptions.password}
                onChange={e => setProtectOptions(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password..."
                className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* 13b. Unlock Options */}
        {tool.id === 'unlock-pdf' && (
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
              Enter Document Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={unlockOptions.password}
                onChange={e => setUnlockOptions(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter document password..."
                className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Leave blank if the document has no password or if permissions only are restricted.
            </p>
          </div>
        )}

        {/* 14. Watermark Options */}
        {tool.id === 'watermark-pdf' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Watermark Text</label>
              <input
                type="text"
                value={watermarkOptions.text}
                onChange={e => setWatermarkOptions(prev => ({ ...prev, text: e.target.value }))}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Execute Button */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        <button
          disabled={!isValid || isProcessing}
          onClick={onExecute}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 text-base font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
        >
          <span>{isProcessing ? 'Processing...' : `${tool.actionText} →`}</span>
        </button>
      </div>
    </div>
  );
};
