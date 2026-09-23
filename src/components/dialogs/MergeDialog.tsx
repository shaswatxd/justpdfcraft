import React, { useState, useEffect } from 'react';
import { Layers, X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';

interface MergeFileItem {
  id: string;
  name: string;
  bytes: Uint8Array;
}

export const MergeDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const { loadDocument, documentId, fileBytes, fileName } = useDocumentStore();

  const [files, setFiles] = useState<MergeFileItem[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    if (activeModal === 'merge') {
      if (fileBytes && documentId && files.length === 0) {
        const nameWithExt = fileName
          ? fileName.toLowerCase().endsWith('.pdf')
            ? fileName
            : `${fileName}.pdf`
          : 'Current Document.pdf';
        setFiles([
          {
            id: 'current_active_doc',
            name: `${nameWithExt} (Active)`,
            bytes: fileBytes,
          },
        ]);
      }
    }
  }, [activeModal, documentId, fileBytes, fileName]);

  if (activeModal !== 'merge') return null;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newItems: MergeFileItem[] = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const f = e.target.files[i];
      if (f.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await f.arrayBuffer();
        newItems.push({
          id: `f_${Date.now()}_${i}`,
          name: f.name,
          bytes: new Uint8Array(buffer),
        });
      }
    }

    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    const copy = [...files];
    const item = copy.splice(index, 1)[0];
    copy.splice(targetIndex, 0, item);
    setFiles(copy);
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleExecuteMerge = async () => {
    if (files.length < 2) {
      addToast({
        type: 'warning',
        title: 'At Least 2 Files Required',
        message: 'Please add at least two PDF documents to merge.',
      });
      return;
    }

    setIsMerging(true);
    try {
      const engine = getPDFEngine();
      const mergedBytes = await engine.mergeDocuments(files.map((f) => f.bytes));

      // Load directly into editor
      await loadDocument(mergedBytes, `Merged_${files[0].name}`);
      setFiles([]);
      setActiveModal(null);

      addToast({
        type: 'success',
        title: 'Merge Complete',
        message: `Merged ${files.length} PDFs into a single document.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Merge Failed',
        message: err?.message || 'Could not merge documents.',
      });
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Merge Dialog">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Merge PDF Documents</h3>
              <p className="text-xs text-slate-400">Combine multiple PDF files into one continuous document</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFiles([]);
              setActiveModal(null);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* File Picker Button */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!e.dataTransfer.files) return;
              const newItems: MergeFileItem[] = [];
              for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const f = e.dataTransfer.files[i];
                if (f.name.toLowerCase().endsWith('.pdf')) {
                  const buffer = await f.arrayBuffer();
                  newItems.push({
                    id: `f_${Date.now()}_${i}`,
                    name: f.name,
                    bytes: new Uint8Array(buffer),
                  });
                }
              }
              if (newItems.length > 0) {
                setFiles((prev) => [...prev, ...newItems]);
              }
            }}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-800/40 hover:bg-slate-800/80 p-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 transition-all"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Add PDF Files... (or drag & drop PDFs here)</span>
            <input
              type="file"
              accept=".pdf"
              multiple
              onClick={(e) => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={handleFilesSelected}
              className="hidden"
            />
          </label>

          {/* Files List */}
          <div className="space-y-2">
            {files.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-8">
                No files added yet. Click above to select PDFs to merge.
              </p>
            ) : (
              files.map((file, idx) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between bg-slate-800/60 border border-slate-800 p-2.5 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="font-mono text-slate-500 font-bold w-4">{idx + 1}</span>
                    <span className="truncate max-w-[200px] text-slate-200 font-medium">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({(file.bytes.byteLength / 1024).toFixed(0)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-700 disabled:opacity-20 rounded text-slate-400"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === files.length - 1}
                      className="p-1 hover:bg-slate-700 disabled:opacity-20 rounded text-slate-400"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(file.id)}
                      className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors ml-1"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <span className="text-xs text-slate-400">{files.length} document(s)</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFiles([]);
                setActiveModal(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteMerge}
              disabled={isMerging || files.length < 2}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              {isMerging ? 'Merging...' : 'Merge All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
