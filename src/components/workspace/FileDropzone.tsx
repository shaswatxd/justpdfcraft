import React, { useRef, useState } from 'react';
import { UploadCloud, FolderPlus, ArrowLeft, ShieldCheck } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        <span>Back to all tools</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {tool.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Modern Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-white shadow-xs'
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
            className="group inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 text-sm sm:text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FolderPlus size={18} className="transition-transform group-hover:scale-105" />
            <span>{isImageTool ? 'Select Images' : tool.multiple ? 'Select PDF Files' : 'Select PDF File'}</span>
          </button>

          <p className="mt-3.5 text-xs sm:text-sm text-slate-500">
            or drop {isImageTool ? 'images' : 'PDF files'} here directly
          </p>

          <div className="mt-6 flex items-center justify-center gap-2.5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200/60 font-medium">
              <UploadCloud size={13} className="text-slate-500" /> Drag &amp; Drop
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-md border border-slate-200/60 font-medium text-slate-600">
              <ShieldCheck size={13} className="text-emerald-600" /> Processed Locally in Browser
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
