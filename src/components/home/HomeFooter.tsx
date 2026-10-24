import React from 'react';
import { SwiftLogo } from '@/components/common/SwiftLogo';
import { useUIStore } from '@/stores/uiStore';
import { ToolCategory } from '@/types/tools';
import { Heart } from 'lucide-react';

interface HomeFooterProps {
  onSelectCategory: (category: ToolCategory | 'all') => void;
}

const scrollToExplorer = () => {
  const dash = document.getElementById('home-dashboard');
  const el = document.getElementById('tool-explorer');
  if (!el) return;
  const top = dash ? dash.getBoundingClientRect().top : 0;
  const rect = el.getBoundingClientRect();
  dash?.scrollTo({ top: dash.scrollTop + (rect.top - top) - 72, behavior: 'smooth' });
};

/** Footer link with a comfortable touch target (44px row) on every device. */
const FooterLink: React.FC<{
  label: string;
  onClick?: () => void;
  title?: string;
}> = ({ label, onClick, title }) => (
  <button
    onClick={onClick || scrollToExplorer}
    className="inline-block w-auto py-2 min-h-[36px] hover:text-swift-400 transition-colors text-left"
    title={title}
  >
    {label}
  </button>
);

export const HomeFooter: React.FC<HomeFooterProps> = ({ onSelectCategory }) => {
  const { setActiveModal, setActiveLegalTab } = useUIStore();

  const openLegal = (tab: string) => {
    setActiveLegalTab(tab);
    setActiveModal('legal');
  };

  const goCategory = (cat: ToolCategory | 'all') => {
    onSelectCategory(cat);
    scrollToExplorer();
  };

  return (
    <footer className="w-full bg-slate-950/80 border-t border-slate-800 text-slate-400 text-xs mt-12 py-10 px-6 select-none">
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Column 1: Brand & Mission */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <SwiftLogo className="w-6 h-6 shrink-0" />
            <span className="font-bold text-base tracking-tight text-white">
              Just<span className="text-swift-400">PDFCraft</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            All-in-one PDF, image and student toolkit. Free, and privacy-first:
            documents and photos are processed strictly inside your browser — never
            uploaded to a server.
          </p>
        </div>

        {/* Column 2: PDF tools */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">PDF Suite</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Merge PDF" title="Browse the PDF tools catalogue" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="Split & Compress" title="Browse the PDF tools catalogue" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="Direct Text Editor" title="Browse the PDF tools catalogue" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="OCR & Snip Text" title="Browse the PDF tools catalogue" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="Organize Pages" title="Browse the PDF tools catalogue" onClick={() => goCategory('pdf')} /></li>
          </ul>
        </div>

        {/* Column 3: Image tools */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Image & Photo</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Target KB Resizer (20–50 KB)" title="Browse the image tools catalogue" onClick={() => goCategory('image')} /></li>
            <li><FooterLink label="Paper Signature Cleaner" title="Browse the image tools catalogue" onClick={() => goCategory('image')} /></li>
          </ul>
        </div>

        {/* Column 4: Student tools */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Student Suite</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Handwriting Generator" title="Browse the student tools catalogue" onClick={() => goCategory('student')} /></li>
            <li><FooterLink label="CGPA & SGPA Calculator" title="Browse the student tools catalogue" onClick={() => goCategory('student')} /></li>
            <li><FooterLink label="Attendance Bunk Planner" title="Browse the student tools catalogue" onClick={() => goCategory('student')} /></li>
            <li><FooterLink label="Timetable & QR Generator" title="Browse the student tools catalogue" onClick={() => goCategory('student')} /></li>
          </ul>
        </div>

        {/* Column 5: Legal & trust */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Trust & Legal</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="About JustPDFCraft" onClick={() => openLegal('about')} /></li>
            <li><FooterLink label="Privacy Policy" onClick={() => openLegal('privacy')} /></li>
            <li><FooterLink label="Terms of Service" onClick={() => openLegal('terms')} /></li>
            <li><FooterLink label="Disclaimer" onClick={() => openLegal('disclaimer')} /></li>
            <li><FooterLink label="Contact Us" onClick={() => openLegal('contact')} /></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-5xl mx-auto pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>
          © {new Date().getFullYear()} JustPDFCraft. Built for students & professionals worldwide.
        </p>
        <p className="flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-rose-500 fill-current" /> for privacy & productivity
        </p>
      </div>
    </footer>
  );
};
