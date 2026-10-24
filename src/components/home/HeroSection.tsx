import React from 'react';
import { ShieldCheck, WifiOff } from 'lucide-react';

interface HeroSectionProps {
  children?: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ children }) => {
  return (
    <section className="w-full max-w-7xl mx-auto flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <h1 className="mt-2 sm:mt-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-3xl">
        Every tool you need to work with PDFs in one place
      </h1>
      <p className="mt-3 text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl font-normal">
        All are 100% free and easy to use! Merge, split, compress, convert, edit, and sign PDFs with just a few clicks. Processed 100% privately in your browser.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold"
          title="Your documents never leave this browser tab."
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Files never leave your device
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-white text-gray-600 font-semibold shadow-2xs"
          title="Tools keep working without an internet connection."
        >
          <WifiOff className="w-3.5 h-3.5 text-gray-500" />
          Works offline
        </span>
      </div>

      {children && <div className="w-full mt-6 sm:mt-8">{children}</div>}
    </section>
  );
};
