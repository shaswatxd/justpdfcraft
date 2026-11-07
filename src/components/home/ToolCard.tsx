import React from 'react';
import { 
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
  ArrowUpRight
} from 'lucide-react';
import { ToolDefinition, ToolId } from '../../types/pdf';

interface ToolCardProps {
  tool: ToolDefinition;
  onSelect: (id: ToolId) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  const renderIcon = () => {
    const props = { 
      size: 20, 
      strokeWidth: 1.8, 
      className: 'transition-transform duration-200 group-hover:scale-105',
      style: { color: tool.color }
    };
    switch (tool.iconName) {
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
    <div
      onClick={() => onSelect(tool.id)}
      className="group relative bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-slate-200 group-hover:shadow-xs transition-all"
          >
            {renderIcon()}
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge && (
              <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                tool.badge === 'Popular'
                  ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                  : tool.badge === 'New'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                {tool.badge}
              </span>
            )}
            <div className="text-slate-300 group-hover:text-slate-600 transition-colors p-1">
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {tool.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-medium text-slate-500 capitalize">
          {tool.category.replace(/-/g, ' ')}
        </span>
        <span className="font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open tool →
        </span>
      </div>
    </div>
  );
};
