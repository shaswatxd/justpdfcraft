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
      'No. JustPDFCraft operates on a 100% client-side, local-first architecture using WebAssembly and Web Workers. Your PDF files, photos, signatures, and notes are processed entirely within your web browser’s volatile memory. Zero files are uploaded or saved to any external cloud server.',
  },
  {
    question: 'How do I merge multiple PDF files?',
    answer:
      'Click on "Merge PDF" from the tools catalog, drag and drop two or more PDF files (or browse them), reorder them by dragging the list items into your desired sequence, and click "Merge & Download". The merged document will be generated locally in seconds.',
  },
  {
    question: 'How does the Target KB Image Resizer work for exams?',
    answer:
      'Government exam portals (like SSC, UPSC, NEET, JEE, and IBPS) require candidate photos to be strictly between specific sizes (e.g. 20–50 KB). Our student tool uses high-precision binary-search quality algorithms and dimension scaling to hit your exact target KB range without blurry degradation.',
  },
  {
    question: 'Is JustPDFCraft completely free to use?',
    answer:
      'Yes, JustPDFCraft is completely free. All 20+ PDF tools, handwritten assignment generator, image compressors, paper whiteners, and 14 student productivity calculators are unlimited and free without subscriptions or forced watermarks.',
  },
  {
    question: 'What file formats are supported?',
    answer:
      'JustPDFCraft supports PDF (.pdf, version 1.0 through 2.0), standard raster images (JPG, JPEG, PNG, WebP, GIF, BMP), as well as plain text (.txt) and Markdown (.md) exports.',
  },
  {
    question: 'How large can a file be?',
    answer:
      'Because all processing is performed locally on your device, file sizes are limited only by your computer or smartphone’s available RAM. Documents up to several hundred megabytes and hundreds of pages have been tested and process smoothly.',
  },
  {
    question: 'Do I need to create an account or log in?',
    answer:
      'No account is required. All tools are immediately accessible to anonymous visitors. Your recent tools, favorites, paper tone preferences, and student notes are saved safely in your browser’s local storage.',
  },
  {
    question: 'How does PDF compression work?',
    answer:
      'PDF compression uses client-side PDF stream optimization and optional downsampling of high-resolution embedded images. Redundant metadata, unused font descriptors, and uncompressed streams are compacted to yield smaller file sizes while maintaining readability.',
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((current) => (current === idx ? null : idx));
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
          <HelpCircle className="w-3.5 h-3.5 text-swift-400" />
          Got Questions?
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Everything you need to know about JustPDFCraft tools, privacy, and how our local-first engine works.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={faq.question}
              className="rounded-2xl bg-slate-800/40 border border-slate-700/60 overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleIndex(idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-800/70 transition-colors select-none"
              >
                <span className="text-sm sm:text-base font-semibold text-slate-200">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-swift-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-700/40 pt-3">
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
