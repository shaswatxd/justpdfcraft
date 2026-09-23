import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  LayoutGrid,
  Heart,
  SlidersHorizontal,
  Flame,
} from 'lucide-react';
import { ToolCategory } from '@/types/tools';
import { searchTools } from '@/data/toolsCatalog';
import { ToolCard } from '@/components/home/ToolCard';
import { useFavoritesStore } from '@/stores/favoritesStore';

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
      list = list.filter((t) => t.badge === 'popular' || ['merge-pdf', 'compress-pdf', 'student-resizer', 'handwriting-gen', 'sign-pdf', 'split-pdf', 'ocr-pdf'].includes(t.id));
    }
    return list;
  }, [searchQuery, activeCategory, showOnlyFavorites, showOnlyPopular, favorites]);

  return (
    <section id="tool-explorer" className="w-full max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Search & Category Filter Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-950/80 p-2 sm:p-2.5 rounded-2xl border border-zinc-800/80 shadow-2xl backdrop-blur-xl">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all' as const, label: 'All Tools', icon: LayoutGrid },
            { id: 'pdf' as const, label: 'PDF Suite', icon: FileText },
            { id: 'image' as const, label: 'Image Suite', icon: ImageIcon },
            { id: 'student' as const, label: 'Student Toolkit', icon: GraduationCap },
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none ${
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

          {/* Popular Filter Tab */}
          <button
            onClick={() => {
              setShowOnlyFavorites(false);
              setShowOnlyPopular((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none ${
              showOnlyPopular
                ? 'bg-amber-600 text-white font-semibold shadow-md shadow-amber-950/50'
                : 'text-zinc-400 hover:text-amber-300 hover:bg-zinc-900/60'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showOnlyPopular ? 'fill-current text-white' : 'text-amber-400'}`} />
            <span>Popular</span>
          </button>

          {/* Favorites Filter Tab */}
          <button
            onClick={() => {
              setShowOnlyPopular(false);
              setShowOnlyFavorites((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all select-none ${
              showOnlyFavorites
                ? 'bg-rose-600 text-white font-semibold shadow-md shadow-rose-950/50'
                : 'text-zinc-400 hover:text-rose-300 hover:bg-zinc-900/60'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current text-white' : 'text-rose-400'}`} />
            <span>Favorites ({favorites.length})</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search 40+ tools... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-swift-500 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-swift-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200 absolute right-2 top-1/2 -translate-y-1/2"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tools Grid Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2 capitalize">
            <SlidersHorizontal className="w-4 h-4 text-swift-400" />
            {showOnlyFavorites
              ? 'Your Favorite Tools'
              : searchQuery
              ? `Search Results for "${searchQuery}"`
              : activeCategory === 'all'
              ? 'All Tools & Productivity Utilities'
              : `${activeCategory} Tools Suite`}
            <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50">
              {filteredTools.length} {filteredTools.length === 1 ? 'tool' : 'tools'}
            </span>
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-16 px-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">No matching tools found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {showOnlyFavorites
                ? "You haven't favorited any tools yet. Click the heart icon on any card to save it here."
                : `We couldn't find anything matching "${searchQuery}". Try searching for handwriting, compress, merge, cgpa, or ocr.`}
            </p>
            {(searchQuery || showOnlyFavorites) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowOnlyFavorites(false);
                }}
                className="px-4 py-2 bg-swift-600 hover:bg-swift-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-md"
              >
                Show All Tools
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
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
