import React from 'react';
import { SwiftLogo } from '@/components/common/SwiftLogo';
import { useUIStore } from '@/stores/uiStore';
import { ToolCategory } from '@/types/tools';
import { Heart, ShieldCheck } from 'lucide-react';

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

/** Footer link with a comfortable touch target (36px min-height) */
const FooterLink: React.FC<{
  label: string;
  onClick?: () => void;
  title?: string;
}> = ({ label, onClick, title }) => (
  <button
    onClick={onClick || scrollToExplorer}
    className="inline-block w-auto py-1.5 min-h-[32px] text-slate-600 hover:text-red-600 font-medium transition-colors text-left"
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
    <footer className="w-full bg-slate-100/90 border-t border-slate-200 text-slate-600 text-xs mt-12 py-12 px-6 select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
        {/* Column 1: Brand & Mission */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <SwiftLogo className="w-6 h-6 shrink-0" />
            <span className="font-bold text-base tracking-tight text-slate-900">
              Just<span className="text-red-600">PDFCraft</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            100% private, client-side PDF tools. Documents and photos are processed strictly inside your browser — never uploaded to a server.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Zero Cloud Uploads</span>
          </div>
        </div>

        {/* Column 2: PDF Essentials */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">PDF Essentials</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Merge PDF" title="Combine multiple PDFs" onClick={() => setActiveModal('merge')} /></li>
            <li><FooterLink label="Split PDF" title="Extract pages or split ranges" onClick={() => setActiveModal('split')} /></li>
            <li><FooterLink label="Compress PDF (Target KB)" title="Compress to exact target KB" onClick={() => setActiveModal('compress')} /></li>
            <li><FooterLink label="PDF to Word (.docx)" title="Convert PDF to editable Word" onClick={() => setActiveModal('convert')} /></li>
            <li><FooterLink label="In-Place Text Editor" title="Edit text directly on canvas" onClick={() => goCategory('pdf')} /></li>
          </ul>
        </div>

        {/* Column 3: Organize & Security */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Organize & Security</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Protect & Encrypt" title="Set password & AES encryption" onClick={() => setActiveModal('protect')} /></li>
            <li><FooterLink label="Unlock PDF" title="Strip password & restrictions" onClick={() => setActiveModal('protect')} /></li>
            <li><FooterLink label="Organize Pages" title="Reorder, rotate & delete pages" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="Watermark PDF" title="Stamp text or image watermarks" onClick={() => setActiveModal('watermark')} /></li>
            <li><FooterLink label="Sign Document" title="Draw or place digital signature" onClick={() => setActiveModal('sign')} /></li>
          </ul>
        </div>

        {/* Column 4: Student & Special Tools */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Exam & Study Tools</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Photo & Sign Resizer (Exact KB)" title="Compress to 20-50 KB for exams" onClick={() => setActiveModal('student-resizer')} /></li>
            <li><FooterLink label="Handwriting Generator" title="Generate realistic handwritten assignments" onClick={() => setActiveModal('handwriting')} /></li>
            <li><FooterLink label="Image to PDF Compiler" title="Convert photos to PDF" onClick={() => setActiveModal('convert')} /></li>
            <li><FooterLink label="PDF OCR & Snip" title="Extract selectable text from scans" onClick={() => setActiveModal('ocr')} /></li>
            <li><FooterLink label="Table to Excel / CSV" title="Extract tabular coordinates" onClick={() => setActiveModal('extract-table')} /></li>
          </ul>
        </div>

        {/* Column 5: Trust & Legal */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Trust & Legal</h4>
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
      <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>
          © {new Date().getFullYear()} JustPDFCraft. 100% Client-Side In-Browser Processing.
        </p>
        <p className="flex items-center gap-1">
          Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for privacy & speed
        </p>
      </div>
    </footer>
  );
};
