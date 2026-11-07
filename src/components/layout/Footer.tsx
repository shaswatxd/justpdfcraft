import React from 'react';
import { PenLine } from 'lucide-react';
import { ToolId } from '../../types/pdf';
import { BrandLogo } from '../common/BrandLogo';

interface FooterProps {
  onSelectTool: (id: ToolId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 pt-10 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Directory Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 text-xs">
          <div>
            <h5 className="font-semibold text-white uppercase text-[11px] tracking-wider mb-3.5">Organize &amp; Edit</h5>
            <ul className="space-y-2">
              <li><button onClick={() => onSelectTool('merge-pdf')} className="hover:text-white transition-colors">Merge PDF</button></li>
              <li><button onClick={() => onSelectTool('split-pdf')} className="hover:text-white transition-colors">Split PDF</button></li>
              <li><button onClick={() => onSelectTool('compress-pdf')} className="hover:text-white transition-colors">Compress PDF</button></li>
              <li><button onClick={() => onSelectTool('organize-pdf')} className="hover:text-white transition-colors">Organize Pages</button></li>
              <li><button onClick={() => onSelectTool('rotate-pdf')} className="hover:text-white transition-colors">Rotate PDF</button></li>
              <li><button onClick={() => onSelectTool('edit-pdf')} className="hover:text-white transition-colors">Edit PDF</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white uppercase text-[11px] tracking-wider mb-3.5">Conversions</h5>
            <ul className="space-y-2">
              <li><button onClick={() => onSelectTool('jpg-to-pdf')} className="hover:text-white transition-colors">Images to PDF</button></li>
              <li><button onClick={() => onSelectTool('pdf-to-jpg')} className="hover:text-white transition-colors">PDF to Images</button></li>
              <li><button onClick={() => onSelectTool('word-to-pdf')} className="hover:text-white transition-colors">Word to PDF (.docx)</button></li>
              <li><button onClick={() => onSelectTool('pdf-to-word')} className="hover:text-white transition-colors">PDF to Word (.docx)</button></li>
              <li><button onClick={() => onSelectTool('excel-to-pdf')} className="hover:text-white transition-colors">Excel to PDF (.xlsx)</button></li>
              <li><button onClick={() => onSelectTool('html-to-pdf')} className="hover:text-white transition-colors">HTML to PDF</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-white uppercase text-[11px] tracking-wider mb-3.5">Security &amp; Studio</h5>
            <ul className="space-y-2">
              <li>
                <button onClick={() => onSelectTool('handwriting')} className="hover:text-white transition-colors text-amber-400 font-medium flex items-center gap-1.5">
                  <PenLine size={12} />
                  <span>Handwriting Studio</span>
                </button>
              </li>
              <li><button onClick={() => onSelectTool('sign-pdf')} className="hover:text-white transition-colors">Sign Document</button></li>
              <li><button onClick={() => onSelectTool('protect-pdf')} className="hover:text-white transition-colors">AES-256 Protect</button></li>
              <li><button onClick={() => onSelectTool('unlock-pdf')} className="hover:text-white transition-colors">Unlock &amp; Decrypt</button></li>
              <li><button onClick={() => onSelectTool('watermark-pdf')} className="hover:text-white transition-colors">Watermark PDF</button></li>
              <li><button onClick={() => onSelectTool('redact-pdf')} className="hover:text-white transition-colors">Sanitize Metadata</button></li>
            </ul>
          </div>

          <div>
            <div className="mb-3">
              <BrandLogo size="sm" theme="light" subtitle={false} />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Fast, simple, and private tools to merge, split, compress, convert, and edit PDF files.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800 text-xs text-slate-500 text-center sm:text-left">
          &copy; {new Date().getFullYear()} JustPDFCraft. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
