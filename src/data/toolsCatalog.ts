import { ToolDefinition, ToolCategory } from '@/types/tools';

/**
 * JustPDFCraft Master Tools Catalog
 * 100% Client-Side In-Browser PDF Suite (matching iLovePDF) + Handwritten Assignment Generator.
 */
export const TOOLS_CATALOG: ToolDefinition[] = [
  // =========================================================================
  // 1. ORGANIZE PDF
  // =========================================================================
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDesc: 'Combine multiple PDF files into one clean document with custom order.',
    category: 'organize',
    iconName: 'Layers',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['merge', 'combine', 'join', 'append', 'pdf', 'bind', 'join pdf', 'combine pdf', 'bind pdf', 'merge pdf'],
    action: { type: 'modal', modal: 'merge' },
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    shortDesc: 'Extract individual pages or custom page ranges into separate files.',
    category: 'organize',
    iconName: 'Scissors',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['split', 'extract', 'pages', 'separate', 'divide', 'cut', 'split pdf', 'separate pdf'],
    action: { type: 'modal', modal: 'split', label: 'Split Pages' },
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    shortDesc: 'Visual drag & drop grid to reorder, duplicate, rotate, and delete pages.',
    category: 'organize',
    iconName: 'Grid',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['organize', 'reorder', 'rotate', 'delete', 'grid', 'pages', 'sort', 'pages reorder', 'reorder pages', 'organize pdf'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'delete-pdf-pages',
    name: 'Remove PDF Pages',
    shortDesc: 'Delete unnecessary or blank pages from your PDF document easily.',
    category: 'organize',
    iconName: 'Scissors',
    color: 'text-rose-500',
    tags: ['delete pages', 'remove page', 'drop page', 'prune', 'remove pdf pages', 'delete pdf pages'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'extract-pdf-pages',
    name: 'Extract PDF Pages',
    shortDesc: 'Extract specific pages or page ranges into a brand new PDF document.',
    category: 'organize',
    iconName: 'Scissors',
    color: 'text-blue-600',
    tags: ['extract pages', 'separate', 'select pages', 'range', 'extract pdf pages'],
    action: { type: 'modal', modal: 'split', label: 'Extract Pages' },
  },
  {
    id: 'scan-pdf',
    name: 'Scan to PDF',
    shortDesc: 'Capture physical documents using your webcam or phone camera with auto-filters.',
    category: 'organize',
    iconName: 'Camera',
    color: 'text-blue-600',
    tags: ['scan', 'camera', 'webcam', 'document', 'scan to pdf', 'smart scanner'],
    action: { type: 'modal', modal: 'scan' },
  },

  // =========================================================================
  // 2. OPTIMIZE PDF
  // =========================================================================
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    shortDesc: 'Reduce PDF file size by preset or exact target KB for email and portal submissions.',
    category: 'optimize',
    iconName: 'FileArchive',
    color: 'text-blue-600',
    badge: 'popular',
    tags: [
      'compress', 'shrink', 'reduce', 'resize', 'resizer', 'pdf resizer', 'mb', 'kb', 
      'optimize', 'size', 'reduce pdf size', 'smaller', 'make pdf smaller', 'make smaller', 
      'smaller file size', 'target kb', 'photo 50 kb', 'resize signature 20 kb', 'compress pdf'
    ],
    action: { type: 'modal', modal: 'compress', label: 'Compress PDF' },
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    shortDesc: 'Best-effort recovery and repair of damaged, corrupted, or unreadable PDF files.',
    category: 'optimize',
    iconName: 'RefreshCw',
    color: 'text-blue-600',
    tags: ['repair', 'fix', 'recover', 'corrupt', 'damaged', 'repair pdf'],
    action: { type: 'modal', modal: 'convert', label: 'Repair & Recover PDF' },
  },
  {
    id: 'ocr-pdf',
    name: 'OCR PDF',
    shortDesc: 'Convert scanned PDFs into searchable and selectable digital text documents.',
    category: 'optimize',
    iconName: 'ScanText',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['ocr', 'scan', 'text', 'recognition', 'snip', 'tesseract', 'copy', 'searchable pdf', 'ocr pdf'],
    action: { type: 'modal', modal: 'ocr', label: 'OCR Text Extraction' },
  },

  // =========================================================================
  // 3. CONVERT PDF
  // =========================================================================
  {
    id: 'pdf-to-word-doc',
    name: 'PDF to Word (.docx)',
    shortDesc: 'Convert PDF paragraphs, text, and headings into editable Microsoft Word (.docx) documents.',
    category: 'convert',
    iconName: 'FileType',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['pdf to word', 'docx', 'word', 'doc', 'convert to word', 'editable word', 'export docx', 'pdf to docx'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-word', label: 'Convert to Word' },
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    shortDesc: 'Convert Microsoft Word (.docx) documents and essays into crisp, printable PDF files.',
    category: 'convert',
    iconName: 'FileType',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['word to pdf', 'docx to pdf', 'convert word', 'doc to pdf', 'word document'],
    action: { type: 'modal', modal: 'convert', initialTab: 'txt-to-pdf', label: 'Word to PDF' },
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    shortDesc: 'Convert PDF pages into high-resolution JPG images with custom DPI.',
    category: 'convert',
    iconName: 'RefreshCw',
    color: 'text-blue-600',
    tags: ['pdf to jpg', 'pdf to image', 'convert jpg', 'export jpg', 'images', 'extract images', 'pdf to png'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-img', label: 'PDF to JPG' },
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    shortDesc: 'Convert JPG, PNG, and photo files into a clean multi-page PDF document.',
    category: 'convert',
    iconName: 'FilePlus',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['jpg to pdf', 'image to pdf', 'photos to pdf', 'convert to pdf', 'images to pdf', 'png to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'img-to-pdf' },
  },
  {
    id: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    shortDesc: 'Convert presentation slides and outline points into formatted PDF handouts.',
    category: 'convert',
    iconName: 'Layers',
    color: 'text-blue-600',
    tags: ['powerpoint to pdf', 'ppt to pdf', 'presentation to pdf', 'slides', 'pptx to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'txt-to-pdf', label: 'PowerPoint to PDF' },
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    shortDesc: 'Convert spreadsheets, tables, and workbooks into clean printable PDF pages.',
    category: 'convert',
    iconName: 'Table',
    color: 'text-blue-600',
    tags: ['excel to pdf', 'xlsx to pdf', 'spreadsheet to pdf', 'table to pdf', 'sheets to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'txt-to-pdf', label: 'Excel to PDF' },
  },
  {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    shortDesc: 'Render webpages, HTML code, and articles into formatted PDF documents.',
    category: 'convert',
    iconName: 'FileCode',
    color: 'text-blue-600',
    tags: ['html to pdf', 'web to pdf', 'webpage to pdf', 'render html', 'website to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'txt-to-pdf', label: 'HTML to PDF' },
  },
  {
    id: 'pdf-to-text-tool',
    name: 'PDF to Text',
    shortDesc: 'Extract all digital textual content from PDF into plain text or Markdown.',
    category: 'convert',
    iconName: 'FileText',
    color: 'text-blue-600',
    tags: ['pdf to text', 'extract text', 'copy text', 'txt', 'markdown', 'text extract'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-txt' },
  },
  {
    id: 'pdf-to-grayscale',
    name: 'PDF to Grayscale (B&W)',
    shortDesc: 'Convert color PDFs to clean monochrome black & white for ink saving and portals.',
    category: 'convert',
    iconName: 'Moon',
    color: 'text-blue-600',
    tags: ['grayscale', 'black and white', 'b&w', 'monochrome', 'pdf to grayscale', 'ink saver'],
    action: { type: 'modal', modal: 'convert', initialTab: 'pdf-to-grayscale' },
  },

  // =========================================================================
  // 4. EDIT & SECURITY
  // =========================================================================
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    shortDesc: 'Rotate PDF pages clockwise or counter-clockwise permanently.',
    category: 'edit',
    iconName: 'RotateCw',
    color: 'text-blue-600',
    tags: ['rotate', 'orientation', 'flip', 'portrait', 'landscape', 'rotate pdf'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'add-page-numbers',
    name: 'Add Page Numbers & Headers',
    shortDesc: 'Stamp customizable Page X of Y, dates, and headers/footers onto your PDF.',
    category: 'edit',
    iconName: 'Tag',
    color: 'text-blue-600',
    tags: ['page numbers', 'header', 'footer', 'numbering', 'page x of y', 'date stamp', 'bates'],
    action: { type: 'modal', modal: 'page-number', label: 'Add Page Numbers' },
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    shortDesc: 'Stamp customized text or image watermarks with angle and opacity control.',
    category: 'edit',
    iconName: 'Droplets',
    color: 'text-blue-600',
    tags: ['watermark', 'stamp', 'opacity', 'confidential', 'draft', 'protect', 'watermark pdf'],
    action: { type: 'modal', modal: 'watermark', label: 'Watermark PDF' },
  },
  {
    id: 'edit-pdf',
    name: 'Edit PDF Canvas',
    shortDesc: 'Annotate, draw, highlight, and place text directly on any PDF page.',
    category: 'edit',
    iconName: 'Edit3',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['edit', 'annotate', 'draw', 'highlight', 'notes', 'markup', 'edit pdf'],
    action: { type: 'modal', modal: 'organize' },
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF Margins',
    shortDesc: 'Trim unwanted whitespace margins or crop to specific page regions.',
    category: 'edit',
    iconName: 'Crop',
    color: 'text-blue-600',
    tags: ['crop', 'margins', 'trim', 'cut', 'box', 'resize', 'crop pdf'],
    action: { type: 'modal', modal: 'crop', label: 'Crop PDF Pages' },
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock & Strip Permissions',
    shortDesc: 'Remove copy/print restrictions and password protection from your documents.',
    category: 'security',
    iconName: 'Lock',
    color: 'text-blue-600',
    tags: ['unlock', 'decrypt', 'remove password', 'permissions', 'unprotect', 'unlock pdf'],
    action: { type: 'modal', modal: 'protect', label: 'Unlock & Manage Security' },
  },
  {
    id: 'protect-pdf',
    name: 'Protect & Encrypt PDF',
    shortDesc: 'Secure your PDF with AES encryption and custom permissions password.',
    category: 'security',
    iconName: 'ShieldCheck',
    color: 'text-blue-600',
    tags: ['protect', 'encrypt', 'password', 'security', 'lock', 'aes', 'protect pdf'],
    action: { type: 'modal', modal: 'protect', label: 'Protect & Encrypt' },
  },
  {
    id: 'sign-pdf',
    name: 'Sign & Digital Signature',
    shortDesc: 'Draw or upload your signature and place it anywhere with custom sizing.',
    category: 'security',
    iconName: 'PenTool',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['sign', 'signature', 'e-sign', 'autograph', 'initials', 'sign pdf'],
    action: { type: 'modal', modal: 'sign', label: 'Sign Document' },
  },
  {
    id: 'compare-pdf',
    name: 'Compare Documents',
    shortDesc: 'Side-by-side synchronized view to spot visual differences between two revisions.',
    category: 'security',
    iconName: 'GitCompare',
    color: 'text-blue-600',
    tags: ['compare', 'diff', 'side-by-side', 'revisions', 'versions', 'compare pdf'],
    action: { type: 'modal', modal: 'compare', label: 'Compare Documents' },
  },
  {
    id: 'flatten-pdf',
    name: 'Flatten PDF',
    shortDesc: 'Merge annotations, form fields, and signatures into the base PDF layer.',
    category: 'edit',
    iconName: 'Layers',
    color: 'text-blue-600',
    tags: ['flatten', 'merge layers', 'burn in', 'print ready', 'flatten pdf'],
    action: { type: 'modal', modal: 'convert', label: 'Flatten Document' },
  },

  // =========================================================================
  // 5. SPECIAL: HANDWRITTEN ASSIGNMENT GENERATOR (USER'S MUST-HAVE EXCEPTION)
  // =========================================================================
  {
    id: 'handwriting-generator',
    name: 'Handwritten Assignment Generator',
    shortDesc: 'Convert typed text into realistic handwritten assignments on ruled sheets with authentic ink and scanner shadows.',
    category: 'handwritten',
    iconName: 'PenTool',
    color: 'text-blue-600',
    badge: 'popular',
    tags: ['handwriting', 'assignment', 'notes', 'handwritten', 'ruled page', 'homework', 'ink', 'scanner', 'text to handwriting', 'handwriting generator'],
    action: { type: 'modal', modal: 'handwriting' },
  },
];

export const getToolsByCategory = (category: ToolCategory): ToolDefinition[] => {
  return TOOLS_CATALOG.filter((tool) => tool.category === category);
};

export const searchTools = (query: string, category?: ToolCategory | 'all'): ToolDefinition[] => {
  const q = query.trim().toLowerCase();
  return TOOLS_CATALOG.filter((tool) => {
    if (category && category !== 'all' && tool.category !== category) {
      return false;
    }
    if (!q) return true;
    const tokens = q.split(/[\s,]+/).filter(Boolean);
    const searchable =
      `${tool.name} ${tool.shortDesc} ${tool.category} ${tool.tags.join(' ')}`.toLowerCase();
    if (tokens.length === 0) return true;
    return tokens.every((token) => searchable.includes(token));
  });
};
