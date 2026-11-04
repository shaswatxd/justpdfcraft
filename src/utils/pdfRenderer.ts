import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configure worker using local bundled asset (with fallback)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Creates a defensive copy of byte buffer so PDF.js worker transfers
 * never detach the caller's ArrayBuffer.
 */
export function getSafeBuffer(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy;
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(new Uint8Array(data));
  return copy;
}

/**
 * Get the total number of pages in a PDF
 */
export async function getPdfPageCount(data: ArrayBuffer | Uint8Array): Promise<number> {
  const loadingTask = pdfjsLib.getDocument({ data: getSafeBuffer(data) });
  const pdf = await loadingTask.promise;
  const count = pdf.numPages;
  await pdf.destroy();
  return count;
}

/**
 * Render a single PDF page into an HTMLCanvasElement
 */
export async function renderPdfPageToCanvas(
  data: ArrayBuffer | Uint8Array,
  pageNumber: number,
  scale: number = 1.0,
  rotationOffset: number = 0
): Promise<HTMLCanvasElement> {
  const loadingTask = pdfjsLib.getDocument({ data: getSafeBuffer(data) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageNumber);

    const rotation = (page.rotate + rotationOffset) % 360;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas;
  } finally {
    await pdf.destroy();
  }
}

/**
 * Render page as image data URL (thumbnail)
 */
export async function renderPdfThumbnail(
  data: ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  maxWidth: number = 220,
  rotationOffset: number = 0
): Promise<string> {
  let pdf: any = null;
  try {
    const loadingTask = pdfjsLib.getDocument({ data: getSafeBuffer(data) });
    pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const rotation = (page.rotate + rotationOffset) % 360;
    const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
    const scale = maxWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Error rendering thumbnail:', error);
    // Return a fallback SVG placeholder
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="220" viewBox="0 0 160 220"><rect width="100%" height="100%" fill="%23f1f1f1"/><text x="50%" y="50%" fill="%23888" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">Page ${pageNumber}</text></svg>`;
  } finally {
    if (pdf) {
      await pdf.destroy().catch(() => {});
    }
  }
}

/**
 * Render all pages of a PDF as thumbnail data URLs
 */
export async function renderAllPagesThumbnails(
  data: ArrayBuffer | Uint8Array,
  maxWidth: number = 200,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const loadingTask = pdfjsLib.getDocument({ data: getSafeBuffer(data) });
  const pdf = await loadingTask.promise;
  const thumbnails: string[] = [];

  try {
    const numPages = pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0, rotation: page.rotate });
      const scale = maxWidth / unscaledViewport.width;
      const viewport = page.getViewport({ scale, rotation: page.rotate });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.85));
      }
      if (onProgress) onProgress(i, numPages);
    }
    return thumbnails;
  } finally {
    await pdf.destroy().catch(() => {});
  }
}
