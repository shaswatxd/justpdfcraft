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

const FooterLink: React.FC<{
  label: string;
  onClick?: () => void;
  title?: string;
}> = ({ label, onClick, title }) => (
  <button
    onClick={onClick || scrollToExplorer}
    className="inline-block w-auto py-1.5 min-h-[32px] text-slate-500 hover:text-blue-600 font-medium transition-colors text-left cursor-pointer"
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
    <footer className="w-full bg-white border-t border-slate-200/80 text-slate-600 text-xs mt-12 py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-8">
        {/* Column 1: Brand & Mission */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <SwiftLogo className="w-4 h-4 shrink-0 text-white fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              Just<span className="text-blue-600">PDFCraft</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            100% private in-browser document processing. Zero server uploads, instant WebAssembly speed.
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
            <li><FooterLink label="Compress PDF" title="Reduce file size" onClick={() => setActiveModal('compress')} /></li>
            <li><FooterLink label="PDF to Word (.docx)" title="Convert PDF to editable Word" onClick={() => setActiveModal('convert')} /></li>
            <li><FooterLink label="In-Place Text Editor" title="Edit text on canvas" onClick={() => goCategory('pdf')} /></li>
          </ul>
        </div>

        {/* Column 3: Organize & Security */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Security & Sign</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Protect & Encrypt" title="Set password & AES encryption" onClick={() => setActiveModal('protect')} /></li>
            <li><FooterLink label="Unlock PDF" title="Strip password & restrictions" onClick={() => setActiveModal('protect')} /></li>
            <li><FooterLink label="Organize Pages" title="Reorder, rotate & delete pages" onClick={() => goCategory('pdf')} /></li>
            <li><FooterLink label="Watermark PDF" title="Stamp text or image watermarks" onClick={() => setActiveModal('watermark')} /></li>
            <li><FooterLink label="Sign Document" title="Draw or place digital signature" onClick={() => setActiveModal('sign')} /></li>
          </ul>
        </div>

        {/* Column 4: Student Suite */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Student Tools</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="Resume & CV Builder" onClick={() => setActiveModal('student-tools')} /></li>
            <li><FooterLink label="Photo Resizer (20–50 KB)" onClick={() => setActiveModal('student-resizer')} /></li>
            <li><FooterLink label="Handwriting Generator" onClick={() => setActiveModal('handwriting')} /></li>
            <li><FooterLink label="CGPA & GPA Calculator" onClick={() => setActiveModal('student-tools')} /></li>
            <li><FooterLink label="Age & Exam Eligibility" onClick={() => setActiveModal('student-tools')} /></li>
          </ul>
        </div>

        {/* Column 5: Developer Utilities */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Developer Utilities</h4>
          <ul className="space-y-0.5">
            <li><FooterLink label="JSON Formatter & Validator" onClick={() => setActiveModal('developer-tools')} /></li>
            <li><FooterLink label="Base64 Encoder / Decoder" onClick={() => setActiveModal('developer-tools')} /></li>
            <li><FooterLink label="UUID & Password Generator" onClick={() => setActiveModal('developer-tools')} /></li>
            <li><FooterLink label="JWT Decoder & Hash Gen" onClick={() => setActiveModal('developer-tools')} /></li>
            <li><FooterLink label="QR Code Generator" onClick={() => setActiveModal('developer-tools')} /></li>
          </ul>
        </div>

        {/* Column 6: Platform & Legal */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Platform & Legal</h4>
          <ul className="space-y-0.5">

            <li><FooterLink label="About JustPDFCraft" onClick={() => setActiveModal('about')} /></li>
            <li><FooterLink label="Privacy Policy" onClick={() => openLegal('privacy')} /></li>
            <li><FooterLink label="Terms of Service" onClick={() => openLegal('terms')} /></li>
            <li><FooterLink label="Contact Support" onClick={() => setActiveModal('contact')} /></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
        <p>
          © {new Date().getFullYear()} JustPDFCraft. 100% Client-Side In-Browser Processing.
        </p>
        <p className="flex items-center gap-1">
          Crafted with <Heart className="w-3.5 h-3.5 text-blue-600 fill-current" /> for privacy & speed
        </p>
      </div>
    </footer>
  );
};
