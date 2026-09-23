import React from 'react';
import { SwiftLogo } from '@/components/common/SwiftLogo';
import { useUIStore } from '@/stores/uiStore';
import { ToolCategory } from '@/types/tools';
import { Heart } from 'lucide-react';

interface HomeFooterProps {
  onSelectCategory: (category: ToolCategory | 'all') => void;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({ onSelectCategory }) => {
  const { setActiveModal, setActiveLegalTab } = useUIStore();

  const openLegal = (tab: string) => {
    setActiveLegalTab(tab);
    setActiveModal('legal');
  };

  return (
    <footer className="w-full bg-slate-950/80 border-t border-slate-800 text-slate-400 text-xs mt-12 py-10 px-6 select-none">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Column 1: Brand & Mission */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <SwiftLogo className="w-6 h-6" />
            <span className="font-bold text-base tracking-tight text-white">
              Just<span className="text-swift-400">PDFCraft</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            All-in-One PDF, Image & Student Toolkit. Free, ultra-fast, and 100% private.
            Documents and photos are processed strictly inside your browser.
          </p>
        </div>

        {/* Column 2: PDF Tools */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">PDF Suite</h4>
          <ul className="space-y-1.5">
            <li>
              <button
                onClick={() => {
                  onSelectCategory('pdf');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Merge PDF
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('pdf');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Split & Compress
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('pdf');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Direct Text Editor
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('pdf');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                OCR & Snip Text
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('pdf');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Organize Pages
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Image & Student Tools */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Image & Student</h4>
          <ul className="space-y-1.5">
            <li>
              <button
                onClick={() => {
                  onSelectCategory('image');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Target KB Resizer (20–50KB)
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('image');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Paper Signature Whitener
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Student Tools */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Suite</h4>
          <ul className="space-y-1.5">
            <li>
              <button
                onClick={() => {
                  onSelectCategory('student');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Handwriting Generator
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('student');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                CGPA & SGPA Calculator
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('student');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Attendance Bunk Planner
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  onSelectCategory('student');
                  document.getElementById('tool-explorer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-swift-400 transition-colors"
              >
                Timetable & QR Gen
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Legal & Trust */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Trust & Legal</h4>
          <ul className="space-y-1.5">
            <li>
              <button onClick={() => openLegal('about')} className="hover:text-swift-400 transition-colors">
                About JustPDFCraft
              </button>
            </li>
            <li>
              <button onClick={() => openLegal('privacy')} className="hover:text-swift-400 transition-colors">
                Privacy Policy
              </button>
            </li>
            <li>
              <button onClick={() => openLegal('terms')} className="hover:text-swift-400 transition-colors">
                Terms of Service
              </button>
            </li>
            <li>
              <button onClick={() => openLegal('disclaimer')} className="hover:text-swift-400 transition-colors">
                Disclaimer
              </button>
            </li>
            <li>
              <button onClick={() => openLegal('contact')} className="hover:text-swift-400 transition-colors">
                Contact Us
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-5xl mx-auto pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>
          © {new Date().getFullYear()} JustPDFCraft. All rights reserved. Built for students & professionals worldwide.
        </p>
        <p className="flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-rose-500 fill-current" /> for privacy & productivity
        </p>
      </div>
    </footer>
  );
};
