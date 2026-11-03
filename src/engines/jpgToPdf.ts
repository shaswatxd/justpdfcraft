import { PDFDocument } from 'pdf-lib';
import { UploadedFile, ProcessResult, JpgToPdfOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

// Standard A4 dimensions in PDF points (72 points per inch)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

/**
 * Converts image file to clean JPEG/PNG bytes via canvas
 */
async function getImageBytesAndType(file: File): Promise<{ bytes: Uint8Array; type: 'jpeg' | 'png' }> {
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    const buffer = await file.arrayBuffer();
    return { bytes: new Uint8Array(buffer), type: 'jpeg' };
  }
  if (file.type === 'image/png') {
    const buffer = await file.arrayBuffer();
    return { bytes: new Uint8Array(buffer), type: 'png' };
  }

  // For WebP or other image formats, render to canvas and convert to JPEG
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        blob.arrayBuffer().then((buf) => {
          resolve({ bytes: new Uint8Array(buf), type: 'jpeg' });
        });
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export async function convertJpgToPdf(
  files: UploadedFile[],
  options: JpgToPdfOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  if (files.length === 0) throw new Error('No images selected.');

  onProgress?.('Creating new PDF document...', 10);
  const pdfDoc = await PDFDocument.create();
  let totalOriginalSize = 0;

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    totalOriginalSize += item.size;
    onProgress?.(`Embedding image ${i + 1} of ${files.length}...`, 20 + Math.round((i / files.length) * 65));

    const { bytes, type } = await getImageBytesAndType(item.file);
    const embeddedImage = type === 'jpeg' ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);

    let pageWidth = A4_WIDTH;
    let pageHeight = A4_HEIGHT;

    if (options.orientation === 'landscape') {
      pageWidth = A4_HEIGHT;
      pageHeight = A4_WIDTH;
    }

    if (options.pageSize === 'fit') {
      pageWidth = embeddedImage.width;
      pageHeight = embeddedImage.height;
    }

    const margin = options.margin === 'none' ? 0 : options.margin === 'small' ? 20 : 40;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    const scale = Math.min(availableWidth / embeddedImage.width, availableHeight / embeddedImage.height, 1.0);
    const drawWidth = embeddedImage.width * scale;
    const drawHeight = embeddedImage.height * scale;

    const x = margin + (availableWidth - drawWidth) / 2;
    const y = margin + (availableHeight - drawHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  onProgress?.('Finalizing PDF...', 90);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: 'justpdfcraft_converted.pdf',
    downloadUrl,
    originalSize: totalOriginalSize,
    newSize: blob.size,
  };
}
