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
  Heart,
  ArrowRight,
  LucideIcon,
} from 'lucide-react';
import { ToolDefinition } from '@/types/tools';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRecentToolsStore } from '@/stores/recentToolsStore';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';
import { analytics } from '@/utils/analytics';

const ICON_MAP: Record<string, LucideIcon> = {
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
};

const COLOR_THEMES: Record<string, { bg: string; border: string; text: string }> = {
  'text-blue-400': {
    bg: 'bg-blue-500/10 group-hover:bg-blue-500/15',
    border: 'border-blue-500/20 group-hover:border-blue-500/35',
    text: 'text-blue-400',
  },
  'text-amber-400': {
    bg: 'bg-amber-500/10 group-hover:bg-amber-500/15',
    border: 'border-amber-500/20 group-hover:border-amber-500/35',
    text: 'text-amber-400',
  },
  'text-amber-500': {
    bg: 'bg-amber-500/10 group-hover:bg-amber-500/15',
    border: 'border-amber-500/20 group-hover:border-amber-500/35',
    text: 'text-amber-400',
  },
  'text-yellow-400': {
    bg: 'bg-yellow-500/10 group-hover:bg-yellow-500/15',
    border: 'border-yellow-500/20 group-hover:border-yellow-500/35',
    text: 'text-yellow-400',
  },
  'text-emerald-400': {
    bg: 'bg-emerald-500/10 group-hover:bg-emerald-500/15',
    border: 'border-emerald-500/20 group-hover:border-emerald-500/35',
    text: 'text-emerald-400',
  },
  'text-teal-400': {
    bg: 'bg-teal-500/10 group-hover:bg-teal-500/15',
    border: 'border-teal-500/20 group-hover:border-teal-500/35',
    text: 'text-teal-400',
  },
  'text-purple-400': {
    bg: 'bg-purple-500/10 group-hover:bg-purple-500/15',
    border: 'border-purple-500/20 group-hover:border-purple-500/35',
    text: 'text-purple-400',
  },
  'text-pink-400': {
    bg: 'bg-pink-500/10 group-hover:bg-pink-500/15',
    border: 'border-pink-500/20 group-hover:border-pink-500/35',
    text: 'text-pink-400',
  },
  'text-cyan-400': {
    bg: 'bg-cyan-500/10 group-hover:bg-cyan-500/15',
    border: 'border-cyan-500/20 group-hover:border-cyan-500/35',
    text: 'text-cyan-400',
  },
  'text-sky-400': {
    bg: 'bg-sky-500/10 group-hover:bg-sky-500/15',
    border: 'border-sky-500/20 group-hover:border-sky-500/35',
    text: 'text-sky-400',
  },
  'text-indigo-400': {
    bg: 'bg-indigo-500/10 group-hover:bg-indigo-500/15',
    border: 'border-indigo-500/20 group-hover:border-indigo-500/35',
    text: 'text-indigo-400',
  },
  'text-rose-400': {
    bg: 'bg-rose-500/10 group-hover:bg-rose-500/15',
    border: 'border-rose-500/20 group-hover:border-rose-500/35',
    text: 'text-rose-400',
  },
};

interface ToolCardProps {
  tool: ToolDefinition;
  onSelectWorkflowFile?: (workflow: any) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelectWorkflowFile }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { trackTool } = useRecentToolsStore();
  const {
    setActiveModal,
    setActiveStudentTab,
    setActiveImageTab,
    setActiveLegalTab,
    setActiveConvertTab,
  } = useUIStore();
  const { setViewMode } = useDocumentStore();
  const { setTool } = useToolStore();

  const IconComponent = ICON_MAP[tool.iconName] || Sparkles;
  const isFav = isFavorite(tool.id);
  const theme = COLOR_THEMES[tool.color] || {
    bg: 'bg-slate-800/60 group-hover:bg-slate-800/90',
    border: 'border-slate-700/60 group-hover:border-slate-600',
    text: 'text-slate-300',
  };

  const handleClick = (e: React.MouseEvent) => {
    // If heart clicked, don't trigger tool launch
    if ((e.target as HTMLElement).closest('.fav-btn')) {
      return;
    }

    trackTool(tool.id);
    analytics.trackEvent('tool_opened', { toolId: tool.id, category: tool.category });

    const act = tool.action;
    if (act.type === 'modal') {
      if ((act.modal === 'student-calculators' || act.modal === 'student-resizer') && act.initialTab) {
        setActiveStudentTab(act.initialTab);
      } else if (act.modal === 'image-tools' && act.initialTab) {
        setActiveImageTab(act.initialTab);
      } else if (act.modal === 'legal' && act.initialTab) {
        setActiveLegalTab(act.initialTab);
      } else if (act.modal === 'convert' && act.initialTab) {
        setActiveConvertTab(act.initialTab);
      }
      setActiveModal(act.modal);
    } else if (act.type === 'workflow') {
      if (onSelectWorkflowFile) {
        onSelectWorkflowFile(act);
      }
    } else if (act.type === 'viewMode') {
      setViewMode(act.viewMode);
    } else if (act.type === 'tool') {
      setTool(act.tool);
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(tool.id);
    analytics.trackEvent(isFav ? 'tool_unfavorited' : 'tool_favorited', { toolId: tool.id });
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
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-950 hover:bg-zinc-900/60 border border-zinc-900 hover:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-black/25 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none text-left"
    >
      {/* Top row: Icon, Badge (if any), Favorite */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div
          className="w-10 h-10 rounded-xl bg-zinc-900/90 group-hover:bg-zinc-800 border border-zinc-800/80 group-hover:border-zinc-700 flex items-center justify-center transition-all duration-200 shadow-xs"
        >
          <IconComponent className={`w-5 h-5 ${theme.text}`} />
        </div>

        <div className="flex items-center gap-1.5">
          {tool.badge && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              {tool.badge}
            </span>
          )}

          <button
            type="button"
            onClick={handleFavoriteToggle}
            className={`fav-btn p-1.5 rounded-lg transition-all ${
              isFav
                ? 'opacity-100 text-rose-500 bg-rose-500/10'
                : 'opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800'
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
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
          {tool.name}
        </h3>
        <p className="text-xs text-zinc-400/90 leading-relaxed line-clamp-2 min-h-[34px]">
          {tool.shortDesc}
        </p>
      </div>

      {/* Bottom Footer: Category & Open Action */}
      <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-500">
        <span className="text-[11px] font-medium capitalize text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {tool.category} Tool
        </span>
        <span className="text-xs font-semibold text-swift-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex items-center gap-1">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
