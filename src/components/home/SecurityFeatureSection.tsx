import React from 'react';
import { ShieldCheck, Cpu, WifiOff, Lock, Check } from 'lucide-react';

export const SecurityFeatureSection: React.FC = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-10 shadow-xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Local-First Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Designed for privacy. Built without cloud uploads.
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
            Most online PDF editors upload your sensitive contracts, tax records, and ID proofs to third-party cloud servers. JustPDFCraft runs entirely inside your browser using WebAssembly and Web Workers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-100">
          {/* Pillar 1 */}
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">WebAssembly Core</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              PDF manipulation, compression, and page rendering execute locally at near-native speed without latency or bandwidth constraints.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Zero Server Storage</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Your files remain in your device’s volatile memory. When you close the browser tab, your document data is completely cleared.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <WifiOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Full Offline Operation</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Every tool works even when you are disconnected from the internet. Ideal for remote travel, air-gapped workstations, and strict privacy.
            </p>
          </div>
        </div>

        {/* Feature checklist */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-gray-700">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No file size artificial limits</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No account registration or login required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>No watermarks added to your documents</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Free forever</span>
          </div>
        </div>
      </div>
    </section>
  );
};
