import { ToolDefinition } from '../types/pdf';

export const TOOLS: ToolDefinition[] = [
  // --- 1. ORGANIZE ---
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    shortTitle: 'Merge',
    description: 'Combine multiple PDF files into a single organized document in any order.',
    category: 'organize',
    iconName: 'Layers',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Merge Files',
    color: '#4f46e5'
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    shortTitle: 'Split',
    description: 'Extract specific page ranges or split each page into a separate PDF file.',
    category: 'organize',
    iconName: 'Scissors',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Split Document',
    color: '#4f46e5'
  },
  {
    id: 'organize-pdf',
    title: 'Organize Pages',
    shortTitle: 'Organize',
    description: 'Rearrange, rotate, delete, or duplicate individual pages with visual previews.',
    category: 'organize',
    iconName: 'LayoutGrid',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Save Reordered PDF',
    color: '#4f46e5'
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    shortTitle: 'Rotate',
    description: 'Rotate pages clockwise or counter-clockwise by 90°, 180°, or 270° degrees.',
    category: 'organize',
    iconName: 'RotateCw',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Apply Rotation',
    color: '#4f46e5'
  },

  // --- 2. OPTIMIZE ---
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    shortTitle: 'Compress',
    description: 'Reduce file size while preserving document resolution and text sharpness.',
    category: 'optimize',
    iconName: 'FileArchive',
    accept: '.pdf,application/pdf',
    badge: 'Popular',
    multiple: true,
    actionText: 'Compress PDF',
    color: '#059669'
  },
  {
    id: 'repair-pdf',
    title: 'Repair PDF',
    shortTitle: 'Repair',
    description: 'Fix corrupt PDF structures, damaged cross-reference tables, and recover content.',
    category: 'optimize',
    iconName: 'Wrench',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Repair Document',
    color: '#059669'
  },
  {
    id: 'ocr-pdf',
    title: 'Extract Text',
    shortTitle: 'Extract Text',
    description: 'Extract plain text and tabular content from all pages into a clean text file.',
    category: 'optimize',
    iconName: 'FileSearch',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Extract Text Content',
    color: '#059669'
  },

  // --- 3. CONVERT TO PDF ---
  {
    id: 'jpg-to-pdf',
    title: 'Images to PDF',
    shortTitle: 'Images to PDF',
    description: 'Convert JPG, PNG, WebP, and BMP images into clean, standardized PDF pages.',
    category: 'convert-to-pdf',
    iconName: 'ImagePlus',
    badge: 'Popular',
    accept: 'image/jpeg,image/png,image/webp,image/bmp',
    multiple: true,
    actionText: 'Create PDF Document',
    color: '#d97706'
  },
  {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    shortTitle: 'DOCX to PDF',
    description: 'Convert Microsoft Word (.docx/.doc) and plain text files directly into PDF.',
    category: 'convert-to-pdf',
    iconName: 'FileText',
    accept: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain',
    multiple: false,
    actionText: 'Convert to PDF',
    color: '#2563eb'
  },
  {
    id: 'excel-to-pdf',
    title: 'Excel to PDF',
    shortTitle: 'XLSX to PDF',
    description: 'Convert Excel (.xlsx/.xls/.csv) spreadsheets into formatted PDF tables.',
    category: 'convert-to-pdf',
    iconName: 'FileSpreadsheet',
    accept: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    multiple: false,
    actionText: 'Export as PDF',
    color: '#16a34a'
  },
  {
    id: 'powerpoint-to-pdf',
    title: 'PowerPoint to PDF',
    shortTitle: 'PPT to PDF',
    description: 'Convert PowerPoint slide presentations (.pptx/.ppt) into portable PDF format.',
    category: 'convert-to-pdf',
    iconName: 'Presentation',
    accept: '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint',
    multiple: false,
    actionText: 'Convert Presentation',
    color: '#ea580c'
  },
  {
    id: 'html-to-pdf',
    title: 'HTML to PDF',
    shortTitle: 'HTML to PDF',
    description: 'Render raw HTML documents, CSS styling, and web snippets into PDF pages.',
    category: 'convert-to-pdf',
    iconName: 'FileCode',
    accept: '.html,.htm,text/html,text/plain',
    multiple: false,
    actionText: 'Render HTML to PDF',
    color: '#6366f1'
  },

  // --- 4. CONVERT FROM PDF ---
  {
    id: 'pdf-to-jpg',
    title: 'PDF to Images',
    shortTitle: 'PDF to JPG',
    description: 'Convert each PDF page into high-resolution JPG or PNG images in a ZIP package.',
    category: 'convert-from-pdf',
    iconName: 'FileImage',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Export Images',
    color: '#d97706'
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    shortTitle: 'PDF to DOCX',
    description: 'Extract formatted document text and structure into editable Microsoft Word (.docx).',
    category: 'convert-from-pdf',
    iconName: 'FileText',
    badge: 'Popular',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Convert to Word',
    color: '#2563eb'
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel',
    shortTitle: 'PDF to XLSX',
    description: 'Extract tables, columns, and numeric records into structured Excel spreadsheets.',
    category: 'convert-from-pdf',
    iconName: 'FileSpreadsheet',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Export to Excel',
    color: '#16a34a'
  },
  {
    id: 'pdf-to-powerpoint',
    title: 'PDF to PowerPoint',
    shortTitle: 'PDF to PPT',
    description: 'Convert PDF document pages into editable Microsoft PowerPoint presentation slides.',
    category: 'convert-from-pdf',
    iconName: 'Presentation',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Export Slides',
    color: '#ea580c'
  },
  {
    id: 'pdf-to-pdfa',
    title: 'PDF to PDF/A',
    shortTitle: 'PDF/A Archive',
    description: 'Convert PDF into ISO 19005-1 compliant PDF/A standard for long-term digital preservation.',
    category: 'convert-from-pdf',
    iconName: 'Shield',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Generate PDF/A',
    color: '#475569'
  },

  // --- 5. EDIT & SECURITY ---
  {
    id: 'sign-pdf',
    title: 'Sign PDF',
    shortTitle: 'Sign',
    description: 'Create and place smooth digital signatures or typed legal names onto any PDF page.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'Popular',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Sign & Export',
    color: '#4f46e5'
  },
  {
    id: 'edit-pdf',
    title: 'Edit PDF',
    shortTitle: 'Editor',
    description: 'Add text notes, highlights, custom callouts, and annotation stamps directly onto pages.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'New',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Save Changes',
    color: '#0284c7'
  },
  {
    id: 'watermark-pdf',
    title: 'Add Watermark',
    shortTitle: 'Watermark',
    description: 'Stamp custom confidentiality or ownership watermarks with custom rotation and opacity.',
    category: 'edit-security',
    iconName: 'Stamp',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Apply Watermark',
    color: '#7c3aed'
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    shortTitle: 'Numbering',
    description: 'Add sequential page numbering with flexible alignment, margins, and format options.',
    category: 'edit-security',
    iconName: 'Hash',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Stamp Numbers',
    color: '#64748b'
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF',
    shortTitle: 'Encrypt',
    description: 'Encrypt your document with AES-256 standard and secure user passwords.',
    category: 'edit-security',
    iconName: 'Lock',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Encrypt Document',
    color: '#334155'
  },
  {
    id: 'unlock-pdf',
    title: 'Unlock PDF',
    shortTitle: 'Decrypt',
    description: 'Remove password protection and permission restrictions from authorized PDF files.',
    category: 'edit-security',
    iconName: 'Unlock',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Decrypt Document',
    color: '#e11d48'
  },
  {
    id: 'scan-to-pdf',
    title: 'Scan to PDF',
    shortTitle: 'Scanner',
    description: 'Capture physical documents using your webcam or mobile camera directly into PDF.',
    category: 'edit-security',
    iconName: 'Camera',
    accept: 'image/*,.pdf',
    multiple: true,
    actionText: 'Create PDF from Scan',
    color: '#0d9488'
  },
  {
    id: 'compare-pdf',
    title: 'Compare PDFs',
    shortTitle: 'Compare',
    description: 'View two PDF versions side-by-side to inspect structural and textual changes.',
    category: 'edit-security',
    iconName: 'GitCompare',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Generate Comparison',
    color: '#8b5cf6'
  },
  {
    id: 'handwriting',
    title: 'Handwriting Studio',
    shortTitle: 'Handwriting',
    description: 'Convert typed text or DOCX into realistic handwritten notebook pages with natural variations.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'Featured',
    accept: '.txt,.md,.docx,text/plain',
    multiple: false,
    actionText: 'Generate Handwritten PDF',
    color: '#b45309'
  },
  {
    id: 'redact-pdf',
    title: 'Sanitize Metadata',
    shortTitle: 'Sanitize',
    description: 'Permanently remove hidden author names, creation software, and tracking metadata.',
    category: 'edit-security',
    iconName: 'EyeOff',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Sanitize Document',
    color: '#475569'
  }
];

export const CATEGORIES = [
  { id: 'organize', name: 'Organize', description: 'Merge, split, reorder, and rotate' },
  { id: 'optimize', name: 'Optimize', description: 'Compress, repair, and extract text' },
  { id: 'convert-to-pdf', name: 'Convert to PDF', description: 'Images, Word, Excel, PowerPoint & HTML' },
  { id: 'convert-from-pdf', name: 'Convert from PDF', description: 'Images, Word, Excel, PowerPoint & PDF/A' },
  { id: 'edit-security', name: 'Security & Tools', description: 'Sign, edit, watermark, protect & sanitize' }
];
