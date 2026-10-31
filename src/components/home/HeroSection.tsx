import React from 'react';
import { ShieldCheck, WifiOff, CheckCircle2, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <section className="w-full max-w-7xl mx-auto flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 pb-4">
      {/* Editorial Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-3 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>100% In-Browser PDF Suite</span>
      </div>

      <h1 className="mt-1 text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
        Everything You Need to Work With Documents
      </h1>

      <p className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
        Merge, split, compress, edit, convert, and sign documents with zero cloud uploads. Powered by WebAssembly — your private files never leave your device.
      </p>

      {/* Trust & capability proof points */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold shadow-2xs"
          title="Your documents never leave this browser tab."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Zero Cloud Uploads
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 font-semibold shadow-2xs"
          title="Tools keep working without an internet connection."
        >
          <WifiOff className="w-3.5 h-3.5 text-slate-500" />
          Works Offline (PWA)
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 font-semibold shadow-2xs"
          title="No registration required, no watermarks added."
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          No Account Required • No Watermarks
        </span>
      </div>

      {children && <div className="w-full mt-6 sm:mt-8">{children}</div>}
    </section>
  );
};
