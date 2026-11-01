import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Layers,
  FileArchive,
  FilePlus,
  RefreshCw,
  Edit3,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  Heart,
  Flame,
} from 'lucide-react';
import { ToolCategory } from '@/types/tools';
import { TOOLS_CATALOG, searchTools } from '@/data/toolsCatalog';
import { ToolCard } from '@/components/home/ToolCard';
import { useFavoritesStore } from '@/stores/favoritesStore';

const ALL_TOOLS_COUNT = TOOLS_CATALOG.length;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Tools',
  organize: 'Organize PDF',
  optimize: 'Optimize PDF',
  'convert-to-pdf': 'Convert to PDF',
  'convert-from-pdf': 'Convert from PDF',
  edit: 'Edit PDF',
  security: 'PDF Security',
  handwriting: 'Handwriting Assignment Generator',
  pdf: 'Organize & PDF Tools',
  image: 'Convert to/from Images',
  document: 'Convert Documents',
  student: 'Handwriting & Exam Tools',
  developer: 'Optimize & Security',
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

  const { favorites } = useFavoritesStore();

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    let list = searchTools(searchQuery, activeCategory);
    if (showOnlyFavorites) {
      list = list.filter((t) => favorites.includes(t.id));
    }
    if (showOnlyPopular) {
      list = list.filter((t) => t.badge === 'popular' || t.badge === 'special');
    }
    return list;
  }, [searchQuery, activeCategory, showOnlyFavorites, showOnlyPopular, favorites]);

  const CATEGORY_TABS: { id: ToolCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All PDF Tools', icon: LayoutGrid },
    { id: 'organize', label: 'Organize', icon: Layers },
    { id: 'optimize', label: 'Optimize', icon: FileArchive },
    { id: 'convert-to-pdf', label: 'Convert to PDF', icon: FilePlus },
    { id: 'convert-from-pdf', label: 'Convert from PDF', icon: RefreshCw },
    { id: 'edit', label: 'Edit PDF', icon: Edit3 },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'handwriting', label: '✍️ Handwriting Generator', icon: Sparkles },
  ];

  return (
    <section
      id="tool-explorer"
      className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6"
    >
      {/* Search & Category Filter Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Live Search Input */}
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            enterKeyHint="search"
            placeholder={`Search all ${ALL_TOOLS_COUNT} PDF tools (e.g. merge, compress, handwriting, word)...`}
            aria-label="Search tools"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/60 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-xl pl-10 pr-9 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white focus:border-red-500 transition-all placeholder:text-slate-400 font-sans shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 lg:p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
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
                className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs shadow-red-500/25'
                    : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 border border-slate-200/60 shadow-2xs'
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
            className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              showOnlyFavorites
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'
                : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 border border-slate-200/60 shadow-2xs'
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
            className={`whitespace-nowrap px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              showOnlyPopular
                ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/20'
                : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 border border-slate-200/60 shadow-2xs'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showOnlyPopular ? 'fill-current text-white' : 'text-amber-500'}`} />
            <span>Popular</span>
          </button>
        </div>
      </div>

      {/* Tools Grid Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            {showOnlyFavorites
              ? 'Your Favorite Tools'
              : searchQuery
              ? `Results for "${searchQuery}"`
              : activeCategory === 'all'
              ? 'All PDF Tools'
              : (CATEGORY_LABELS[activeCategory] || activeCategory)}
            <span className="text-xs font-semibold text-slate-500 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No matching tools found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              We couldn&apos;t find any tool matching &quot;{searchQuery}&quot;. Try searching for merge, split, compress, or handwriting.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setShowOnlyFavorites(false);
                setShowOnlyPopular(false);
                onCategoryChange('all');
              }}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
