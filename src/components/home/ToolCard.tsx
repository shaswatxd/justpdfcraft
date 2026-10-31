import React from 'react';
import {
  Layers,
  Scissors,
  FileArchive,
  RefreshCw,
  Grid,
  Edit3,
  ScanText,
  ShieldCheck,
  Lock,
  Droplets,
  Tag,
  Crop,
  Camera,
  Table,
  Image as ImageIcon,
  PenTool,
  Stamp,
  GitCompare,
  Printer,
  Sliders,
  GraduationCap,
  Eraser,
  FilePlus,
  Calculator,
  CheckCircle2,
  Percent,
  Calendar,
  Scale,
  Clock,
  LayoutGrid,
  Timer,
  ArrowLeftRight,
  BookOpen,
  QrCode,
  KeyRound,
  Dices,
  MessageSquareText,
  Sparkles,
  BookMarked,
  CheckSquare,
  CheckCheck,
  Languages,
  CalendarCheck,
  FileBadge,
  FileType,
  Moon,
  Heart,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import { ToolDefinition } from '@/types/tools';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRecentToolsStore } from '@/stores/recentToolsStore';
import { useUIStore, UIState, ModalType } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';

export const ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  Scissors,
  FileArchive,
  RefreshCw,
  Grid,
  Edit3,
  ScanText,
  ShieldCheck,
  Lock,
  Droplets,
  Tag,
  Crop,
  Camera,
  Table,
  Image: ImageIcon,
  PenTool,
  Stamp,
  GitCompare,
  Printer,
  Sliders,
  GraduationCap,
  Eraser,
  FilePlus,
  Calculator,
  CheckCircle2,
  Percent,
  Calendar,
  Scale,
  Clock,
  LayoutGrid,
  Timer,
  ArrowLeftRight,
  BookOpen,
  QrCode,
  KeyRound,
  Dices,
  MessageSquareText,
  Sparkles,
  BookMarked,
  CheckSquare,
  CheckCheck,
  Languages,
  CalendarCheck,
  FileBadge,
  FileType,
  Moon,
};

const COLOR_THEMES: Record<string, { bg: string; border: string; text: string }> = {
  'text-red-500': {
    bg: 'bg-red-50 group-hover:bg-red-100/80',
    border: 'border-red-200/80',
    text: 'text-red-600',
  },
  'text-red-600': {
    bg: 'bg-red-50 group-hover:bg-red-100/80',
    border: 'border-red-200/80',
    text: 'text-red-600',
  },
  'text-orange-500': {
    bg: 'bg-orange-50 group-hover:bg-orange-100/80',
    border: 'border-orange-200/80',
    text: 'text-orange-600',
  },
  'text-orange-600': {
    bg: 'bg-orange-50 group-hover:bg-orange-100/80',
    border: 'border-orange-600',
    text: 'text-orange-600',
  },
  'text-amber-500': {
    bg: 'bg-amber-50 group-hover:bg-amber-100/80',
    border: 'border-amber-200/80',
    text: 'text-amber-600',
  },
  'text-emerald-500': {
    bg: 'bg-emerald-50 group-hover:bg-emerald-100/80',
    border: 'border-emerald-200/80',
    text: 'text-emerald-600',
  },
  'text-emerald-600': {
    bg: 'bg-emerald-50 group-hover:bg-emerald-100/80',
    border: 'border-emerald-200/80',
    text: 'text-emerald-600',
  },
  'text-emerald-700': {
    bg: 'bg-emerald-50 group-hover:bg-emerald-100/80',
    border: 'border-emerald-200/80',
    text: 'text-emerald-700',
  },
  'text-green-700': {
    bg: 'bg-green-50 group-hover:bg-green-100/80',
    border: 'border-green-200/80',
    text: 'text-green-700',
  },
  'text-teal-500': {
    bg: 'bg-teal-50 group-hover:bg-teal-100/80',
    border: 'border-teal-200/80',
    text: 'text-teal-600',
  },
  'text-teal-600': {
    bg: 'bg-teal-50 group-hover:bg-teal-100/80',
    border: 'border-teal-200/80',
    text: 'text-teal-600',
  },
  'text-blue-500': {
    bg: 'bg-blue-50 group-hover:bg-blue-100/80',
    border: 'border-blue-200/80',
    text: 'text-blue-600',
  },
  'text-blue-600': {
    bg: 'bg-blue-50 group-hover:bg-blue-100/80',
    border: 'border-blue-200/80',
    text: 'text-blue-600',
  },
  'text-blue-700': {
    bg: 'bg-blue-50 group-hover:bg-blue-100/80',
    border: 'border-blue-200/80',
    text: 'text-blue-700',
  },
  'text-indigo-600': {
    bg: 'bg-indigo-50 group-hover:bg-indigo-100/80',
    border: 'border-indigo-200/80',
    text: 'text-indigo-600',
  },
  'text-purple-500': {
    bg: 'bg-purple-50 group-hover:bg-purple-100/80',
    border: 'border-purple-200/80',
    text: 'text-purple-600',
  },
  'text-purple-600': {
    bg: 'bg-purple-50 group-hover:bg-purple-100/80',
    border: 'border-purple-200/80',
    text: 'text-purple-600',
  },
  'text-rose-500': {
    bg: 'bg-rose-50 group-hover:bg-rose-100/80',
    border: 'border-rose-200/80',
    text: 'text-rose-600',
  },
  'text-rose-600': {
    bg: 'bg-rose-50 group-hover:bg-rose-100/80',
    border: 'border-rose-200/80',
    text: 'text-rose-600',
  },
  'text-sky-500': {
    bg: 'bg-sky-50 group-hover:bg-sky-100/80',
    border: 'border-sky-200/80',
    text: 'text-sky-600',
  },
  'text-cyan-600': {
    bg: 'bg-cyan-50 group-hover:bg-cyan-100/80',
    border: 'border-cyan-200/80',
    text: 'text-cyan-600',
  },
  'text-fuchsia-600': {
    bg: 'bg-fuchsia-50 group-hover:bg-fuchsia-100/80',
    border: 'border-fuchsia-200/80',
    text: 'text-fuchsia-600',
  },
  'text-slate-600': {
    bg: 'bg-slate-100 group-hover:bg-slate-200/80',
    border: 'border-slate-300',
    text: 'text-slate-700',
  },
  'text-slate-800': {
    bg: 'bg-slate-100 group-hover:bg-slate-200/80',
    border: 'border-slate-300',
    text: 'text-slate-800',
  },
};

interface ToolCardProps {
  tool: ToolDefinition;
  onSelectWorkflowFile: (workflow: {
    modal?: ModalType;
    viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
    tool?: any;
    label: string;
    initialTab?: string;
  }) => void;
}

export const launchToolAction = (
  tool: ToolDefinition,
  ui: UIState,
  docStore: any,
  tools: any,
  onSelectWorkflowFile: (workflow: any) => void
) => {
  if (tool.action.type === 'workflow') {
    if (!docStore.documentId) {
      onSelectWorkflowFile({
        modal: tool.action.modal,
        viewMode: tool.action.viewMode,
        tool: tool.action.tool,
        label: tool.name,
        initialTab: tool.action.initialTab,
      });
      return;
    }
    if (tool.action.viewMode) {
      docStore.setViewMode(tool.action.viewMode);
      ui.setActiveView('editor');
    }
    if (tool.action.tool) {
      tools.setActiveTool(tool.action.tool);
      ui.setActiveView('editor');
    }
    if (tool.action.modal) {
      ui.setActiveModal(tool.action.modal);
    }
    return;
  }

  if (tool.action.type === 'viewMode') {
    docStore.setViewMode(tool.action.viewMode);
    ui.setActiveView('editor');
    return;
  }

  if (tool.action.type === 'tool') {
    tools.setActiveTool(tool.action.tool);
    ui.setActiveView('editor');
    return;
  }

  if (tool.action.type === 'modal') {
    const targetModal = tool.action.modal;
    const initialTab = tool.action.initialTab;

    if (targetModal === 'convert' && initialTab) {
      ui.setActiveConvertTab(initialTab);
    }
    if (targetModal === 'document-tools' && initialTab) {
      ui.setActiveDocTab(initialTab);
    }
    if (targetModal === 'student-tools' && initialTab) {
      ui.setActiveStudentTab(initialTab);
    }

    if (targetModal) {
      ui.setActiveModal(targetModal);
    }
    return;
  }
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelectWorkflowFile }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { trackTool } = useRecentToolsStore();
  const ui = useUIStore();
  const docStore = useDocumentStore();
  const tools = useToolStore();

  const IconComponent = ICON_MAP[tool.iconName] || Sparkles;
  const isFav = isFavorite(tool.id);
  const theme = COLOR_THEMES[tool.color] || {
    bg: 'bg-red-50 group-hover:bg-red-100/80',
    border: 'border-red-200/80',
    text: 'text-red-600',
  };

  const isHandwriting = tool.id === 'handwriting-generator';

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.fav-btn')) {
      return;
    }
    trackTool(tool.id);
    launchToolAction(tool, ui, docStore, tools, onSelectWorkflowFile);
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(tool.id);
  };

  return (
    <div
      onClick={handleClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-white transition-all duration-200 cursor-pointer select-none text-left border ${
        isHandwriting
          ? 'border-amber-300/90 shadow-md shadow-amber-500/10 hover:border-red-500 hover:shadow-2xl hover:-translate-y-1.5 ring-1 ring-amber-400/30'
          : 'border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-xl hover:-translate-y-1.5'
      }`}
    >
      {/* Top row: Icon, Badge, Favorite */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div
          className={`w-14 h-14 rounded-2xl ${
            isHandwriting ? 'bg-gradient-to-br from-red-50 to-amber-50 border-amber-300' : theme.bg
          } border ${theme.border} flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-105`}
        >
          <IconComponent className={`w-7 h-7 ${isHandwriting ? 'text-red-600' : theme.text}`} />
        </div>

        <div className="flex items-center gap-1.5">
          {isHandwriting ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-2xs">
              ✨ EXCLUSIVE
            </span>
          ) : tool.badge ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-600">
              {tool.badge}
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleFavoriteToggle}
            className={`fav-btn p-2 rounded-lg transition-all ${
              isFav
                ? 'opacity-100 text-rose-500 bg-rose-50'
                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-slate-100'
            }`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5 flex-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug">
          {tool.name}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed line-clamp-2">
          {tool.shortDesc}
        </p>
      </div>

      {/* Bottom Footer: Category & Open Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors">
          {tool.category.replace(/-/g, ' ')}
        </span>
        <span className="text-xs font-bold text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-x-0.5 transition-all flex items-center gap-1">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
