import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Are my uploaded files and photos stored on your servers?',
    answer:
      'No. JustPDFCraft operates on a 100% client-side, local-first architecture using WebAssembly and Web Workers. Your PDF files, photos, signatures, and documents are processed entirely within your web browser’s volatile memory. Zero files are uploaded or saved to any external cloud server.',
  },
  {
    question: 'How do I merge multiple PDF files?',
    answer:
      'Click on "Merge PDF" from the tools catalog, drag and drop two or more PDF files (or browse them), reorder them by dragging the list items into your desired sequence, and click "Merge & Download". The merged document will be generated locally in seconds.',
  },
  {
    question: 'How does the Target KB Image Resizer work for exams?',
    answer:
      'Government exam portals (like SSC, UPSC, NEET, JEE, and IBPS) require candidate photos to be strictly between specific sizes (e.g. 20–50 KB). Our photo tool uses high-precision binary-search quality algorithms and dimension scaling to hit your exact target KB range without blurry degradation.',
  },
  {
    question: 'Is JustPDFCraft completely free to use?',
    answer:
      'Yes, JustPDFCraft is completely free. The full PDF toolset, the exact-KB photo resizer, and the handwritten assignment generator are available without subscriptions, accounts, or forced watermarks.',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="w-5 h-5 text-swift-400" />
        <h3 className="text-lg font-bold text-slate-100">Frequently Asked Questions</h3>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-slate-800/80 rounded-xl bg-slate-900/40 overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleIndex(index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-slate-200">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-swift-400' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/40">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
