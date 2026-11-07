import React from 'react';
import { Cpu, ShieldCheck, Lock, CheckCircle2, Zap } from 'lucide-react';

export const FeatureBanners: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8 space-y-12">
      {/* Privacy Architecture Banner */}
      <div className="bg-slate-900 rounded-2xl text-white p-8 sm:p-12 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 border border-slate-700/80 rounded-full text-xs font-medium text-slate-300 mb-4">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span>Architecture &amp; Security</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            Compiled WebAssembly executing locally on your device.
          </h2>
          
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Most online PDF tools upload your confidential contracts, invoices, and personal records to external cloud servers.
            JustPDFCraft is built differently: all PDF manipulation, rendering, and conversion routines run inside your browser’s local sandboxed memory.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Zero server upload telemetry</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Instant local processing speeds</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Works offline without internet connection</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>No account required, no file size limits</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
            <Cpu size={20} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">Local WebAssembly Runtime</h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Compiled C++ and WebAssembly engines perform binary manipulation directly in memory, eliminating network latency and server upload bottlenecks.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <Lock size={20} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">Confidential by Default</h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Meets strict HIPAA, GDPR, and enterprise confidentiality standards because zero bytes of document data ever leave your machine.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
            <Zap size={20} />
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-slate-900">No Queue or Paywalls</h3>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Process unlimited files without arbitrary subscription tiers, queue waitlists, email collection, or watermarked outputs.
          </p>
        </div>
      </div>
    </section>
  );
};
