import React, { useState } from 'react';
import { ToolDefinition, ToolId } from '../../types/pdf';
import { ToolCard } from './ToolCard';
import { CATEGORIES } from '../../config/tools';

interface ToolGridProps {
  tools: ToolDefinition[];
  searchQuery: string;
  onSelectTool: (id: ToolId) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({ tools, searchQuery, onSelectTool }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-xs font-semibold'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
          }`}
        >
          All Tools ({tools.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = tools.filter(t => t.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`ml-1.5 text-xs ${selectedCategory === cat.id ? 'text-slate-300' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of tools */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 max-w-md mx-auto shadow-xs">
          <p className="text-slate-600 text-sm font-medium">No tools found matching &quot;{searchQuery}&quot;.</p>
          <p className="text-slate-400 text-xs mt-1">Try searching for merge, compress, word, sign, or rotate.</p>
          <button
            onClick={() => { setSelectedCategory('all'); }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
