import React, { useState } from 'react';
import {
  Hand,
  PenTool,
  Highlighter,
  Type,
  Eraser,
  Stamp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Grid,
  AlignJustify,
  Check,
  X,
  FileArchive,
  Scissors,
  Files,
  ScanText,
  Shield,
  Droplets,
  Crop,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';

const COLOR_PALETTE = [
  '#000000',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

const STROKE_SIZES = [2, 4, 8, 14];

export const MobileEditorToolbar: React.FC = () => {
  const {
    currentTool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
  } = useToolStore();

  const {
    currentPage,
    pageCount,
    setCurrentPage,
    zoom,
    setZoom,
    viewMode,
    setViewMode,
  } = useDocumentStore();

  const { setActiveModal, toggleSidebar, addToast } = useUIStore();

  const [showOptions, setShowOptions] = useState(false);
  const [showMoreToolsSheet, setShowMoreToolsSheet] = useState(false);

  // Auto show tool options if user activates an annotating tool
  const isAnnotationTool = ['draw', 'highlight', 'text', 'rectangle', 'circle', 'line', 'arrow'].includes(currentTool);

  const handleToolSelect = (tool: ToolMode) => {
    if (currentTool === tool && isAnnotationTool) {
      setShowOptions(!showOptions);
    } else {
      setTool(tool);
      if (['draw', 'highlight', 'text'].includes(tool)) {
        setShowOptions(true);
      } else {
        setShowOptions(false);
      }

      if (tool === 'edit_text') {
        addToast({
          type: 'info',
          title: 'Direct Text Edit Active',
          message: 'Tap any word to edit, or tap empty space to add text.',
        });
      } else if (tool === 'text') {
        addToast({
          type: 'info',
          title: 'Insert Text Mode',
          message: 'Tap anywhere on the page to insert new text.',
        });
      } else if (tool === 'draw') {
        addToast({
          type: 'info',
          title: 'Pen Draw Mode',
          message: 'Use your finger to write or draw on the page.',
        });
      } else if (tool === 'highlight') {
        addToast({
          type: 'info',
          title: 'Highlighter Mode',
          message: 'Drag across content to highlight it.',
        });
      } else if (tool === 'eraser') {
        addToast({
          type: 'info',
          title: 'Eraser Mode',
          message: 'Swipe over any drawing to erase.',
        });
      }
    }
  };

  return (
    <>
      {/* 1. Mobile Tool Property Drawer (Color & Stroke Options for Pen/Text/Highlighter) */}
      {showOptions && isAnnotationTool && (
        <div className="md:hidden fixed bottom-[108px] left-3 right-3 z-40 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-150">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {currentTool === 'draw'
                ? 'Pen Settings'
                : currentTool === 'highlight'
                ? 'Highlighter Settings'
                : 'Text / Shape Settings'}
            </span>
            <button
              onClick={() => setShowOptions(false)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color Swatches */}
          <div className="flex items-center justify-between gap-1 mb-2.5">
            {COLOR_PALETTE.map((c) => {
              const isSelected = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center ${
                    isSelected
                      ? 'scale-110 border-white shadow-md'
                      : 'border-zinc-700/60 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        c === '#ffffff' || c === '#f59e0b' ? 'text-black' : 'text-white'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Stroke Width Buttons */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/60">
            <span className="text-[10px] text-zinc-500 font-medium">Thickness</span>
            <div className="flex items-center gap-2">
              {STROKE_SIZES.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setStrokeWidth(sz)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                    strokeWidth === sz
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Quick Bottom HUD (Page Stepper, Zoom, Grid, Save) */}
      <div className="md:hidden fixed bottom-[58px] left-2 right-2 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
        {/* Left: Page Stepper Pill */}
        <div className="pointer-events-auto bg-black/90 backdrop-blur-xl border border-zinc-800/90 rounded-2xl px-2 py-1 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-25 active:scale-90 transition-transform"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={toggleSidebar}
            className="text-[11px] font-mono font-semibold text-zinc-200 px-1.5 py-0.5 rounded-md hover:bg-zinc-800 hover:text-blue-400 min-w-[48px] text-center transition-colors"
            title="Open Page Thumbnails"
          >
            {currentPage} <span className="text-zinc-500">/</span> {pageCount}
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage >= pageCount}
            className="p-1 text-zinc-300 hover:text-white disabled:opacity-25 active:scale-90 transition-transform"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Zoom & Grid Toggle */}
        <div className="pointer-events-auto bg-black/90 backdrop-blur-xl border border-zinc-800/90 rounded-2xl px-2 py-1 flex items-center gap-1.5 shadow-xl">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            className="p-1 text-zinc-400 hover:text-white active:scale-90 transition-transform"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                const dims = useDocumentStore.getState().pageDimensions[0];
                const fitW = dims?.width ? (window.innerWidth - 24) / dims.width : 0.65;
                setZoom(Math.min(1.0, Math.max(0.45, Number(fitW.toFixed(2)))));
              }
            }}
            className="text-[10px] font-mono text-zinc-300 px-1 hover:text-white"
            title="Reset Zoom to Fit Width"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
            className="p-1 text-zinc-400 hover:text-white active:scale-90 transition-transform"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

          {/* Grid View Organizer Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'organize' ? 'continuous' : 'organize')}
            className={`p-1.5 rounded-xl transition-all ${
              viewMode === 'organize'
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={viewMode === 'organize' ? 'Back to Reader' : 'Organize Page Grid'}
          >
            {viewMode === 'organize' ? (
              <AlignJustify className="w-3.5 h-3.5" />
            ) : (
              <Grid className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Primary Mobile Tool Switcher Dock (Anchored to Bottom) */}
      <nav
        aria-label="Mobile PDF Tool Dock"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-zinc-800/90 px-2 py-1.5 flex items-center justify-around gap-0.5 select-none safe-area-bottom shadow-2xl overflow-x-auto no-scrollbar"
      >
        {/* Hand / Pan Tool */}
        <button
          onClick={() => handleToolSelect('hand')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all shrink-0 min-w-[42px] ${
            currentTool === 'hand'
              ? 'text-blue-400 bg-blue-500/15 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Pan / Scroll Mode"
        >
          <Hand className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Pan</span>
        </button>

        {/* Edit Text Tool */}
        <button
          onClick={() => handleToolSelect('edit_text')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all shrink-0 min-w-[42px] ${
            currentTool === 'edit_text'
              ? 'text-cyan-400 bg-cyan-500/20 font-bold ring-1 ring-cyan-500/40'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Edit Existing Text in PDF"
        >
          <Edit3 className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Edit</span>
        </button>

        {/* Draw / Pen Tool */}
        <button
          onClick={() => handleToolSelect('draw')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative shrink-0 min-w-[42px] ${
            currentTool === 'draw'
              ? 'text-blue-400 bg-blue-500/15 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Pen / Freehand Draw"
        >
          <PenTool className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Draw</span>
          {currentTool === 'draw' && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: color }}
            />
          )}
        </button>

        {/* Highlighter Tool */}
        <button
          onClick={() => handleToolSelect('highlight')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all relative shrink-0 min-w-[42px] ${
            currentTool === 'highlight'
              ? 'text-amber-400 bg-amber-500/15 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Highlighter"
        >
          <Highlighter className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Highlight</span>
        </button>

        {/* Text Annotation Tool */}
        <button
          onClick={() => handleToolSelect('text')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all shrink-0 min-w-[42px] ${
            currentTool === 'text'
              ? 'text-emerald-400 bg-emerald-500/15 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Add Text"
        >
          <Type className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Text</span>
        </button>

        {/* Sign Tool */}
        <button
          onClick={() => setActiveModal('sign')}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-purple-400 hover:text-purple-300 transition-all shrink-0 min-w-[42px]"
          title="Sign Document"
        >
          <Stamp className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Sign</span>
        </button>

        {/* Eraser Tool */}
        <button
          onClick={() => handleToolSelect('eraser')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all shrink-0 min-w-[42px] ${
            currentTool === 'eraser'
              ? 'text-rose-400 bg-rose-500/15 font-semibold'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Eraser"
        >
          <Eraser className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Eraser</span>
        </button>

        {/* More Tools Drawer Button */}
        <button
          onClick={() => setShowMoreToolsSheet(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-xl text-zinc-400 hover:text-white transition-all shrink-0 min-w-[42px]"
          title="More PDF Tools (Compress, Split, OCR, etc.)"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-[9.5px] font-medium mt-0.5">Tools</span>
        </button>
      </nav>

      {/* 4. More PDF Tools Bottom Sheet for Mobile */}
      {showMoreToolsSheet && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-150">
          <div
            className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200"
            role="dialog"
            aria-label="More PDF Tools"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white">Document Utilities</h3>
                <p className="text-xs text-zinc-400">100% private in-browser processing</p>
              </div>
              <button
                onClick={() => setShowMoreToolsSheet(false)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'compress', label: 'Compress PDF', icon: FileArchive, color: 'text-emerald-400', desc: 'Reduce file size' },
                { id: 'split', label: 'Split & Extract', icon: Scissors, color: 'text-rose-400', desc: 'Cut into pages' },
                { id: 'merge', label: 'Merge Files', icon: Files, color: 'text-blue-400', desc: 'Combine external PDFs' },
                { id: 'ocr', label: 'Scan & OCR', icon: ScanText, color: 'text-cyan-400', desc: 'Extract text' },
                { id: 'protect', label: 'Protect / Lock', icon: Shield, color: 'text-amber-400', desc: 'Password encryption' },
                { id: 'watermark', label: 'Watermark', icon: Droplets, color: 'text-indigo-400', desc: 'Custom text stamp' },
                { id: 'crop', label: 'Crop Margins', icon: Crop, color: 'text-teal-400', desc: 'Trim white margins' },
                { id: 'student-resizer', label: 'Exam Resizer', icon: Sparkles, color: 'text-pink-400', desc: 'Target 20-50 KB' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowMoreToolsSheet(false);
                      setActiveModal(item.id as any);
                    }}
                    className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 text-left transition-all active:scale-95 flex flex-col justify-between space-y-2"
                  >
                    <div className="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{item.label}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
