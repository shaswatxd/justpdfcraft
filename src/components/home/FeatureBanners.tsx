import React from 'react';
import { ShieldCheck, Cpu, Smartphone, Sparkles, CheckCircle2, Lock, FileCode2 } from 'lucide-react';

export const FeatureBanners: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-16">
      {/* Studio Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl text-white p-8 sm:p-14 shadow-2xl border border-indigo-800/40">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-xs font-semibold text-indigo-300 mb-5">
            <Sparkles size={14} />
            <span>Built Differently by Design</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            A real PDF workshop running directly on your hardware.
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            Most online PDF websites upload your private contracts, financial invoices, and medical records to anonymous cloud servers. JustPDFCraft runs 100% locally in your browser sandbox using compiled WebAssembly.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-indigo-200">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Zero server upload telemetry</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-indigo-200">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Instant client-side throughput</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-indigo-200">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Offline capable workspace</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-indigo-200">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>Zero tracking or mandatory login</span>
            </div>
          </div>
        </div>

        {/* Ambient lighting */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 3 Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
            <Cpu size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-900">High-Performance Processing</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Direct WebAssembly byte manipulation and fast local memory operations eliminate network roundtrips.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
            <Lock size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Complete Confidentiality</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Strict client isolation ensures HIPAA, GDPR, and enterprise NDA compatibility by never transmitting data.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5">
            <FileCode2 size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Modern Format Support</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Full fidelity support for PDF/A archiving, Word DOCX, Excel XLSX, and high-resolution rasterization.
          </p>
        </div>
      </div>
    </section>
  );
};
