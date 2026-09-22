/**
 * SwiftPDF — PDFEngine Master Abstraction Interface
 * 
 * Strict boundary between UI / application services and underlying PDF libraries.
 * Can be implemented by FallbackPDFEngine (pdf-lib + PDF.js) or Commercial SDK (Apryse, Nutrient).
 */

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  isEncrypted: boolean;
  pageCount: number;
  pdfVersion: string;
  fileSizeBytes?: number;
}

export interface PageDimensions {
  pageNumber: number; // 1-indexed
  width: number;      // in PDF points (72 pt/in)
  height: number;     // in PDF points (72 pt/in)
  rotation: number;   // 0, 90, 180, 270
}

export type AnnotationType = 
  | 'highlight' 
  | 'underline' 
  | 'strikethrough' 
  | 'text' 
  | 'draw' 
  | 'rectangle' 
  | 'circle' 
  | 'line'
  | 'arrow'
  | 'stamp'
  | 'note'
  | 'measure';

export interface AnnotationObject {
  id: string;
  pageIndex: number; // 0-indexed
  type: AnnotationType;
  rect: [number, number, number, number]; // [x, y, width, height] in PDF points
  color: string;
  opacity: number;
  strokeWidth?: number;
  content?: string;
  stampText?: string;
  endPoint?: { x: number; y: number };
  points?: Array<{ x: number; y: number }>;
  dimensionUnit?: 'mm' | 'cm' | 'in' | 'pt';
  dimensionScale?: number;
  dimensionText?: string;
  author?: string;
  createdAt: string;
}

export interface DocumentOutlineItem {
  title: string;
  bold?: boolean;
  italic?: boolean;
  pageIndex?: number;
  items?: DocumentOutlineItem[];
}

export interface FormFieldData {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button' | 'signature';
  value: string | boolean;
  pageIndex: number;
  rect: { x: number; y: number; width: number; height: number }; // PDF points
  options?: string[];
  multiline?: boolean;
  maxLength?: number;
  readOnly?: boolean;
}

export interface RedactionArea {
  pageIndex: number; // 0-indexed
  rect: [number, number, number, number]; // [x, y, width, height]
  overlayText?: string;
}

export type CompressPreset = 'max_quality' | 'balanced' | 'small_file' | 'extreme';

export interface CompressOptions {
  preset: CompressPreset;
  imageQuality?: number; // 0.1 to 1.0
  stripMetadata?: boolean;
  targetSizeMB?: number;
}

export interface CompressResult {
  originalBytes: number;
  newBytes: number;
  compressionRatio: number;
  data: Uint8Array;
}

export interface RenderResult {
  pageIndex: number;
  canvas: HTMLCanvasElement | null;
  imageDataUrl: string;
  width: number;
  height: number;
  scale: number;
}

export interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  x: number;
  y: number;
}

export interface PageTextContent {
  pageIndex: number;
  text: string;
  items: TextItem[];
}

export interface PDFError {
  code: 
    | 'FILE_NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'PASSWORD_REQUIRED'
    | 'INVALID_PASSWORD'
    | 'INVALID_PDF'
    | 'UNSUPPORTED_FEATURE'
    | 'ENGINE_ERROR'
    | 'CORRUPTED_STREAM'
    | 'OCR_FAILED'
    | 'OUT_OF_MEMORY'
    | 'CANCELLED';
  message: string;
  userMessage: string;
  operation: string;
  recoverable: boolean;
  technicalDetails?: string;
}

export interface InsertTextOptions {
  pageIndex: number;
  text: string;
  x: number; // PDF points from bottom-left
  y: number;
  size?: number;
  color?: string; // hex #RRGGBB
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
}

export interface InsertImageOptions {
  pageIndex: number;
  imageBuffer: Uint8Array;
  mimeType: 'image/jpeg' | 'image/png';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFEngine {
  readonly engineName: string;
  readonly isCommercial: boolean;

  // Document Lifecycle
  openDocument(source: Uint8Array, password?: string): Promise<{ documentId: string; metadata: DocumentMetadata }>;
  closeDocument(documentId: string): Promise<void>;
  saveDocument(documentId: string): Promise<Uint8Array>;
  getMetadata(documentId: string): Promise<DocumentMetadata>;
  updateMetadata(documentId: string, metadata: Partial<DocumentMetadata>): Promise<void>;

  // Page Geometry & Rendering
  getPageCount(documentId: string): number;
  getPageDimensions(documentId: string, pageIndex: number): Promise<PageDimensions>;
  renderPage(documentId: string, pageIndex: number, scale: number): Promise<RenderResult>;
  extractPageText(documentId: string, pageIndex: number): Promise<PageTextContent>;
  searchDocument(documentId: string, query: string, caseSensitive?: boolean): Promise<Array<{ pageIndex: number; textSnippet: string; matchIndex: number }>>;

  // Page Operations
  reorderPages(documentId: string, pageIndices: number[]): Promise<void>;
  rotatePages(documentId: string, pageIndices: number[], degrees: number): Promise<void>;
  deletePages(documentId: string, pageIndices: number[]): Promise<void>;
  insertBlankPage(documentId: string, atIndex: number, width?: number, height?: number): Promise<void>;
  duplicatePages(documentId: string, pageIndices: number[]): Promise<void>;
  extractPages(documentId: string, pageIndices: number[]): Promise<Uint8Array>;
  reversePages(documentId: string): Promise<void>;
  mergeDocuments(sources: Uint8Array[]): Promise<Uint8Array>;
  splitDocument(documentId: string, pageRanges: Array<[number, number]>): Promise<Uint8Array[]>;

  // Editing & Content Insertion
  insertText(documentId: string, options: InsertTextOptions): Promise<void>;
  insertImage(documentId: string, options: InsertImageOptions): Promise<void>;
  addAnnotation(documentId: string, annotation: AnnotationObject): Promise<void>;
  getAnnotations(documentId: string, pageIndex?: number): Promise<AnnotationObject[]>;
  deleteAnnotation(documentId: string, annotationId: string): Promise<void>;
  flattenAnnotations(documentId: string): Promise<void>;

  // True Redaction (Irreversible destructive removal of content & pixel data)
  applyRedactions(documentId: string, redactions: RedactionArea[]): Promise<void>;

  // Security & Encryption
  encryptDocument(documentId: string, userPassword: string, ownerPassword?: string): Promise<void>;
  removePassword(documentId: string): Promise<void>;

  // Form Handling
  getFormFields(documentId: string): Promise<FormFieldData[]>;
  setFormFieldValue(documentId: string, fieldName: string, value: string | boolean): Promise<void>;
  clearFormFields(documentId: string): Promise<void>;
  exportFormData(documentId: string): Promise<Record<string, any>>;
  flattenForms(documentId: string): Promise<void>;

  // Compression & Optimization
  compressDocument(documentId: string, options: CompressOptions, onProgress?: (percent: number) => void): Promise<CompressResult>;

  // Watermark & Cleaning
  addWatermark(documentId: string, options: WatermarkOptions): Promise<void>;
  removeBlankPages(documentId: string): Promise<number[]>;

  // Bates Numbering & Header/Footer
  addBatesNumbering(documentId: string, options: BatesNumberingOptions): Promise<void>;
  addHeaderFooter(documentId: string, options: HeaderFooterOptions): Promise<void>;

  // Document Sanitization & Privacy Scrubber
  sanitizeDocument(documentId: string): Promise<SanitizeResult>;

  // Batch Automation
  processBatch(items: BatchItem[], options: BatchProcessOptions): Promise<BatchItem[]>;

  // Page Cropping & Margin Trimming
  cropPages(documentId: string, options: CropBoxOptions): Promise<void>;
  trimMargins(documentId: string, options: MarginTrimOptions): Promise<void>;

  // OCR & Searchable PDF Generation
  embedSearchableText(
    documentId: string,
    pageResults: Array<{ pageIndex: number; text: string }>
  ): Promise<Uint8Array>;

  // Direct In-Place Text Editing
  replaceTextOnPage(documentId: string, options: ReplaceTextOptions): Promise<void>;

  // Universal PDF Unlocker & Permission Stripper
  unlockAndStripPermissions(documentId: string): Promise<Uint8Array>;

  // Form Field Creation & Designer
  addFormField(documentId: string, options: FormFieldCreateOptions): Promise<void>;

  // Document Outline & Bookmarks
  getDocumentOutline(documentId: string): Promise<DocumentOutlineItem[]>;

  // Photo & Image Extraction
  extractImages(documentId: string): Promise<ExtractedImageItem[]>;
}

export interface ExtractedImageItem {
  id: string;
  pageIndex: number;
  name?: string;
  width: number;
  height: number;
  mimeType: string;
  dataUrl: string;
  buffer: Uint8Array;
  sizeBytes: number;
}

export interface FormFieldCreateOptions {
  pageIndex: number;
  type: 'text' | 'checkbox' | 'dropdown';
  name: string;
  rect: [number, number, number, number]; // [x, y, width, height] in PDF points
  defaultValue?: string;
  options?: string[]; // for dropdown
}

export interface ReplaceTextOptions {
  pageIndex: number;
  rect: [number, number, number, number]; // [x, y, width, height] in PDF points
  originalText: string;
  newText: string;
  fontSize?: number;
  color?: string;
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  backgroundColor?: string;
}

export type BatchOperationType = 'compress' | 'watermark' | 'sanitize';

export interface BatchItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  fileBytes: Uint8Array;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  outputBytes?: Uint8Array;
  outputFileName?: string;
  errorMessage?: string;
  savingsBytes?: number;
}

export interface BatchProcessOptions {
  operation: BatchOperationType;
  compressOptions?: CompressOptions;
  watermarkOptions?: WatermarkOptions;
  onProgress?: (itemId: string, progress: number) => void;
}

export interface SanitizeResult {
  strippedFields: string[];
  hasXmpStreamPurged: boolean;
  cleanedMetadata: DocumentMetadata;
}

export type HeaderFooterPosition = 
  | 'top-left' 
  | 'top-center' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-center' 
  | 'bottom-right';

export interface BatesNumberingOptions {
  prefix?: string;
  suffix?: string;
  startNumber: number;
  digitsCount: number;
  position: HeaderFooterPosition;
  fontSize?: number;
  color?: string;
  pageIndices?: number[];
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  margin?: number;
}

export interface HeaderFooterOptions {
  text: string;
  position: HeaderFooterPosition;
  fontSize?: number;
  color?: string;
  pageIndices?: number[];
  fontFamily?: 'Helvetica' | 'TimesRoman' | 'Courier';
  margin?: number;
}

export interface WatermarkOptions {
  text?: string;
  imageBuffer?: Uint8Array;
  imageMimeType?: 'image/png' | 'image/jpeg';
  imageWidth?: number;
  imageHeight?: number;
  fontSize?: number;
  opacity?: number;
  rotationDegrees?: number;
  color?: string;
  pageIndices?: number[];
  skipCoverPage?: boolean;
}

export interface CropBoxOptions {
  pageIndices?: number[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MarginTrimOptions {
  pageIndices?: number[];
  top: number;
  bottom: number;
  left: number;
  right: number;
}
