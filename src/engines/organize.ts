import { PDFDocument, degrees } from 'pdf-lib';
import { UploadedFile, ProcessResult } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export interface PageOrganizeItem {
  pageIndex: number;
  rotation: number;
}

export async function organizePdf(
  fileItem: UploadedFile,
  activePages: PageOrganizeItem[],
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  if (activePages.length === 0) {
    throw new Error('At least one page must be kept.');
  }

  onProgress?.('Loading source document...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.('Reorganizing and re-ordering pages...', 50);
  const newPdf = await PDFDocument.create();

  for (let i = 0; i < activePages.length; i++) {
    const item = activePages[i];
    const [copiedPage] = await newPdf.copyPages(sourcePdf, [item.pageIndex]);

    if (item.rotation) {
      const currentRot = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
    }
    newPdf.addPage(copiedPage);
  }

  onProgress?.('Generating organized PDF...', 85);
  const pdfBytes = await newPdf.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_organized.pdf`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
