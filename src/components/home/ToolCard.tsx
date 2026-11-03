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
    const props = { size: 26, className: 'transition-transform duration-300 group-hover:scale-110' };
    switch (tool.iconName) {
      case 'Layers': return <Layers {...props} style={{ color: tool.color }} />;
      case 'Scissors': return <Scissors {...props} style={{ color: tool.color }} />;
      case 'FileArchive': return <FileArchive {...props} style={{ color: tool.color }} />;
      case 'RotateCw': return <RotateCw {...props} style={{ color: tool.color }} />;
      case 'LayoutGrid': return <LayoutGrid {...props} style={{ color: tool.color }} />;
      case 'Stamp': return <Stamp {...props} style={{ color: tool.color }} />;
      case 'Hash': return <Hash {...props} style={{ color: tool.color }} />;
      case 'Lock': return <Lock {...props} style={{ color: tool.color }} />;
      case 'Unlock': return <Unlock {...props} style={{ color: tool.color }} />;
      case 'ImagePlus': return <ImagePlus {...props} style={{ color: tool.color }} />;
      case 'FileImage': return <FileImage {...props} style={{ color: tool.color }} />;
      case 'FileText': return <FileText {...props} style={{ color: tool.color }} />;
      case 'Presentation': return <Presentation {...props} style={{ color: tool.color }} />;
      case 'FileSpreadsheet': return <FileSpreadsheet {...props} style={{ color: tool.color }} />;
      case 'FileCode': return <FileCode {...props} style={{ color: tool.color }} />;
      case 'PenTool': return <PenTool {...props} style={{ color: tool.color }} />;
      case 'Wrench': return <Wrench {...props} style={{ color: tool.color }} />;
      case 'Shield': return <Shield {...props} style={{ color: tool.color }} />;
      case 'Camera': return <Camera {...props} style={{ color: tool.color }} />;
      case 'FileSearch': return <FileSearch {...props} style={{ color: tool.color }} />;
      case 'GitCompare': return <GitCompare {...props} style={{ color: tool.color }} />;
      case 'EyeOff': return <EyeOff {...props} style={{ color: tool.color }} />;
      default: return <Layers {...props} style={{ color: tool.color }} />;
    }
  };

  return (
    <div
      onClick={() => onSelect(tool.id)}
      className="group relative bg-white border border-slate-200/90 hover:border-indigo-400/80 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{ backgroundColor: `${tool.color}15` }}
          >
            {renderIcon()}
          </div>
          {tool.badge && (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">
              {tool.badge}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {tool.title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-indigo-600 transition-colors">
        <span>Open studio</span>
        <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </div>
  );
};
