import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, X, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const SanitizeDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const {
    documentId,
    metadata,
    fileName,
    filePath,
    loadDocument,
    pushHistory,
  } = useDocumentStore();

  const [isSanitizing, setIsSanitizing] = useState(false);
  const [sanitizedReport, setSanitizedReport] = useState<{
    strippedFields: string[];
    hasXmpStreamPurged: boolean;
  } | null>(null);

  if (activeModal !== 'sanitize') return null;

  // Calculate potential privacy leaks
  const leaks: Array<{ label: string; value: string | undefined }> = [
    { label: 'Author / Owner', value: metadata?.author },
    { label: 'Document Title', value: metadata?.title },
    { label: 'Subject', value: metadata?.subject },
    { label: 'Creator Software', value: metadata?.creator },
    { label: 'Producer Tool', value: metadata?.producer },
    {
      label: 'Creation Timestamp',
      value: metadata?.creationDate ? new Date(metadata.creationDate).toLocaleString() : undefined,
    },
    {
      label: 'Modification Timestamp',
      value: metadata?.modificationDate ? new Date(metadata.modificationDate).toLocaleString() : undefined,
    },
  ];

  const populatedLeaks = leaks.filter((l) => Boolean(l.value && l.value.trim().length > 0));

  const handleSanitize = async () => {
    if (!documentId) return;
    setIsSanitizing(true);

    try {
      await pushHistory('Sanitize document metadata');
      const engine = getPDFEngine();
      const result = await engine.sanitizeDocument(documentId);

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setSanitizedReport({
        strippedFields: result.strippedFields,
        hasXmpStreamPurged: result.hasXmpStreamPurged,
      });

      addToast({
        type: 'success',
        title: 'Document Sanitized',
        message: `Successfully stripped ${result.strippedFields.length} metadata and system tags.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Sanitization Failed',
        message: err?.message || 'Failed to sanitize document.',
      });
    } finally {
      setIsSanitizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sanitize Dialog">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Document Sanitizer & Metadata Scrubber</h3>
              <p className="text-xs text-slate-400">
                Purge hidden identifiers, software fingerprints, and XML streams
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Sanitizer"
            description="Please select a PDF document first to inspect metadata and purge hidden identifiers."
            icon={ShieldCheck}
            actionText="Select PDF to Sanitize"
          />
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
          {/* Status Threat Banner */}
          {sanitizedReport ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-300 text-xs">Document Successfully Sanitized</h4>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  All personal names, editing history, creation timestamps, and hidden XMP streams have been permanently purged.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sanitizedReport.strippedFields.map((field) => (
                    <span
                      key={field}
                      className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono text-[10px] font-semibold"
                    >
                      ✓ {field}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : populatedLeaks.length > 0 ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-300 text-xs">
                  {populatedLeaks.length} Privacy Identifier{populatedLeaks.length > 1 ? 's' : ''} Detected
                </h4>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  This document contains embedded personal names, software versions, or timestamps that could be leaked when sharing.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-200 text-xs">Standard Metadata Clean</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  No standard personal tags detected. Running sanitizer will ensure any hidden raw catalog XML streams are also eliminated.
                </p>
              </div>
            </div>
          )}

          {/* Existing Metadata Inspection Table */}
          <div>
            <label className="font-semibold text-slate-300 block mb-1.5">
              Metadata & Device Inspection
            </label>
            <div className="bg-slate-950/60 rounded-xl border border-slate-800 divide-y divide-slate-800/60 overflow-hidden">
              {leaks.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-3.5 py-2">
                  <span className="text-slate-400 font-medium">{item.label}</span>
                  {item.value ? (
                    <span className="text-amber-400 font-mono text-[11px] max-w-[240px] truncate" title={item.value}>
                      {item.value}
                    </span>
                  ) : (
                    <span className="text-slate-600 font-mono text-[11px]">[None / Clean]</span>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between px-3.5 py-2">
                <span className="text-slate-400 font-medium">Catalog XMP Stream</span>
                <span className="text-swift-400 font-mono text-[11px]">
                  {sanitizedReport ? '[Purged]' : 'Scrub on Clean'}
                </span>
              </div>
            </div>
          </div>

          {/* Security Guarantee Checklist */}
          <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
            <h5 className="font-bold text-slate-200 text-xs mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-swift-400" />
              JustPDFCraft Privacy & Sanitization Guarantee
            </h5>
            <p className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Completely strips Author, Creator, Subject, and Title tags.
            </p>
            <p className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Wipes operating system, hardware identifiers, and editing tools.
            </p>
            <p className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> Deletes raw `/Metadata` catalog XML packets without corrupting PDF page layout.
            </p>
            <p className="flex items-center gap-1.5 text-slate-400">
              <span className="text-emerald-400 font-bold">✓</span> 100% local processing with zero telemetry or network transmission.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {sanitizedReport ? 'Ready for distribution' : 'Action is undoable via Ctrl+Z'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {sanitizedReport ? 'Done' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSanitize}
              disabled={isSanitizing}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSanitizing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sanitizing...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{sanitizedReport ? 'Re-Sanitize' : 'Sanitize & Clean Document'}</span>
                </>
              )}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};
