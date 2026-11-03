import JSZip from 'jszip';
import { UploadedFile, ProcessResult, PdfToJpgOptions } from '../types/pdf';
import { getPdfPageCount, renderPdfPageToCanvas } from '../utils/pdfRenderer';

export async function convertPdfToJpg(
  fileItem: UploadedFile,
  options: PdfToJpgOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Reading PDF pages...', 10);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pageCount = await getPdfPageCount(arrayBuffer);

  const format = options.format || 'jpg';
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format === 'png' ? 'png' : 'jpg';
  const baseName = fileItem.name.replace(/\.pdf$/i, '');
  const scale = options.quality || 1.5; // High resolution rendering

  if (pageCount === 1) {
    onProgress?.('Rendering page to high-resolution image...', 50);
    const canvas = await renderPdfPageToCanvas(arrayBuffer, 1, scale);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to render canvas to blob'));
      }, mimeType, 0.95);
    });

    const downloadUrl = URL.createObjectURL(blob);
    onProgress?.('Complete!', 100);

    return {
      blob,
      fileName: `${baseName}_page_1.${extension}`,
      downloadUrl,
      originalSize: fileItem.size,
      newSize: blob.size,
      isZip: false,
    };
  }

  // Multi-page: render all and package into a ZIP archive
  const zip = new JSZip();

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(`Rendering page ${i} of ${pageCount}...`, 15 + Math.round((i / pageCount) * 70));
    const canvas = await renderPdfPageToCanvas(arrayBuffer, i, scale);
    const imageBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error(`Failed to render page ${i}`));
      }, mimeType, 0.95);
    });

    const imgBuffer = await imageBlob.arrayBuffer();
    zip.file(`${baseName}_page_${i}.${extension}`, imgBuffer);
  }

  onProgress?.('Packaging images into ZIP archive...', 90);
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(zipBlob);

  onProgress?.('Complete!', 100);

  return {
    blob: zipBlob,
    fileName: `${baseName}_images.zip`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: zipBlob.size,
    isZip: true,
  };
}
