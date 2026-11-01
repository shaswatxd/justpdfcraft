import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { unzip } from './unzip';

export interface DocxElement {
  type: 'heading' | 'paragraph';
  text: string;
}

export interface DocxParseResult {
  title: string;
  elements: DocxElement[];
}

export interface XlsxParseResult {
  sheetName: string;
  rows: string[][];
}

export interface PptxSlide {
  slideNumber: number;
  title: string;
  bullets: string[];
}

export interface PptxParseResult {
  title: string;
  slides: PptxSlide[];
}

/**
 * Parses a standard Microsoft Word (.docx) file into structured text elements.
 */
export async function parseDocx(buffer: Uint8Array, fileName?: string): Promise<DocxParseResult> {
  const files = await unzip(buffer);
  const docXmlBytes = files.get('word/document.xml');

  if (!docXmlBytes) {
    throw new Error('Invalid Word document: word/document.xml not found.');
  }

  const xmlText = new TextDecoder('utf-8').decode(docXmlBytes);
  const elements: DocxElement[] = [];

  const pMatches = xmlText.match(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi) || [];

  for (const pXml of pMatches) {
    const isHeading = /<w:pStyle\s+[^>]*w:val="(?:Heading|Title)[^"]*"/i.test(pXml);

    const tMatches = Array.from(pXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)).map((m) => m[1]);
    const cleanText = tMatches
      .join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (cleanText) {
      elements.push({
        type: isHeading ? 'heading' : 'paragraph',
        text: cleanText,
      });
    }
  }

  const defaultTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Word Document';
  const firstHeading = elements.find((e) => e.type === 'heading')?.text;

  return {
    title: firstHeading || defaultTitle,
    elements,
  };
}

/**
 * Parses a standard Microsoft PowerPoint (.pptx) file into slides with bullet points.
 */
export async function parsePptx(buffer: Uint8Array, fileName?: string): Promise<PptxParseResult> {
  const files = await unzip(buffer);
  const slides: PptxSlide[] = [];

  // Match all ppt/slides/slide*.xml entries
  const slideKeys = Array.from(files.keys())
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

  for (let i = 0; i < slideKeys.length; i++) {
    const slideBytes = files.get(slideKeys[i]);
    if (!slideBytes) continue;

    const xml = new TextDecoder('utf-8').decode(slideBytes);
    const pMatches = xml.match(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/gi) || [];
    const lines: string[] = [];

    for (const pXml of pMatches) {
      const tMatches = Array.from(pXml.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi)).map((m) => m[1]);
      const line = tMatches
        .join('')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();

      if (line) lines.push(line);
    }

    if (lines.length > 0) {
      slides.push({
        slideNumber: i + 1,
        title: lines[0],
        bullets: lines.slice(1),
      });
    }
  }

  const defaultTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Presentation Slides';

  return {
    title: slides[0]?.title || defaultTitle,
    slides,
  };
}

/**
 * Parses a standard Microsoft Excel (.xlsx) file into 2D table data.
 */
export async function parseXlsx(buffer: Uint8Array): Promise<XlsxParseResult> {
  const files = await unzip(buffer);

  const sharedStrings: string[] = [];
  const sstBytes = files.get('xl/sharedStrings.xml');
  if (sstBytes) {
    const sstXml = new TextDecoder('utf-8').decode(sstBytes);
    const siMatches = sstXml.match(/<si\b[^>]*>([\s\S]*?)<\/si>/gi) || [];
    for (const si of siMatches) {
      const textMatches = Array.from(si.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)).map((m) => m[1]);
      sharedStrings.push(
        textMatches
          .join('')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      );
    }
  }

  let sheetBytes = files.get('xl/worksheets/sheet1.xml');
  if (!sheetBytes) {
    for (const [name, bytes] of files.entries()) {
      if (name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')) {
        sheetBytes = bytes;
        break;
      }
    }
  }

  if (!sheetBytes) {
    throw new Error('Invalid Excel file: worksheet XML not found.');
  }

  const sheetXml = new TextDecoder('utf-8').decode(sheetBytes);
  const rows: string[][] = [];
  const rowMatches = sheetXml.match(/<row\b[^>]*>([\s\S]*?)<\/row>/gi) || [];

  for (const rowXml of rowMatches) {
    const row: string[] = [];
    const cellMatches = rowXml.match(/<c\b[^>]*>([\s\S]*?)<\/c>|<c\b[^>]*\/>/gi) || [];

    for (const cellXml of cellMatches) {
      const typeMatch = cellXml.match(/t="([^"]+)"/);
      const cellType = typeMatch ? typeMatch[1] : null;

      let val = '';
      if (cellType === 's') {
        const vMatch = cellXml.match(/<v>([^<]+)<\/v>/);
        if (vMatch) {
          const idx = parseInt(vMatch[1], 10);
          val = sharedStrings[idx] ?? '';
        }
      } else if (cellType === 'inlineStr') {
        const tMatch = cellXml.match(/<t\b[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) val = tMatch[1];
      } else {
        const vMatch = cellXml.match(/<v>([^<]+)<\/v>/);
        if (vMatch) val = vMatch[1];
      }

      row.push(
        val
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .trim()
      );
    }

    if (row.some((c) => c.length > 0)) {
      rows.push(row);
    }
  }

  return {
    sheetName: 'Sheet1',
    rows,
  };
}

/**
 * Parses raw CSV or TSV text into 2D table data.
 */
export function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const delimiter = lines[0]?.includes('\t') ? '\t' : ',';

  return lines.map((line) => {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    return row;
  });
}

/**
 * Renders structured Word document elements into a crisp, multi-page PDF.
 */
export async function renderWordToPdf(
  elements: DocxElement[],
  options?: { title?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  const pageWidth = 595.28;
  const pageHeight = 841.89; // Standard A4
  const maxLineWidth = pageWidth - margin * 2;
  const fontSize = 10.5;
  const lineHeight = 15;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const docTitle = options?.title || 'Document';
  page.drawText(docTitle, {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.15, 0.3),
  });
  y -= 28;

  for (const el of elements) {
    const isHeading = el.type === 'heading';
    const currentFont = isHeading ? bold : font;
    const currentSize = isHeading ? 13 : fontSize;
    const currentLineHeight = isHeading ? 20 : lineHeight;

    if (isHeading) {
      y -= 8;
    }

    const words = el.text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = currentFont.widthOfTextAtSize(testLine, currentSize);
      if (width > maxLineWidth && currentLine) {
        page.drawText(currentLine, {
          x: margin,
          y,
          size: currentSize,
          font: currentFont,
          color: isHeading ? rgb(0.1, 0.2, 0.4) : rgb(0.15, 0.15, 0.15),
        });
        y -= currentLineHeight;
        if (y < margin + currentLineHeight) {
          page = doc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x: margin,
        y,
        size: currentSize,
        font: currentFont,
        color: isHeading ? rgb(0.1, 0.2, 0.4) : rgb(0.15, 0.15, 0.15),
      });
      y -= currentLineHeight;
      if (y < margin + currentLineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    y -= 6;
  }

  return await doc.save();
}

/**
 * Renders PowerPoint slides into clean presentation PDF pages.
 */
export async function renderPptxToPdf(
  slides: PptxSlide[],
  options?: { title?: string }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Landscape 16:9 Presentation (841.89 x 473.56 pt)
  const pageWidth = 841.89;
  const pageHeight = 595.28; // Standard A4 Landscape
  const margin = 50;

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const page = doc.addPage([pageWidth, pageHeight]);

    // Top color bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - 12,
      width: pageWidth,
      height: 12,
      color: rgb(0.9, 0.35, 0.15), // PPT orange
    });

    // Slide Header
    page.drawText(s.title || `Slide ${s.slideNumber}`, {
      x: margin,
      y: pageHeight - 60,
      size: 22,
      font: bold,
      color: rgb(0.1, 0.15, 0.25),
    });

    // Subtitle / Bullets
    let bulletY = pageHeight - 110;
    for (const b of s.bullets) {
      if (bulletY < margin + 20) break;
      page.drawText(`•  ${b}`, {
        x: margin + 15,
        y: bulletY,
        size: 13,
        font,
        color: rgb(0.2, 0.25, 0.3),
      });
      bulletY -= 26;
    }

    // Slide footer
    page.drawText(`${options?.title || 'Presentation'}  |  Slide ${s.slideNumber} of ${slides.length}`, {
      x: margin,
      y: 25,
      size: 9,
      font,
      color: rgb(0.6, 0.65, 0.7),
    });
  }

  return await doc.save();
}

/**
 * Renders 2D table rows (from Excel or CSV) into a formatted grid PDF.
 */
export async function renderExcelToPdf(
  rows: string[][],
  options?: { title?: string; orientation?: 'portrait' | 'landscape' }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const isLandscape = options?.orientation === 'landscape' || (rows[0] && rows[0].length > 6);
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;

  const colCount = Math.max(...rows.map((r) => r.length), 1);
  const colWidth = tableWidth / colCount;
  const rowHeight = 22;
  const fontSize = colCount > 8 ? 7.5 : colCount > 5 ? 8.5 : 9.5;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const title = options?.title || 'Spreadsheet Report';
  page.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.35, 0.2),
  });
  y -= 26;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isHeader = r === 0;

    if (y - rowHeight < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    if (isHeader) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.9, 0.95, 0.92),
      });
    } else if (r % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: tableWidth,
        height: rowHeight,
        color: rgb(0.97, 0.98, 0.99),
      });
    }

    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] ?? '';
      const cellX = margin + c * colWidth;

      let display = cellText;
      const targetFont = isHeader ? bold : font;
      while (display.length > 0 && targetFont.widthOfTextAtSize(display + '..', fontSize) > colWidth - 8) {
        display = display.slice(0, -1);
      }
      if (display !== cellText && cellText.length > 0) {
        display += '..';
      }

      page.drawText(display, {
        x: cellX + 4,
        y: y - 12,
        size: fontSize,
        font: targetFont,
        color: isHeader ? rgb(0.05, 0.25, 0.15) : rgb(0.15, 0.15, 0.15),
      });

      page.drawRectangle({
        x: cellX,
        y: y - rowHeight + 4,
        width: colWidth,
        height: rowHeight,
        borderColor: rgb(0.85, 0.88, 0.9),
        borderWidth: 0.5,
      });
    }

    y -= rowHeight;
  }

  return await doc.save();
}

export interface HtmlBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'code';
  text: string;
}

/**
 * Parses raw HTML markup into structured blocks for PDF rendering.
 * Works seamlessly in both browser (DOMParser) and headless/Node environments (regex).
 */
export function parseHtmlBlocks(html: string): { title: string; blocks: HtmlBlock[] } {
  let title = 'Document';
  const blocks: HtmlBlock[] = [];

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      title = doc.title || 'Document';

      const nodes = doc.querySelectorAll('h1, h2, h3, h4, p, li, pre, blockquote');
      nodes.forEach((node) => {
        const text = (node.textContent || '').trim();
        if (!text) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'h1') blocks.push({ type: 'h1', text });
        else if (tag === 'h2') blocks.push({ type: 'h2', text });
        else if (tag === 'h3' || tag === 'h4') blocks.push({ type: 'h3', text });
        else if (tag === 'li') blocks.push({ type: 'li', text: `• ${text}` });
        else if (tag === 'pre') blocks.push({ type: 'code', text });
        else blocks.push({ type: 'p', text });
      });

      if (blocks.length > 0) {
        if (!title || title === 'Document') {
          const firstH1 = blocks.find((b) => b.type === 'h1');
          if (firstH1) title = firstH1.text;
        }
        return { title, blocks };
      }
    } catch {
      // Fallback to regex
    }
  }

  // Regex parser fallback for Node / test runners
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
  }

  const tagRegex = /<(h[1-4]|p|li|pre|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const rawTag = match[1].toLowerCase();
    const rawText = match[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!rawText) continue;

    if (rawTag === 'h1') blocks.push({ type: 'h1', text: rawText });
    else if (rawTag === 'h2') blocks.push({ type: 'h2', text: rawText });
    else if (rawTag === 'h3' || rawTag === 'h4') blocks.push({ type: 'h3', text: rawText });
    else if (rawTag === 'li') blocks.push({ type: 'li', text: `• ${rawText}` });
    else if (rawTag === 'pre') blocks.push({ type: 'code', text: rawText });
    else blocks.push({ type: 'p', text: rawText });
  }

  // If no HTML tags matched, treat as plain text lines
  if (blocks.length === 0) {
    const cleanLines = html.replace(/<[^>]+>/g, '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of cleanLines) {
      blocks.push({ type: 'p', text: line });
    }
  }

  if ((!title || title === 'Document') && blocks[0]?.type === 'h1') {
    title = blocks[0].text;
  }

  return { title, blocks };
}

/**
 * Renders HTML markup into a clean, formatted vector PDF document.
 */
export async function renderHtmlToPdf(
  html: string,
  options?: { title?: string }
): Promise<Uint8Array> {
  const { title: parsedTitle, blocks } = parseHtmlBlocks(html);
  const docTitle = options?.title || parsedTitle || 'Web Document';

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header Title
  page.drawText(docTitle, {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  y -= 30;

  for (const block of blocks) {
    let font = fontRegular;
    let size = 10.5;
    let color = rgb(0.15, 0.15, 0.15);
    let gapAfter = 8;

    if (block.type === 'h1') {
      font = fontBold;
      size = 16;
      color = rgb(0.08, 0.12, 0.2);
      gapAfter = 12;
      y -= 8;
    } else if (block.type === 'h2') {
      font = fontBold;
      size = 13.5;
      color = rgb(0.1, 0.18, 0.3);
      gapAfter = 10;
      y -= 6;
    } else if (block.type === 'h3') {
      font = fontBold;
      size = 11.5;
      color = rgb(0.15, 0.22, 0.35);
      gapAfter = 8;
    } else if (block.type === 'code') {
      font = fontMono;
      size = 9;
      color = rgb(0.2, 0.25, 0.3);
      gapAfter = 10;
    }

    const words = block.text.split(/\s+/);
    let line = '';
    const lines: string[] = [];

    for (const w of words) {
      const testLine = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    const lineHeight = size * 1.35;
    for (const l of lines) {
      if (y - lineHeight < margin) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      page.drawText(l, {
        x: block.type === 'li' ? margin + 10 : margin,
        y: y - size,
        size,
        font,
        color,
      });

      y -= lineHeight;
    }

    y -= gapAfter;
  }

  return await doc.save();
}

