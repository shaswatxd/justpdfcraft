import { ToolDefinition, ToolCategory } from '@/types/tools';

/**
 * iLovePDF-parity catalog (see docs/REDESIGN-ILOVEPDF-PLAN.md).
 * Only iLovePDF-grade tools remain, plus the two user-mandated keeps:
 * the exact-KB photo resizer and the handwritten assignment generator.
 * Total: 23 tools (20 PDF, 2 Image, 1 Student).
 */
export const TOOLS_CATALOG: ToolDefinition[] = [
  // =========================================================================
  // PDF TOOLS (20)
  // =========================================================================
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    shortDesc: 'Combine multiple PDF files into one clean document with custom order.',
    category: 'pdf',
    iconName: 'Layers',
    color: 'text-blue-400',
    tags: ['merge', 'combine', 'join', 'append', 'pdf', 'bind', 'join pdf', 'combine pdf'],
    action: { type: 'modal', modal: 'merge' },
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    shortDesc: 'Extract individual pages or custom page ranges into separate files.',
    category: 'pdf',
    iconName: 'Scissors',
    color: 'text-amber-400',
    tags: ['split', 'extract', 'pages', 'separate', 'divide', 'cut'],
    action: { type: 'workflow', modal: 'split', label: 'Split Pages' },
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    shortDesc: 'Reduce PDF file size by preset or exact target KB (e.g. 100 KB, 200 KB) for portal submissions.',
    category: 'pdf',
    iconName: 'FileArchive',
    color: 'text-emerald-400',
    badge: 'popular',
    tags: ['compress', 'shrink', 'reduce', 'resize', 'resizer', 'pdf resizer', 'mb', 'kb', 'optimize', 'size', 'reduce pdf size', 'smaller file size', 'make pdf smaller'],
    action: { type: 'workflow', modal: 'compress', label: 'Compress PDF' },
  },
  {
    id: 'convert-pdf',
    name: 'Convert PDF',
    shortDesc: 'Convert PDF to JPG/PNG/WebP, PDF to Text/Markdown, and Images to PDF.',
    category: 'pdf',
    iconName: 'RefreshCw',
    color: 'text-teal-400',
    tags: ['convert', 'jpg', 'png', 'webp', 'txt', 'markdown', 'images', 'export'],
    action: { type: 'workflow', modal: 'convert', label: 'Convert PDF' },
  },
  {
    id: 'pdf-to-word-doc',
    name: 'PDF to Word (.docx)',
    shortDesc: 'Convert PDF paragraphs, text, and headings into editable Microsoft Word (.docx) documents.',
    category: 'pdf',
    iconName: 'FileType',
    color: 'text-blue-400',
    badge: 'new',
    tags: ['pdf to word', 'docx', 'word', 'doc', 'convert to word', 'editable word', 'export docx'],
    action: { type: 'workflow', modal: 'convert', initialTab: 'pdf-to-word', label: 'Convert to Word' },
  },
  {
    id: 'text-to-pdf-compiler',
    name: 'Text & Notes to PDF',
    shortDesc: 'Compile plain text, essays, and notes directly into formatted multi-page PDF documents.',
    category: 'pdf',
    iconName: 'FileText',
    color: 'text-teal-400',
    badge: 'new',
    tags: ['text to pdf', 'txt to pdf', 'markdown to pdf', 'notes to pdf', 'write pdf', 'compile pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'txt-to-pdf' },
  },
  {
    id: 'organize-pdf',
    name: 'Organize & Reorder Pages',
    shortDesc: 'Visual grid to rearrange, rotate, duplicate, and delete pages with drag & drop.',
    category: 'pdf',
    iconName: 'Grid',
    color: 'text-yellow-400',
    tags: ['organize', 'reorder', 'rotate', 'delete', 'grid', 'pages', 'sort', 'pages reorder'],
    action: { type: 'workflow', viewMode: 'organize', label: 'Visual Page Organizer' },
  },
  {
    id: 'direct-text-editor',
    name: 'In-Place Text Editor',
    shortDesc: 'Edit text directly on the PDF canvas with font detection and matching.',
    category: 'pdf',
    iconName: 'Edit3',
    color: 'text-sky-400',
    tags: ['edit', 'text', 'inline', 'canvas', 'modify', 'replace', 'type'],
    action: { type: 'workflow', tool: 'edit_text', label: 'In-Place Text Editor' },
  },
  {
    id: 'ocr-pdf',
    name: 'PDF OCR & Snip',
    shortDesc: 'Extract selectable digital text from scanned book pages and documents.',
    category: 'pdf',
    iconName: 'ScanText',
    color: 'text-indigo-400',
    tags: ['ocr', 'scan', 'text', 'recognition', 'snip', 'tesseract', 'copy'],
    action: { type: 'workflow', modal: 'ocr', label: 'OCR Text Extraction' },
  },
  {
    id: 'protect-pdf',
    name: 'Protect & Encrypt PDF',
    shortDesc: 'Secure your PDF with AES encryption and custom permissions password.',
    category: 'pdf',
    iconName: 'ShieldCheck',
    color: 'text-rose-500',
    tags: ['protect', 'encrypt', 'password', 'security', 'lock', 'aes'],
    action: { type: 'workflow', modal: 'protect', label: 'Protect & Encrypt' },
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock & Strip Permissions',
    shortDesc: 'Remove copy/print restrictions and password protection from your documents.',
    category: 'pdf',
    iconName: 'Lock',
    color: 'text-emerald-400',
    tags: ['unlock', 'decrypt', 'remove password', 'permissions', 'unprotect'],
    action: { type: 'workflow', modal: 'protect', label: 'Unlock & Manage Security' },
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    shortDesc: 'Stamp customized text or image watermarks with angle and opacity control.',
    category: 'pdf',
    iconName: 'Droplets',
    color: 'text-blue-400',
    tags: ['watermark', 'stamp', 'opacity', 'confidential', 'draft', 'protect'],
    action: { type: 'workflow', modal: 'watermark', label: 'Watermark PDF' },
  },
  {
    id: 'add-page-numbers',
    name: 'Add Page Numbers & Headers',
    shortDesc: 'Stamp customizable Page X of Y, dates, or headers and footers across all or selected pages.',
    category: 'pdf',
    iconName: 'Hash',
    color: 'text-violet-400',
    tags: ['page numbers', 'header', 'footer', 'numbering', 'page x of y', 'date stamp', 'stamp'],
    action: { type: 'workflow', modal: 'page-number', label: 'Add Page Numbers' },
  },
  {
    id: 'bates-numbering',
    name: 'Page Numbering & Bates',
    shortDesc: 'Apply dynamic page numbers, legal Bates sequences, and headers/footers.',
    category: 'pdf',
    iconName: 'Tag',
    color: 'text-purple-400',
    tags: ['bates', 'page number', 'numbering', 'legal', 'header', 'footer'],
    action: { type: 'workflow', modal: 'bates', label: 'Page Numbering & Bates' },
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF Margins',
    shortDesc: 'Trim unwanted whitespace margins or crop to specific page regions.',
    category: 'pdf',
    iconName: 'Crop',
    color: 'text-teal-400',
    tags: ['crop', 'margins', 'trim', 'cut', 'box', 'resize'],
    action: { type: 'workflow', modal: 'crop', label: 'Crop PDF Pages' },
  },
  {
    id: 'scan-pdf',
    name: 'Smart Document Scanner',
    shortDesc: 'Capture physical documents using your webcam/camera with auto-filter.',
    category: 'pdf',
    iconName: 'Camera',
    color: 'text-orange-400',
    tags: ['scan', 'camera', 'webcam', 'document', 'photo to pdf'],
    action: { type: 'modal', modal: 'scan' },
  },
  {
    id: 'table-extract',
    name: 'Table to Excel / CSV',
    shortDesc: 'Detect and extract tabular data coordinates into native Excel (.xlsx) workbooks or clean CSV files.',
    category: 'pdf',
    iconName: 'Table',
    color: 'text-emerald-400',
    tags: ['table', 'excel', 'csv', 'data', 'spreadsheet', 'extract'],
    action: { type: 'workflow', modal: 'extract-table', label: 'Extract Tables' },
  },
  {
    id: 'sign-pdf',
    name: 'Sign & Digital Signature',
    shortDesc: 'Draw or upload your signature and place it anywhere with custom sizing.',
    category: 'pdf',
    iconName: 'PenTool',
    color: 'text-sky-300',
    tags: ['sign', 'signature', 'e-sign', 'autograph', 'initials'],
    action: { type: 'workflow', modal: 'sign', label: 'Sign Document' },
  },
  {
    id: 'compare-pdf',
    name: 'Compare Documents',
    shortDesc: 'Side-by-side synchronized view to spot visual differences between two revisions.',
    category: 'pdf',
    iconName: 'GitCompare',
    color: 'text-purple-400',
    tags: ['compare', 'diff', 'side-by-side', 'revisions', 'versions'],
    action: { type: 'workflow', modal: 'compare', label: 'Compare Documents' },
  },
  {
    id: 'batch-pdf',
    name: 'Batch Multi-File Processing',
    shortDesc: 'Process multiple PDF documents simultaneously in one click.',
    category: 'pdf',
    iconName: 'Layers',
    color: 'text-indigo-400',
    tags: ['batch', 'bulk', 'multi-file', 'mass', 'parallel'],
    action: { type: 'modal', modal: 'batch' },
  },

  // =========================================================================
  // IMAGE TOOLS (2)
  // =========================================================================
  {
    id: 'image-to-pdf-tool',
    name: 'Image to PDF Compiler',
    shortDesc: 'Convert multiple photos, notes, and receipts into a multi-page PDF.',
    category: 'image',
    iconName: 'FilePlus',
    color: 'text-indigo-400',
    tags: ['image to pdf', 'jpg to pdf', 'png to pdf', 'photos to pdf', 'images to pdf'],
    action: { type: 'modal', modal: 'convert', initialTab: 'img-to-pdf' },
  },
  {
    id: 'target-kb-resizer',
    name: 'Photo & Signature Resizer',
    shortDesc: 'Compress photos or signatures to exact file size limits (e.g. 20–50 KB, 10–20 KB) for exam portals.',
    category: 'image',
    iconName: 'Sliders',
    color: 'text-amber-400',
    tags: ['resizer', 'target kb', 'compress kb', 'exam photo', 'ssc', 'upsc', 'neet', 'jee', 'photo 50kb', 'signature 20kb', 'photo 50 kb', 'signature 20 kb', 'resize signature 20 kb', 'resize photo', 'reduce photo size', 'kb limit'],
    action: { type: 'modal', modal: 'student-resizer', initialTab: 'resizer' },
  },

  // =========================================================================
  // STUDENT TOOLS (1)
  // =========================================================================
  {
    id: 'handwriting-generator',
    name: 'Handwritten Assignment Generator',
    shortDesc: 'Convert typed text into realistic handwritten assignments on ruled sheets with authentic ink and scanner shadows.',
    category: 'student',
    iconName: 'PenTool',
    color: 'text-amber-400',
    badge: 'new',
    tags: ['handwriting', 'assignment', 'notes', 'handwritten', 'ruled page', 'homework', 'ink', 'scanner', 'text to handwriting'],
    action: { type: 'modal', modal: 'handwriting' },
  },
];

export const getToolsByCategory = (category: ToolCategory): ToolDefinition[] => {
  return TOOLS_CATALOG.filter((tool) => tool.category === category);
};

export const getPopularTools = (): ToolDefinition[] => {
  return TOOLS_CATALOG.filter((tool) => tool.badge === 'popular' || tool.badge === 'recommended');
};

export const searchTools = (query: string, category?: ToolCategory | 'all'): ToolDefinition[] => {
  const q = query.trim().toLowerCase();
  return TOOLS_CATALOG.filter((tool) => {
    if (category && category !== 'all' && tool.category !== category) {
      return false;
    }
    if (!q) return true;
    // Split the query into individual words so natural multi-word searches like
    // "photo 50 kb", "reduce pdf size", "pages reorder" or "signature background"
    // match every term somewhere in the tool's name, description, category or tags.
    const tokens = q.split(/[\s,]+/).filter(Boolean);
    const searchable =
      `${tool.name} ${tool.shortDesc} ${tool.category} ${tool.tags.join(' ')}`.toLowerCase();
    if (tokens.length === 0) return true;
    return tokens.every((token) => searchable.includes(token));
  });
};
