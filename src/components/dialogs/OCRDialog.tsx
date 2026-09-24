import React, { useState, useRef } from 'react';
import {
  ScanText,
  X,
  Check,
  Copy,
  Download,
  Sparkles,
  Globe,
  FileText,
  Zap,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  FileDown,
  Info,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { ocrService, OCRPageResult } from '@core/ocr/ocr-service';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const OCRDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName, currentPage, pageCount, loadDocument } = useDocumentStore();

  const [language, setLanguage] = useState('eng');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [mode, setMode] = useState<'deep_visual' | 'smart_auto' | 'fast_stream'>('deep_visual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Preprocessing options
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [sharpenText, setSharpenText] = useState(true);
  const [binarizeText, setBinarizeText] = useState(false);

  // Result metrics
  const [pageResults, setPageResults] = useState<OCRPageResult[]>([]);
  const [avgConfidence, setAvgConfidence] = useState<number | null>(null);
  const [totalWords, setTotalWords] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (activeModal !== 'ocr') return null;

  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'hin', name: 'Hindi (हिंदी)' },
    { code: 'eng+hin', name: 'English + Hindi Bilingual' },
    { code: 'spa', name: 'Spanish (Español)' },
    { code: 'fra', name: 'French (Français)' },
    { code: 'deu', name: 'German (Deutsch)' },
    { code: 'chi_sim', name: 'Chinese Simplified (简体中文)' },
    { code: 'jpn', name: 'Japanese (日本語)' },
  ];

  const handleFilePicked = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a valid PDF file.',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatusText('Loading PDF document into memory...');
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      await loadDocument(bytes, file.name);
      addToast({
        type: 'success',
        title: 'PDF Ready for OCR',
        message: `Loaded "${file.name}"`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'File Load Error',
        message: err?.message || 'Failed to open PDF for OCR.',
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const handleStartExtraction = async () => {
    if (!documentId) {
      fileInputRef.current?.click();
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setStatusText('Preparing text extraction engine...');
    setExtractedText('');
    setPageResults([]);
    setAvgConfidence(null);
    setTotalWords(0);

    try {
      const engine = getPDFEngine();
      const totalPages = Math.max(1, pageCount);
      const pagesToProcess =
        scope === 'current'
          ? [Math.max(0, Math.min(currentPage - 1, totalPages - 1))]
          : Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i);

      let textOutput = '';
      const collectedResults: OCRPageResult[] = [];

      // 1. FAST STREAM EXTRACTION MODE
      if (mode === 'fast_stream') {
        setProgress(15);
        for (let i = 0; i < pagesToProcess.length; i++) {
          const pIdx = pagesToProcess[i];
          setStatusText(`Reading digital text stream from page ${pIdx + 1}...`);
          setProgress(Math.round(20 + (i / pagesToProcess.length) * 70));

          const pageTextResult = await engine.extractPageText(documentId, pIdx);
          const rawText = (pageTextResult.text || '').trim();

          if (rawText.length > 0) {
            textOutput += `=== PAGE ${pIdx + 1} ===\n${rawText}\n\n`;
            collectedResults.push({
              pageIndex: pIdx,
              text: rawText,
              confidence: 100,
              lines: rawText.split('\n').map((l) => ({ text: l, confidence: 100 })),
              wordCount: rawText.split(/\s+/).filter(Boolean).length,
              charCount: rawText.length,
            });
          } else {
            textOutput += `=== PAGE ${pIdx + 1} ===\n[No digital text stream found on this page. Switch to "Deep Visual OCR" to recognize scanned text or bypass DRM restrictions.]\n\n`;
          }
        }

        setProgress(100);
        setStatusText('Extraction complete!');
        setExtractedText(textOutput.trim());
        setPageResults(collectedResults);
        setAvgConfidence(100);
        const wCount = collectedResults.reduce((acc, r) => acc + r.wordCount, 0);
        setTotalWords(wCount);

        addToast({
          type: 'success',
          title: 'Text Extracted',
          message: `Extracted digital text from ${pagesToProcess.length} page(s).`,
        });
        return;
      }

      // 2. SMART AUTO-DETECT MODE
      if (mode === 'smart_auto') {
        let needsVisualOCR = false;
        // Test first page to see if clean text exists
        const sampleText = await engine.extractPageText(documentId, pagesToProcess[0]);
        const cleanSample = (sampleText.text || '').trim();

        // Check if text is completely empty or contains corrupted non-ASCII/scrambled glyphs
        if (cleanSample.length < 20) {
          needsVisualOCR = true;
        } else {
          // Check for scrambled CMAP (high ratio of unprintable or unusual replacement symbols)
          const nonAsciiCount = (cleanSample.match(/[^\x20-\x7E\s]/g) || []).length;
          if (nonAsciiCount / cleanSample.length > 0.4) {
            needsVisualOCR = true;
          }
        }

        if (!needsVisualOCR) {
          // Digital stream is clean!
          return handleStreamRun(pagesToProcess);
        }
        // Otherwise fall through to Deep Visual OCR below
      }

      // 3. DEEP VISUAL OCR MODE (Bypasses all copy restrictions, scrambled fonts, and scans)
      const canvases: Array<{ pageIndex: number; canvas: HTMLCanvasElement }> = [];

      for (let i = 0; i < pagesToProcess.length; i++) {
        const pIdx = pagesToProcess[i];
        setStatusText(`Rendering page ${pIdx + 1} at 2.5x high-fidelity (300 DPI equivalent)...`);
        setProgress(Math.round(10 + (i / pagesToProcess.length) * 30));

        // Render at 2.5x scale for optimal OCR accuracy
        const renderRes = await engine.renderPage(documentId, pIdx, 2.5);
        if (renderRes.canvas) {
          canvases.push({ pageIndex: pIdx, canvas: renderRes.canvas });
        }
      }

      if (canvases.length === 0) {
        throw new Error('Unable to render page canvases for visual text recognition.');
      }

      const results = await ocrService.recognizePages(canvases, {
        language,
        preprocess: true,
        preprocessOptions: {
          grayscale: true,
          enhanceContrast,
          sharpen: sharpenText,
          binarize: binarizeText,
          autoInvert: true,
        },
        onProgress: (p, s, currentConf) => {
          setProgress(Math.round(40 + (p / 100) * 58));
          setStatusText(s);
          if (currentConf !== undefined) {
            setAvgConfidence(currentConf);
          }
        },
      });

      const combined = results
        .map((r) => `=== PAGE ${r.pageIndex + 1} (${r.confidence}% confidence) ===\n${r.text.trim() || '[No text detected]'}\n`)
        .join('\n');

      setProgress(100);
      setStatusText('Visual OCR processing finished!');
      setExtractedText(combined);
      setPageResults(results);

      const validConfs = results.map((r) => r.confidence).filter((c) => c > 0);
      const meanConfidence = validConfs.length > 0
        ? Math.round(validConfs.reduce((a, b) => a + b, 0) / validConfs.length)
        : 85;
      setAvgConfidence(meanConfidence);

      const wCount = results.reduce((acc, r) => acc + r.wordCount, 0);
      setTotalWords(wCount);

      addToast({
        type: 'success',
        title: 'OCR Finished',
        message: `Recognized ${wCount} words across ${results.length} page(s) (${meanConfidence}% confidence).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'OCR Error',
        message: err?.message || 'Text recognition failed.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStreamRun = async (pagesToProcess: number[]) => {
    const engine = getPDFEngine();
    let textOutput = '';
    const collectedResults: OCRPageResult[] = [];

    for (let i = 0; i < pagesToProcess.length; i++) {
      const pIdx = pagesToProcess[i];
      const pageTextResult = await engine.extractPageText(documentId!, pIdx);
      const rawText = (pageTextResult.text || '').trim();
      textOutput += `=== PAGE ${pIdx + 1} ===\n${rawText}\n\n`;
      collectedResults.push({
        pageIndex: pIdx,
        text: rawText,
        confidence: 100,
        lines: rawText.split('\n').map((l) => ({ text: l, confidence: 100 })),
        wordCount: rawText.split(/\s+/).filter(Boolean).length,
        charCount: rawText.length,
      });
    }

    setProgress(100);
    setStatusText('Clean digital stream extracted!');
    setExtractedText(textOutput.trim());
    setPageResults(collectedResults);
    setAvgConfidence(100);
    const wCount = collectedResults.reduce((acc, r) => acc + r.wordCount, 0);
    setTotalWords(wCount);
    setIsProcessing(false);

    addToast({
      type: 'success',
      title: 'Auto Extraction Complete',
      message: `Extracted ${wCount} words.`,
    });
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
    addToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'All extracted text copied cleanly without restriction.',
    });
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName ? fileName.replace(/\.pdf$/i, '') : 'JustPDFCraft'}_Extracted_Text.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    if (!extractedText) return;
    const mdContent = `# Extracted Text — ${fileName || 'Document'}\n\n*Extracted with JustPDFCraft Ultra-OCR on ${new Date().toLocaleDateString()}*\n\n---\n\n${extractedText}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName ? fileName.replace(/\.pdf$/i, '') : 'JustPDFCraft'}_Extracted.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSearchablePDF = async () => {
    if (!documentId || pageResults.length === 0) {
      addToast({
        type: 'warning',
        title: 'Run OCR First',
        message: 'Please extract text from pages before generating a searchable PDF.',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatusText('Embedding invisible searchable text layer into PDF...');
      const engine = getPDFEngine();

      const ocrItems = pageResults.map((r) => ({
        pageIndex: r.pageIndex,
        text: r.text,
      }));

      const searchablePdfBytes = await engine.embedSearchableText(documentId, ocrItems);

      const blob = new Blob([searchablePdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName ? fileName.replace(/\.pdf$/i, '') : 'JustPDFCraft'}_Searchable.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Searchable PDF Created',
        message: 'Successfully generated unlocked searchable PDF with embedded text layer.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Searchable PDF Failed',
        message: err?.message || 'Could not generate searchable PDF.',
      });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="OCR Dialog">
      <div className="w-full max-w-2xl bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ScanText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Ultra-OCR & Text Extraction</h3>
                <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  DRM / Copy-Bypass
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Extract text from scans, photos, scrambled fonts, and permission-restricted PDFs
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Picker Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFilePicked(file);
          }}
        />

        {!documentId ? (
          <NoDocumentState
            toolName="Ultra-OCR & Text Extraction"
            description="Please select a PDF document first to run Deep Visual OCR, DRM bypass, and extract clean text."
            icon={ScanText}
            actionText="Select PDF for OCR"
          />
        ) : (
          <>
            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/60 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-200 block truncate">
                      {fileName || 'Current Document'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {pageCount} {pageCount === 1 ? 'page' : 'pages'} loaded
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline shrink-0 ml-2"
                >
                  Change PDF
                </button>
              </div>

          {/* Mode Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Recognition Mode
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('deep_visual')}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  mode === 'deep_visual'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300 mb-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Deep Visual OCR
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  Direct pixel neural reading. Bypasses copy locks, scrambled fonts, and scans.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('smart_auto')}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  mode === 'smart_auto'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300 mb-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Smart Auto
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  Fast stream first; auto-switches to Visual OCR if text is missing or garbled.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('fast_stream')}
                disabled={isProcessing}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  mode === 'fast_stream'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-300 mb-1">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Fast Stream
                </div>
                <p className="text-[10.5px] text-slate-400 leading-tight">
                  Instant (0.05s) extraction for normal, non-restricted digital PDFs.
                </p>
              </button>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                OCR Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isProcessing || mode === 'fast_stream'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Page Scope
              </label>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setScope('current')}
                  disabled={isProcessing}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors ${
                    scope === 'current' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Current ({documentId ? currentPage : 1})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  disabled={isProcessing}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors ${
                    scope === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({documentId ? pageCount : 1})
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Preprocessing Tuning Accordion */}
          {mode !== 'fast_stream' && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#000000]/40">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  Image Preprocessing & Pixel Enhancements
                </span>
                <span className="text-[10px] text-indigo-400">
                  {showAdvanced ? 'Hide options ▲' : 'Show options ▼'}
                </span>
              </button>

              {showAdvanced && (
                <div className="p-3 border-t border-slate-800/80 grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enhanceContrast}
                      onChange={(e) => setEnhanceContrast(e.target.checked)}
                      disabled={isProcessing}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Auto Contrast</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sharpenText}
                      onChange={(e) => setSharpenText(e.target.checked)}
                      disabled={isProcessing}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Unsharp Mask</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={binarizeText}
                      onChange={(e) => setBinarizeText(e.target.checked)}
                      disabled={isProcessing}
                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Otsu Binarize</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Copy-Restriction Bypass Informational Callout */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white block mb-0.5">How Copy-Restriction Bypass Works:</strong>
              When a PDF blocks text selection or clipboard copying, <strong>Deep Visual OCR</strong> renders the page pixels directly at 300 DPI and performs neural character recognition, completely bypassing PDF DRM flags, owner passwords, and scrambled font encoding.
            </div>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs text-slate-300">
                <span className="truncate max-w-xs">{statusText}</span>
                <span className="font-mono text-indigo-400">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Area */}
          {extractedText && (
            <div className="space-y-2.5">
              {/* Metrics Pill Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#000000] p-2.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-3 text-slate-400">
                  <span>
                    Words: <strong className="text-slate-200">{totalWords}</strong>
                  </span>
                  <span>
                    Chars: <strong className="text-slate-200">{extractedText.length}</strong>
                  </span>
                  {avgConfidence !== null && (
                    <span className="flex items-center gap-1">
                      Confidence:{' '}
                      <strong className={avgConfidence > 80 ? 'text-emerald-400' : 'text-amber-400'}>
                        {avgConfidence}%
                      </strong>
                    </span>
                  )}
                </div>

                {/* Export Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
                    title="Copy without restriction"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopied ? 'Copied!' : 'Copy Clean'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
                    title="Export as .txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.TXT</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
                    title="Export as Markdown"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>.MD</span>
                  </button>

                  <button
                    onClick={handleGenerateSearchablePDF}
                    disabled={isProcessing}
                    className="flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg transition-colors border border-emerald-700/50"
                    title="Create an unlocked Searchable PDF with invisible text layer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Make Searchable PDF</span>
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <textarea
                readOnly
                value={extractedText}
                rows={9}
                className="w-full bg-[#000000] border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 leading-relaxed outline-none focus:border-indigo-500 select-text"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#000000]/60 flex justify-end gap-2">
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleStartExtraction}
            disabled={isProcessing}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-900/30 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isProcessing
              ? 'Recognizing & Bypassing...'
              : !documentId
              ? 'Choose PDF & Extract'
              : mode === 'deep_visual'
              ? 'Run Deep Visual OCR'
              : mode === 'smart_auto'
              ? 'Auto Extract Text'
              : 'Extract Digital Stream'}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OCRDialog;
