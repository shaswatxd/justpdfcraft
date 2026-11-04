import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as docx from 'docx';
import * as XLSX from 'xlsx';
import { UploadedFile, ProcessResult } from '../types/pdf';
import { createPdfBlob } from '../utils/blob';
import { parseDocx, parsePptx } from '../utils/docxParser';
import { getSafeBuffer } from '../utils/pdfRenderer';

/**
 * Extract all text lines from PDF using pdfjs-dist
 */
async function extractTextFromPdf(data: ArrayBuffer): Promise<string[][]> {
  const loadingTask = pdfjsLib.getDocument({ data: getSafeBuffer(data) });
  const pdf = await loadingTask.promise;
  try {
    const pagesText: string[][] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageLines: string[] = [];
      let currentLine = '';

      for (const item of textContent.items as any[]) {
        if (item.str !== undefined) {
          if (item.hasEOL) {
            currentLine += item.str;
            pageLines.push(currentLine);
            currentLine = '';
          } else {
            currentLine += (currentLine ? ' ' : '') + item.str;
          }
        }
      }
      if (currentLine) pageLines.push(currentLine);
      pagesText.push(pageLines);
    }

    return pagesText;
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

/**
 * Convert PDF to editable Word DOCX
 */
export async function convertPdfToWord(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Extracting text content and structure from PDF...', 20);
  const buffer = await fileItem.file.arrayBuffer();
  const pagesText = await extractTextFromPdf(buffer);

  onProgress?.('Generating Microsoft Word document...', 60);

  const sections: docx.ISectionOptions[] = pagesText.map((lines, pageIdx) => ({
    properties: {},
    children: [
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `Document Page ${pageIdx + 1}`,
            bold: true,
            size: 24,
            color: '2B579A',
          }),
        ],
        spacing: { after: 200 },
      }),
      ...lines.map(
        line =>
          new docx.Paragraph({
            children: [new docx.TextRun({ text: line, size: 22 })],
            spacing: { after: 120 },
          })
      ),
    ],
  }));

  if (sections.length === 0) {
    sections.push({
      properties: {},
      children: [
        new docx.Paragraph({
          children: [new docx.TextRun({ text: 'No selectable text content found in the source PDF document.', size: 22 })],
        }),
      ],
    });
  }

  const doc = new docx.Document({ sections });
  const docxBlob = await docx.Packer.toBlob(doc);
  const downloadUrl = URL.createObjectURL(docxBlob);
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob: docxBlob,
    fileName: `${baseName}.docx`,
    downloadUrl,
    originalSize: fileItem.size,
    newSize: docxBlob.size,
  };
}

/**
 * Convert Word DOCX / PPTX / Text to PDF
 */
export async function convertWordToPdf(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  const isPptx = fileItem.name.toLowerCase().endsWith('.pptx');
  const isDocx = fileItem.name.toLowerCase().endsWith('.docx');
  const buffer = await fileItem.file.arrayBuffer();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (isPptx) {
    onProgress?.('Parsing PowerPoint slide decks...', 25);
    const slides = await parsePptx(buffer);

    for (let i = 0; i < slides.length; i++) {
      onProgress?.(`Rendering slide ${i + 1} of ${slides.length}...`, 25 + Math.round((i / Math.max(1, slides.length)) * 65));
      const slideLines = slides[i];
      const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
      const margin = 50;
      let y = 595.28 - margin;

      page.drawText(`Slide ${i + 1}`, {
        x: margin,
        y,
        size: 18,
        font: boldFont,
        color: rgb(0.8, 0.25, 0.1),
      });
      y -= 35;

      for (const line of slideLines) {
        if (y < margin + 20) break;
        page.drawText(`• ${line.slice(0, 110)}`, {
          x: margin + 15,
          y,
          size: 12,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 20;
      }
    }
  } else {
    onProgress?.('Parsing document paragraphs...', 25);
    let lines: string[] = [];
    if (isDocx) {
      lines = await parseDocx(buffer);
    } else {
      const text = await fileItem.file.text();
      lines = text
        .split(/\r?\n/)
        .map(l => l.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ').trim())
        .filter(Boolean);
    }

    onProgress?.('Rendering PDF pages...', 60);
    const fontSize = 11;
    const lineHeight = 16;
    const margin = 50;

    let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
    let y = 841.89 - margin;

    // Header
    currentPage.drawText(fileItem.name, {
      x: margin,
      y,
      size: 13,
      font: boldFont,
      color: rgb(0.17, 0.34, 0.6),
    });
    y -= 30;

    for (const line of lines) {
      if (y < margin + 20) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        y = 841.89 - margin;
      }
      const truncatedLine = line.slice(0, 95);
      currentPage.drawText(truncatedLine, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineHeight;
    }
  }

  onProgress?.('Finalizing PDF document...', 92);
  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.(docx?|pptx?|txt)$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Convert PDF to Excel XLSX
 */
export async function convertPdfToExcel(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Extracting tables and tabular text from PDF...', 25);
  const buffer = await fileItem.file.arrayBuffer();
  const pagesText = await extractTextFromPdf(buffer);

  onProgress?.('Building Excel spreadsheets...', 65);
  const wb = XLSX.utils.book_new();

  pagesText.forEach((lines, pageIdx) => {
    // Split lines by multiple spaces or tabs into columns
    const sheetData: string[][] = lines.map(line => {
      const cols = line.split(/\s{2,}|\t/).map(c => c.trim()).filter(Boolean);
      return cols.length > 0 ? cols : [line];
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${pageIdx + 1}`);
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const xlsxBlob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob: xlsxBlob,
    fileName: `${baseName}.xlsx`,
    downloadUrl: URL.createObjectURL(xlsxBlob),
    originalSize: fileItem.size,
    newSize: xlsxBlob.size,
  };
}

/**
 * Convert Excel XLSX to PDF
 */
export async function convertExcelToPdf(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Reading Excel workbook...', 20);
  const buffer = await fileItem.file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  onProgress?.('Formatting spreadsheet pages to PDF...', 60);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!data || data.length === 0) continue;

    let page = pdfDoc.addPage([841.89, 595.28]); // Landscape A4
    const margin = 40;
    let y = 595.28 - margin;

    // Sheet Title
    page.drawText(`Sheet: ${sheetName}`, {
      x: margin,
      y,
      size: 14,
      font: boldFont,
      color: rgb(0.13, 0.45, 0.27),
    });
    y -= 25;

    for (let r = 0; r < Math.min(data.length, 35); r++) {
      const row = data[r];
      if (y < margin + 20) {
        page = pdfDoc.addPage([841.89, 595.28]);
        y = 595.28 - margin;
      }

      let x = margin;
      const colWidth = 110;

      for (let c = 0; c < Math.min(row?.length || 0, 7); c++) {
        const val = String(row[c] ?? '').slice(0, 16);
        page.drawText(val, {
          x,
          y,
          size: 9,
          font: r === 0 ? boldFont : font,
          color: r === 0 ? rgb(0, 0, 0) : rgb(0.25, 0.25, 0.25),
        });
        x += colWidth;
      }
      y -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = createPdfBlob(pdfBytes);
  const baseName = fileItem.name.replace(/\.(xlsx?|csv)$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}.pdf`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}

/**
 * Convert PDF to PowerPoint presentation slides
 */
export async function convertPdfToPowerPoint(
  fileItem: UploadedFile,
  onProgress?: (msg: string, percent: number) => void
): Promise<ProcessResult> {
  onProgress?.('Rendering PDF pages into PowerPoint slides...', 30);
  const buffer = await fileItem.file.arrayBuffer();
  const pagesText = await extractTextFromPdf(buffer);

  // Package as formatted XML/HTML presentation container with text & layout
  const slidesHtml = pagesText
    .map(
      (lines, i) => `
    <div style="page-break-after: always; width: 960px; height: 540px; padding: 40px; background: white; font-family: Arial, sans-serif;">
      <h2 style="color: #d24726; font-size: 28px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Slide ${i + 1}</h2>
      <div style="font-size: 18px; color: #333; line-height: 1.6; margin-top: 20px;">
        ${lines.map(l => `<p style="margin: 8px 0;">• ${l}</p>`).join('')}
      </div>
    </div>`
    )
    .join('');

  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Presentation</title></head><body>${slidesHtml}</body></html>`;
  const blob = new Blob([fullHtml], { type: 'application/vnd.ms-powerpoint' });
  const baseName = fileItem.name.replace(/\.pdf$/i, '');

  onProgress?.('Complete!', 100);

  return {
    blob,
    fileName: `${baseName}.ppt`,
    downloadUrl: URL.createObjectURL(blob),
    originalSize: fileItem.size,
    newSize: blob.size,
  };
}
