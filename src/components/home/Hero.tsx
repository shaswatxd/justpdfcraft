import React, { useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ searchQuery, onSearchChange }) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut: Cmd+K or Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="pt-6 pb-1 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Compact Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <Search size={18} />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search 25+ PDF tools (e.g. merge, compress, word, sign)..."
          className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {searchQuery ? (
            <button
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="text-xs font-medium text-slate-400 hover:text-slate-700 px-2 py-1 transition-colors"
            >
              Clear
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
              <kbd className="font-mono text-[10px]">⌘</kbd>
              <kbd className="font-mono text-[10px]">K</kbd>
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
