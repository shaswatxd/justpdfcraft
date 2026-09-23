import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  X,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Download,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const ProtectDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { documentId, metadata, pushHistory, fileName, filePath, loadDocument } = useDocumentStore();

  const [activeTab, setActiveTab] = useState<'unlock' | 'protect'>('unlock');
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restrictPrinting, setRestrictPrinting] = useState(false);
  const [restrictEditing, setRestrictEditing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (activeModal !== 'protect') return null;

  const isCurrentlyEncrypted = metadata?.isEncrypted;

  const handleApplyProtection = async () => {
    if (!documentId) return;

    if (userPassword !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please verify.',
      });
      return;
    }

    if (userPassword.length < 4) {
      addToast({
        type: 'warning',
        title: 'Password Too Short',
        message: 'Password must be at least 4 characters long.',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await pushHistory('Protect document with password');
      const engine = getPDFEngine();
      await engine.encryptDocument(documentId, userPassword, undefined, {
        allowPrinting: !restrictPrinting,
        allowModifying: !restrictEditing,
      });
      const savedBytes = await engine.saveDocument(documentId);

      if (fileName) {
        await loadDocument(savedBytes, fileName, filePath || undefined, userPassword);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Document Protected',
        message: 'Password encryption flags applied to PDF.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Encryption Failed',
        message: err?.message || 'Could not encrypt PDF.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUniversalUnlock = async (saveAsNewFile: boolean = false) => {
    if (!documentId) return;
    try {
      setIsProcessing(true);
      const engine = getPDFEngine();
      const unlockedBytes = await engine.unlockAndStripPermissions(documentId);

      if (saveAsNewFile) {
        const blob = new Blob([unlockedBytes as unknown as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName ? fileName.replace(/\.pdf$/i, '') : 'Document'}_Unlocked.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({
          type: 'success',
          title: 'Unlocked PDF Downloaded',
          message: 'Saved fully unrestricted, unencrypted PDF copy.',
        });
      } else {
        if (fileName) {
          await loadDocument(unlockedBytes, fileName, filePath || undefined);
        }
        addToast({
          type: 'success',
          title: 'Document Unlocked',
          message: 'All DRM restrictions, print locks, and owner permissions stripped successfully.',
        });
        setActiveModal(null);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Unlock Failed',
        message: err?.message || 'Failed to strip document restrictions.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Security & Permissions Center</h3>
              <p className="text-xs text-slate-400">
                Unlock restricted PDFs or apply standard password protection
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

        {!documentId ? (
          <NoDocumentState
            toolName="Protect & Unlock"
            description="Please select a PDF document first to remove permissions or apply password encryption."
            icon={Shield}
            actionText="Select PDF to Protect"
          />
        ) : (
          <>
            {/* Tab Selector */}
            <div className="px-6 pt-3 border-b border-slate-800 flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('unlock')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'unlock'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            Universal PDF Unlocker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('protect')}
            className={`pb-2.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'protect'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Password Encryption
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'unlock' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>1-Click Universal Permission Stripper</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Bypass owner restrictions, print disablement flags, content copy locks, and form editing limits. Re-encodes the PDF without the encryption dictionary so it becomes 100% free and open in all viewers.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Enables High-Resolution Printing & Content Copying</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Removes Owner Passwords & Annotation Bans</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>100% Local-first — zero data leaves your device</span>
                  </div>
                </div>
              </div>

              {isCurrentlyEncrypted && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Document currently has encryption flags enabled.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleUniversalUnlock(false)}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Current PDF</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleUniversalUnlock(true)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Unlocked Copy</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Set Document Password</label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-semibold text-slate-400 block">Permissions Restrictions</label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restrictPrinting}
                    onChange={(e) => setRestrictPrinting(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Disallow High-Resolution Printing</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restrictEditing}
                    onChange={(e) => setRestrictEditing(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Disallow Content Modification</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleApplyProtection}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Apply Password
                </button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
};
