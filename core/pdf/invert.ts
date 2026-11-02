/**
 * JustPDFCraft — High-Contrast Dark Mode & Inverted PDF Engine
 * 
 * Inverts page colors (white-on-black) for:
 * - Comfortable nighttime reading without eye strain
 * - OLED battery saving on portable tablets / laptops
 * - Inverted high-contrast printing
 * 
 * 100% Client-Side via Web Canvas and pdf-lib. Zero cloud uploads.
 */

import { PDFDocument } from 'pdf-lib';
import { getPDFEngine } from './engine.factory';
import { PDFEngine } from './engine.interface';

export interface InvertPdfOptions {
  pageIndices?: number[];
  scale?: number;
  quality?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Inverts pixel colors in-place on RGBA canvas ImageData.
 */
export function applyInvertToImageData(data: Uint8ClampedArray | number[]): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];       // Red
    data[i + 1] = 255 - data[i + 1]; // Green
    data[i + 2] = 255 - data[i + 2]; // Blue
    // data[i + 3] (Alpha) is preserved
  }
}

/**
 * Converts a PDF into an inverted Dark-Mode PDF.
 */
export async function convertToInvertedPdf(
  documentId: string,
  options: InvertPdfOptions = {},
  customEngine?: PDFEngine
): Promise<Uint8Array> {
  const engine = customEngine || getPDFEngine();
  const totalDocPages = engine.getPageCount(documentId);
  const targetIndices =
    options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices
      : Array.from({ length: totalDocPages }, (_, i) => i);

  const scale = options.scale ?? 2.0;
  const quality = options.quality ?? 0.88;
  const newPdf = await PDFDocument.create();

  for (let i = 0; i < targetIndices.length; i++) {
    const pageIndex = targetIndices[i];
    const renderRes = await engine.renderPage(documentId, pageIndex, scale);
    const canvas = renderRes.canvas;

    let imageBytes: Uint8Array;

    if (canvas && typeof canvas.getContext === 'function') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyInvertToImageData(imgData.data);
        ctx.putImageData(imgData, 0, 0);
      }
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      imageBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        imageBytes[k] = binaryString.charCodeAt(k);
      }
    } else if (renderRes.imageDataUrl) {
      // In node or mock environment without raw canvas context
      const base64 = renderRes.imageDataUrl.split(',')[1];
      const binaryString = atob(base64);
      imageBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        imageBytes[k] = binaryString.charCodeAt(k);
      }
    } else {
      throw new Error(`Failed to render page ${pageIndex + 1} for dark mode conversion.`);
    }

    const origDims = await engine.getPageDimensions(documentId, pageIndex);
    const embeddedImg = await newPdf.embedJpg(imageBytes);
    const newPage = newPdf.addPage([origDims.width, origDims.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: origDims.width,
      height: origDims.height,
    });

    if (options.onProgress) {
      options.onProgress(i + 1, targetIndices.length);
    }

    if (targetIndices.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return newPdf.save();
}
