import { PDFDocument } from 'pdf-lib';
import { getPDFEngine } from './engine.factory';
import { PDFEngine } from './engine.interface';

export interface GrayscalePdfOptions {
  pageIndices?: number[];
  scale?: number;
  quality?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Transforms an RGBA canvas ImageData array into monochrome/grayscale in-place
 * using ITU-R BT.601 standard luma weighting (Y' = 0.299 R + 0.587 G + 0.114 B).
 */
export function applyGrayscaleToImageData(data: Uint8ClampedArray | number[]): void {
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
}

/**
 * Converts selected pages of a PDF document to 100% monochrome/grayscale PDF.
 * Strips all color ink while preserving page dimensions and aspect ratios.
 */
export async function convertToGrayscalePdf(
  documentId: string,
  options: GrayscalePdfOptions = {},
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
        applyGrayscaleToImageData(imgData.data);
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
      const base64 = renderRes.imageDataUrl.split(',')[1];
      const binaryString = atob(base64);
      imageBytes = new Uint8Array(binaryString.length);
      for (let k = 0; k < binaryString.length; k++) {
        imageBytes[k] = binaryString.charCodeAt(k);
      }
    } else {
      throw new Error(`Failed to render page ${pageIndex + 1} for grayscale conversion`);
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

    // Yield to event loop between pages
    if (targetIndices.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return newPdf.save();
}
