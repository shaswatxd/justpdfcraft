import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  FileType,
  Table,
  Download,
  Copy,
  Check,
  FolderOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { createDocx } from '@/utils/docx';
import { getPDFEngine } from '@core/pdf/engine.factory';
import {
  parseDocx,
  parseXlsx,
  parseCsv,
  renderWordToPdf,
  renderExcelToPdf,
  DocxElement,
} from '@/utils/officeParsers';

type DocTab =
  | 'word-to-pdf'
  | 'pdf-to-word'
  | 'excel-to-pdf'
  | 'txt-to-pdf'
  | 'markdown-to-pdf'
  | 'html-to-pdf'
  | 'pdf-to-txt';

export const DocumentToolsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeDocTab, addToast } = useUIStore();
  const { documentId, fileName, pageCount, loadDocument } = useDocumentStore();
  const isOpen = activeModal === 'document-tools';

  const [activeTab, setActiveTab] = useState<DocTab>('word-to-pdf');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Word to PDF state
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [wordTitle, setWordTitle] = useState('My Document');
  const [wordElements, setWordElements] = useState<DocxElement[]>([]);
  const [manualWordText, setManualWordText] = useState('');
  const [showManualWord, setShowManualWord] = useState(false);

  // Excel to PDF state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelTitle, setExcelTitle] = useState('Spreadsheet Report');
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [excelOrientation, setExcelOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [manualCsvText, setManualCsvText] = useState('');
  const [showManualCsv, setShowManualCsv] = useState(false);

  // PDF Text Extraction state
  const [extractedText, setExtractedText] = useState('');

  // Hidden file inputs
  const wordInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeDocTab) {
      setActiveTab(activeDocTab as DocTab);
    }
  }, [activeDocTab]);

  // Handle Word file selection (.docx, .doc, .txt, .md)
  const handleWordFile = async (file: File) => {
    setWordFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setWordTitle(cleanName);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      if (file.name.toLowerCase().endsWith('.docx')) {
        const parsed = await parseDocx(uint8, file.name);
        setWordElements(parsed.elements);
        if (parsed.title) setWordTitle(parsed.title);
        addToast({
          type: 'success',
          title: 'Word Document Loaded',
          message: `Parsed ${parsed.elements.length} paragraphs/headings from ${file.name}.`,
        });
      } else {
        // Plain text / Markdown fallback
        const text = new TextDecoder('utf-8').decode(uint8);
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const elements: DocxElement[] = lines.map((l) => ({
          type: l.startsWith('#') ? 'heading' : 'paragraph',
          text: l.replace(/^#+\s*/, ''),
        }));
        setWordElements(elements);
        addToast({
          type: 'success',
          title: 'Document Loaded',
          message: `Parsed ${elements.length} lines from ${file.name}.`,
        });
      }
    } catch (err: any) {
      console.error('Word parse error:', err);
      addToast({
        type: 'error',
        title: 'Could Not Parse File',
        message: err?.message || 'Failed to read Word document. Please ensure it is a valid .docx file.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Word to PDF
  const handleConvertWordToPdf = async () => {
    let elements = wordElements;
    if (elements.length === 0 && manualWordText.trim()) {
      elements = manualWordText
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => ({
          type: l.startsWith('#') ? 'heading' : 'paragraph',
          text: l.replace(/^#+\s*/, ''),
        }));
    }

    if (elements.length === 0) {
      addToast({ type: 'warning', title: 'No Content', message: 'Please select a Word document or enter text.' });
      return;
    }

    setIsProcessing(true);
    try {
      const pdfBytes = await renderWordToPdf(elements, { title: wordTitle });
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${wordTitle.replace(/\s+/g, '_')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      await loadDocument(pdfBytes, `${wordTitle}.pdf`);
      addToast({
        type: 'success',
        title: 'Word Document Converted to PDF',
        message: `Successfully generated ${wordTitle}.pdf and loaded into editor.`,
      });
      setActiveModal(null);
    } catch (err: any) {
      console.error('Word to PDF failed:', err);
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message || 'Could not export to PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Excel file selection (.xlsx, .xls, .csv)
  const handleExcelFile = async (file: File) => {
    setExcelFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    setExcelTitle(cleanName);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
        const text = new TextDecoder('utf-8').decode(uint8);
        const rows = parseCsv(text);
        setExcelRows(rows);
        if (rows[0] && rows[0].length > 5) setExcelOrientation('landscape');
        addToast({
          type: 'success',
          title: 'CSV File Loaded',
          message: `Parsed ${rows.length} rows with ${rows[0]?.length || 0} columns.`,
        });
      } else {
        const parsed = await parseXlsx(uint8);
        setExcelRows(parsed.rows);
        if (parsed.rows[0] && parsed.rows[0].length > 5) setExcelOrientation('landscape');
        addToast({
          type: 'success',
          title: 'Excel Workbook Loaded',
          message: `Parsed ${parsed.rows.length} rows from sheet "${parsed.sheetName}".`,
        });
      }
    } catch (err: any) {
      console.error('Excel parse error:', err);
      addToast({
        type: 'error',
        title: 'Could Not Parse Excel',
        message: err?.message || 'Failed to read Excel workbook. Please ensure it is a valid .xlsx or .csv file.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert Excel to PDF
  const handleConvertExcelToPdf = async () => {
    let rows = excelRows;
    if (rows.length === 0 && manualCsvText.trim()) {
      rows = parseCsv(manualCsvText);
    }

    if (rows.length === 0) {
      addToast({ type: 'warning', title: 'No Data', message: 'Please select an Excel file or paste CSV data.' });
      return;
    }

    setIsProcessing(true);
    try {
      const pdfBytes = await renderExcelToPdf(rows, {
        title: excelTitle,
        orientation: excelOrientation,
      });

      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${excelTitle.replace(/\s+/g, '_')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      await loadDocument(pdfBytes, `${excelTitle}.pdf`);
      addToast({
        type: 'success',
        title: 'Excel Converted to PDF',
        message: `Successfully rendered ${rows.length} rows to ${excelTitle}.pdf.`,
      });
      setActiveModal(null);
    } catch (err: any) {
      console.error('Excel to PDF failed:', err);
      addToast({ type: 'error', title: 'Conversion Failed', message: err?.message || 'Could not export Excel to PDF.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle PDF file selection for PDF to Word / PDF to Text
  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({ type: 'error', title: 'Invalid File', message: 'Please choose a valid .pdf file.' });
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name);
      addToast({ type: 'success', title: 'PDF Loaded', message: `${file.name} ready for conversion.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to Open PDF', message: err?.message || 'Could not parse PDF.' });
    }
  };

  // Convert PDF to Word (.docx)
  const handlePdfToWord = async () => {
    if (!documentId) {
      pdfInputRef.current?.click();
      return;
    }
    setIsProcessing(true);
    try {
      const engine = getPDFEngine();
      const paragraphs: any[] = [];

      for (let i = 0; i < pageCount; i++) {
        const textData = await engine.extractPageText(documentId, i);
        if (textData && textData.text) {
          for (const line of textData.text.split('\n')) {
            if (line.trim()) {
              paragraphs.push({ text: line.trim() });
            }
          }
        }
      }

      const docxBytes = await createDocx(paragraphs);
      const blob = new Blob([docxBytes as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName ? fileName.replace(/\.pdf$/i, '') : 'document') + '.docx';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast({ type: 'success', title: 'Word Document (.docx) Exported' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Conversion Failed', message: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Extract PDF Text
  const handleExtractPdfText = async () => {
    if (!documentId) {
      pdfInputRef.current?.click();
      return;
    }
    setIsProcessing(true);
    try {
      const engine = getPDFEngine();
      let allText = '';
      for (let i = 0; i < pageCount; i++) {
        const data = await engine.extractPageText(documentId, i);
        if (data?.text) {
          allText += `--- Page ${i + 1} ---\n` + data.text + '\n\n';
        }
      }
      setExtractedText(allText.trim());
      addToast({ type: 'success', title: 'Text Extracted from All Pages' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Extraction Failed', message: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: DocTab; label: string; icon: any }[] = [
    { id: 'word-to-pdf', label: 'Word to PDF', icon: FileType },
    { id: 'excel-to-pdf', label: 'Excel to PDF', icon: Table },
    { id: 'pdf-to-word', label: 'PDF to Word (.docx)', icon: FileType },
    { id: 'txt-to-pdf', label: 'TXT to PDF', icon: FileText },
    { id: 'markdown-to-pdf', label: 'Markdown to PDF', icon: FileText },
    { id: 'pdf-to-txt', label: 'PDF to Text', icon: Copy },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in" role="dialog" aria-modal="true" aria-label="Document Conversion Suite">
      {/* Hidden File Inputs */}
      <input
        ref={wordInputRef}
        type="file"
        accept=".docx,.doc,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleWordFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleExcelFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handlePdfUpload(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl h-[92dvh] max-h-[94dvh] sm:h-[88vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Document Converters</h2>
              <p className="text-xs text-slate-500 font-medium">100% Client-Side Word & Excel Conversion • Zero Cloud Uploads</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Nav Bar */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-3 sm:px-4 py-2 gap-1.5 bg-white shrink-0 scrollbar-none touch-pan-x">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          {/* WORD TO PDF */}
          {activeTab === 'word-to-pdf' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {!wordFile && wordElements.length === 0 ? (
                /* Empty Upload State - iLovePDF Big Button */
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleWordFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-red-300 hover:border-red-500 bg-white hover:bg-red-50/20 rounded-3xl p-8 sm:p-12 text-center transition-all shadow-xs space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                    <FileType className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Word to PDF</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                      Convert your DOCX documents to PDF with standard formatting and layout preservation.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => wordInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-2xl text-base shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-5 h-5" />
                      <span>Select WORD files</span>
                    </button>
                    <p className="text-xs text-slate-400 mt-2 font-medium">or drop Word (.docx) files here</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualWord(!showManualWord)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                    >
                      {showManualWord ? 'Hide manual text entry' : 'Or paste document text manually'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected File / Parsed Preview State */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{wordFile ? wordFile.name : 'Custom Document'}</h4>
                      <p className="text-xs text-slate-500">
                        {wordElements.length} paragraphs parsed • Ready to convert
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWordFile(null);
                        setWordElements([]);
                      }}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      Choose another file
                    </button>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                    <input
                      type="text"
                      value={wordTitle}
                      onChange={(e) => setWordTitle(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Document Preview</span>
                      <span className="text-[11px] text-slate-400">{wordElements.length} blocks</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 space-y-2 font-sans">
                      {wordElements.map((el, idx) => (
                        <p key={idx} className={el.type === 'heading' ? 'font-bold text-slate-900 text-sm' : ''}>
                          {el.text}
                        </p>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleConvertWordToPdf}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>{isProcessing ? 'Generating PDF...' : 'Convert to PDF'}</span>
                  </button>
                </div>
              )}

              {/* Manual Entry Fallback */}
              {showManualWord && (!wordFile || wordElements.length === 0) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Paste Text Directly</h4>
                  <textarea
                    value={manualWordText}
                    onChange={(e) => setManualWordText(e.target.value)}
                    rows={6}
                    placeholder="Type or paste document text here..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 resize-none"
                  />
                  <button
                    onClick={handleConvertWordToPdf}
                    disabled={isProcessing || !manualWordText.trim()}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Generate PDF from Text
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EXCEL TO PDF */}
          {activeTab === 'excel-to-pdf' && (
            <div className="max-w-2xl mx-auto space-y-4">
              {!excelFile && excelRows.length === 0 ? (
                /* Empty Upload State - iLovePDF Big Button */
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleExcelFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 rounded-3xl p-8 sm:p-12 text-center transition-all shadow-xs space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <Table className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Excel to PDF</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                      Make EXCEL spreadsheets easy to read by converting them to clean, tabular PDF pages.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => excelInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl text-base shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-5 h-5" />
                      <span>Select EXCEL files</span>
                    </button>
                    <p className="text-xs text-slate-400 mt-2 font-medium">or drop Excel (.xlsx, .csv) files here</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowManualCsv(!showManualCsv)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                    >
                      {showManualCsv ? 'Hide manual CSV entry' : 'Or paste CSV table data manually'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Selected File / Parsed Table Preview State */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{excelFile ? excelFile.name : 'Spreadsheet Data'}</h4>
                      <p className="text-xs text-slate-500">
                        {excelRows.length} rows • {excelRows[0]?.length || 0} columns parsed
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setExcelFile(null);
                        setExcelRows([]);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Choose another file
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                      <input
                        type="text"
                        value={excelTitle}
                        onChange={(e) => setExcelTitle(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Page Orientation</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExcelOrientation('portrait')}
                          className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            excelOrientation === 'portrait'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => setExcelOrientation('landscape')}
                          className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            excelOrientation === 'landscape'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Spreadsheet Preview (First 5 Rows)</span>
                      <span className="text-[11px] text-slate-400">Total {excelRows.length} rows</span>
                    </label>
                    <div className="max-h-44 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <tbody>
                          {excelRows.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx === 0 ? 'bg-emerald-100/60 font-bold text-emerald-950' : 'border-t border-slate-200'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 border-r border-slate-200 whitespace-nowrap">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    onClick={handleConvertExcelToPdf}
                    disabled={isProcessing}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>{isProcessing ? 'Rendering PDF Table...' : 'Convert to PDF'}</span>
                  </button>
                </div>
              )}

              {/* Manual Entry Fallback */}
              {showManualCsv && (!excelFile || excelRows.length === 0) && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">Paste Comma-Separated Values (CSV)</h4>
                  <textarea
                    value={manualCsvText}
                    onChange={(e) => setManualCsvText(e.target.value)}
                    rows={6}
                    placeholder="Name, Department, Salary\nJohn Doe, Engineering, $95,000"
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 resize-none"
                  />
                  <button
                    onClick={handleConvertExcelToPdf}
                    disabled={isProcessing || !manualCsvText.trim()}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Generate PDF Table from CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PDF TO WORD (.DOCX) */}
          {activeTab === 'pdf-to-word' && (
            <div className="max-w-xl mx-auto space-y-4 text-center">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 mx-auto">
                  <FileType className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">PDF to Editable Microsoft Word (.docx)</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Converts paragraphs, fonts, and text structure into a native editable Word document.
                  </p>
                </div>

                {documentId ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Active File: <strong className="text-slate-900">{fileName || 'Document.pdf'}</strong></span>
                    <span className="text-slate-500">{pageCount} page(s)</span>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                    <p className="text-xs text-slate-600 font-medium">Select a PDF to convert to Word document</p>
                    <button
                      type="button"
                      onClick={() => pdfInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Select PDF File</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={handlePdfToWord}
                  disabled={isProcessing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isProcessing ? 'Generating .docx...' : documentId ? 'Convert & Download .docx' : 'Select PDF to Convert'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TXT / MARKDOWN TO PDF */}
          {(activeTab === 'txt-to-pdf' || activeTab === 'markdown-to-pdf') && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {activeTab === 'markdown-to-pdf' ? 'Markdown to PDF' : 'Text to PDF'}
                </h4>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                  <input
                    type="text"
                    value={wordTitle}
                    onChange={(e) => setWordTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Input Text</label>
                  <textarea
                    value={manualWordText}
                    onChange={(e) => setManualWordText(e.target.value)}
                    rows={8}
                    placeholder="Type or paste content here..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 shadow-2xs resize-none focus:outline-none focus:border-red-500"
                  />
                </div>
                <button
                  onClick={handleConvertWordToPdf}
                  disabled={isProcessing || !manualWordText.trim()}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Compile PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* PDF TO TEXT */}
          {activeTab === 'pdf-to-txt' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">PDF to Plain Text & Markdown</h4>
                    <p className="text-xs text-slate-500">Extract clean digital text from all pages.</p>
                  </div>
                  <button
                    onClick={handleExtractPdfText}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {isProcessing ? 'Extracting...' : documentId ? 'Extract Text Now' : 'Select PDF'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={extractedText}
                  placeholder="Extracted document text will appear here..."
                  rows={10}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 resize-none font-mono"
                />
                {extractedText && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(extractedText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
