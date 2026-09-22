import React from 'react';
import { ShieldCheck, Zap, Laptop, GraduationCap, Check } from 'lucide-react';

export const FeatureHighlights: React.FC = () => {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Why Students & Professionals Choose <span className="text-swift-400">JustPDFCraft</span>
        </h2>
        <p className="text-sm text-slate-400">
          Engineered from scratch to solve real document, image, and exam submission problems without compromising speed or data privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: ShieldCheck,
            title: '100% In-Browser Privacy',
            desc: 'Your documents and photos never leave your device. All compression, merging, editing, and calculations run in local browser memory.',
            badge: 'Zero Cloud Storage',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            icon: Zap,
            title: 'Instant Lightning Speed',
            desc: 'Zero server queues and zero waiting for network uploads. Even large multi-page PDF operations execute in milliseconds.',
            badge: 'Real-Time Canvas',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
          {
            icon: GraduationCap,
            title: 'Student Exam Toolkit',
            desc: 'Exact target KB resizer (20–50 KB), paper signature whitener, DOP name banner, CGPA, Attendance Bunk, and Timetable planner.',
            badge: 'SSC • UPSC • NEET',
            color: 'text-swift-400',
            bg: 'bg-swift-500/10 border-swift-500/20',
          },
          {
            icon: Laptop,
            title: 'Runs Anywhere, 100% Free',
            desc: 'No expensive subscriptions, watermarks, or software installations. Seamless experience across smartphones, tablets, and laptops.',
            badge: 'Mobile First',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10 border-purple-500/20',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-slate-600 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.bg}`}>
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-700/40">
                <Check className="w-3.5 h-3.5 text-swift-400" />
                <span>Verified in Client Engine</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
