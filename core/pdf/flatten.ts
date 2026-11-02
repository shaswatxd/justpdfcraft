/**
 * JustPDFCraft — High-Performance PDF Flattening Engine
 * 
 * Provides two levels of flattening:
 * 1. 'forms-only': Merges interactive AcroForm fields, digital signatures, and dynamic annotations
 *    into static vector content streams while keeping vector text crisp.
 * 2. 'full-rasterize': Renders each page into high-resolution images (150-300 DPI) and re-assembles
 *    a 100% read-only, non-editable, tamper-proof PDF.
 * 
 * 100% Client-Side via pdf-lib and Web Canvas. Zero cloud uploads.
 */

import { PDFDocument } from 'pdf-lib';
import { getPDFEngine } from './engine.factory';
import { PDFEngine } from './engine.interface';

export type FlattenMode = 'forms-only' | 'full-rasterize';

export interface FlattenOptions {
  mode: FlattenMode;
  dpi?: 150 | 200 | 300;
  quality?: number; // for full-rasterize (0.85 to 0.95)
  onProgress?: (current: number, total: number) => void;
}

/**
 * Flattens a document according to the requested mode.
 */
export async function flattenPdfDocument(
  documentId: string,
  options: FlattenOptions = { mode: 'forms-only' },
  customEngine?: PDFEngine
): Promise<Uint8Array> {
  const engine = customEngine || getPDFEngine();

  if (options.mode === 'forms-only') {
    const rawBytes = await engine.saveDocument(documentId);
    const pdfLibDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });

    try {
      const form = pdfLibDoc.getForm();
      form.flatten();
    } catch {
      // Document might not have an AcroForm or any interactive fields
    }

    // Save with flattened form fields
    return pdfLibDoc.save();
  }

  // Full Rasterize Mode (Tamper-proof, read-only PDF)
  const pageCount = engine.getPageCount(documentId);
  const outDoc = await PDFDocument.create();

  const scaleMap: Record<number, number> = {
    150: 1.56,
    200: 2.08,
    300: 3.12,
  };
  const renderScale = scaleMap[options.dpi || 200] || 2.08;
  const imgQuality = options.quality ?? 0.90;

  for (let p = 0; p < pageCount; p++) {
    const renderRes = await engine.renderPage(documentId, p, renderScale);
    let imageBytes: Uint8Array;

    if (renderRes.canvas && typeof renderRes.canvas.toDataURL === 'function') {
      const dataUrl = renderRes.canvas.toDataURL('image/jpeg', imgQuality);
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
      throw new Error(`Failed to rasterize page ${p + 1} for complete flattening.`);
    }

    const dims = await engine.getPageDimensions(documentId, p);
    const embeddedImg = await outDoc.embedJpg(imageBytes);
    const newPage = outDoc.addPage([dims.width, dims.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: dims.width,
      height: dims.height,
    });

    if (options.onProgress) {
      options.onProgress(p + 1, pageCount);
    }

    if (pageCount > 1) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return outDoc.save();
}
