import { PDFDocument, degrees } from 'pdf-lib';
import { UploadedFile, ProcessResult } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function mergePdfs(
  files: UploadedFile[],
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  if (files.length < 2) {
    throw new Error('At least two PDF files are required to merge.');
  }

  onProgress?.('Initializing merge document...', 10);
  const mergedPdf = await PDFDocument.create();
  let totalOriginalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    totalOriginalSize += item.size;
    onProgress?.(`Processing "${item.name}" (${i + 1}/${files.length})...`, 15 + Math.round((i / files.length) * 70));

    const arrayBuffer = await item.file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

    for (const page of copiedPages) {
      if (item.rotation) {
        const currentRot = page.getRotation().angle;
        page.setRotation(degrees((currentRot + item.rotation) % 360));
      }
      mergedPdf.addPage(page);
    }
  }

  onProgress?.('Generating final merged PDF...', 90);
  const pdfBytes = await mergedPdf.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: 'justpdfcraft_merged.pdf',
    downloadUrl,
    originalSize: totalOriginalSize,
    newSize: blob.size,
  };
}
