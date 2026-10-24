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
  pdf: 'PDF & Document Tools',
  image: 'Photo & Image Tools',
  student: 'Student & Study Tools',
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

  // Locally recorded recent tools — only this user's real usage
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
      className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6"
    >
      {/* Recently Used — appears only when the user has local history */}
      {recentTools.length > 0 && !searchQuery && !showOnlyFavorites && (
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <h2 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
              <History className="w-3.5 h-3.5 text-red-500" />
              Recently used
            </h2>
            <button
              type="button"
              onClick={clearRecents}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Clear your recent tools history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {recentTools.map((tool) => {
              const Icon = ICON_MAP[tool.iconName] || Flame;
              const isFav = favorites.includes(tool.id);
              return (
                <div
                  key={tool.id}
                  className="shrink-0 inline-flex items-stretch rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 transition-all text-left shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => launchRecent(tool)}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-2"
                    title={`Open ${tool.name}`}
                  >
                    <Icon className={`w-4 h-4 ${tool.color}`} />
                    <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {tool.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tool.id);
                    }}
                    className="p-2 mr-1 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
                    aria-label={isFav ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
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

      {/* Search & Category Filter Header Bar (BillGenHai Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
        {/* Live Search Input */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder={`Search all ${ALL_TOOLS_COUNT} PDF & document tools…`}
            aria-label="Search tools"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-transparent transition-all placeholder:text-gray-400 font-sans shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 absolute right-2.5 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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
                className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/80 shadow-2xs'
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
            className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              showOnlyFavorites
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/80 shadow-2xs'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current text-white' : 'text-rose-500'}`} />
            <span>Favorites ({favorites.length})</span>
          </button>

          {/* Popular Filter Tab */}
          <button
            onClick={() => {
              setShowOnlyFavorites(false);
              setShowOnlyPopular((prev) => !prev);
            }}
            aria-pressed={showOnlyPopular}
            className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              showOnlyPopular
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/80 shadow-2xs'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showOnlyPopular ? 'fill-current text-white' : 'text-amber-500'}`} />
            <span>Popular</span>
          </button>
        </div>
      </div>

      {/* Tools Grid Section (BillGenHai Theme) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            {showOnlyFavorites
              ? 'Your Favorite Tools'
              : searchQuery
              ? `Results for "${searchQuery}"`
              : activeCategory === 'all'
              ? 'All Tools'
              : CATEGORY_LABELS[activeCategory]}
            <span className="text-xs font-semibold text-gray-500 px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-16 px-4 rounded-2xl bg-white border border-gray-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-500 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">No matching tools found</h4>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              {showOnlyFavorites
                ? "You haven't favorited any tools yet. Tap the heart on any card to save it here."
                : `Nothing matches "${searchQuery}". Try searching for "compress", "photo 50 kb", "merge", "pdf to word", or "organize".`}
            </p>
            {(searchQuery || showOnlyFavorites) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowOnlyFavorites(false);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 active:scale-95 cursor-pointer"
              >
                Show all tools
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 py-2">
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
