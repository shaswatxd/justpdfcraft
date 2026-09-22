import React, { useRef } from 'react';
import { FolderOpen, FileText } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';

interface NoDocumentStateProps {
  toolName: string;
  description?: string;
  icon?: any;
  actionText?: string;
}

export const NoDocumentState: React.FC<NoDocumentStateProps> = ({
  toolName,
  description,
  icon: Icon = FileText,
  actionText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadDocument } = useDocumentStore();
  const { addToast } = useUIStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({
        type: 'error',
        title: 'Unsupported File Type',
        message: 'Please select a valid .pdf document.',
      });
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await loadDocument(new Uint8Array(buffer), file.name, (file as any).path);
      addToast({
        type: 'success',
        title: 'Document Loaded',
        message: `${file.name} is ready for ${toolName}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Open PDF',
        message: err?.message || 'Could not load PDF document.',
      });
    }
  };

  return (
    <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 my-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-16 h-16 rounded-2xl bg-swift-500/10 text-swift-400 flex items-center justify-center border border-swift-500/20 shadow-inner">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-bold text-white">No PDF Document Open</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          {description || `Please select a PDF document first to use the ${toolName} workflow.`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-5 py-2.5 bg-swift-600 hover:bg-swift-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-swift-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <FolderOpen className="w-4 h-4" />
        <span>{actionText || `Select PDF to ${toolName}`}</span>
      </button>
    </div>
  );
};
