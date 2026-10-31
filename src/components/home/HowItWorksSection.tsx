import React from 'react';
import { UploadCloud, Cpu, Download } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Select a Tool or Drop File',
      desc: 'Pick any PDF, image, document, or developer utility from our instant finder or drop your file right on the page.',
      icon: UploadCloud,
    },
    {
      num: '02',
      title: 'Process Instantly in Browser',
      desc: 'Our high-speed WebAssembly engine processes your file directly in memory. No server uploads, zero wait queues.',
      icon: Cpu,
    },
    {
      num: '03',
      title: 'Download Ready Output',
      desc: 'Save your compressed, converted, edited, or generated document immediately to your device with full fidelity.',
      icon: Download,
    },
  ];

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1.5">How It Works</h2>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Three Simple Steps to Flawless Documents
        </h3>
        <p className="text-sm text-slate-500 mt-2">
          Experience frictionless in-browser document processing without uploading private files to third-party clouds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-black text-blue-600/30">{step.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">{step.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
