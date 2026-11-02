import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  ShieldCheck,
  Download,
  Trash2,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { downloadBlob } from '@/utils/download';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const MetadataDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, fileName } = useDocumentStore();
  const isOpen = activeModal === 'metadata';

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');
  const [creationDate, setCreationDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      loadMeta();
    }
  }, [isOpen, documentId]);

  const loadMeta = async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const engine = getPDFEngine();
      const meta = await engine.getMetadata(documentId);
      setTitle(meta.title || '');
      setAuthor(meta.author || '');
      setSubject(meta.subject || '');
      setKeywords(meta.keywords ? meta.keywords.join(', ') : '');
      setCreator(meta.creator || '');
      setProducer(meta.producer || '');
      setCreationDate(meta.creationDate ? new Date(meta.creationDate).toLocaleString() : 'Unknown');
    } catch (err: any) {
      console.warn('Failed to load metadata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleWipeAll = () => {
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords('');
    setCreator('JustPDFCraft Privacy Scrubber');
    setProducer('JustPDFCraft');
    addToast({
      type: 'info',
      title: 'Metadata Wiped',
      message: 'All personal tracking information cleared. Click Save to download clean PDF.',
    });
  };

  const handleSave = async () => {
    if (!documentId) return;
    setIsProcessing(true);

    try {
      const engine = getPDFEngine();
      const parsedKeywords = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      await engine.updateMetadata(documentId, {
        title,
        author,
        subject,
        keywords: parsedKeywords,
        creator,
        producer,
      });

      const updatedBytes = await engine.saveDocument(documentId);
      const blob = new Blob([updatedBytes as any], { type: 'application/pdf' });
      const baseName = fileName ? fileName.replace(/\.pdf$/i, '') : 'document';
      downloadBlob(blob, `${baseName}_updated_metadata.pdf`);

      addToast({
        type: 'success',
        title: 'Metadata Updated',
        message: 'Saved updated document properties and downloaded PDF.',
      });

      setActiveModal(null);
    } catch (err: any) {
      console.error('Metadata update error:', err);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err?.message || 'Could not update document metadata.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">PDF Metadata & Privacy Scrubber</h2>
              <p className="text-xs text-slate-500">
                Edit document properties or wipe tracking information • 100% Client-Side
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!documentId ? (
            <NoDocumentState
              toolName="Edit PDF Metadata"
              description="Inspect or sanitize Document Title, Author, Keywords, and software fingerprinting."
              icon={Tag}
              actionText="Select PDF to Edit"
            />
          ) : isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
              <p className="text-xs text-slate-500">Reading document metadata dictionary...</p>
            </div>
          ) : (
            <>
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">{fileName}</span>
                </div>
                {creationDate && (
                  <span className="text-[11px] text-slate-400 shrink-0">Created: {creationDate}</span>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Document Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Financial Report 2026"
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Author</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Quarterly Audit"
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. finance, tax, 2026, certified"
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Creator Application</label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      placeholder="e.g. JustPDFCraft"
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">PDF Producer</label>
                    <input
                      type="text"
                      value={producer}
                      onChange={(e) => setProducer(e.target.value)}
                      placeholder="e.g. JustPDFCraft Core Engine"
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    />
                  </div>
                </div>
              </div>

              {/* Privacy Scrubber 1-Click Banner */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200/60 rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-rose-900 block">
                    Privacy Scrubber (Anonymous PDF)
                  </span>
                  <span className="text-[11px] text-rose-700/80">
                    Wipe personal names, authors, and computer identifiers.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleWipeAll}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All</span>
                </button>
              </div>

              {/* Privacy Notice */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Metadata is modified locally in browser memory. Zero tracking.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {documentId && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isProcessing}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-black rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isProcessing ? 'Saving...' : 'Save & Download PDF'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
