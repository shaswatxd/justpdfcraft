import React from 'react';
import { 
  RotateCw, 
  Trash2, 
  Plus, 
  FileText, 
  ArrowLeft, 
  ArrowRight,
  MoveLeft,
  MoveRight
} from 'lucide-react';
import { UploadedFile, ToolId } from '../../types/pdf';

interface PageItem {
  pageNumber: number;
  rotation: number;
  thumbnail?: string;
  originalIndex: number;
}

interface FileCanvasProps {
  toolId: ToolId;
  files: UploadedFile[];
  pages: PageItem[];
  onAddMoreFiles: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onRotateFile: (fileId: string) => void;
  onMoveFile: (index: number, direction: 'left' | 'right') => void;
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onMovePage: (index: number, direction: 'left' | 'right') => void;
  allowMultiple: boolean;
  accept: string;
}

export const FileCanvas: React.FC<FileCanvasProps> = ({
  toolId,
  files,
  pages,
  onAddMoreFiles,
  onRemoveFile,
  onRotateFile,
  onMoveFile,
  onRotatePage,
  onDeletePage,
  onMovePage,
  allowMultiple,
  accept,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isPageLevelTool = toolId === 'organize-pdf';

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddMoreFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex-1 min-h-[500px] p-6 sm:p-8 bg-gray-100/70 rounded-3xl border border-gray-200/80 overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        onChange={handleFileInput}
        className="hidden"
      />

      {isPageLevelTool && pages.length > 0 ? (
        /* Page-level Thumbnail Grid (Organize PDF) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
          {pages.map((p, index) => (
            <div
              key={`${p.originalIndex}-${index}`}
              className="group relative bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-lg transition-all p-3 flex flex-col justify-between"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100">
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={`Page ${p.pageNumber}`}
                    className="w-full h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${p.rotation}deg)` }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <FileText size={32} />
                    <span className="text-xs mt-1 font-semibold">Page {p.pageNumber}</span>
                  </div>
                )}

                {/* Page Number Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold rounded-md">
                  {index + 1}
                </div>

                {/* Hover Actions Bar */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onRotatePage(index)}
                    title="Rotate Page"
                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-indigo-600 rounded-lg shadow-md transition-colors"
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    onClick={() => onDeletePage(index)}
                    title="Delete Page"
                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 rounded-lg shadow-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Order Controls */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500 font-semibold px-1">
                <button
                  disabled={index === 0}
                  onClick={() => onMovePage(index, 'left')}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Move Page Earlier"
                >
                  <MoveLeft size={16} />
                </button>
                <span className="text-[11px] text-gray-400">Page {p.pageNumber}</span>
                <button
                  disabled={index === pages.length - 1}
                  onClick={() => onMovePage(index, 'right')}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Move Page Later"
                >
                  <MoveRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* File Cards Grid (Merge, Rotate, Split, Compress, etc.) */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {files.map((fileItem, index) => (
            <div
              key={fileItem.id}
              className="group relative bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-sm hover:shadow-lg transition-all p-4 flex flex-col justify-between"
            >
              {/* File Preview Thumbnail */}
              <div className="relative aspect-[3/4] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 mb-3">
                {fileItem.thumbnails && fileItem.thumbnails[0] ? (
                  <img
                    src={fileItem.thumbnails[0]}
                    alt={fileItem.name}
                    className="w-full h-full object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${fileItem.rotation || 0}deg)` }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <FileText size={48} className="text-red-400 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">PDF Document</span>
                  </div>
                )}

                {/* Page count pill */}
                {fileItem.pageCount && (
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold rounded-md">
                    {fileItem.pageCount} {fileItem.pageCount === 1 ? 'page' : 'pages'}
                  </div>
                )}

                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onRotateFile(fileItem.id)}
                    title="Rotate 90°"
                    className="p-1.5 bg-white/95 hover:bg-white text-gray-700 hover:text-indigo-600 rounded-lg shadow-md transition-colors"
                  >
                    <RotateCw size={15} />
                  </button>
                  <button
                    onClick={() => onRemoveFile(fileItem.id)}
                    title="Remove file"
                    className="p-1.5 bg-white/95 hover:bg-white text-gray-700 hover:text-red-600 rounded-lg shadow-md transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* File Info & Reorder */}
              <div>
                <p className="font-semibold text-gray-800 text-sm truncate" title={fileItem.name}>
                  {fileItem.name}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{formatFileSize(fileItem.size)}</span>
                  {allowMultiple && files.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={index === 0}
                        onClick={() => onMoveFile(index, 'left')}
                        className="p-1 hover:text-gray-900 disabled:opacity-20"
                        title="Move left"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <span className="font-bold text-gray-600">#{index + 1}</span>
                      <button
                        disabled={index === files.length - 1}
                        onClick={() => onMoveFile(index, 'right')}
                        className="p-1 hover:text-gray-900 disabled:opacity-20"
                        title="Move right"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add more files card */}
          {allowMultiple && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[3/4] border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl bg-white/60 hover:bg-indigo-50/40 flex flex-col items-center justify-center p-6 text-slate-500 hover:text-indigo-600 transition-all group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-colors">
                <Plus size={24} />
              </div>
              <span className="font-bold text-sm">Add more files</span>
              <span className="text-xs text-slate-400 mt-1">or drop files here</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
