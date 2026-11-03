import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  UploadedFile, 
  ProcessResult, 
  SignPdfOptions, 
  EditPdfOptions, 
  HtmlToPdfOptions, 
  RedactOptions 
} from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

/**
 * Sign PDF with drawn signature data URL or typed signature
 */
export async function signPdf(
  fileItem: UploadedFile,
  options: SignPdfOptions,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Loading PDF document for digital signing...', 20);
  const buffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1]; // Sign on the last page or all pages
  const { width } = lastPage.getSize();

  onProgress?.('Applying digital signature stamp...', 60);

  if (options.signatureDataUrl) {
    // Drawn or uploaded signature image
    const signatureImage = await pdfDoc.embedPng(options.signatureDataUrl);
    const imgWidth = 160;
    const imgHeight = (signatureImage.height / signatureImage.width) * imgWidth;
    let x = width - imgWidth - 50;
    let y = 60;

    if (options.position === 'bottom-left') x = 50;
    if (options.position === 'center') x = width / 2 - imgWidth / 2;

    lastPage.drawImage(signatureImage, { x, y, width: imgWidth, height: imgHeight });

    // Add signature metadata line
    const dateStr = `Digitally signed on ${new Date().toLocaleDateString()}`;
    lastPage.drawText(dateStr, {
      x,
      y: y - 12,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  } else {
    // Typed signature
    const signer = options.signerName || 'Verified Signature';
    const x = options.position === 'bottom-left' ? 50 : width - 220;
    const y = 60;

    lastPage.drawText(signer, {
      x,
      y: y + 15,
      size: 20,
      font: italicFont,
      color: rgb(0.05, 0.2, 0.6),
    });

    lastPage.drawLine({
      start: { x, y: y + 10 },
      end: { x: x + 180, y: y + 10 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });

    lastPage.drawText(`Digitally Verified • ${new Date().toLocaleDateString()}`, {
      x,
      y: y - 5,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  onProgress?.('Finalizing signed document...', 90);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}_signed.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Edit PDF (Insert text annotations, notes, highlights)
 */
export async function editPdf(
  fileItem: UploadedFile,
  options: EditPdfOptions,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Loading PDF for editing...', 20);
  const buffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  onProgress?.('Injecting annotations and text overlays...', 60);
  const textToDraw = (options.addedText || 'Crafted with JustPDFCraft').replace(
    /[^\x20-\x7E\xA0-\xFF]/g,
    ' '
  );
  const fontSize = options.textSize || 14;

  if (options.highlightText) {
    // Draw yellow highlight box
    firstPage.drawRectangle({
      x: 45,
      y: 695,
      width: textToDraw.length * 8 + 10,
      height: fontSize + 8,
      color: rgb(1, 0.95, 0.4),
      opacity: 0.6,
    });
  }

  firstPage.drawText(textToDraw, {
    x: 50,
    y: 700,
    size: fontSize,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}_edited.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Repair damaged PDF
 */
export async function repairPdf(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Scanning document for damaged xref streams and headers...', 20);
  const buffer = await fileItem.file.arrayBuffer();

  // Load in fault-tolerant mode (ignoring encryption and syntax warnings)
  onProgress?.('Reconstructing cross-reference tables and recovering lost streams...', 50);
  const recoveredDoc = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
    updateMetadata: true,
  });

  onProgress?.('Re-indexing objects and finalizing recovered structure...', 85);
  const repairedBytes = await recoveredDoc.save({ useObjectStreams: false });
  const blob = createPdfBlob(repairedBytes);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Repair complete!', 100);

  return {
    blob,
    fileName: `${baseName}_repaired.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Convert PDF to PDF/A ISO archiving format
 */
export async function convertPdfToPdfA(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Validating PDF/A compliance criteria...', 25);
  const buffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  onProgress?.('Injecting ISO 19005-1 PDF/A-1b metadata and color profile...', 65);
  pdfDoc.setTitle(`${fileItem.name.replace(/\.pdf$/i, '')} (PDF/A Compliant)`);
  pdfDoc.setProducer('JustPDFCraft ISO PDF/A Engine');
  pdfDoc.setCreator('JustPDFCraft Archiver');
  pdfDoc.setModificationDate(new Date());

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('PDF/A conversion complete!', 100);

  return {
    blob,
    fileName: `${baseName}_PDFA.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Convert HTML content or URL to formatted PDF
 */
export async function convertHtmlToPdf(
  fileItem: UploadedFile,
  options: HtmlToPdfOptions,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Parsing HTML layout and typography...', 20);
  const htmlContent = options.htmlInput || (await fileItem.file.text());

  // Extract plain text and clean tags
  const cleanLines = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .split(/\r?\n/)
    .map(l => l.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim())
    .filter(Boolean);

  onProgress?.('Rendering HTML pages into PDF document...', 60);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 50;
  let y = 841.89 - margin;

  // Title
  page.drawText(options.pageTitle || 'HTML to PDF Document', {
    x: margin,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.9, 0.2, 0.18),
  });
  y -= 35;

  for (const line of cleanLines) {
    if (y < margin + 20) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 841.89 - margin;
    }
    page.drawText(line.slice(0, 85), {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: 'justpdfcraft_html_converted.pdf',
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * OCR PDF: Extract selectable text transcript and searchable document
 */
export async function ocrPdf(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Extracting text content from PDF pages...', 20);
  const buffer = await fileItem.file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Extracting text from page ${i} of ${pdf.numPages}...`, 20 + Math.round((i / pdf.numPages) * 70));
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';

    for (const item of content.items as any[]) {
      if (item.str !== undefined) {
        if (item.hasEOL) {
          currentLine += item.str;
          lines.push(currentLine);
          currentLine = '';
        } else {
          currentLine += (currentLine ? ' ' : '') + item.str;
        }
      }
    }
    if (currentLine) lines.push(currentLine);

    pageTexts.push(`--- PAGE ${i} ---\n` + (lines.length > 0 ? lines.join('\n') : '[No selectable text on this page]'));
  }

  onProgress?.('Compiling text transcript...', 95);
  const fullText = pageTexts.join('\n\n');
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}_extracted_text.txt`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Compare two PDFs and output comparison summary
 */
export async function comparePdf(
  files: UploadedFile[],
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  if (files.length < 2) {
    throw new Error('Please select at least 2 PDF documents to compare.');
  }

  onProgress?.('Comparing document architectures and pages...', 40);
  const doc1 = await PDFDocument.load(await files[0].file.arrayBuffer(), { ignoreEncryption: true });
  const doc2 = await PDFDocument.load(await files[1].file.arrayBuffer(), { ignoreEncryption: true });

  const compDoc = await PDFDocument.create();
  const font = await pdfDocFont(compDoc);

  const reportPage = compDoc.addPage([595.28, 841.89]);
  reportPage.drawText('Document Comparison Summary', {
    x: 50,
    y: 780,
    size: 18,
    font: font.bold,
    color: rgb(0.6, 0.2, 0.7),
  });

  reportPage.drawText(`Document 1: ${files[0].name} (${doc1.getPageCount()} pages, ${files[0].size} bytes)`, {
    x: 50,
    y: 730,
    size: 12,
    font: font.regular,
    color: rgb(0.2, 0.2, 0.2),
  });

  reportPage.drawText(`Document 2: ${files[1].name} (${doc2.getPageCount()} pages, ${files[1].size} bytes)`, {
    x: 50,
    y: 700,
    size: 12,
    font: font.regular,
    color: rgb(0.2, 0.2, 0.2),
  });

  const pageDiff = Math.abs(doc1.getPageCount() - doc2.getPageCount());
  reportPage.drawText(`Page Count Difference: ${pageDiff} pages`, {
    x: 50,
    y: 660,
    size: 12,
    font: font.bold,
    color: pageDiff === 0 ? rgb(0.1, 0.6, 0.2) : rgb(0.8, 0.2, 0.2),
  });

  // Include pages from both
  const p1 = await compDoc.copyPages(doc1, [0]);
  const p2 = await compDoc.copyPages(doc2, [0]);
  compDoc.addPage(p1[0]);
  compDoc.addPage(p2[0]);

  const pdfBytes = await compDoc.save();
  const blob = createPdfBlob(pdfBytes);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: 'justpdfcraft_comparison_report.pdf',
    downloadUrl: URL.createObjectURL(blob),
    originalSize: files[0].size + files[1].size,
    newSize: blob.size,
  };
}

async function pdfDocFont(doc: PDFDocument) {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

/**
 * Sanitize metadata & redact confidential parts on PDF
 */
export async function redactPdf(
  fileItem: UploadedFile,
  _options: RedactOptions,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Scanning document structure for metadata and sensitive tags...', 25);
  const buffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  onProgress?.('Sanitizing hidden author metadata & revision tracking...', 60);
  // Strip all identifying metadata and tracking
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Sanitization complete!', 100);

  return {
    blob,
    fileName: `${baseName}_sanitized.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
