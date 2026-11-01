import React, { useState, useRef } from 'react';
import {
  Wrench,
  X,
  Download,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { repairPdf, RepairResult } from '@/utils/repairPdf';

export const RepairDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { loadDocument } = useDocumentStore();
  const isOpen = activeModal === 'repair';

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilePicked = async (pickedFile: File) => {
    setFile(pickedFile);
    setResult(null);
    setIsProcessing(true);

    try {
      const buffer = await pickedFile.arrayBuffer();
      const res = await repairPdf(new Uint8Array(buffer));
      setResult(res);

      if (res.success) {
        addToast({
          type: 'success',
          title: 'PDF Repaired Successfully',
          message: `Recovered ${res.pageCount} page(s) and reconstructed xref streams.`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Repair Incomplete',
          message: res.error || 'Could not reconstruct valid PDF streams.',
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        pageCount: 0,
        originalBytes: pickedFile.size,
        repairedBytes: 0,
        error: err?.message || 'Failed to process file.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result?.data || !file) return;
    const blob = new Blob([result.data as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_Repaired.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenInEditor = async () => {
    if (!result?.data || !file) return;
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    await loadDocument(result.data, `${baseName}_Repaired.pdf`);
    setActiveModal(null);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setActiveModal(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Repair PDF"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleFilePicked(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col text-slate-800 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Repair PDF</h2>
              <p className="text-xs text-slate-500 font-medium">Reconstruct damaged cross-references & recovery streams</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!file ? (
            /* Upload State */
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFilePicked(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white hover:bg-amber-50/20 rounded-3xl p-8 text-center transition-all shadow-xs space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Wrench className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload Corrupted or Damaged PDF</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  We will parse damaged objects, rebuild the xref table, and recover readable document pages.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-2xl text-sm sm:text-base shadow-lg shadow-red-500/25 transition-all cursor-pointer"
                >
                  <FolderOpen className="w-5 h-5" />
                  <span>Select PDF file</span>
                </button>
                <p className="text-xs text-slate-400 mt-2 font-medium">or drop damaged PDF here</p>
              </div>
            </div>
          ) : isProcessing ? (
            /* Loading State */
            <div className="p-10 text-center space-y-3">
              <RotateCcw className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">Repairing Document Streams...</h4>
              <p className="text-xs text-slate-500">Rebuilding cross-references and normalizing objects...</p>
            </div>
          ) : result?.success ? (
            /* Success State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">PDF Successfully Repaired</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Recovered {result.pageCount} page(s). Rebuilt xref structure and output {Math.round(result.repairedBytes / 1024)} KB clean PDF.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1.5 font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>File Name:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[220px]">{file.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pages Recovered:</span>
                  <span className="font-bold text-slate-900">{result.pageCount}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Repaired Size:</span>
                  <span className="font-bold text-slate-900">{(result.repairedBytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Repaired PDF</span>
                </button>
                <button
                  onClick={handleOpenInEditor}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open in Editor</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                >
                  Repair another PDF
                </button>
              </div>
            </div>
          ) : (
            /* Error State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Repair Unsuccessful</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {result?.error || 'Unable to reconstruct document streams.'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                If the file was incompletely downloaded or encrypted with an unrecoverable cipher, standard recovery cannot restore missing binary data.
              </p>

              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Try Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
