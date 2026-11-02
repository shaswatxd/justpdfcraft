/**
 * JustPDFCraft — High-Performance N-Up Multi-Page Layout Engine
 * 
 * Arranges 2, 4, 6, 8, or 9 pages onto a single sheet for:
 * - Lecture slide handouts (2-up or 4-up)
 * - Exam cheat sheets & summary guides
 * - Eco-friendly document printing
 * 
 * 100% Client-Side via pdf-lib. Zero cloud uploads.
 */

import { PDFDocument, rgb } from 'pdf-lib';
import { getPDFEngine } from './engine.factory';
import { PDFEngine } from './engine.interface';

export type NUpLayout = '2-up' | '4-up' | '6-up' | '8-up' | '9-up';
export type NUpPageSize = 'A4' | 'Letter' | 'Legal';
export type NUpOrientation = 'auto' | 'portrait' | 'landscape';

export interface NUpOptions {
  layout: NUpLayout;
  pageSize?: NUpPageSize;
  orientation?: NUpOrientation;
  margin?: number; // Outer margins in points (default: 24)
  spacing?: number; // Space between sub-pages in points (default: 12)
  drawBorder?: boolean; // Draw subtle border around each sub-page
  pageIndices?: number[]; // Subset of pages to include (default: all)
  onProgress?: (completedSheets: number, totalSheets: number) => void;
}

const PAGE_SIZE_POINTS: Record<NUpPageSize, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

interface GridDimension {
  cols: number;
  rows: number;
  preferredOrientation: 'portrait' | 'landscape';
}

const LAYOUT_SPECS: Record<NUpLayout, GridDimension> = {
  '2-up': { cols: 2, rows: 1, preferredOrientation: 'landscape' },
  '4-up': { cols: 2, rows: 2, preferredOrientation: 'landscape' },
  '6-up': { cols: 3, rows: 2, preferredOrientation: 'landscape' },
  '8-up': { cols: 4, rows: 2, preferredOrientation: 'landscape' },
  '9-up': { cols: 3, rows: 3, preferredOrientation: 'portrait' },
};

/**
 * Transforms an existing PDF into an N-Up multi-page per sheet document.
 */
export async function createNUpPdf(
  documentId: string,
  options: NUpOptions,
  customEngine?: PDFEngine
): Promise<Uint8Array> {
  const engine = customEngine || getPDFEngine();
  const sourceBytes = await engine.saveDocument(documentId);
  const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });

  const totalPages = srcDoc.getPageCount();
  const targetIndices =
    options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

  if (targetIndices.length === 0) {
    throw new Error('No valid pages selected for N-Up layout.');
  }

  const spec = LAYOUT_SPECS[options.layout] || LAYOUT_SPECS['4-up'];
  const pagesPerSheet = spec.cols * spec.rows;
  const totalSheets = Math.ceil(targetIndices.length / pagesPerSheet);

  const outDoc = await PDFDocument.create();

  // Determine Sheet Dimensions based on size and orientation
  const baseDims = PAGE_SIZE_POINTS[options.pageSize || 'A4'];
  const targetOrientation =
    options.orientation === 'auto' || !options.orientation
      ? spec.preferredOrientation
      : options.orientation;

  const [sheetWidth, sheetHeight] =
    targetOrientation === 'landscape'
      ? [Math.max(baseDims[0], baseDims[1]), Math.min(baseDims[0], baseDims[1])]
      : [Math.min(baseDims[0], baseDims[1]), Math.max(baseDims[0], baseDims[1])];

  const margin = options.margin ?? 24;
  const spacing = options.spacing ?? 12;

  const availableWidth = sheetWidth - 2 * margin - (spec.cols - 1) * spacing;
  const availableHeight = sheetHeight - 2 * margin - (spec.rows - 1) * spacing;

  const cellWidth = availableWidth / spec.cols;
  const cellHeight = availableHeight / spec.rows;

  // Embed source pages into the output document
  const srcPages = srcDoc.getPages();
  const embeddedPages = await outDoc.embedPages(srcPages);

  for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
    const sheet = outDoc.addPage([sheetWidth, sheetHeight]);
    const startPageIdx = sheetIdx * pagesPerSheet;
    const endPageIdx = Math.min(startPageIdx + pagesPerSheet, targetIndices.length);

    for (let i = startPageIdx; i < endPageIdx; i++) {
      const pageIndexInSheet = i - startPageIdx;
      const col = pageIndexInSheet % spec.cols;
      const row = Math.floor(pageIndexInSheet / spec.cols);

      const srcPageNum = targetIndices[i];
      const embeddedPage = embeddedPages[srcPageNum];
      if (!embeddedPage) continue;

      const origW = embeddedPage.width;
      const origH = embeddedPage.height;

      // Maintain aspect ratio inside cell
      const scale = Math.min(cellWidth / origW, cellHeight / origH);
      const drawW = origW * scale;
      const drawH = origH * scale;

      // Position: top-to-bottom, left-to-right (PDF coordinate system is bottom-up)
      const cellLeft = margin + col * (cellWidth + spacing);
      const cellTop = sheetHeight - margin - row * (cellHeight + spacing);
      const cellBottom = cellTop - cellHeight;

      const drawX = cellLeft + (cellWidth - drawW) / 2;
      const drawY = cellBottom + (cellHeight - drawH) / 2;

      sheet.drawPage(embeddedPage, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });

      // Optional neat frame around the miniature slide/page
      if (options.drawBorder) {
        sheet.drawRectangle({
          x: drawX,
          y: drawY,
          width: drawW,
          height: drawH,
          borderWidth: 0.5,
          borderColor: rgb(0.82, 0.84, 0.88),
        });
      }
    }

    if (options.onProgress) {
      options.onProgress(sheetIdx + 1, totalSheets);
    }

    // Yield control to UI thread
    if (totalSheets > 1) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return outDoc.save();
}
