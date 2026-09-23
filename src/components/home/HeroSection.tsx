import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Sliders,
  ArrowRight,
} from 'lucide-react';
import { ToolCategory } from '@/types/tools';

interface HeroSectionProps {
  onSelectCategory: (category: ToolCategory | 'all') => void;
  onOpenPdfUploader?: () => void;
  onOpenExamSuite?: () => void;
  children?: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectCategory,
  onOpenExamSuite,
  children,
}) => {
  return (
    <section className="relative w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col items-center text-center pt-3 pb-6 sm:pt-6 sm:pb-8 px-3 sm:px-6 lg:px-8">
      {/* Front & Center Top Dropzone */}
      {children && (
        <div className="w-full">
          {children}
        </div>
      )}

      {/* Quick Category Jump Buttons */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 w-full sm:w-auto px-2">
        <button
          onClick={() => onSelectCategory('pdf')}
          className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>PDF Tools</span>
        </button>

        <button
          onClick={() => onSelectCategory('image')}
          className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
          <span>Image Tools</span>
        </button>

        <button
          onClick={() => onSelectCategory('student')}
          className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          <span>Student Tools</span>
        </button>

        <button
          onClick={onOpenExamSuite}
          className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 font-medium text-xs border border-amber-500/30 hover:border-amber-500/50 transition-all flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Exam Suite</span>
        </button>

        <button
          onClick={() => onSelectCategory('all')}
          className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-medium text-xs border border-zinc-800/80 hover:border-zinc-700 transition-all flex items-center justify-center gap-1"
        >
          <span>All 45 Tools</span>
          <ArrowRight className="w-3 h-3 text-zinc-500" />
        </button>
      </div>
    </section>
  );
};
