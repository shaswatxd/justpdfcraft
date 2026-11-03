import { ToolDefinition } from '../types/pdf';

export const TOOLS: ToolDefinition[] = [
  // --- 1. ORGANIZE ---
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    shortTitle: 'Merge',
    description: 'Combine multiple PDF documents into a unified, seamless document in any custom sequence.',
    category: 'organize',
    iconName: 'Layers',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Merge Files',
    color: '#4f46e5' // Indigo
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    shortTitle: 'Split',
    description: 'Extract specific page ranges or burst every page into individual files packaged in a ZIP archive.',
    category: 'organize',
    iconName: 'Scissors',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Split Document',
    color: '#6366f1' // Light Indigo
  },
  {
    id: 'organize-pdf',
    title: 'Organize Pages',
    shortTitle: 'Organize',
    description: 'Visually sort, duplicate, delete, and rearrange pages using a real-time thumbnail workspace.',
    category: 'organize',
    iconName: 'LayoutGrid',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Save Reordered PDF',
    color: '#8b5cf6' // Violet
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    shortTitle: 'Rotate',
    description: 'Permanently reorient pages clockwise or counter-clockwise by 90°, 180°, or 270° degrees.',
    category: 'organize',
    iconName: 'RotateCw',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Apply Rotation',
    color: '#06b6d4' // Cyan
  },

  // --- 2. OPTIMIZE ---
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    shortTitle: 'Compress',
    description: 'Optimize PDF streams and downsample imagery with tailored compression profiles.',
    category: 'optimize',
    iconName: 'FileArchive',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Compress PDF',
    color: '#10b981' // Emerald
  },
  {
    id: 'repair-pdf',
    title: 'Repair PDF',
    shortTitle: 'Repair',
    description: 'Rebuild damaged cross-reference xref streams and recover lost data from broken PDF files.',
    category: 'optimize',
    iconName: 'Wrench',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Repair Document',
    color: '#14b8a6' // Teal
  },
  {
    id: 'ocr-pdf',
    title: 'Extract Text',
    shortTitle: 'Extract Text',
    description: 'Extract raw text streams and transcripts from all PDF pages into a clean text document.',
    category: 'optimize',
    iconName: 'FileSearch',
    badge: 'POPULAR',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Extract Text Content',
    color: '#0284c7' // Sky
  },

  // --- 3. CONVERT TO PDF ---
  {
    id: 'jpg-to-pdf',
    title: 'Images to PDF',
    shortTitle: 'Images to PDF',
    description: 'Convert JPG, PNG, WebP, and BMP graphics into clean, high-fidelity PDF documents.',
    category: 'convert-to-pdf',
    iconName: 'ImagePlus',
    accept: 'image/jpeg,image/png,image/webp,image/bmp',
    multiple: true,
    actionText: 'Create PDF Document',
    color: '#f59e0b' // Amber
  },
  {
    id: 'word-to-pdf',
    title: 'Word to PDF',
    shortTitle: 'DOCX to PDF',
    description: 'Transform Microsoft Word (.docx/.doc) and rich text files into universal PDF files.',
    category: 'convert-to-pdf',
    iconName: 'FileText',
    accept: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain',
    multiple: false,
    actionText: 'Convert to PDF',
    color: '#2563eb' // Blue
  },
  {
    id: 'excel-to-pdf',
    title: 'Excel to PDF',
    shortTitle: 'XLSX to PDF',
    description: 'Render Microsoft Excel (.xlsx/.xls/.csv) spreadsheets into formatted PDF tables.',
    category: 'convert-to-pdf',
    iconName: 'FileSpreadsheet',
    accept: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    multiple: false,
    actionText: 'Export as PDF',
    color: '#059669' // Green
  },
  {
    id: 'powerpoint-to-pdf',
    title: 'PowerPoint to PDF',
    shortTitle: 'PPT to PDF',
    description: 'Convert presentation slides (.pptx/.ppt) into portable PDF documents.',
    category: 'convert-to-pdf',
    iconName: 'Presentation',
    accept: '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint',
    multiple: false,
    actionText: 'Convert Presentation',
    color: '#ea580c' // Orange
  },
  {
    id: 'html-to-pdf',
    title: 'HTML to PDF',
    shortTitle: 'HTML to PDF',
    description: 'Convert raw HTML code, snippets, or web content into styled PDF documents.',
    category: 'convert-to-pdf',
    iconName: 'FileCode',
    accept: '.html,.htm,text/html,text/plain',
    multiple: false,
    actionText: 'Render HTML to PDF',
    color: '#4f46e5'
  },

  // --- 4. CONVERT FROM PDF ---
  {
    id: 'pdf-to-jpg',
    title: 'PDF to Images',
    shortTitle: 'PDF to JPG',
    description: 'Render every PDF page into crisp, high-resolution JPG/PNG images or ZIP archives.',
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
    description: 'Extract formatted text and structure into native editable Microsoft Word (.docx) format.',
    category: 'convert-from-pdf',
    iconName: 'FileText',
    badge: 'POPULAR',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Convert to Word',
    color: '#1d4ed8'
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel',
    shortTitle: 'PDF to XLSX',
    description: 'Pull tables and structured data directly into Microsoft Excel spreadsheets.',
    category: 'convert-from-pdf',
    iconName: 'FileSpreadsheet',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Export to Excel',
    color: '#047857'
  },
  {
    id: 'pdf-to-powerpoint',
    title: 'PDF to PowerPoint',
    shortTitle: 'PDF to PPT',
    description: 'Transform PDF pages into editable slide decks (.ppt) with structured layout.',
    category: 'convert-from-pdf',
    iconName: 'Presentation',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Export Slides',
    color: '#c2410c'
  },
  {
    id: 'pdf-to-pdfa',
    title: 'PDF to PDF/A',
    shortTitle: 'PDF/A Archive',
    description: 'Convert PDF to ISO 19005-1 compliant PDF/A-1b standard for guaranteed long-term archiving.',
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
    title: 'Sign Document',
    shortTitle: 'Sign',
    description: 'Draw your digital signature with bezier smoothing or type your legal name to stamp securely.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'POPULAR',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Sign & Export',
    color: '#4f46e5'
  },
  {
    id: 'edit-pdf',
    title: 'Edit PDF',
    shortTitle: 'Editor',
    description: 'Add text annotations, custom notes, review stamps, and yellow highlighter directly onto pages.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'NEW',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Save Changes',
    color: '#0284c7'
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark',
    shortTitle: 'Watermark',
    description: 'Stamp custom security watermarks with customizable opacity, rotation, and 9-point grid alignment.',
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
    description: 'Insert sequential page numbers with flexible positioning and numbering format presets.',
    category: 'edit-security',
    iconName: 'Hash',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Stamp Numbers',
    color: '#9333ea'
  },
  {
    id: 'protect-pdf',
    title: 'Protect PDF',
    shortTitle: 'Encrypt',
    description: 'Encrypt your PDF with military-grade AES-256 standard and custom passwords.',
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
    description: 'Strip security restrictions and decrypt protected PDF files client-side.',
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
    description: 'Capture real physical documents using your device webcam or camera directly into PDF.',
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
    description: 'Inspect two documents side-by-side to detect structural, page, and textual differences.',
    category: 'edit-security',
    iconName: 'GitCompare',
    accept: '.pdf,application/pdf',
    multiple: true,
    actionText: 'Generate Comparison',
    color: '#8b5cf6'
  },
  {
    id: 'handwriting',
    title: 'Handwriting Generator',
    shortTitle: 'Handwriting',
    description: 'Transform typed text and Word documents into authentic handwritten notes on notebook paper with realistic ink jitter and camera scan shadows.',
    category: 'edit-security',
    iconName: 'PenTool',
    badge: 'STUDENT FAV',
    accept: '.txt,.md,.docx,text/plain',
    multiple: false,
    actionText: 'Generate Handwritten PDF',
    color: '#d97706' // Amber
  },
  {
    id: 'redact-pdf',
    title: 'Sanitize PDF',
    shortTitle: 'Sanitize',
    description: 'Permanently scrub confidential document metadata, author information, and private tracking data.',
    category: 'edit-security',
    iconName: 'EyeOff',
    accept: '.pdf,application/pdf',
    multiple: false,
    actionText: 'Sanitize Document',
    color: '#0f172a'
  }
];

export const CATEGORIES = [
  { id: 'organize', name: 'Organize', description: 'Merge, split, reorder and rotate' },
  { id: 'optimize', name: 'Optimize', description: 'Compress, repair and extract text' },
  { id: 'convert-to-pdf', name: 'Convert to PDF', description: 'Images, Word, Excel, PowerPoint & HTML' },
  { id: 'convert-from-pdf', name: 'Convert from PDF', description: 'Word, Excel, PowerPoint, Images & PDF/A' },
  { id: 'edit-security', name: 'Security & Studio', description: 'Sign, edit, watermark, encrypt & redact' }
];
