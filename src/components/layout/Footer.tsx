import React from 'react';
import { ShieldCheck, Zap, Lock, Globe, Sparkles } from 'lucide-react';
import { ToolId } from '../../types/pdf';

interface FooterProps {
  onSelectTool: (id: ToolId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">True Zero-Knowledge Privacy</h4>
              <p className="text-xs text-slate-400 mt-0.5">Documents remain in local browser RAM and are never transmitted over the internet.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Zap size={26} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Instant Client-Side Engine</h4>
              <p className="text-xs text-slate-400 mt-0.5">Zero queue delays or upload wait times. Instant processing via WebAssembly.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/20">
              <Lock size={26} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Military-Grade Security</h4>
              <p className="text-xs text-slate-400 mt-0.5">Integrated AES-256 encryption and decryption compliant with enterprise standards.</p>
            </div>
          </div>
        </div>

        {/* Directory Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-xs">
          <div>
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-4">Core Utilities</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => onSelectTool('merge-pdf')} className="hover:text-white transition-colors">Merge PDF</button></li>
              <li><button onClick={() => onSelectTool('split-pdf')} className="hover:text-white transition-colors">Split PDF</button></li>
              <li><button onClick={() => onSelectTool('compress-pdf')} className="hover:text-white transition-colors">Compress PDF</button></li>
              <li><button onClick={() => onSelectTool('organize-pdf')} className="hover:text-white transition-colors">Organize Pages</button></li>
              <li><button onClick={() => onSelectTool('rotate-pdf')} className="hover:text-white transition-colors">Rotate PDF</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-4">Conversions</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => onSelectTool('jpg-to-pdf')} className="hover:text-white transition-colors">Images to PDF</button></li>
              <li><button onClick={() => onSelectTool('pdf-to-jpg')} className="hover:text-white transition-colors">PDF to Images</button></li>
              <li><button onClick={() => onSelectTool('pdf-to-word')} className="hover:text-white transition-colors">PDF to Word DOCX</button></li>
              <li><button onClick={() => onSelectTool('word-to-pdf')} className="hover:text-white transition-colors">Word to PDF</button></li>
              <li><button onClick={() => onSelectTool('excel-to-pdf')} className="hover:text-white transition-colors">Excel to PDF</button></li>
              <li><button onClick={() => onSelectTool('pdf-to-excel')} className="hover:text-white transition-colors">PDF to Excel XLSX</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider mb-4">Studio & Security</h5>
            <ul className="space-y-2.5">
              <li><button onClick={() => onSelectTool('sign-pdf')} className="hover:text-white transition-colors">Digital Signature Pad</button></li>
              <li><button onClick={() => onSelectTool('edit-pdf')} className="hover:text-white transition-colors">PDF Canvas Editor</button></li>
              <li><button onClick={() => onSelectTool('protect-pdf')} className="hover:text-white transition-colors">AES-256 Encrypt</button></li>
              <li><button onClick={() => onSelectTool('unlock-pdf')} className="hover:text-white transition-colors">PDF Decrypt</button></li>
              <li><button onClick={() => onSelectTool('watermark-pdf')} className="hover:text-white transition-colors">Watermark Tool</button></li>
              <li><button onClick={() => onSelectTool('redact-pdf')} className="hover:text-white transition-colors">Redact Confidential Data</button></li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-extrabold text-white text-sm">JustPDFCraft</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              A private, open browser workshop for modern document workflows. No account needed.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-[11px] font-semibold border border-slate-700">
              <span>Open Source & Client-Side</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 JustPDFCraft Studio • Built for privacy and speed
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Architecture</span>
            <span className="hover:text-slate-400 cursor-pointer">Security Whitepaper</span>
            <span className="hover:text-slate-400 cursor-pointer">Documentation</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
