import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { UploadedFile, ProcessResult, WatermarkOptions } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';

function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 0.9, g: 0.2, b: 0.2 };
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) return { r: 0.9, g: 0.2, b: 0.2 };
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255,
  };
}

export async function addWatermark(
  fileItem: UploadedFile,
  options: WatermarkOptions,
  onProgress?: (message: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Loading PDF document...', 20);
  const arrayBuffer = await fileItem.file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  const { r, g, b } = hexToRgb(options.color || '#e5322d');
  const rawText = options.text || 'CONFIDENTIAL';
  // Sanitize text for standard PDF WinAnsi font encoding so emojis/unsupported chars don't crash
  const watermarkText = rawText.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
  const fontSize = options.fontSize || 36;
  const opacity = Math.min(Math.max(options.opacity, 0.05), 1.0);
  const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  onProgress?.('Applying watermark to pages...', 50);

  pages.forEach((page, index) => {
    onProgress?.(`Watermarking page ${index + 1} of ${pages.length}...`, 50 + Math.round((index / pages.length) * 35));
    const { width, height } = page.getSize();
    let x = width / 2 - textWidth / 2;
    let y = height / 2 - textHeight / 2;

    switch (options.position) {
      case 'top-left':
        x = 40;
        y = height - 50;
        break;
      case 'top-center':
        x = width / 2 - textWidth / 2;
        y = height - 50;
        break;
      case 'top-right':
        x = width - textWidth - 40;
        y = height - 50;
        break;
      case 'center':
        x = width / 2 - textWidth / 2;
        y = height / 2 - textHeight / 2;
        break;
      case 'bottom-left':
        x = 40;
        y = 50;
        break;
      case 'bottom-center':
        x = width / 2 - textWidth / 2;
        y = 50;
        break;
      case 'bottom-right':
        x = width - textWidth - 40;
        y = 50;
        break;
    }

    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(r, g, b),
      opacity,
      rotate: degrees(options.rotation || 0),
    });
  });

  onProgress?.('Finalizing watermarked PDF...', 90);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const downloadUrl = URL.createObjectURL(blob);

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${fileItem.name.replace(/\.pdf$/i, '')}_watermarked.pdf`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
