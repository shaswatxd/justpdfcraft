import React, { useRef, useState } from 'react';
import { FolderOpen, FileText, UploadCloud } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const { loadDocument } = useDocumentStore();
  const { addToast } = useUIStore();

  const handleFile = async (file: File) => {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await handleFile(e.target.files[0]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      className={`p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-4 my-2 border-2 border-dashed rounded-2xl transition-all duration-200 ${
        isDragging
          ? 'border-blue-600 bg-blue-50/50 scale-[0.99]'
          : 'border-slate-200 hover:border-blue-400 bg-slate-50/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-xs">
        {isDragging ? <UploadCloud className="w-8 h-8 animate-bounce" /> : <Icon className="w-8 h-8" />}
      </div>

      <div className="space-y-1">
        <h4 className="text-base sm:text-lg font-bold text-gray-900">Select PDF for {toolName}</h4>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          {description || `Choose or drag a PDF document here to start the ${toolName} workflow. 100% private in your browser.`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer min-h-[44px]"
      >
        <FolderOpen className="w-4 h-4" />
        <span>{actionText || `Select PDF to ${toolName}`}</span>
      </button>

      <p className="text-[11px] text-gray-400 font-medium">or drop your PDF anywhere in this box</p>
    </div>
  );
};
