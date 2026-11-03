export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'pdf-to-word'
  | 'pdf-to-powerpoint'
  | 'pdf-to-excel'
  | 'word-to-pdf'
  | 'powerpoint-to-pdf'
  | 'excel-to-pdf'
  | 'edit-pdf'
  | 'pdf-to-jpg'
  | 'jpg-to-pdf'
  | 'sign-pdf'
  | 'watermark-pdf'
  | 'rotate-pdf'
  | 'html-to-pdf'
  | 'unlock-pdf'
  | 'protect-pdf'
  | 'organize-pdf'
  | 'pdf-to-pdfa'
  | 'repair-pdf'
  | 'page-numbers'
  | 'scan-to-pdf'
  | 'ocr-pdf'
  | 'compare-pdf'
  | 'redact-pdf'
  | 'handwriting';

export type ToolCategory =
  | 'organize'
  | 'optimize'
  | 'convert-to-pdf'
  | 'convert-from-pdf'
  | 'edit-security';

export interface ToolDefinition {
  id: ToolId;
  title: string;
  shortTitle: string;
  description: string;
  category: ToolCategory;
  iconName: string;
  badge?: string;
  accept: string;
  multiple: boolean;
  actionText: string;
  color: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount?: number;
  rotation?: number;
  thumbnails?: string[];
  pages?: {
    pageNumber: number;
    rotation: number;
    deleted: boolean;
    thumbnail?: string;
  }[];
}

export type WorkspaceStage = 'select' | 'configure' | 'processing' | 'complete';

export interface ProcessingProgress {
  message: string;
  percent: number;
}

export interface ProcessResult {
  blob: Blob;
  fileName: string;
  downloadUrl: string;
  originalSize?: number;
  newSize?: number;
  isZip?: boolean;
}

// Tool Specific Options
export interface MergeOptions {
  files: UploadedFile[];
}

export interface SplitOptions {
  mode: 'range' | 'extract-all';
  ranges: string;
}

export interface CompressOptions {
  level: 'extreme' | 'recommended' | 'less';
}

export interface RotateOptions {
  globalRotation: number;
}

export interface OrganizeOptions {
  pageOrder: {
    fileId: string;
    originalPageIndex: number;
    rotation: number;
  }[];
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  opacity: number;
  color: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  rotation: number;
}

export interface PageNumberOptions {
  position: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left';
  format: 'number' | 'page_n' | 'page_n_of_p';
  startFrom: number;
  fontSize: number;
  margin: number;
}

export interface ProtectOptions {
  password: string;
  confirmPassword: string;
}

export interface UnlockOptions {
  password?: string;
}

export interface JpgToPdfOptions {
  orientation: 'portrait' | 'landscape';
  pageSize: 'fit' | 'a4';
  margin: 'none' | 'small' | 'big';
}

export interface PdfToJpgOptions {
  quality: number;
  format: 'jpg' | 'png';
}

export interface SignPdfOptions {
  signatureDataUrl: string;
  signerName: string;
  position: 'bottom-right' | 'bottom-left' | 'center';
}

export interface EditPdfOptions {
  addedText: string;
  textColor: string;
  textSize: number;
  highlightText: boolean;
}

export interface HtmlToPdfOptions {
  htmlInput: string;
  pageTitle: string;
}

export interface RedactOptions {
  redactNotes: string;
}
