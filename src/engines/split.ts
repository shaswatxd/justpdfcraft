import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { UploadedFile, ProcessResult, SplitOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

/**
 * Parses page range string like "1-3, 5, 7-9" into an array of 0-based page indices
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      if (start <= end) {
        for (let i = start; i <= end; i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export async function splitPdf(
  fileItem: UploadedFile,
  options: SplitOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Reading source PDF...', 15);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();

  if (options.mode === 'extract-all' || options.ranges.trim() === 'all') {
    onProgress?.('Extracting all pages into individual PDFs...', 30);
    const zip = new JSZip();

    for (let i = 0; i < totalPages; i++) {
      onProgress?.(`Extracting page ${i + 1} of ${totalPages}...`, 30 + Math.round((i / totalPages) * 55));
      const singlePdf = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(sourcePdf, [i]);
      singlePdf.addPage(copiedPage);

      const singleBytes = await singlePdf.save();
      const baseName = fileItem.name.replace(/\.pdf$/i, '');
      zip.file(`${baseName}_page_${i + 1}.pdf`, singleBytes);
    }

    onProgress?.('Compressing files into ZIP archive...', 90);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    onProgress?.('Complete!', 100);
    return {
      blob: zipBlob,
      fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_split_pages.zip`,
      downloadUrl,
      originalSize: fileItem.size,
      newSize: zipBlob.size,
      isZip: true
    };
  } else {
    // Range mode
    const pageIndices = parsePageRanges(options.ranges, totalPages);
    if (pageIndices.length === 0) {
      throw new Error(`Invalid page range. The document has ${totalPages} pages.`);
    }

    onProgress?.(`Extracting ${pageIndices.length} pages...`, 40);
    const splitPdfDoc = await PDFDocument.create();
    const copiedPages = await splitPdfDoc.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach(p => splitPdfDoc.addPage(p));

    onProgress?.('Generating extracted PDF...', 85);
    const pdfBytes = await splitPdfDoc.save();
    const blob = createPdfBlob(pdfBytes);
    const downloadUrl = URL.createObjectURL(blob);

    onProgress?.('Complete!', 100);
    return {
      blob,
      fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_extracted.pdf`,
      downloadUrl,
      originalSize: fileItem.size,
      newSize: blob.size,
      isZip: false
    };
  }
}
