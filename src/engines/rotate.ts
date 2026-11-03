import { PDFDocument, degrees } from 'pdf-lib';
import { UploadedFile, ProcessResult, RotateOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

export async function rotatePdf(
  files: UploadedFile[],
  options: RotateOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  const fileItem = files[0];
  if (!fileItem) throw new Error('No file selected.');

  onProgress?.('Loading PDF document...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  onProgress?.('Applying page rotations...', 50);
  pages.forEach((page, index) => {
    const individualOffset = fileItem.pages?.[index]?.rotation || 0;
    const totalRotation = (options.globalRotation + individualOffset) % 360;
    const currentAngle = page.getRotation().angle;
    page.setRotation(degrees((currentAngle + totalRotation) % 360));
  });

  onProgress?.('Saving rotated document...', 80);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_rotated.pdf`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
