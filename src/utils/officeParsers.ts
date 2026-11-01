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

  // Match all paragraphs <w:p>
  const pMatches = xmlText.match(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi) || [];

  for (const pXml of pMatches) {
    const isHeading = /<w:pStyle\s+[^>]*w:val="(?:Heading|Title)[^"]*"/i.test(pXml);

    // Extract all run text segments <w:t>
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
 * Parses a standard Microsoft Excel (.xlsx) file into 2D table data.
 */
export async function parseXlsx(buffer: Uint8Array): Promise<XlsxParseResult> {
  const files = await unzip(buffer);

  // 1. Parse Shared Strings if available
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

  // 2. Parse Primary Worksheet (xl/worksheets/sheet1.xml)
  let sheetBytes = files.get('xl/worksheets/sheet1.xml');
  if (!sheetBytes) {
    // Find any sheet*.xml in worksheets
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

    // Only add row if it has content
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
      y -= 8; // Extra breathing room before heading
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

    y -= 6; // Spacing after paragraph
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

  // Title header
  const title = options?.title || 'Spreadsheet Report';
  page.drawText(title, {
    x: margin,
    y,
    size: 16,
    font: bold,
    color: rgb(0.1, 0.35, 0.2), // Excel green
  });
  y -= 26;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isHeader = r === 0;

    // Check if new page needed
    if (y - rowHeight < margin) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    // Row background (header = green tint, alternate rows = soft gray)
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

    // Draw cells
    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] ?? '';
      const cellX = margin + c * colWidth;

      // Truncate text if exceeds column width
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

      // Cell border
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
