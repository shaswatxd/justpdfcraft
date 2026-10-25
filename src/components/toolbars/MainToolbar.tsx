import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  Hand,
  Type,
  PenTool,
  Highlighter,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon,
  Stamp,
  MessageSquare,
  EyeOff,
  Search,
  FileText,
  FileArchive,
  ScanText,
  Shield,
  Sidebar,
  ChevronDown,
  Layers,
  Crop as CropIcon,
  Hash,
  Droplets,
  GitCompare,
  Scissors,
  Files,
  Edit3,
  Unlock,
  Table,
  Eraser,
  Ruler,
  Camera,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { useToolStore, ToolMode } from '@/stores/toolStore';
import { useUIStore, ModalType } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';

export const MainToolbar: React.FC = () => {
  const { currentTool, setTool } = useToolStore();
  const { documentId, formFields } = useDocumentStore();
  const {
    setActiveModal,
    activeModal,
    toggleSidebar,
    isSidebarOpen,
    setSidebarTab,
  } = useUIStore();

  const [shapesOpen, setShapesOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const moreToolsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as Node;
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(target)) {
        setShapesOpen(false);
      }
      if (moreToolsMenuRef.current && !moreToolsMenuRef.current.contains(target)) {
        setMoreToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (!documentId) return null;

  const shapeTools: Array<{ id: ToolMode; label: string; icon: any }> = [
    { id: 'rectangle', label: 'Rectangle Box', icon: Square },
    { id: 'circle', label: 'Circle / Oval', icon: Circle },
    { id: 'line', label: 'Straight Line', icon: Minus },
    { id: 'arrow', label: 'Arrow Pointer', icon: ArrowUpRight },
  ];

  const isShapeActive = ['rectangle', 'circle', 'line', 'arrow'].includes(currentTool);
  const activeShapeTool = shapeTools.find((s) => s.id === currentTool) || shapeTools[0];
  const ActiveShapeIcon = activeShapeTool.icon;

  const moreToolsList: Array<{
    id: ModalType;
    label: string;
    description: string;
    icon: any;
    color: string;
  }> = [
    {
      id: 'student-resizer',
      label: 'Exam Photo & Signature Resizer',
      description: 'Resize to exact portal KB limits (SSC, UPSC, NEET, JEE style requirements)',
      icon: GraduationCap,
      color: 'text-amber-400',
    },
    {
      id: 'sign',
      label: 'E-Sign & Digital Signature',
      description: 'Draw, type, or upload transparent handwritten signatures',
      icon: PenTool,
      color: 'text-sky-400',
    },
    {
      id: 'convert',
      label: 'Convert PDF Format',
      description: 'Export pages as PNG/JPG/WebP or TXT/MD, or images to PDF',
      icon: RefreshCw,
      color: 'text-amber-400',
    },
    {
      id: 'scan',
      label: 'Camera Document Scanner',
      description: 'Capture documents with webcam or camera with scanner filter',
      icon: Camera,
      color: 'text-indigo-400',
    },
    
    
    {
      id: 'extract-table',
      label: 'PDF Table Extractor to Excel & CSV',
      description: 'Convert document tables into clean spreadsheet data',
      icon: Table,
      color: 'text-emerald-400',
    },
    {
      id: 'protect',
      label: 'Universal PDF Unlocker & DRM Bypass',
      description: '1-click strip owner password, print & copy restrictions',
      icon: Unlock,
      color: 'text-rose-400',
    },
    
    {
      id: 'batch',
      label: 'Batch Automation Hub',
      description: 'Compress, watermark, or sanitize multiple PDFs',
      icon: Layers,
      color: 'text-purple-400',
    },
    {
      id: 'crop',
      label: 'Page Crop & Margin Trimming',
      description: 'Custom crop boxes or auto white-margin trim',
      icon: CropIcon,
      color: 'text-cyan-400',
    },
    {
      id: 'bates',
      label: 'Bates Numbering & Headers',
      description: 'Legal bates sequential stamps, headers & footers',
      icon: Hash,
      color: 'text-swift-400',
    },
    {
      id: 'compare',
      label: 'Document Comparison',
      description: 'Side-by-side visual difference between revisions',
      icon: GitCompare,
      color: 'text-amber-400',
    },
    {
      id: 'watermark',
      label: 'Watermark Document',
      description: 'Custom text stamps (Confidential, Draft, etc.)',
      icon: Droplets,
      color: 'text-blue-400',
    },
    {
      id: 'split',
      label: 'Split & Extract Pages',
      description: 'Separate document into individual pages or ranges',
      icon: Scissors,
      color: 'text-rose-400',
    },
    {
      id: 'merge',
      label: 'Merge Multiple PDFs',
      description: 'Combine external PDF files into one master document',
      icon: Files,
      color: 'text-teal-400',
    },
  ];

  return (
    <div className="h-11 bg-white border-b border-gray-200 px-3 flex items-center justify-between z-20 gap-2 select-none overflow-x-auto no-scrollbar overflow-y-visible shadow-2xs">
      {/* Left: Sidebar toggle + Main Edit Tools */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            isSidebarOpen
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-800'
          }`}
          title="Toggle Navigation Sidebar"
        >
          <Sidebar className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-gray-200 mx-1 shrink-0" />

        {/* Primary Pointer Tools */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
          <button
            onClick={() => setTool('select')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'select'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Select / Interact (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('hand')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'hand'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Pan / Hand Tool (H)"
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Drawing & Annotation Tools */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
          <button
            onClick={() => setTool('draw')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'draw'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Pen / Freehand Draw (P)"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'eraser'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Stroke Eraser (E) - Click or drag to erase strokes & annotations"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('highlight')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'highlight'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'text'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Add Text (T)"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('edit_text')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'edit_text'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Edit Existing PDF Text (Click any text on page to edit)"
          >
            <Edit3 className={`w-3.5 h-3.5 ${currentTool === 'edit_text' ? 'text-white' : 'text-red-600'}`} />
          </button>
          <button
            onClick={() => setTool('snip_ocr')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'snip_ocr'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Area OCR / Text Grabber (Ctrl+Shift+X) - Drag box to extract text to clipboard"
          >
            <ScanText className={`w-3.5 h-3.5 ${currentTool === 'snip_ocr' ? 'text-white' : 'text-amber-600'}`} />
          </button>

          {/* Shapes Dropdown */}
          <div className="relative" ref={shapesMenuRef}>
            <button
              onClick={() => setShapesOpen((v) => !v)}
              className={`p-1.5 rounded-md transition-all flex items-center gap-0.5 text-xs font-medium ${
                isShapeActive
                  ? 'bg-swift-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'
              }`}
              title={`Shapes (${activeShapeTool.label})`}
            >
              <ActiveShapeIcon className="w-3.5 h-3.5" />
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {shapesOpen && (
              <div className="absolute left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-50 w-44 flex flex-col gap-0.5 animate-scale-in text-gray-800">
                <span className="text-[10px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Geometric Shapes
                </span>
                {shapeTools.map((s) => {
                  const SIcon = s.icon;
                  const isSelected = currentTool === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setTool(s.id);
                        setShapesOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-red-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <SIcon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Architectural Dimension Ruler */}
          <button
            onClick={() => setTool('measure')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'measure'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Measure / Dimension Ruler (M) - Calibrated distance & scale measurement"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Markup & Stamps */}
        <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
          <button
            onClick={() => setTool('underline')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'underline'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Underline Text"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('strikethrough')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'strikethrough'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Strikethrough Text"
          >
            <StrikethroughIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('stamp')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'stamp'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Approval & Review Stamps"
          >
            <Stamp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('note')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'note'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
            title="Sticky Note"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveModal('sign')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              activeModal === 'sign'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-sky-700 hover:text-sky-900 hover:bg-sky-50'
            }`}
            title="E-Sign & Digital Signature (Draw, Type, Upload)"
          >
            <PenTool className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('redact')}
            className={`p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-medium ${
              currentTool === 'redact'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
            }`}
            title="True Redact (R)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Quick Actions & Responsive "More Tools" Dropdown */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setSidebarTab('search')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs shrink-0"
          title="Search Document (Ctrl+F)"
        >
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <span className="hidden md:inline font-medium">Search</span>
        </button>

        <button
          onClick={() => setSidebarTab('forms')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs relative shrink-0"
          title="Interactive Forms & Field Filling"
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline font-medium">Forms</span>
          {formFields.length > 0 && (
            <span className="bg-swift-500 text-white text-[9px] px-1 py-0.2 rounded-full font-mono font-bold">
              {formFields.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveModal('compress')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs shrink-0"
          title="Smart Compression"
        >
          <FileArchive className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline font-medium">Compress</span>
        </button>

        <button
          onClick={() => setActiveModal('ocr')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs shrink-0"
          title="OCR & Text Recognition"
        >
          <ScanText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline font-medium">OCR</span>
        </button>

        

        <button
          onClick={() => setActiveModal('protect')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200 shadow-2xs shrink-0"
          title="Password Protect & Permissions"
        >
          <Shield className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline font-medium">Protect</span>
        </button>

        

        {/* "More Tools" Dropdown - Contains Sanitize, Batch, Crop, Bates, Compare, etc. */}
        <div className="relative shrink-0" ref={moreToolsMenuRef}>
          <button
            onClick={() => setMoreToolsOpen((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors border shrink-0 ${
              moreToolsOpen
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 shadow-2xs'
            }`}
            title="More Professional Tools"
          >
            <span>More Tools</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {moreToolsOpen && (
            <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 z-50 w-72 flex flex-col gap-1 animate-scale-in text-gray-800">
              <span className="text-[10px] font-bold text-gray-400 px-3 py-1.5 uppercase tracking-wider border-b border-gray-100">
                Advanced PDF Utilities
              </span>
              <div className="max-h-80 overflow-y-auto space-y-0.5 p-1">
                {moreToolsList.map((tool) => {
                  const TIcon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setActiveModal(tool.id);
                        setMoreToolsOpen(false);
                      }}
                      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-gray-50 transition-colors group"
                    >
                      <div className={`p-1.5 rounded-lg bg-gray-100 group-hover:bg-gray-200/80 shrink-0 mt-0.5 ${tool.color}`}>
                        <TIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-gray-900 block truncate group-hover:text-red-600 transition-colors">
                          {tool.label}
                        </span>
                        <span className="text-[11px] text-gray-500 block leading-tight truncate">
                          {tool.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
