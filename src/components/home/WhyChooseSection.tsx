import React from 'react';
import { ShieldCheck, Zap, Laptop, Lock, Layers, Award } from 'lucide-react';

export const WhyChooseSection: React.FC = () => {
  const benefits = [
    {
      title: '100% Privacy by Design',
      desc: 'Files are processed inside your browser tab using WebAssembly and Web Workers. Zero remote file storage or analytics tracking.',
      icon: ShieldCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    },
    {
      title: 'Instant Local Speed',
      desc: 'No uploading or downloading lag. Even gigabyte-scale documents process with immediate native responsiveness.',
      icon: Zap,
      color: 'text-blue-600 bg-blue-50 border-blue-200/80',
    },
    {
      title: 'Works Offline Everywhere',
      desc: 'Install JustPDFCraft as a progressive web app (PWA) on your laptop or phone and edit PDFs completely off-grid.',
      icon: Laptop,
      color: 'text-violet-600 bg-violet-50 border-violet-200/80',
    },
    {
      title: 'Military-Grade Encryption',
      desc: 'Lock confidential documents with standard AES-128 and AES-256 bit password protection or strip print/copy restrictions.',
      icon: Lock,
      color: 'text-rose-600 bg-rose-50 border-rose-200/80',
    },
    {
      title: 'All-in-One Utility Arsenal',
      desc: '90+ integrated tools spanning PDF manipulation, exam photo resizing, student grade planning, and developer formats.',
      icon: Layers,
      color: 'text-amber-600 bg-amber-50 border-amber-200/80',
    },
    {
      title: 'No Watermarks or Limits',
      desc: 'Enjoy professional outputs without watermarks, mandatory sign-ups, or artificial page-count paywalls on core tools.',
      icon: Award,
      color: 'text-sky-600 bg-sky-50 border-sky-200/80',
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">Why JustPDFCraft</h2>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Built for Speed, Privacy, and Uncompromising Reliability
        </h3>
        <p className="text-sm text-slate-500 mt-2">
          Compare our local-first architecture against traditional upload-heavy online PDF converters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((b, idx) => {
          const Icon = b.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-start"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-4 ${b.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">{b.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
