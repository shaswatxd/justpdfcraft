import React from 'react';
import { Search, Sparkles, Command } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ searchQuery, onSearchChange }) => {
  return (
    <section className="pt-16 pb-10 px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
      {/* Studio Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
        <Sparkles size={14} className="text-indigo-600" />
        <span>The Private Client-Side PDF Studio</span>
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
        Craft, transform, &amp; secure PDFs <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600">with zero compromises.</span>
      </h1>
      
      <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        An open in-browser document workshop. Convert, sign, compress, and edit PDFs with zero file uploads and instant WebAssembly speed.
      </p>

      {/* Modern Search bar */}
      <div className="mt-8 max-w-xl mx-auto relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search 26 tools (e.g. merge, word, sign, protect, ocr)..."
          className="w-full pl-11 pr-24 py-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5 pointer-events-none">
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="pointer-events-auto text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              <Command size={10} /> F
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
