import React from 'react';
import { FileText, Image as ImageIcon, GraduationCap, Code2 } from 'lucide-react';

export const SeoContentSection: React.FC = () => {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200/80">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs text-slate-600">
        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Complete PDF Arsenal</span>
          </h4>
          <p className="leading-relaxed">
            Merge multiple PDF documents, split large files by page ranges, compress files to specific KB boundaries,
            sign documents with digital ink, and edit canvas text directly in your browser. All algorithms run locally.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-teal-600" />
            <span>High-Speed Image Tools</span>
          </h4>
          <p className="leading-relaxed">
            Convert JPG, PNG, and WebP images, crop to exact passport or visa specs (2×2 inch), rotate, and resize
            to precise file size limits (20–50 KB) mandatory for competitive exams, SSC, UPSC, and government portals.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-violet-600" />
            <span>Student Academic Suite</span>
          </h4>
          <p className="leading-relaxed">
            Generate realistic handwritten assignments on ruled pages with authentic ink noise, compute weighted CGPA
            and SGPA with 9.5 conversion multipliers, calculate exam eligibility age, and build ATS resumes.
          </p>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span>Developer Utilities</span>
          </h4>
          <p className="leading-relaxed">
            Format and validate JSON with custom indentation, encode and decode Base64 and URLs, generate v4 UUIDs,
            create cryptographically secure passwords, test regular expressions, and inspect JWT tokens safely.
          </p>
        </div>
      </div>
    </section>
  );
};
