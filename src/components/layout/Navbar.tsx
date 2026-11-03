import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Menu, 
  X, 
  Layers, 
  Scissors, 
  FileArchive, 
  RotateCw, 
  LayoutGrid, 
  Stamp, 
  Hash, 
  Lock, 
  Unlock, 
  ImagePlus, 
  FileImage,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileCode,
  PenTool,
  Wrench,
  Shield,
  Camera,
  FileSearch,
  GitCompare,
  EyeOff,
  Sparkles,
  Zap
} from 'lucide-react';
import { ToolId } from '../../types/pdf';
import { TOOLS, CATEGORIES } from '../../config/tools';

interface NavbarProps {
  currentToolId: ToolId | null;
  onSelectTool: (id: ToolId | null) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentToolId, onSelectTool }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [convertDropdownOpen, setConvertDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
        setConvertDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToolClick = (id: ToolId) => {
    onSelectTool(id);
    setToolsDropdownOpen(false);
    setConvertDropdownOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getToolIcon = (name: string, size = 18, color?: string) => {
    const iconColor = color || '#4f46e5';
    const props = { size, style: { color: iconColor } };
    switch (name) {
      case 'Layers': return <Layers {...props} />;
      case 'Scissors': return <Scissors {...props} />;
      case 'FileArchive': return <FileArchive {...props} />;
      case 'RotateCw': return <RotateCw {...props} />;
      case 'LayoutGrid': return <LayoutGrid {...props} />;
      case 'Stamp': return <Stamp {...props} />;
      case 'Hash': return <Hash {...props} />;
      case 'Lock': return <Lock {...props} />;
      case 'Unlock': return <Unlock {...props} />;
      case 'ImagePlus': return <ImagePlus {...props} />;
      case 'FileImage': return <FileImage {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'Presentation': return <Presentation {...props} />;
      case 'FileSpreadsheet': return <FileSpreadsheet {...props} />;
      case 'FileCode': return <FileCode {...props} />;
      case 'PenTool': return <PenTool {...props} />;
      case 'Wrench': return <Wrench {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'Camera': return <Camera {...props} />;
      case 'FileSearch': return <FileSearch {...props} />;
      case 'GitCompare': return <GitCompare {...props} />;
      case 'EyeOff': return <EyeOff {...props} />;
      default: return <Layers {...props} />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo: JustPDFCraft */}
          <div 
            onClick={() => { onSelectTool(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            {/* Custom geometric craft emblem */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/30 group-hover:scale-105 transition-all">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Just<span className="text-indigo-600">PDF</span>Craft
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                100% Client-Side Studio
              </span>
            </div>
          </div>

          {/* Desktop Navigation (No Auth) */}
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2" ref={dropdownRef}>
            <button
              onClick={() => handleToolClick('merge-pdf')}
              className={`px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                currentToolId === 'merge-pdf'
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              Merge
            </button>
            <button
              onClick={() => handleToolClick('split-pdf')}
              className={`px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                currentToolId === 'split-pdf'
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => handleToolClick('compress-pdf')}
              className={`px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                currentToolId === 'compress-pdf'
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              Compress
            </button>
            <button
              onClick={() => handleToolClick('sign-pdf')}
              className={`px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                currentToolId === 'sign-pdf'
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              Sign
            </button>
            <button
              onClick={() => handleToolClick('handwriting')}
              className={`px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                currentToolId === 'handwriting'
                  ? 'text-amber-700 bg-amber-100/70 font-bold'
                  : 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
              }`}
            >
              Handwriting
            </button>

            {/* Convert Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setConvertDropdownOpen(!convertDropdownOpen);
                  setToolsDropdownOpen(false);
                }}
                className={`flex items-center gap-1 px-3.5 py-2 text-xs xl:text-sm font-semibold uppercase tracking-wider rounded-xl transition-all ${
                  convertDropdownOpen ? 'bg-slate-100 text-indigo-600' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                Convert
                <ChevronDown size={14} className={`transition-transform duration-200 ${convertDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {convertDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Convert to PDF</div>
                  <button onClick={() => handleToolClick('jpg-to-pdf')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('ImagePlus', 16, '#f59e0b')} <span>Images to PDF</span>
                  </button>
                  <button onClick={() => handleToolClick('word-to-pdf')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileText', 16, '#2563eb')} <span>Word to PDF</span>
                  </button>
                  <button onClick={() => handleToolClick('excel-to-pdf')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileSpreadsheet', 16, '#059669')} <span>Excel to PDF</span>
                  </button>
                  <button onClick={() => handleToolClick('html-to-pdf')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileCode', 16, '#4f46e5')} <span>HTML to PDF</span>
                  </button>

                  <div className="my-2 border-t border-slate-100" />
                  <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Convert from PDF</div>
                  <button onClick={() => handleToolClick('pdf-to-jpg')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileImage', 16, '#d97706')} <span>PDF to Images</span>
                  </button>
                  <button onClick={() => handleToolClick('pdf-to-word')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileText', 16, '#1d4ed8')} <span>PDF to Word DOCX</span>
                  </button>
                  <button onClick={() => handleToolClick('pdf-to-excel')} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/60 hover:text-indigo-600 rounded-lg text-left">
                    {getToolIcon('FileSpreadsheet', 16, '#047857')} <span>PDF to Excel XLSX</span>
                  </button>
                </div>
              )}
            </div>

            {/* All Tools Mega Menu Button */}
            <div className="relative">
              <button
                onClick={() => {
                  setToolsDropdownOpen(!toolsDropdownOpen);
                  setConvertDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs xl:text-sm font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
              >
                <Sparkles size={14} className="text-indigo-600" />
                <span>All Tools ({TOOLS.length})</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute right-0 mt-3 w-[840px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in slide-in-from-top-2 max-h-[85vh] overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6">
                    {CATEGORIES.map(cat => {
                      const catTools = TOOLS.filter(t => t.category === cat.id);
                      return (
                        <div key={cat.id} className="space-y-2">
                          <div className="font-extrabold text-[11px] uppercase text-slate-400 tracking-wider border-b border-slate-100 pb-1.5">
                            {cat.name}
                          </div>
                          <div className="space-y-0.5">
                            {catTools.map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleToolClick(t.id)}
                                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-left transition-colors group"
                              >
                                {getToolIcon(t.iconName, 15, t.color)}
                                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                                  {t.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Privacy Pill (Replaces Auth buttons) */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zero Uploads • 100% In-Browser</span>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-8 space-y-4 max-h-[80vh] overflow-y-auto">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="space-y-1">
              <div className="font-bold text-xs uppercase text-slate-400 tracking-wider px-2 pt-2">
                {cat.name}
              </div>
              {TOOLS.filter(t => t.category === cat.id).map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 text-left"
                >
                  {getToolIcon(tool.iconName, 16, tool.color)}
                  <span>{tool.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
};
