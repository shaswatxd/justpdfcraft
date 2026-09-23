import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  GraduationCap,
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
    <section className="relative w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col items-center text-center pt-8 pb-10 sm:pt-12 sm:pb-14 px-4 sm:px-6 lg:px-8">
      {/* Privacy guarantee pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-swift-500/10 border border-swift-500/20 text-swift-400 text-xs font-medium uppercase tracking-wider mb-6 shadow-xs">
        <Lock className="w-3.5 h-3.5 text-swift-400" />
        <span>100% Client-Side • Zero Cloud Uploads • Private & Secure</span>
      </div>

      {/* Main Headline & Subheadline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.12]">
        All Your <span className="text-swift-400 bg-gradient-to-r from-swift-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">PDF, Image & Student</span> Tools in One Place
      </h1>

      <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-2xl font-normal leading-relaxed">
        Fast, clean, and professional browser tools for editing PDFs, resizing exam photos, creating handwritten assignments, and student utilities.
      </p>

      {/* Primary CTAs */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
        <button
          onClick={() => {
            onSelectCategory('pdf');
            onOpenPdfUploader();
          }}
          className="px-5 py-2.5 rounded-xl bg-swift-600 hover:bg-swift-500 text-white font-semibold text-sm shadow-md shadow-swift-900/30 hover:shadow-lg hover:shadow-swift-800/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Explore PDF Tools
        </button>

        <button
          onClick={() => onSelectCategory('image')}
          className="px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-xs"
        >
          <ImageIcon className="w-4 h-4 text-pink-400" />
          Explore Image Tools
        </button>

        <button
          onClick={() => onSelectCategory('student')}
          className="px-5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-xs"
        >
          <GraduationCap className="w-4 h-4 text-amber-400" />
          Student Tools
        </button>

        <button
          onClick={() => onSelectCategory('all')}
          className="px-5 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white font-medium text-sm border border-slate-800 hover:border-slate-700 hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          All Tools
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Trust Indicators */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Blazing Fast & Lightweight</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Zero Server Storage</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-swift-400" />
          <span>100% In-Browser Privacy</span>
        </div>
      </div>

      {/* Category Visual Cards */}
      <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {[
          {
            category: 'pdf' as const,
            title: 'PDF Suite',
            desc: 'Merge, Split, Compress, OCR, In-Place Edit, Sign & Bates',
            icon: FileText,
            color: 'text-blue-400',
            bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
            border: 'border-blue-500/20 hover:border-blue-500/40',
            iconBg: 'bg-blue-500/10 border-blue-500/25',
          },
          {
            category: 'image' as const,
            title: 'Image Suite',
            desc: 'Target KB Resizer, Sign Whitener, DOP Stamp & Presets',
            icon: ImageIcon,
            color: 'text-pink-400',
            bg: 'from-pink-500/10 via-pink-500/5 to-transparent',
            border: 'border-pink-500/20 hover:border-pink-500/40',
            iconBg: 'bg-pink-500/10 border-pink-500/25',
          },
          {
            category: 'student' as const,
            title: 'Student Toolkit',
            desc: 'Handwriting Gen, CGPA, Attendance Bunk, Timetable & Notes',
            icon: GraduationCap,
            color: 'text-amber-400',
            bg: 'from-amber-500/10 via-amber-500/5 to-transparent',
            border: 'border-amber-500/20 hover:border-amber-500/40',
            iconBg: 'bg-amber-500/10 border-amber-500/25',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.category}
              onClick={() => onSelectCategory(item.category)}
              className={`p-5 rounded-2xl bg-gradient-to-b ${item.bg} bg-slate-900/50 border ${item.border} text-left cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/25 group select-none flex flex-col justify-between`}
            >
              <div>
                <div
                  className={`w-10 h-10 rounded-xl ${item.iconBg} border flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="text-[15px] font-semibold text-white group-hover:text-swift-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400/90 mt-1.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-medium text-swift-400 opacity-80 group-hover:opacity-100">
                <span>View Suite</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
