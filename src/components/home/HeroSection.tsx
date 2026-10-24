import React from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <section className="w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col items-center text-center px-3 sm:px-6 lg:px-8">
      <h1 className="mt-4 sm:mt-8 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl">
        Every tool you need to work with PDFs in one place
      </h1>
      <p className="mt-2.5 text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-normal">
        All are 100% free and easy to use! Merge, split, compress, convert, edit, and sign PDFs with just a few clicks. Processed 100% privately in your browser.
      </p>
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 font-medium"
          title="Your documents never leave this browser tab."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Files never leave your device
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 text-slate-600 dark:text-zinc-300 font-medium shadow-xs"
          title="Tools keep working without an internet connection."
        >
          <WifiOff className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
          Works offline
        </span>
      </div>

      {children && <div className="w-full mt-5 sm:mt-7">{children}</div>}
    </section>
  );
};
