/**
 * JustPDFCraft — High-Performance Mini Xerox / Pocket Notes PDF Engine
 * 
 * Specifically engineered for student exam revision, photocopy shops, and compact pocket booklets:
 * - Multi-document merging: combine multiple chapter PDFs into one pocket booklet
 * - Direct text / notes chits mode: paste notes & adjust font size (chota / bada)
 * - 4-in-1, 6-in-1, 8-in-1, 9-in-1, 16-in-1, and 25-in-1 (5x5 Ultra Micro Farra)
 * - Z-Order (Horizontal) & N-Order (Vertical column-first for scissor stacking)
 * - Auto-Rotate pages by 90° to eliminate white space & maximize text size
 * - Custom page range filter (e.g. '1-10', 'odd', 'even', 'all')
 * - Content zoom & auto-margin trimming to maximize text legibility
 * - Scissor cutting guidelines (dashed lines) for paper-cutter slicing
 * - Sequential mini-page numbering badges (#1, #2...) so sliced cards stay in order
 * - Duplex cut-safe alignment for double-sided printing
 * - 100% Client-Side via WebAssembly & pdf-lib (zero server uploads)
 */

import {
  PDFDocument,
  rgb,
  StandardFonts,
  LineCapStyle,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from 'pdf-lib';
import { getPDFEngine } from './engine.factory';

export type MiniXeroxLayout = '4-in-1' | '6-in-1' | '8-in-1' | '9-in-1' | '16-in-1' | '25-in-1';
export type MiniXeroxPageSize = 'A4' | 'Letter' | 'Legal';
export type MiniXeroxOrientation = 'auto' | 'portrait' | 'landscape';
export type MiniXeroxPageOrder = 'horizontal' | 'vertical';

export interface MiniXeroxOptions {
  layout: MiniXeroxLayout;
  pageSize?: MiniXeroxPageSize;
  orientation?: MiniXeroxOrientation;
  pageOrder?: MiniXeroxPageOrder;   // 'horizontal' (Z-order) or 'vertical' (N-order column-first)
  autoRotate?: boolean;             // Auto-rotate page 90° if it fills the cell better
  pageRange?: string;               // e.g. 'all', '1-10', 'odd', 'even'
  drawCutGuides?: boolean;          // Dashed scissor lines between cells
  drawBorders?: boolean;            // Thin outer border around each mini-page
  drawPageNumbers?: boolean;        // Sequential '#1', '#2' badge on each mini page
  duplexCutSafe?: boolean;          // Mirror columns on even sheets for back-to-back cutting
  contentZoom?: number;             // Zoom factor to expand content & trim outer white margins (e.g. 1.0 - 1.4)
  trimMargins?: boolean;            // Crop 10% outer whitespace margins so text is bigger
  margin?: number;                  // Outer sheet margin in points (default: 14)
  spacing?: number;                 // Gap between mini pages in points (default: 4)
  cellPadding?: number;             // Inner safety padding per cell to avoid cut line collision (default: 2.5)
  onProgress?: (currentSheet: number, totalSheets: number, status: string) => void;
}

export interface NotesChitsOptions {
  text: string;
  fontSize?: number;             // Chota/Bada text control (e.g. 5 to 14 pt, default: 7.5)
  layout?: MiniXeroxLayout;      // Grid per page (default: '16-in-1')
  columnsPerChit?: 1 | 2 | 3;    // Multi-column text flow inside each micro chit (default: 2)
  pageSize?: MiniXeroxPageSize;  // A4 / Letter / Legal
  drawCutGuides?: boolean;       // Dashed scissor lines
  drawPageNumbers?: boolean;     // '#1', '#2' badges
  drawBorders?: boolean;         // Outer cell borders
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
  '25-in-1': { cols: 5, rows: 5, preferredOrientation: 'portrait', paperSavings: '96.0%' },
};

export interface SourcePageReference {
  docIndex: number;
  pageIndex: number;
  width: number;
  height: number;
}

/**
 * Parses user page range syntax: e.g. "all", "1-10", "1, 3, 5-8", "odd", "even"
 */
export function parsePageRange(rangeStr: string | undefined, maxPages: number): number[] {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: maxPages }, (_, i) => i);
  }
  const pages = new Set<number>();
  const parts = rangeStr.split(/[,;s]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === 'odd') {
      for (let i = 0; i < maxPages; i += 2) pages.add(i);
    } else if (trimmed.toLowerCase() === 'even') {
      for (let i = 1; i < maxPages; i += 2) pages.add(i);
    } else if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let p = min; p <= max; p++) pages.add(p - 1);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num - 1);
      }
    }
  }
  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: maxPages }, (_, i) => i);
}

/**
 * Fallback page rasterizer via PDF.js if direct stream embedding encounters unknown filters.
 */
async function renderPageFallback(
  docBytes: Uint8Array,
  pageIndex: number
): Promise<{ imageBytes: Uint8Array; width: number; height: number } | null> {
  try {
    if (typeof window === 'undefined') return null;
    const pdfjsLib = await import('pdfjs-dist');
    const loadingTask = pdfjsLib.getDocument({ data: docBytes.slice() });
    const pdfDoc = await loadingTask.promise;
    const page = await pdfDoc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const u8 = new Uint8Array(binary.length);
    for (let k = 0; k < binary.length; k++) u8[k] = binary.charCodeAt(k);
    return {
      imageBytes: u8,
      width: viewport.width / 2.0,
      height: viewport.height / 2.0,
    };
  } catch (err) {
    console.warn('Fallback rendering failed for page:', err);
    return null;
  }
}

/**
 * Creates a Mini Xerox PDF from one or more PDF documents.
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
  const rawPageRefs: { docIndex: number; pageIndex: number; originalDoc: PDFDocument }[] = [];

  for (let dIdx = 0; dIdx < docBuffers.length; dIdx++) {
    const buf = docBuffers[dIdx];
    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true, throwOnInvalidObject: false });
      loadedDocs.push(doc);
      const count = doc.getPageCount();
      for (let pIdx = 0; pIdx < count; pIdx++) {
        rawPageRefs.push({ docIndex: dIdx, pageIndex: pIdx, originalDoc: doc });
      }
    } catch (err: any) {
      console.warn(`Failed to parse source document #${dIdx + 1}:`, err);
    }
  }

  if (rawPageRefs.length === 0) {
    throw new Error('No valid pages found in provided document(s).');
  }

  // Filter with pageRange if specified
  const filteredIndices = parsePageRange(options.pageRange, rawPageRefs.length);
  const allPageRefs = filteredIndices.map((idx) => rawPageRefs[idx]);

  if (allPageRefs.length === 0) {
    throw new Error('No pages match the specified page range.');
  }

  const spec = MINI_XEROX_LAYOUTS[options.layout] || MINI_XEROX_LAYOUTS['16-in-1'];
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

  const margin = options.margin ?? 14;
  const spacing = options.spacing ?? 4;

  const availableWidth = sheetWidth - 2 * margin - (spec.cols - 1) * spacing;
  const availableHeight = sheetHeight - 2 * margin - (spec.rows - 1) * spacing;

  const cellWidth = availableWidth / spec.cols;
  const cellHeight = availableHeight / spec.rows;

  const contentZoom = Math.max(
    0.6,
    Math.min(
      options.contentZoom !== undefined
        ? options.contentZoom
        : options.trimMargins
        ? 1.08
        : 1.0,
      1.4
    )
  );

  const cellPadding = options.cellPadding ?? (spacing === 0 ? 1.5 : 2.5);
  const availCellW = Math.max(10, cellWidth - 2 * cellPadding);
  const availCellH = Math.max(10, cellHeight - 2 * cellPadding);

  // 3. Cache embedded pages to avoid redundant embedding
  const embeddedPageCache = new Map<string, any>();
  const embeddedJpgCache = new Map<string, { img: any; width: number; height: number }>();

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
      
      let row = 0;
      let col = 0;

      if (options.pageOrder === 'vertical') {
        // N-Order (Down column first, then next column - ideal for cutting into strips & stacking)
        col = Math.floor(posOnSheet / spec.rows);
        row = posOnSheet % spec.rows;
      } else {
        // Z-Order (Across rows first - standard reading order)
        row = Math.floor(posOnSheet / spec.cols);
        col = posOnSheet % spec.cols;
      }

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
      let embeddedJpg = embeddedJpgCache.get(cacheKey);

      if (!embeddedPage && !embeddedJpg) {
        try {
          const [embedded] = await outDoc.embedPages([pageRef.originalDoc.getPage(pageRef.pageIndex)]);
          embeddedPage = embedded;
          embeddedPageCache.set(cacheKey, embeddedPage);
        } catch (embedErr) {
          console.warn(`Direct embedPages failed on page #${pageNumberInDoc}, using high-res rasterizer fallback:`, embedErr);
          const fallbackRes = await renderPageFallback(docBuffers[pageRef.docIndex], pageRef.pageIndex);
          if (fallbackRes) {
            const img = await outDoc.embedJpg(fallbackRes.imageBytes);
            embeddedJpg = { img, width: fallbackRes.width, height: fallbackRes.height };
            embeddedJpgCache.set(cacheKey, embeddedJpg);
          } else {
            throw embedErr;
          }
        }
      }

      const origWidth = embeddedPage ? embeddedPage.width : embeddedJpg!.width;
      const origHeight = embeddedPage ? embeddedPage.height : embeddedJpg!.height;

      // Check scale without rotation
      const baseScaleNoRot = Math.min(availCellW / origWidth, availCellH / origHeight);

      // Check scale with 90° rotation
      const baseScaleWithRot = Math.min(availCellW / origHeight, availCellH / origWidth);

      // Auto-rotate if enabled and rotation yields >= 12% bigger text
      const shouldRotate = Boolean(options.autoRotate && baseScaleWithRot > baseScaleNoRot * 1.12);

      const chosenBaseScale = shouldRotate ? baseScaleWithRot : baseScaleNoRot;
      const effectiveScale = chosenBaseScale * contentZoom;
      const fittedWidth = (shouldRotate ? origHeight : origWidth) * effectiveScale;
      const fittedHeight = (shouldRotate ? origWidth : origHeight) * effectiveScale;

      // Center within the cell (accounting for inner padding)
      const drawX = cellX + cellPadding + (availCellW - fittedWidth) / 2;
      const drawY = cellY + cellPadding + (availCellH - fittedHeight) / 2;

      // HARD PDF CELL CLIPPING:
      // Strictly clip any graphics to the bounds of [cellX, cellY, cellWidth, cellHeight]
      // to guarantee zero bleed across scissor cut lines or sheet boundaries.
      outPage.pushOperators(
        pushGraphicsState(),
        rectangle(cellX, cellY, cellWidth, cellHeight),
        clip(),
        endPath()
      );

      // Embed the mini-page
      if (embeddedPage) {
        if (shouldRotate) {
          outPage.drawPage(embeddedPage, {
            x: drawX + fittedWidth,
            y: drawY,
            xScale: effectiveScale,
            yScale: effectiveScale,
            rotate: degrees(90),
          });
        } else {
          outPage.drawPage(embeddedPage, {
            x: drawX,
            y: drawY,
            xScale: effectiveScale,
            yScale: effectiveScale,
          });
        }
      } else if (embeddedJpg) {
        outPage.drawImage(embeddedJpg.img, {
          x: drawX,
          y: drawY,
          width: fittedWidth,
          height: fittedHeight,
        });
      }

      // Restore graphics state before drawing borders, badges, and guides
      outPage.pushOperators(popGraphicsState());

      // Optional cell border
      if (options.drawBorders) {
        outPage.drawRectangle({
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
          borderColor: rgb(0.72, 0.74, 0.78),
          borderWidth: 0.5,
        });
      }

      // Optional sequential page numbering badge (#1, #2...)
      if (options.drawPageNumbers && badgeFont) {
        const badgeText = `#${pageNumberInDoc}`;
        const fontSize = Math.max(5.5, Math.min(8.5, Math.floor(cellHeight * 0.075)));
        const textWidth = badgeFont.widthOfTextAtSize(badgeText, fontSize);
        const padX = 2.5;
        const padY = 1.5;
        const badgeW = textWidth + padX * 2;
        const badgeH = fontSize + padY * 2;

        const badgeX = cellX + 1.5;
        const badgeY = cellY + cellHeight - badgeH - 1.5;

        // Background pill
        outPage.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: badgeW,
          height: badgeH,
          color: rgb(0.96, 0.96, 0.98),
          borderColor: rgb(0.8, 0.82, 0.86),
          borderWidth: 0.5,
        });

        // Badge text
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

/**
 * Creates an ultra-compact Cheat Sheet / Pocket Farra PDF directly from typed/pasted notes.
 * Automatically flows text through multi-column micro-chits with exact font size control.
 */
export async function createNotesChitsPdf(options: NotesChitsOptions): Promise<Uint8Array> {
  const inputText = (options.text || '').trim();
  if (!inputText) {
    throw new Error('Please enter or paste your notes/formulas text.');
  }

  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

  const spec = MINI_XEROX_LAYOUTS[options.layout || '16-in-1'];
  const [sheetWidth, sheetHeight] = PAGE_SIZE_POINTS[options.pageSize || 'A4'];

  const margin = 14;
  const spacing = 4;
  const availableWidth = sheetWidth - 2 * margin - (spec.cols - 1) * spacing;
  const availableHeight = sheetHeight - 2 * margin - (spec.rows - 1) * spacing;

  const cellWidth = availableWidth / spec.cols;
  const cellHeight = availableHeight / spec.rows;

  const fontSize = Math.max(5, Math.min(options.fontSize || 7.5, 14));
  const lineHeight = fontSize * 1.25;
  const columnsPerChit = options.columnsPerChit || 2;
  const chitInternalMargin = 4;
  const colGap = 3;
  const printableChitWidth = cellWidth - 2 * chitInternalMargin;
  const singleColWidth = (printableChitWidth - (columnsPerChit - 1) * colGap) / columnsPerChit;
  const printableChitHeight = cellHeight - 2 * chitInternalMargin - 6; // leave room for badge
  const maxLinesPerColumn = Math.max(3, Math.floor(printableChitHeight / lineHeight));

  // 1. Break text into wrapped lines for the chit column width
  const rawParagraphs = inputText.split('\n');
  const wrappedLines: { text: string; isHeader: boolean }[] = [];

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      wrappedLines.push({ text: '', isHeader: false });
      continue;
    }

    const isHeader = /^#|^[A-Z0-9\s\-_:]{3,30}$/.test(trimmed) && trimmed.length < 35;
    const activeFont = isHeader ? boldFont : font;

    const words = trimmed.replace(/^#+\s*/, '').split(' ');
    let curLine = '';

    for (const w of words) {
      const testLine = curLine ? `${curLine} ${w}` : w;
      const textW = activeFont.widthOfTextAtSize(testLine, fontSize);
      if (textW > singleColWidth && curLine) {
        wrappedLines.push({ text: curLine, isHeader });
        curLine = w;
      } else {
        curLine = testLine;
      }
    }
    if (curLine) {
      wrappedLines.push({ text: curLine, isHeader });
    }
  }

  // 2. Flow lines into chits (each chit has columnsPerChit columns)
  const linesPerChit = maxLinesPerColumn * columnsPerChit;
  const totalChits = Math.max(1, Math.ceil(wrappedLines.length / linesPerChit));
  const chitsPerSheet = spec.cols * spec.rows;
  const totalSheets = Math.ceil(totalChits / chitsPerSheet);

  options.onProgress?.(0, totalSheets, `Typesetting ${wrappedLines.length} lines into ${totalChits} pocket slips...`);

  let currentLineIdx = 0;

  for (let sIdx = 0; sIdx < totalSheets; sIdx++) {
    const page = outDoc.addPage([sheetWidth, sheetHeight]);

    for (let cIdx = 0; cIdx < chitsPerSheet; cIdx++) {
      const overallChitIdx = sIdx * chitsPerSheet + cIdx;
      if (overallChitIdx >= totalChits) break;

      const row = Math.floor(cIdx / spec.cols);
      const col = cIdx % spec.cols;

      const cellX = margin + col * (cellWidth + spacing);
      const cellY = sheetHeight - margin - (row + 1) * cellHeight - row * spacing;

      // Draw cell border
      if (options.drawBorders !== false) {
        page.drawRectangle({
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
          borderColor: rgb(0.72, 0.74, 0.78),
          borderWidth: 0.5,
        });
      }

      // Draw sequential chit badge (#1, #2...)
      if (options.drawPageNumbers !== false) {
        const badgeText = `#${overallChitIdx + 1}`;
        const bSize = Math.max(5.5, Math.min(8, fontSize * 0.9));
        const bWidth = boldFont.widthOfTextAtSize(badgeText, bSize);
        page.drawText(badgeText, {
          x: cellX + cellWidth - bWidth - 3,
          y: cellY + 2.5,
          size: bSize,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.3),
        });
      }

      // Draw text columns inside this chit
      for (let c = 0; c < columnsPerChit; c++) {
        const colStartX = cellX + chitInternalMargin + c * (singleColWidth + colGap);
        let startY = cellY + cellHeight - chitInternalMargin - lineHeight;

        for (let l = 0; l < maxLinesPerColumn; l++) {
          if (currentLineIdx >= wrappedLines.length) break;
          const lineObj = wrappedLines[currentLineIdx++];

          if (lineObj.text) {
            const fontToUse = lineObj.isHeader ? boldFont : font;
            const colorToUse = lineObj.isHeader ? rgb(0.65, 0.1, 0.1) : rgb(0.1, 0.1, 0.12);

            page.drawText(lineObj.text, {
              x: colStartX,
              y: startY,
              size: fontSize,
              font: fontToUse,
              color: colorToUse,
            });
          }
          startY -= lineHeight;
        }
      }
    }

    // Draw scissor cut lines if enabled
    if (options.drawCutGuides !== false) {
      const guideColor = rgb(0.75, 0.78, 0.82);
      const dashArray = [4, 4];

      for (let c = 1; c < spec.cols; c++) {
        const cutX = margin + c * cellWidth + (c - 0.5) * spacing;
        page.drawLine({
          start: { x: cutX, y: margin * 0.5 },
          end: { x: cutX, y: sheetHeight - margin * 0.5 },
          color: guideColor,
          thickness: 0.5,
          dashArray,
          lineCap: LineCapStyle.Round,
        });
      }

      for (let r = 1; r < spec.rows; r++) {
        const cutY = sheetHeight - margin - r * cellHeight - (r - 0.5) * spacing;
        page.drawLine({
          start: { x: margin * 0.5, y: cutY },
          end: { x: sheetWidth - margin * 0.5, y: cutY },
          color: guideColor,
          thickness: 0.5,
          dashArray,
          lineCap: LineCapStyle.Round,
        });
      }
    }

    options.onProgress?.(sIdx + 1, totalSheets, `Typeset Sheet ${sIdx + 1} of ${totalSheets}...`);
  }

  return await outDoc.save();
}
