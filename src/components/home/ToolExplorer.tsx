import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  LayoutGrid,
  Heart,
  Flame,
  History,
  Trash2,
} from 'lucide-react';
import { ToolCategory, ToolDefinition } from '@/types/tools';
import { TOOLS_CATALOG, searchTools } from '@/data/toolsCatalog';
import { ToolCard, launchToolAction, ICON_MAP } from '@/components/home/ToolCard';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRecentToolsStore } from '@/stores/recentToolsStore';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useToolStore } from '@/stores/toolStore';

const CATALOG_BY_ID: Record<string, ToolDefinition> = Object.fromEntries(
  TOOLS_CATALOG.map((t) => [t.id, t])
);
const ALL_TOOLS_COUNT = TOOLS_CATALOG.length;

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  pdf: 'PDF & document tools',
  image: 'Photo & image tools',
  student: 'Student & study tools',
};

interface ToolExplorerProps {
  activeCategory: ToolCategory | 'all';
  onCategoryChange: (category: ToolCategory | 'all') => void;
  onSelectWorkflowFile: (workflow: any) => void;
}

export const ToolExplorer: React.FC<ToolExplorerProps> = ({
  activeCategory,
  onCategoryChange,
  onSelectWorkflowFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);

  const { favorites, toggleFavorite } = useFavoritesStore();
  const { recentToolIds, clearRecents, trackTool } = useRecentToolsStore();
  const ui = useUIStore();
  const doc = useDocumentStore();
  const tools = useToolStore();

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    let list = searchTools(searchQuery, activeCategory);
    if (showOnlyFavorites) {
      list = list.filter((t) => favorites.includes(t.id));
    }
    if (showOnlyPopular) {
      list = list.filter((t) => t.badge === 'popular' || ['merge-pdf', 'compress-pdf', 'target-kb-resizer', 'handwriting-generator', 'sign-pdf', 'split-pdf', 'ocr-pdf'].includes(t.id));
    }
    return list;
  }, [searchQuery, activeCategory, showOnlyFavorites, showOnlyPopular, favorites]);

  // Locally recorded recent tools — only this user's real usage, never pre-seeded.
  const recentTools = useMemo(() => {
    if (!recentToolIds.length) return [];
    return recentToolIds
      .map((id) => CATALOG_BY_ID[id])
      .filter((t): t is ToolDefinition => Boolean(t))
      .slice(0, 6);
  }, [recentToolIds]);

  const launchRecent = (tool: ToolDefinition) => {
    trackTool(tool.id);
    launchToolAction(tool, ui, doc, tools, onSelectWorkflowFile);
  };

  return (
    <section
      id="tool-explorer"
      className="w-full max-w-6xl xl:max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-8"
    >
      {/* Recently Used — appears only when the user has local history */}
      {recentTools.length > 0 && !searchQuery && !showOnlyFavorites && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
            <h2 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <History className="w-3.5 h-3.5 text-swift-400" />
              Recently used
            </h2>
            <button
              type="button"
              onClick={clearRecents}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors min-h-[36px]"
              title="Clear your recent tools history (stored only in this browser)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
            {recentTools.map((tool) => {
              const Icon = ICON_MAP[tool.iconName] || Flame;
              const isFav = favorites.includes(tool.id);
              return (
                <div
                  key={tool.id}
                  className="shrink-0 inline-flex items-stretch rounded-xl border border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900 transition-colors text-left"
                >
                  <button
                    type="button"
                    onClick={() => launchRecent(tool)}
                    className="inline-flex items-center gap-2 pl-2.5 pr-2 py-2"
                    title={`Open ${tool.name}`}
                  >
                    <Icon className={`w-4 h-4 ${tool.color}`} />
                    <span className="text-xs font-semibold text-zinc-200 whitespace-nowrap">
                      {tool.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tool.id);
                    }}
                    className="p-2 mr-1 rounded-lg text-zinc-600 hover:text-rose-400 transition-colors"
                    aria-label={
                      isFav
                        ? `Remove ${tool.name} from favorites`
                        : `Add ${tool.name} to favorites`
                    }
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Category Filter Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950/80 p-2 sm:p-2.5 rounded-2xl border border-zinc-800/80 shadow-lg">
        {/* Live Search Input — prominent and thumb friendly */}
        <div className="relative flex-1 md:max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder={`Search all ${ALL_TOOLS_COUNT} tools…`}
            aria-label="Search tools"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-swift-500 rounded-xl pl-9 pr-9 py-3 sm:py-2.5 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-swift-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all' as const, label: 'All Tools', icon: LayoutGrid },
            { id: 'pdf' as const, label: 'PDF', icon: FileText },
            { id: 'image' as const, label: 'Image & Photo', icon: ImageIcon },
            { id: 'student' as const, label: 'Student', icon: GraduationCap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id && !showOnlyFavorites && !showOnlyPopular;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setShowOnlyFavorites(false);
                  setShowOnlyPopular(false);
                  onCategoryChange(tab.id);
                }}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none min-h-[44px] ${
                  isActive
                    ? 'bg-swift-600 text-white font-semibold shadow-md shadow-swift-950/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {/* Favorites Filter Tab */}
          <button
            onClick={() => {
              setShowOnlyPopular(false);
              setShowOnlyFavorites((prev) => !prev);
            }}
            aria-pressed={showOnlyFavorites}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none min-h-[44px] ${
              showOnlyFavorites
                ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-950/50'
                : 'text-zinc-400 hover:text-rose-300 hover:bg-zinc-900/60'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current text-white' : 'text-rose-400'}`} />
            <span>Favorites ({favorites.length})</span>
          </button>

          {/* Popular Filter Tab */}
          <button
            onClick={() => {
              setShowOnlyFavorites(false);
              setShowOnlyPopular((prev) => !prev);
            }}
            aria-pressed={showOnlyPopular}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none min-h-[44px] ${
              showOnlyPopular
                ? 'bg-amber-600 text-white font-semibold shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900/60'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showOnlyPopular ? 'fill-current text-white' : 'text-amber-400'}`} />
            <span>Popular</span>
          </button>
        </div>
      </div>

      {/* Tools Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2">
            {showOnlyFavorites
              ? 'Your favorite tools'
              : searchQuery
              ? `Results for "${searchQuery}"`
              : activeCategory === 'all'
              ? 'All tools'
              : CATEGORY_LABELS[activeCategory]}
            <span className="text-[11px] font-normal text-zinc-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-12 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-300">No matching tools found</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {showOnlyFavorites
                ? "You haven't favorited any tools yet. Tap the heart on any card to save it here."
                : `Nothing matches "${searchQuery}". Try "compress", "photo 50 kb", "merge", "cgpa", "signature" or "reorder".`}
            </p>
            {(searchQuery || showOnlyFavorites) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowOnlyFavorites(false);
                }}
                className="px-4 py-2.5 bg-swift-600 hover:bg-swift-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md min-h-[44px]"
              >
                Show all tools
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onSelectWorkflowFile={onSelectWorkflowFile}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
