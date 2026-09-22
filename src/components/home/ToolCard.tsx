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

interface ToolCardProps {
  tool: ToolDefinition;
  onSelectWorkflowFile?: (workflow: any) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelectWorkflowFile }) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { trackTool } = useRecentToolsStore();
  const { setActiveModal, setActiveStudentTab, setActiveAITab, setActiveImageTab } = useUIStore();
  const { setViewMode } = useDocumentStore();
  const { setTool } = useToolStore();

  const IconComponent = ICON_MAP[tool.iconName] || Sparkles;
  const isFav = isFavorite(tool.id);

  const handleClick = (e: React.MouseEvent) => {
    // If heart clicked, don't trigger tool launch
    if ((e.target as HTMLElement).closest('.fav-btn')) {
      return;
    }

    trackTool(tool.id);
    analytics.trackEvent('tool_opened', { toolId: tool.id, category: tool.category });

    const act = tool.action;
    if (act.type === 'modal') {
      if (act.modal === 'student-calculators' && act.initialTab) {
        setActiveStudentTab(act.initialTab);
      } else if (act.modal === 'ai-tools' && act.initialTab) {
        setActiveAITab(act.initialTab);
      } else if (act.modal === 'image-tools' && act.initialTab) {
        setActiveImageTab(act.initialTab);
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
      className="group relative flex flex-col justify-between p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 hover:border-swift-500/50 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer select-none text-left"
    >
      {/* Top row: Icon, Badge, Favorite */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
          <IconComponent className={`w-5 h-5 ${tool.color}`} />
        </div>

        <div className="flex items-center gap-1.5">
          {tool.badge && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                tool.badge === 'popular'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : tool.badge === 'recommended'
                  ? 'bg-swift-500/20 text-swift-400 border border-swift-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {tool.badge}
            </span>
          )}

          <button
            type="button"
            onClick={handleFavoriteToggle}
            className="fav-btn p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Title and description */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-swift-400 transition-colors line-clamp-1">
          {tool.name}
        </h3>
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {tool.shortDesc}
        </p>
      </div>

      {/* Category tag bottom pill */}
      <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="capitalize">{tool.category} Tool</span>
        <span className="text-swift-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-xs font-semibold">
          Open →
        </span>
      </div>
    </div>
  );
};
