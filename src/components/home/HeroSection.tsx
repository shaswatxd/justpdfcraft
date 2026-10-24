import React from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

/**
 * Compact identity header: says in plain language what JustPDFCraft does,
 * without exaggerated claims, fake statistics or marketing slogans.
 */
export const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <section className="w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col items-center text-center px-3 sm:px-6 lg:px-8">
      <h1 className="mt-4 sm:mt-6 text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight max-w-3xl">
        Every PDF, photo & student task in one private toolbox
      </h1>
      <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
        Edit, sign, merge, compress and convert PDFs. Resize exam photos to an exact KB
        limit. Use student calculators and a handwriting generator — all processed on
        your own device.
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-zinc-400">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          title="Your documents never leave this browser tab."
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Files never leave your device
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300"
          title="Tools keep working without an internet connection."
        >
          <WifiOff className="w-3.5 h-3.5" />
          Works offline
        </span>
      </div>

      {children && <div className="w-full mt-5 sm:mt-7">{children}</div>}
    </section>
  );
};
