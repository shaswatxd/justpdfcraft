import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { ToolCategory } from '@/types/tools';

interface HeroSectionProps {
  onSelectCategory: (category: ToolCategory | 'all') => void;
  onOpenPdfUploader: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSelectCategory,
  onOpenPdfUploader,
}) => {
  return (
    <section className="relative w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-4 pb-6 px-4">
      {/* Privacy guarantee pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-swift-500/10 border border-swift-500/25 text-swift-400 text-xs font-semibold uppercase tracking-wider mb-5 shadow-xs">
        <Lock className="w-3.5 h-3.5 text-swift-400" />
        <span>100% Client-Side • Zero Cloud Uploads • Private & Secure</span>
      </div>

      {/* Main Headline & Subheadline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.15]">
        All Your <span className="text-swift-400 bg-gradient-to-r from-swift-400 to-indigo-400 bg-clip-text text-transparent">PDF, Image & Student</span> Tools in One Place
      </h1>

      <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
        Fast, simple and powerful tools for PDFs, images, documents and everyday student tasks. Everything runs directly in your browser.
      </p>

      {/* Primary CTAs */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => {
            onSelectCategory('pdf');
            onOpenPdfUploader();
          }}
          className="px-5 py-2.5 rounded-xl bg-swift-600 hover:bg-swift-500 text-white font-semibold text-sm shadow-lg shadow-swift-900/40 hover:shadow-swift-700/50 hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Explore PDF Tools
        </button>

        <button
          onClick={() => onSelectCategory('image')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 hover:border-slate-600 hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4 text-pink-400" />
          Explore Image Tools
        </button>

        <button
          onClick={() => onSelectCategory('student')}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 hover:border-slate-600 hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <GraduationCap className="w-4 h-4 text-amber-400" />
          Student Tools
        </button>

        <button
          onClick={() => onSelectCategory('all')}
          className="px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-700/60 hover:scale-[1.02] transition-all flex items-center gap-1.5"
        >
          All Tools
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Trust Indicators */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Fast & Easy</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>No Installation</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-swift-400" />
          <span>Privacy Focused (In-Browser)</span>
        </div>
      </div>

      {/* Category Visual Cards */}
      <div className="mt-8 w-full grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            category: 'pdf' as const,
            title: 'PDF Suite',
            desc: '20+ tools: Merge, Split, Compress, OCR, Direct Edit',
            icon: FileText,
            color: 'text-blue-400',
            bg: 'from-blue-500/10 to-transparent',
            border: 'border-blue-500/20 hover:border-blue-500/50',
          },
          {
            category: 'image' as const,
            title: 'Image Suite',
            desc: 'Target KB Resizer, Sign Whitener, DOP Strip & Presets',
            icon: ImageIcon,
            color: 'text-pink-400',
            bg: 'from-pink-500/10 to-transparent',
            border: 'border-pink-500/20 hover:border-pink-500/50',
          },
          {
            category: 'student' as const,
            title: 'Student Toolkit',
            desc: 'Handwriting Gen, CGPA, Attendance Bunk, Timetable, Notes & QR',
            icon: GraduationCap,
            color: 'text-amber-400',
            bg: 'from-amber-500/10 to-transparent',
            border: 'border-amber-500/20 hover:border-amber-500/50',
          },
          {
            category: 'ai' as const,
            title: 'AI Study Assistant',
            desc: 'Ask PDF, Summarizer, Study Notes, MCQs & Flashcards',
            icon: Sparkles,
            color: 'text-indigo-400',
            bg: 'from-indigo-500/10 to-transparent',
            border: 'border-indigo-500/20 hover:border-indigo-500/50',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.category}
              onClick={() => onSelectCategory(item.category)}
              className={`p-4 rounded-2xl bg-gradient-to-b ${item.bg} bg-slate-900/60 border ${item.border} text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group select-none`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-swift-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
