import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  FileType,
  Table,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createDocx } from '@/utils/docx';
import { getPDFEngine } from '@core/pdf/engine.factory';

type DocTab =
  | 'word-to-pdf'
  | 'pdf-to-word'
  | 'excel-to-pdf'
  | 'txt-to-pdf'
  | 'html-to-pdf'
  | 'csv-to-pdf'
  | 'markdown-to-pdf'
  | 'pdf-to-txt';

export const DocumentToolsDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeDocTab, addToast } = useUIStore();
  const { documentId, fileName, pageCount } = useDocumentStore();
  const isOpen = activeModal === 'document-tools';

  const [activeTab, setActiveTab] = useState<DocTab>('word-to-pdf');
  const [inputText, setInputText] = useState('Type or paste document content here...');
  const [docTitle, setDocTitle] = useState('My Document');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeDocTab) {
      setActiveTab(activeDocTab as DocTab);
    }
  }, [activeDocTab]);

  // Convert Text / Markdown / HTML / CSV to PDF
  const compileTextToPdf = async (customText?: string, title?: string) => {
    const textToUse = customText || inputText;
    const titleToUse = title || docTitle;
    if (!textToUse.trim()) return;

    setIsProcessing(true);
    try {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const maxLineWidth = pageWidth - margin * 2;
      const fontSize = 10.5;
      const lineHeight = 15;

      let page = doc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      if (titleToUse.trim()) {
        page.drawText(titleToUse.trim(), {
          x: margin,
          y,
          size: 18,
          font: bold,
          color: rgb(0.1, 0.15, 0.3),
        });
        y -= 28;
      }

      const paragraphs = textToUse.split('\n');
      for (const para of paragraphs) {
        if (!para.trim()) {
          y -= lineHeight * 0.75;
          if (y < margin + lineHeight) {
            page = doc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          continue;
        }

        const isHeading = para.startsWith('# ') || para.startsWith('## ');
        const cleanPara = para.replace(/^#+\s*/, '');
        const currentFont = isHeading ? bold : font;
        const currentSize = isHeading ? 14 : fontSize;

        const words = cleanPara.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = currentFont.widthOfTextAtSize(testLine, currentSize);
          if (width > maxLineWidth && currentLine) {
            page.drawText(currentLine, {
              x: margin,
              y,
              size: currentSize,
              font: currentFont,
              color: isHeading ? rgb(0.1, 0.2, 0.4) : rgb(0.15, 0.15, 0.15),
            });
            y -= lineHeight;
            if (y < margin + lineHeight) {
              page = doc.addPage([pageWidth, pageHeight]);
              y = pageHeight - margin;
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          page.drawText(currentLine, {
            x: margin,
            y,
            size: currentSize,
            font: currentFont,
            color: isHeading ? rgb(0.1, 0.2, 0.4) : rgb(0.15, 0.15, 0.15),
          });
          y -= lineHeight;
          if (y < margin + lineHeight) {
            page = doc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
      }

      const pdfBytes = await doc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titleToUse.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({ type: 'success', title: 'PDF Created Successfully' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Export Failed', message: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert PDF to Word (.docx)
  const handlePdfToWord = async () => {
    if (!documentId) {
      addToast({ type: 'warning', title: 'No PDF Open', message: 'Please open a PDF first to convert to Word.' });
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
      const blob = new Blob([new Uint8Array(docxBytes)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName ? fileName.replace(/\.pdf$/i, '') : 'document') + '.docx';
      a.click();
      URL.revokeObjectURL(url);
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
      addToast({ type: 'warning', title: 'No PDF Open', message: 'Please open a PDF first.' });
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
    { id: 'pdf-to-word', label: 'PDF to Word (.docx)', icon: FileType },
    { id: 'excel-to-pdf', label: 'Excel / CSV to PDF', icon: Table },
    { id: 'txt-to-pdf', label: 'TXT to PDF', icon: FileText },
    { id: 'markdown-to-pdf', label: 'Markdown to PDF', icon: FileText },
    { id: 'html-to-pdf', label: 'HTML to PDF', icon: FileText },
    { id: 'pdf-to-txt', label: 'PDF to Text', icon: Copy },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Document Conversion Suite</h2>
              <p className="text-xs text-slate-500 font-medium">Word, Excel, Text, Markdown & HTML to PDF</p>
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
        <div className="flex overflow-x-auto border-b border-slate-100 px-4 py-2 gap-1.5 bg-white shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
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
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {/* WORD TO PDF */}
          {activeTab === 'word-to-pdf' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900">Word Document to PDF Compiler</h4>
                <p className="text-xs text-slate-500">
                  Paste Word document text or drop a text file to compile into a crisp, multi-page PDF document.
                </p>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Content</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={8}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                  />
                </div>
                <button
                  onClick={() => compileTextToPdf()}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isProcessing ? 'Compiling PDF...' : 'Compile to PDF'}</span>
                </button>
              </div>
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
                    Converts paragraphs and text structure into a native editable Word document.
                  </p>
                </div>
                {documentId ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs font-semibold text-slate-700">
                    Active File: <strong className="text-slate-900">{fileName || 'Document.pdf'}</strong>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 font-semibold">Please open a PDF file from the editor or homepage.</p>
                )}
                <button
                  onClick={handlePdfToWord}
                  disabled={isProcessing || !documentId}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{isProcessing ? 'Generating .docx...' : 'Convert & Download .docx'}</span>
                </button>
              </div>
            </div>
          )}

          {/* EXCEL / CSV TO PDF */}
          {activeTab === 'excel-to-pdf' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900">CSV & Tabular Data to PDF</h4>
                <p className="text-xs text-slate-500">Paste comma-separated data to render clean formatted table rows in PDF.</p>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">CSV Data</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={8}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                    placeholder="Name, Role, Department\nJohn Doe, Lead Engineer, Technology\nJane Smith, Designer, Product"
                  />
                </div>
                <button
                  onClick={() => compileTextToPdf(undefined, 'Tabular Data Report')}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Generate Table PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* TXT / MARKDOWN / HTML TO PDF */}
          {(activeTab === 'txt-to-pdf' || activeTab === 'markdown-to-pdf' || activeTab === 'html-to-pdf') && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {activeTab === 'markdown-to-pdf' ? 'Markdown to PDF' : activeTab === 'html-to-pdf' ? 'HTML to PDF' : 'Text to PDF'}
                </h4>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Document Title</label>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Input Text</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={8}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                  />
                </div>
                <button
                  onClick={() => compileTextToPdf()}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
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
                  <h4 className="text-sm font-bold text-slate-900">PDF to Plain Text & Markdown</h4>
                  <button
                    onClick={handleExtractPdfText}
                    disabled={isProcessing || !documentId}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {isProcessing ? 'Extracting...' : 'Extract Text Now'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={extractedText || 'Extracted document text will appear here...'}
                  rows={10}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 shadow-2xs resize-none"
                />
                {extractedText && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(extractedText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
