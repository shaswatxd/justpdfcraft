import { ToolDefinition, ToolCategory } from '@/types/tools';

/**
 * JustPDFCraft Master Tools Catalog
 * High-speed, 100% Client-Side Privacy Document Suite (iLovePDF Style Architecture).
 * All processing runs locally via WebAssembly, pdf-lib, and Canvas.
 */
export const TOOLS_CATALOG: ToolDefinition[] = [
  // =========================================================================
  // 1. ORGANIZE PDF
  // =========================================================================
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDesc: 'Combine multiple PDF files into one single unified document in any order.',
    category: 'organize',
    iconName: 'Layers',
    color: 'text-red-500',
    badge: 'popular',
    tags: ['merge', 'combine', 'join', 'append', 'pdf', 'bind', 'join pdf', 'combine pdf'],
    action: { type: 'modal', modal: 'merge' },
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    shortDesc: 'Separate one page or a whole set for easy conversion into independent PDF files.',
    category: 'organize',
    iconName: 'Scissors',
    color: 'text-orange-500',
    badge: 'popular',
    tags: ['split', 'extract', 'pages', 'separate', 'divide', 'cut', 'pages reorder'],
    action: { type: 'modal', modal: 'split', label: 'Split Pages' },
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    shortDesc: 'Sort, add, duplicate, rotate and delete pages of your PDF however you like.',
    category: 'organize',
    iconName: 'Grid',
    color: 'text-purple-600',
    tags: ['organize', 'reorder', 'pages reorder', 'delete pages', 'rotate', 'manage pages'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'scan-pdf',
    name: 'Scan to PDF',
    shortDesc: 'Capture physical documents using your webcam or scanner and compile into a PDF.',
    category: 'organize',
    iconName: 'Camera',
    color: 'text-teal-600',
    tags: ['scan', 'camera', 'photo to pdf', 'document scanner', 'capture'],
    action: { type: 'modal', modal: 'scan' },
  },
  {
    id: 'delete-pdf-pages',
    name: 'Delete PDF Pages',
    shortDesc: 'Quickly remove unwanted, blank, or duplicate pages from your PDF with 1-click download.',
    category: 'organize',
    iconName: 'Trash2',
    color: 'text-rose-600',
    badge: 'popular',
    tags: ['delete pages', 'remove pages', 'delete page from pdf', 'trash pages', 'cut page', 'delete pdf pages', 'remove blank pages'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'extract-pdf-pages',
    name: 'Extract PDF Pages',
    shortDesc: 'Select specific pages or custom page ranges to export into a brand-new PDF file.',
    category: 'organize',
    iconName: 'ExternalLink',
    color: 'text-amber-600',
    badge: 'popular',
    tags: ['extract pages', 'separate pages', 'save specific pages', 'extract page ranges', 'export selected pages'],
    action: { type: 'modal', modal: 'split', label: 'Extract Pages' },
  },
  {
    id: 'n-up-pdf',
    name: 'N-Up (Multi-Page Sheet)',
    shortDesc: 'Fit 2, 4, 6, 8, or 9 pages per printable sheet for college handouts and cheat sheets.',
    category: 'organize',
    iconName: 'LayoutGrid',
    color: 'text-purple-600',
    badge: 'special',
    tags: ['n-up', 'multiple pages per sheet', '2 up', '4 up', 'handouts', 'slides print', 'cheat sheet', 'booklet layout', 'nup'],
    action: { type: 'modal', modal: 'n-up' },
  },
  {
    id: 'mini-xerox-pdf',
    name: 'Mini Xerox / Pocket Notes',
    shortDesc: 'Condense notes into 4, 8, or 16 pages per sheet with scissor cut guidelines for pocket revision booklets.',
    category: 'organize',
    iconName: 'Scissors',
    color: 'text-amber-600',
    badge: 'special',
    tags: [
      'mini xerox',
      'pocket xerox',
      'micro xerox',
      '16 in 1 xerox',
      '4 in 1 xerox',
      'choti xerox',
      'cheat sheet',
      'pocket notes',
      'exam notes xerox',
      'xerox pdf',
      'mini xerox online',
      'cut guidelines',
    ],
    action: { type: 'modal', modal: 'mini-xerox' },
  },

  // =========================================================================
  // 2. OPTIMIZE PDF
  // =========================================================================
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    shortDesc: 'Reduce file size while optimizing for maximal PDF quality and target KB limits.',
    category: 'optimize',
    iconName: 'FileArchive',
    color: 'text-emerald-500',
    badge: 'popular',
    tags: ['compress', 'shrink', 'reduce', 'resize', 'resizer', 'pdf resizer', 'mb', 'kb', 'optimize', 'size', 'reduce pdf size', 'smaller', 'make pdf smaller', 'smaller file size'],
    action: { type: 'modal', modal: 'compress', label: 'Compress PDF' },
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    shortDesc: 'Repair a damaged or corrupted PDF file and recover readable data streams.',
    category: 'optimize',
    iconName: 'RefreshCw',
    color: 'text-amber-500',
    tags: ['repair', 'fix', 'recover', 'corrupt', 'damaged'],
    action: { type: 'modal', modal: 'repair', label: 'Repair PDF' },
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    shortDesc: 'Convert non-selectable scanned PDFs into searchable, selectable text documents.',
    category: 'optimize',
    iconName: 'ScanText',
    color: 'text-indigo-600',
    tags: ['ocr', 'searchable', 'text recognition', 'scanned pdf to text', 'tesseract'],
    action: { type: 'modal', modal: 'ocr' },
  },
  {
    id: 'pdf-to-grayscale',
    name: 'Grayscale PDF (B&W)',
    shortDesc: 'Convert color documents to monochrome black & white to save printer toner and compress size.',
    category: 'optimize',
    iconName: 'Printer',
    color: 'text-slate-700',
    badge: 'popular',
    tags: ['grayscale', 'black and white', 'b&w', 'monochrome', 'ink saver', 'print ink', 'convert black and white', 'toner saver'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-grayscale', label: 'Grayscale PDF' },
  },
  {
    id: 'invert-pdf',
    name: 'Invert / Dark Mode PDF',
    shortDesc: 'Transform bright white PDF pages into dark-mode high-contrast colors for comfortable night reading.',
    category: 'optimize',
    iconName: 'Moon',
    color: 'text-indigo-900',
    badge: 'new',
    tags: ['invert', 'dark mode', 'night mode', 'high contrast', 'inverted colors', 'invert pdf colors', 'oled pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-invert', label: 'Dark Mode PDF' },
  },

  // =========================================================================
  // 3. CONVERT TO PDF
  // =========================================================================
  {
    id: 'image-to-pdf-tool',
    name: 'JPG to PDF',
    shortDesc: 'Convert JPG, PNG, and photos into a clean, multi-page PDF document.',
    category: 'convert-to-pdf',
    iconName: 'FilePlus',
    color: 'text-rose-600',
    badge: 'popular',
    tags: ['jpg to pdf', 'image to pdf', 'photos to pdf', 'images to pdf', 'png to pdf', 'convert to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'img-to-pdf' },
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    shortDesc: 'Make DOC and DOCX files easy to read by converting them to clean PDF documents.',
    category: 'convert-to-pdf',
    iconName: 'FileType',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['word to pdf', 'docx to pdf', 'convert docx', 'microsoft word'],
    action: { type: 'modal', modal: 'document-tools', initialTab: 'word-to-pdf' },
  },
  {
    id: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    shortDesc: 'Make presentation slides, text, and outlines easy to view by converting to PDF.',
    category: 'convert-to-pdf',
    iconName: 'FileType',
    color: 'text-orange-600',
    tags: ['powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'presentation'],
    action: { type: 'modal', modal: 'document-tools', initialTab: 'powerpoint-to-pdf' },
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    shortDesc: 'Convert tabular spreadsheets, CSV, and workbooks into clean printable PDF pages.',
    category: 'convert-to-pdf',
    iconName: 'Table',
    color: 'text-green-700',
    tags: ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'spreadsheet to pdf'],
    action: { type: 'modal', modal: 'document-tools', initialTab: 'excel-to-pdf' },
  },
  {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    shortDesc: 'Render clean web markup, URLs, and formatted HTML content into PDF format.',
    category: 'convert-to-pdf',
    iconName: 'FileText',
    color: 'text-cyan-600',
    tags: ['html to pdf', 'web to pdf', 'url to pdf', 'webpage'],
    action: { type: 'modal', modal: 'document-tools', initialTab: 'html-to-pdf' },
  },

  // =========================================================================
  // 4. CONVERT FROM PDF
  // =========================================================================
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    shortDesc: 'Extract all pages into high-resolution JPG images with custom DPI settings.',
    category: 'convert-from-pdf',
    iconName: 'RefreshCw',
    color: 'text-amber-500',
    badge: 'popular',
    tags: ['pdf to jpg', 'pdf to image', 'convert jpg', 'export jpg', 'images'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-img', label: 'PDF to JPG' },
  },
  {
    id: 'pdf-to-word-doc',
    name: 'PDF to Word',
    shortDesc: 'Convert your PDF to editable Microsoft Word (.docx) documents with high precision.',
    category: 'convert-from-pdf',
    iconName: 'FileType',
    color: 'text-blue-700',
    badge: 'popular',
    tags: ['pdf to word', 'pdf to docx', 'convert word', 'editable docx'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-word', label: 'Convert to Word' },
  },
  {
    id: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    shortDesc: 'Turn your PDF contents into easy-to-edit presentation slides and text decks.',
    category: 'convert-from-pdf',
    iconName: 'FileType',
    color: 'text-orange-500',
    tags: ['pdf to powerpoint', 'pdf to ppt', 'slides', 'presentation export'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-powerpoint', label: 'PDF to PowerPoint' },
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    shortDesc: 'Pull data and tables straight from PDFs into Excel spreadsheets in a few seconds.',
    category: 'convert-from-pdf',
    iconName: 'Table',
    color: 'text-emerald-700',
    tags: ['pdf to excel', 'pdf to xlsx', 'pdf to csv', 'extract table'],
    action: { type: 'modal', modal: 'extract-table' },
  },
  {
    id: 'pdf-to-pdfa',
    name: 'PDF to PDF/A',
    shortDesc: 'Transform your PDF to standard PDF/A format for ISO-compliant long-term archiving.',
    category: 'convert-from-pdf',
    iconName: 'FileArchive',
    color: 'text-slate-600',
    tags: ['pdf to pdfa', 'pdf/a', 'archiving', 'iso standard'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-pdfa' },
  },
  {
    id: 'extract-images-pdf',
    name: 'Extract Images from PDF',
    shortDesc: 'Extract all embedded photos and high-resolution figures from your PDF into a clean ZIP archive.',
    category: 'convert-from-pdf',
    iconName: 'Image',
    color: 'text-amber-500',
    badge: 'popular',
    tags: ['extract images', 'extract photos', 'pdf to images', 'save images', 'pull images from pdf', 'download pictures', 'rip images'],
    action: { type: 'modal', modal: 'extract-images' },
  },

  // =========================================================================
  // 5. EDIT PDF
  // =========================================================================
  {
    id: 'edit-pdf',
    name: 'Edit PDF',
    shortDesc: 'Add text, shapes, freehand annotations, and stamps directly onto any PDF page.',
    category: 'edit',
    iconName: 'Edit3',
    color: 'text-indigo-600',
    badge: 'popular',
    tags: ['edit', 'annotate', 'draw', 'highlight', 'notes', 'markup', 'edit pdf'],
    action: { type: 'workflow', viewMode: 'single', label: 'Edit PDF' },
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    shortDesc: 'Rotate PDF pages clockwise or counter-clockwise permanently with 1 click.',
    category: 'edit',
    iconName: 'RefreshCw',
    color: 'text-blue-500',
    tags: ['rotate', 'orientation', 'flip', 'portrait', 'landscape'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'page-number-pdf',
    name: 'Page Numbers',
    shortDesc: 'Add page numbers, customized Bates sequences, and headers/footers to your PDF.',
    category: 'edit',
    iconName: 'Tag',
    color: 'text-rose-500',
    tags: ['page numbers', 'numbering', 'bates', 'headers', 'footers'],
    action: { type: 'modal', modal: 'bates' },
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark',
    shortDesc: 'Stamp customized text or image watermarks with precise opacity, font, and angle.',
    category: 'edit',
    iconName: 'Droplets',
    color: 'text-teal-500',
    badge: 'popular',
    tags: ['watermark', 'stamp', 'confidential', 'draft', 'brand logo'],
    action: { type: 'modal', modal: 'watermark' },
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF',
    shortDesc: 'Trim unwanted white margins and adjust visible canvas boundaries precisely.',
    category: 'edit',
    iconName: 'Crop',
    color: 'text-fuchsia-600',
    tags: ['crop', 'margins', 'trim', 'cut borders', 'bleed'],
    action: { type: 'modal', modal: 'crop' },
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    shortDesc: 'Bake interactive forms, signatures, and annotations permanently into the page canvas.',
    category: 'edit',
    iconName: 'Layers',
    color: 'text-indigo-600',
    badge: 'popular',
    tags: ['flatten', 'flatten pdf', 'make uneditable', 'lock form', 'flatten annotations', 'read only pdf', 'tamper proof'],
    action: { type: 'modal', modal: 'flatten' },
  },

  // =========================================================================
  // 6. PDF SECURITY
  // =========================================================================
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    shortDesc: 'Remove password security, print restrictions, and copy locks from your documents.',
    category: 'security',
    iconName: 'Lock',
    color: 'text-red-500',
    badge: 'popular',
    tags: ['unlock', 'decrypt', 'remove password', 'strip permissions', 'bypass'],
    action: { type: 'modal', modal: 'protect', initialTab: 'unlock' },
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    shortDesc: 'Encrypt your PDF with strong AES-256 passwords and custom permission restrictions.',
    category: 'security',
    iconName: 'ShieldCheck',
    color: 'text-emerald-600',
    badge: 'popular',
    tags: ['protect', 'encrypt', 'password', 'aes', 'secure', 'restrict'],
    action: { type: 'modal', modal: 'protect', initialTab: 'protect' },
  },
  {
    id: 'sign-pdf',
    name: 'Sign PDF',
    shortDesc: 'Draw, type, or upload your signature and stamp it anywhere on the document.',
    category: 'security',
    iconName: 'PenTool',
    color: 'text-sky-500',
    badge: 'popular',
    tags: ['sign', 'signature', 'draw signature', 'stamp', 'initials', 'sign document'],
    action: { type: 'modal', modal: 'sign' },
  },
  {
    id: 'redact-pdf',
    name: 'Redact PDF',
    shortDesc: 'Permanently remove sensitive private text, financial data, and personal details.',
    category: 'security',
    iconName: 'ShieldCheck',
    color: 'text-slate-800',
    tags: ['redact', 'blackout', 'sanitize', 'remove metadata', 'purge'],
    action: { type: 'workflow', tool: 'redact', viewMode: 'single', label: 'Redact PDF' },
  },
  {
    id: 'compare-pdf',
    name: 'Compare PDF',
    shortDesc: 'Side-by-side synchronized view to easily spot visual and text changes between versions.',
    category: 'security',
    iconName: 'GitCompare',
    color: 'text-purple-500',
    tags: ['compare', 'diff', 'side by side', 'revisions', 'differences'],
    action: { type: 'modal', modal: 'compare' },
  },
  {
    id: 'metadata-pdf',
    name: 'Edit PDF Metadata',
    shortDesc: 'View and update Document Title, Author, Subject, Keywords, or wipe all tracking data with 1 click.',
    category: 'security',
    iconName: 'Tag',
    color: 'text-slate-700',
    tags: ['metadata', 'author', 'title', 'edit metadata', 'privacy scrubber', 'clean pdf info', 'properties', 'wipe metadata'],
    action: { type: 'modal', modal: 'metadata' },
  },

  // =========================================================================
  // 7. EXCLUSIVE SPECIAL FEATURES (Handwriting & Exam Tools)
  // =========================================================================
  {
    id: 'handwriting-generator',
    name: 'Handwritten Assignment Generator',
    shortDesc: 'Convert typed text into authentic handwritten homework on ruled sheets with realistic ink & scanner shadows.',
    category: 'handwriting',
    iconName: 'Sparkles',
    color: 'text-red-600',
    badge: 'special',
    tags: ['handwriting', 'handwritten', 'assignment', 'homework', 'notes', 'handwritten generator'],
    action: { type: 'modal', modal: 'handwriting' },
  },
  {
    id: 'target-kb-resizer',
    name: 'Photo & Signature Resizer',
    shortDesc: 'Compress photos and signatures to exact file size limits (20–50 KB, 10–20 KB) for exam & government portals.',
    category: 'optimize',
    iconName: 'Crop',
    color: 'text-blue-600',
    badge: 'special',
    tags: ['photo resizer', 'signature resizer', 'photo 50 kb', 'resize signature 20 kb', 'exam portal', 'target kb resizer', 'resizer'],
    action: { type: 'modal', modal: 'student-resizer' },
  },
];

export const CATEGORY_MAPPINGS: Record<string, ToolCategory[]> = {
  all: ['organize', 'optimize', 'convert-to-pdf', 'convert-from-pdf', 'edit', 'security', 'handwriting'],
  organize: ['organize'],
  optimize: ['optimize'],
  'convert-to-pdf': ['convert-to-pdf'],
  'convert-from-pdf': ['convert-from-pdf'],
  edit: ['edit'],
  security: ['security'],
  handwriting: ['handwriting'],
  // Legacy aliases
  pdf: ['organize', 'optimize', 'edit', 'security'],
  image: ['convert-to-pdf', 'convert-from-pdf', 'optimize'],
  document: ['convert-to-pdf', 'convert-from-pdf'],
  student: ['handwriting', 'optimize'],
  developer: ['optimize', 'security'],
};

export const getToolsByCategory = (category: ToolCategory): ToolDefinition[] => {
  const allowed = CATEGORY_MAPPINGS[category] || [category];
  return TOOLS_CATALOG.filter((tool) => allowed.includes(tool.category));
};

export const searchTools = (query: string, category?: ToolCategory | 'all'): ToolDefinition[] => {
  const q = query.trim().toLowerCase();
  const allowedCategories = category && category !== 'all' ? (CATEGORY_MAPPINGS[category] || [category]) : null;

  return TOOLS_CATALOG.filter((tool) => {
    if (allowedCategories && !allowedCategories.includes(tool.category)) {
      return false;
    }
    if (!q) return true;
    const tokens = q.split(/[\s,]+/).filter(Boolean);
    const searchable = `${tool.name} ${tool.shortDesc} ${tool.category} ${tool.tags.join(' ')}`.toLowerCase();
    if (tokens.length === 0) return true;
    return tokens.every((token) => searchable.includes(token));
  });
};
