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
  'text-blue-400': {
    bg: 'bg-blue-50 group-hover:bg-blue-100/70',
    border: 'border-blue-200/80',
    text: 'text-blue-600',
  },
  'text-amber-400': {
    bg: 'bg-amber-50 group-hover:bg-amber-100/70',
    border: 'border-amber-200/80',
    text: 'text-amber-600',
  },
  'text-amber-500': {
    bg: 'bg-amber-50 group-hover:bg-amber-100/70',
    border: 'border-amber-200/80',
    text: 'text-amber-600',
  },
  'text-yellow-400': {
    bg: 'bg-yellow-50 group-hover:bg-yellow-100/70',
    border: 'border-yellow-200/80',
    text: 'text-yellow-600',
  },
  'text-emerald-400': {
    bg: 'bg-emerald-50 group-hover:bg-emerald-100/70',
    border: 'border-emerald-200/80',
    text: 'text-emerald-600',
  },
  'text-teal-400': {
    bg: 'bg-teal-50 group-hover:bg-teal-100/70',
    border: 'border-teal-200/80',
    text: 'text-teal-600',
  },
  'text-purple-400': {
    bg: 'bg-purple-50 group-hover:bg-purple-100/70',
    border: 'border-purple-200/80',
    text: 'text-purple-600',
  },
  'text-violet-400': {
    bg: 'bg-violet-50 group-hover:bg-violet-100/70',
    border: 'border-violet-200/80',
    text: 'text-violet-600',
  },
  'text-rose-500': {
    bg: 'bg-rose-50 group-hover:bg-rose-100/70',
    border: 'border-rose-200/80',
    text: 'text-rose-600',
  },
  'text-rose-400': {
    bg: 'bg-rose-50 group-hover:bg-rose-100/70',
    border: 'border-rose-200/80',
    text: 'text-rose-600',
  },
  'text-red-400': {
    bg: 'bg-red-50 group-hover:bg-red-100/70',
    border: 'border-red-200/80',
    text: 'text-red-600',
  },
  'text-indigo-400': {
    bg: 'bg-indigo-50 group-hover:bg-indigo-100/70',
    border: 'border-indigo-200/80',
    text: 'text-indigo-600',
  },
  'text-sky-400': {
    bg: 'bg-sky-50 group-hover:bg-sky-100/70',
    border: 'border-sky-200/80',
    text: 'text-sky-600',
  },
  'text-sky-300': {
    bg: 'bg-sky-50 group-hover:bg-sky-100/70',
    border: 'border-sky-200/80',
    text: 'text-sky-600',
  },
  'text-orange-400': {
    bg: 'bg-orange-50 group-hover:bg-orange-100/70',
    border: 'border-orange-200/80',
    text: 'text-orange-600',
  },
};

interface ToolCardProps {
  tool: ToolDefinition;
  onSelectWorkflowFile?: (workflow: any) => void;
}

/**
 * Shared tool launcher: routes a ToolAction to the right modal / editor workflow.
 */
export const launchToolAction = (
  tool: ToolDefinition,
  ui: UIState,
  _docStore: { setViewMode: (v: 'single' | 'continuous' | 'organize' | 'spread') => void },
  _tools: { setTool: (t: any) => void },
  _onSelectWorkflowFile?: (workflow: any) => void
) => {
  const act = tool.action;
  let targetModal: ModalType = null;

  if (act.type === 'modal') {
    targetModal = act.modal;
  } else if (act.type === 'workflow') {
    if (act.modal) {
      targetModal = act.modal;
    } else if (act.viewMode === 'organize') {
      targetModal = 'organize';
    } else if (act.tool === 'draw' || act.tool === 'edit_text') {
      targetModal = 'organize';
    } else {
      targetModal = 'organize';
    }
  } else if (act.type === 'viewMode') {
    targetModal = 'organize';
  } else if (act.type === 'tool') {
    targetModal = 'organize';
  }

  const initialTab = (act as any).initialTab;
  if (targetModal === 'legal' && initialTab) {
    ui.setActiveLegalTab(initialTab);
  } else if (targetModal === 'convert' && initialTab) {
    ui.setActiveConvertTab(initialTab);
  } else if (targetModal === 'image-tools' && initialTab) {
    ui.setActiveImageTab(initialTab);
  } else if (targetModal === 'document-tools' && initialTab) {
    ui.setActiveDocTab(initialTab);
  } else if (targetModal === 'student-tools' && initialTab) {
    ui.setActiveStudentTab(initialTab);
  } else if (targetModal === 'developer-tools' && initialTab) {
    ui.setActiveDeveloperTab(initialTab);
  } else if (targetModal === 'ai-tools' && initialTab) {
    ui.setActiveAITab(initialTab);
  }

  if (targetModal) {
    ui.setActiveModal(targetModal);
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
    bg: 'bg-slate-50 group-hover:bg-gray-100',
    border: 'border-gray-200/80',
    text: 'text-gray-700',
  };

  const handleClick = (e: React.MouseEvent) => {
    // If heart clicked, don't trigger tool launch
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
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white hover:bg-gray-50/80 border border-gray-200 hover:border-gray-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer select-none text-left"
    >
      {/* Top row: Icon, Badge (if any), Favorite */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          className={`w-11 h-11 rounded-xl ${theme.bg} border ${theme.border} flex items-center justify-center transition-all duration-200 shadow-2xs`}
        >
          <IconComponent className={`w-5 h-5 ${theme.text}`} />
        </div>

        <div className="flex items-center gap-1.5">
          {tool.badge && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-gray-100 border border-gray-200 text-gray-600"
            >
              {tool.badge}
            </span>
          )}

          <button
            type="button"
            onClick={handleFavoriteToggle}
            className={`fav-btn p-3.5 lg:p-2 rounded-lg transition-all ${
              isFav
                ? 'opacity-100 text-rose-500 bg-rose-50'
                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-rose-500 hover:bg-gray-100'
            }`}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {tool.name}
        </h3>
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 min-h-[32px]">
          {tool.shortDesc}
        </p>
      </div>

      {/* Bottom Footer: Category & Open Action */}
      <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span className="text-[11px] font-medium capitalize text-gray-500 group-hover:text-gray-700 transition-colors">
          {tool.category} Tool
        </span>
        <span className="text-xs font-semibold text-blue-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-x-0.5 transition-all flex items-center gap-1">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
