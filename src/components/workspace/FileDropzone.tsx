import React, { useRef, useState } from 'react';
import { UploadCloud, FolderPlus, ArrowLeft, Sparkles } from 'lucide-react';
import { ToolDefinition } from '../../types/pdf';

interface FileDropzoneProps {
  tool: ToolDefinition;
  onFilesSelected: (files: File[]) => void;
  onBack: () => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ tool, onFilesSelected, onBack }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const isImageTool = tool.id === 'jpg-to-pdf';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Studio Catalog</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-3">
          <Sparkles size={12} />
          <span>JustPDFCraft Workshop</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {tool.title}
        </h1>
        <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Modern Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-12 sm:p-16 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
            : 'border-slate-300/80 hover:border-indigo-400 bg-white shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={tool.accept}
          multiple={tool.multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <FolderPlus size={22} className="transition-transform group-hover:scale-110" />
            <span>{isImageTool ? 'Select Images' : tool.multiple ? 'Select PDF Files' : 'Select PDF File'}</span>
          </button>

          <p className="mt-5 text-xs sm:text-sm font-semibold text-slate-500">
            or drop {isImageTool ? 'images' : 'documents'} here directly
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <UploadCloud size={14} /> Drag &amp; Drop
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              100% In-Browser Privacy
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
