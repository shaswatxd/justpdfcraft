/**
 * JustPDFCraft — High-Performance Mini Xerox / Pocket Notes PDF Engine
 * 
 * Specifically engineered for student exam revision, photocopy shops, and compact pocket booklets:
 * - Multi-document merging: combine multiple chapter PDFs into one pocket booklet
 * - 4-in-1, 6-in-1, 8-in-1, 9-in-1, and authentic 16-in-1 (4x4) Micro Xerox
 * - Scissor cutting guidelines (dashed lines) for paper-cutter slicing
 * - Sequential mini-page numbering badges (#1, #2...) so sliced cards stay in order
 * - Duplex cut-safe alignment for double-sided printing
 * - 100% Client-Side via WebAssembly & pdf-lib (zero server uploads)
 */

import { PDFDocument, rgb, StandardFonts, LineCapStyle } from 'pdf-lib';
import { getPDFEngine } from './engine.factory';

export type MiniXeroxLayout = '4-in-1' | '6-in-1' | '8-in-1' | '9-in-1' | '16-in-1';
export type MiniXeroxPageSize = 'A4' | 'Letter' | 'Legal';
export type MiniXeroxOrientation = 'auto' | 'portrait' | 'landscape';

export interface MiniXeroxOptions {
  layout: MiniXeroxLayout;
  pageSize?: MiniXeroxPageSize;
  orientation?: MiniXeroxOrientation;
  drawCutGuides?: boolean;       // Dashed scissor lines between cells
  drawBorders?: boolean;         // Thin outer border around each mini-page
  drawPageNumbers?: boolean;     // Sequential '#1', '#2' badge on each mini page
  duplexCutSafe?: boolean;       // Mirror columns on even sheets for back-to-back cutting
  margin?: number;               // Outer sheet margin in points (default: 18)
  spacing?: number;              // Gap between mini pages in points (default: 8)
  onProgress?: (currentSheet: number, totalSheets: number, status: string) => void;
}

const PAGE_SIZE_POINTS: Record<MiniXeroxPageSize, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

interface GridSpec {
  cols: number;
  rows: number;
  preferredOrientation: 'portrait' | 'landscape';
  paperSavings: string;
}

export const MINI_XEROX_LAYOUTS: Record<MiniXeroxLayout, GridSpec> = {
  '4-in-1': { cols: 2, rows: 2, preferredOrientation: 'landscape', paperSavings: '75.0%' },
  '6-in-1': { cols: 3, rows: 2, preferredOrientation: 'landscape', paperSavings: '83.3%' },
  '8-in-1': { cols: 4, rows: 2, preferredOrientation: 'landscape', paperSavings: '87.5%' },
  '9-in-1': { cols: 3, rows: 3, preferredOrientation: 'portrait', paperSavings: '88.9%' },
  '16-in-1': { cols: 4, rows: 4, preferredOrientation: 'portrait', paperSavings: '93.8%' },
};

export interface SourcePageReference {
  docIndex: number;
  pageIndex: number;
  width: number;
  height: number;
}

/**
 * Creates a Mini Xerox PDF from one or more PDF documents.
 * 
 * @param sourceDocuments Array of Uint8Array PDF byte arrays (or single documentId if loading from store)
 * @param options Mini Xerox configuration options
 */
export async function createMiniXeroxPdf(
  sourceDocuments: Uint8Array[] | string,
  options: MiniXeroxOptions
): Promise<Uint8Array> {
  let docBuffers: Uint8Array[] = [];

  if (typeof sourceDocuments === 'string') {
    const engine = getPDFEngine();
    const bytes = await engine.saveDocument(sourceDocuments);
    docBuffers = [bytes];
  } else if (Array.isArray(sourceDocuments) && sourceDocuments.length > 0) {
    docBuffers = sourceDocuments;
  } else {
    throw new Error('Please provide at least one valid PDF document.');
  }

  options.onProgress?.(0, 1, 'Loading source documents...');

  // 1. Load all source documents and catalog total pages
  const loadedDocs: PDFDocument[] = [];
  const allPageRefs: { docIndex: number; pageIndex: number; originalDoc: PDFDocument }[] = [];

  for (let dIdx = 0; dIdx < docBuffers.length; dIdx++) {
    const buf = docBuffers[dIdx];
    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      loadedDocs.push(doc);
      const count = doc.getPageCount();
      for (let pIdx = 0; pIdx < count; pIdx++) {
        allPageRefs.push({ docIndex: dIdx, pageIndex: pIdx, originalDoc: doc });
      }
    } catch (err: any) {
      console.warn(`Failed to parse source document #${dIdx + 1}:`, err);
    }
  }

  if (allPageRefs.length === 0) {
    throw new Error('No valid pages found in provided document(s).');
  }

  const spec = MINI_XEROX_LAYOUTS[options.layout] || MINI_XEROX_LAYOUTS['4-in-1'];
  const pagesPerSheet = spec.cols * spec.rows;
  const totalSheets = Math.ceil(allPageRefs.length / pagesPerSheet);

  options.onProgress?.(0, totalSheets, `Arranging ${allPageRefs.length} pages into ${totalSheets} sheet(s)...`);

  // 2. Prepare Output Document & Fonts
  const outDoc = await PDFDocument.create();
  const badgeFont = options.drawPageNumbers ? await outDoc.embedFont(StandardFonts.HelveticaBold) : null;

  const baseDims = PAGE_SIZE_POINTS[options.pageSize || 'A4'];
  const targetOrientation =
    options.orientation === 'auto' || !options.orientation
      ? spec.preferredOrientation
      : options.orientation;

  const [sheetWidth, sheetHeight] =
    targetOrientation === 'landscape'
      ? [Math.max(baseDims[0], baseDims[1]), Math.min(baseDims[0], baseDims[1])]
      : [Math.min(baseDims[0], baseDims[1]), Math.max(baseDims[0], baseDims[1])];

  const margin = options.margin ?? 18;
  const spacing = options.spacing ?? 8;

  const availableWidth = sheetWidth - 2 * margin - (spec.cols - 1) * spacing;
  const availableHeight = sheetHeight - 2 * margin - (spec.rows - 1) * spacing;

  const cellWidth = availableWidth / spec.cols;
  const cellHeight = availableHeight / spec.rows;

  // 3. Cache embedded pages to avoid redundant embedding
  const embeddedPageCache = new Map<string, any>();

  // 4. Generate each Sheet
  for (let sIdx = 0; sIdx < totalSheets; sIdx++) {
    const isEvenSheet = sIdx % 2 === 1; // 2nd, 4th sheet (for duplex flip alignment)
    const outPage = outDoc.addPage([sheetWidth, sheetHeight]);

    const sheetStartIdx = sIdx * pagesPerSheet;
    const sheetEndIdx = Math.min(sheetStartIdx + pagesPerSheet, allPageRefs.length);

    // Draw individual cells
    for (let i = sheetStartIdx; i < sheetEndIdx; i++) {
      const pageNumberInDoc = i + 1; // 1-based sequential number
      const posOnSheet = i - sheetStartIdx;
      
      const row = Math.floor(posOnSheet / spec.cols);
      let col = posOnSheet % spec.cols;

      // Duplex cut alignment: mirror columns on reverse side so Page 1 back matches Page 2
      if (options.duplexCutSafe && isEvenSheet) {
        col = spec.cols - 1 - col;
      }

      const cellX = margin + col * (cellWidth + spacing);
      // PDF-Lib coordinate system has (0,0) at bottom-left
      const cellY = sheetHeight - margin - (row + 1) * cellHeight - row * spacing;

      const pageRef = allPageRefs[i];
      const cacheKey = `${pageRef.docIndex}_${pageRef.pageIndex}`;
      let embeddedPage = embeddedPageCache.get(cacheKey);

      if (!embeddedPage) {
        const [embedded] = await outDoc.embedPages([pageRef.originalDoc.getPage(pageRef.pageIndex)]);
        embeddedPage = embedded;
        embeddedPageCache.set(cacheKey, embeddedPage);
      }

      // Calculate uniform scale to fit cell preserving aspect ratio
      const scaleX = cellWidth / embeddedPage.width;
      const scaleY = cellHeight / embeddedPage.height;
      const scale = Math.min(scaleX, scaleY);

      const fittedWidth = embeddedPage.width * scale;
      const fittedHeight = embeddedPage.height * scale;

      // Center within the cell
      const drawX = cellX + (cellWidth - fittedWidth) / 2;
      const drawY = cellY + (cellHeight - fittedHeight) / 2;

      // Embed the mini-page
      outPage.drawPage(embeddedPage, {
        x: drawX,
        y: drawY,
        xScale: scale,
        yScale: scale,
      });

      // Optional cell border
      if (options.drawBorders) {
        outPage.drawRectangle({
          x: drawX,
          y: drawY,
          width: fittedWidth,
          height: fittedHeight,
          borderColor: rgb(0.7, 0.72, 0.75),
          borderWidth: 0.6,
        });
      }

      // Optional sequential page numbering badge (#1, #2...)
      if (options.drawPageNumbers && badgeFont) {
        const badgeText = `#${pageNumberInDoc}`;
        const fontSize = Math.max(6, Math.min(9, Math.floor(cellHeight * 0.08)));
        const textWidth = badgeFont.widthOfTextAtSize(badgeText, fontSize);
        const padX = 3;
        const padY = 2;
        const badgeW = textWidth + padX * 2;
        const badgeH = fontSize + padY * 2;

        const badgeX = drawX + fittedWidth - badgeW - 2;
        const badgeY = drawY + 2;

        // Background pill
        outPage.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: badgeW,
          height: badgeH,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.2, 0.2, 0.25),
          borderWidth: 0.5,
          opacity: 0.95,
        });

        // Text
        outPage.drawText(badgeText, {
          x: badgeX + padX,
          y: badgeY + padY + 1,
          size: fontSize,
          font: badgeFont,
          color: rgb(0.1, 0.1, 0.15),
        });
      }
    }

    // Optional Scissor Cutting Guidelines (Dashed lines between rows and columns)
    if (options.drawCutGuides) {
      const guideColor = rgb(0.75, 0.78, 0.82);
      const dashArray = [4, 4];

      // Vertical dashed cut-lines between columns
      for (let c = 1; c < spec.cols; c++) {
        const cutX = margin + c * cellWidth + (c - 0.5) * spacing;
        outPage.drawLine({
          start: { x: cutX, y: margin * 0.5 },
          end: { x: cutX, y: sheetHeight - margin * 0.5 },
          color: guideColor,
          thickness: 0.5,
          dashArray,
          lineCap: LineCapStyle.Round,
        });
      }

      // Horizontal dashed cut-lines between rows
      for (let r = 1; r < spec.rows; r++) {
        const cutY = sheetHeight - margin - r * cellHeight - (r - 0.5) * spacing;
        outPage.drawLine({
          start: { x: margin * 0.5, y: cutY },
          end: { x: sheetWidth - margin * 0.5, y: cutY },
          color: guideColor,
          thickness: 0.5,
          dashArray,
          lineCap: LineCapStyle.Round,
        });
      }
    }

    options.onProgress?.(sIdx + 1, totalSheets, `Rendered Sheet ${sIdx + 1} of ${totalSheets}...`);
  }

  options.onProgress?.(totalSheets, totalSheets, 'Saving final Mini Xerox PDF...');
  return await outDoc.save();
}
