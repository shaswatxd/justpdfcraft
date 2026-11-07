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
  PenLine
} from 'lucide-react';
import { ToolId } from '../../types/pdf';
import { TOOLS, CATEGORIES } from '../../config/tools';
import { BrandLogo } from '../common/BrandLogo';

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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const getToolIcon = (name: string, size = 16, color = '#4f46e5') => {
    const props = { size, style: { color }, className: 'shrink-0' };
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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <BrandLogo 
            size="md" 
            onClick={() => { onSelectTool(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
            <button
              onClick={() => handleToolClick('merge-pdf')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentToolId === 'merge-pdf'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Merge
            </button>
            <button
              onClick={() => handleToolClick('split-pdf')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentToolId === 'split-pdf'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => handleToolClick('compress-pdf')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentToolId === 'compress-pdf'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Compress
            </button>
            <button
              onClick={() => handleToolClick('sign-pdf')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentToolId === 'sign-pdf'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Sign
            </button>

            {/* Convert Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setConvertDropdownOpen(!convertDropdownOpen);
                  setToolsDropdownOpen(false);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  convertDropdownOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Convert</span>
                <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${convertDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {convertDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Convert to PDF
                  </div>
                  <button onClick={() => handleToolClick('jpg-to-pdf')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('ImagePlus', 16, '#d97706')} <span>Images to PDF</span>
                  </button>
                  <button onClick={() => handleToolClick('word-to-pdf')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileText', 16, '#2563eb')} <span>Word to PDF (.docx)</span>
                  </button>
                  <button onClick={() => handleToolClick('excel-to-pdf')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileSpreadsheet', 16, '#16a34a')} <span>Excel to PDF (.xlsx)</span>
                  </button>
                  <button onClick={() => handleToolClick('html-to-pdf')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileCode', 16, '#6366f1')} <span>HTML to PDF</span>
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />
                  
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Convert from PDF
                  </div>
                  <button onClick={() => handleToolClick('pdf-to-jpg')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileImage', 16, '#d97706')} <span>PDF to Images (JPG/PNG)</span>
                  </button>
                  <button onClick={() => handleToolClick('pdf-to-word')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileText', 16, '#2563eb')} <span>PDF to Word DOCX</span>
                  </button>
                  <button onClick={() => handleToolClick('pdf-to-excel')} className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-left transition-colors">
                    {getToolIcon('FileSpreadsheet', 16, '#16a34a')} <span>PDF to Excel XLSX</span>
                  </button>
                </div>
              )}
            </div>

            {/* Handwriting Link */}
            <button
              onClick={() => handleToolClick('handwriting')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                currentToolId === 'handwriting'
                  ? 'text-amber-800 bg-amber-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PenLine size={14} className="text-amber-600" />
              <span>Handwriting</span>
              <span className="text-[10px] font-medium bg-amber-100/80 text-amber-800 px-1.5 py-0.2 rounded">Studio</span>
            </button>

            {/* All Tools Mega Menu Button */}
            <div className="relative ml-1">
              <button
                onClick={() => {
                  setToolsDropdownOpen(!toolsDropdownOpen);
                  setConvertDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  toolsDropdownOpen 
                    ? 'bg-slate-100 text-slate-900 border-slate-300' 
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={14} className="text-slate-500" />
                <span>All Tools ({TOOLS.length})</span>
                <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[820px] bg-white rounded-2xl shadow-xl border border-slate-200 p-6 z-50 max-h-[85vh] overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6">
                    {CATEGORIES.map(cat => {
                      const catTools = TOOLS.filter(t => t.category === cat.id);
                      return (
                        <div key={cat.id} className="space-y-1.5">
                          <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            {cat.name}
                          </div>
                          <div className="space-y-0.5">
                            {catTools.map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleToolClick(t.id)}
                                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors group"
                              >
                                {getToolIcon(t.iconName, 15, t.color)}
                                <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
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

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick featured tools for mobile */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
            <button
              onClick={() => handleToolClick('merge-pdf')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <Layers size={16} className="text-indigo-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Merge PDF</div>
                <div className="text-[10px] text-slate-500">Combine files</div>
              </div>
            </button>
            <button
              onClick={() => handleToolClick('compress-pdf')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <FileArchive size={16} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Compress PDF</div>
                <div className="text-[10px] text-slate-500">Reduce size</div>
              </div>
            </button>
            <button
              onClick={() => handleToolClick('sign-pdf')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <PenTool size={16} className="text-blue-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Sign PDF</div>
                <div className="text-[10px] text-slate-500">Digital signature</div>
              </div>
            </button>
            <button
              onClick={() => handleToolClick('handwriting')}
              className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
            >
              <PenLine size={16} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">Handwriting</div>
                <div className="text-[10px] text-slate-500">Assignment notes</div>
              </div>
            </button>
          </div>

          {CATEGORIES.map(cat => (
            <div key={cat.id} className="space-y-1">
              <div className="font-semibold text-xs uppercase text-slate-400 tracking-wider px-2 pt-1">
                {cat.name}
              </div>
              {TOOLS.filter(t => t.category === cat.id).map(tool => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 text-left transition-colors"
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
