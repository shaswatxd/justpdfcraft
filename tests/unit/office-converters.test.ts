import { describe, it, expect } from 'vitest';
import { parseCsv, renderExcelToPdf, renderWordToPdf, parsePptx, renderPptxToPdf, renderHtmlToPdf, parseHtmlBlocks } from '../../src/utils/officeParsers';
import { createXlsx } from '../../src/utils/xlsx';
import { parseXlsx } from '../../src/utils/officeParsers';
import { createDocx } from '../../src/utils/docx';
import { parseDocx } from '../../src/utils/officeParsers';
import { createPptx } from '../../src/utils/pptx';

describe('Office Document Parsers & PDF Renderers', () => {
  it('should parse CSV text correctly into 2D rows', () => {
    const csv = `Product,Qty,Price\nLaptop,5,$1200\nMouse,15,"$25,00"`;
    const rows = parseCsv(csv);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(['Product', 'Qty', 'Price']);
    expect(rows[1]).toEqual(['Laptop', '5', '$1200']);
    expect(rows[2][0]).toBe('Mouse');
  });

  it('should render Excel/CSV rows into a valid PDF document buffer', async () => {
    const rows = [
      ['ID', 'Customer', 'Amount', 'Status'],
      ['101', 'Alice', '$450.00', 'Paid'],
      ['102', 'Bob', '$120.00', 'Pending'],
    ];

    const pdfBytes = await renderExcelToPdf(rows, { title: 'Q3 Financials' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);
    expect(pdfBytes[0]).toBe(0x25); // %
    expect(pdfBytes[1]).toBe(0x50); // P
    expect(pdfBytes[2]).toBe(0x44); // D
    expect(pdfBytes[3]).toBe(0x46); // F
  });

  it('should render Word elements into a valid PDF document buffer', async () => {
    const elements = [
      { type: 'heading' as const, text: 'Executive Summary' },
      { type: 'paragraph' as const, text: 'The project delivered all milestones on schedule.' },
    ];

    const pdfBytes = await renderWordToPdf(elements, { title: 'Annual Report' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);
    expect(pdfBytes[0]).toBe(0x25); // %
    expect(pdfBytes[1]).toBe(0x50); // P
  });

  it('should round-trip parse generated XLSX files', async () => {
    const originalRows = [
      ['Quarter', 'Revenue', 'Profit'],
      ['Q1', '$100,000', '$25,000'],
      ['Q2', '$150,000', '$40,000'],
    ];

    const xlsxBytes = createXlsx(originalRows, 'Finances');
    const parsed = await parseXlsx(xlsxBytes);

    expect(parsed.rows.length).toBe(3);
    expect(parsed.rows[0]).toEqual(['Quarter', 'Revenue', 'Profit']);
    expect(parsed.rows[1]).toEqual(['Q1', '$100,000', '$25,000']);
  });

  it('should parse generated DOCX files and extract paragraphs', async () => {
    const paragraphs = [
      'Welcome to JustPDFCraft',
      'This document was created directly in browser memory.',
    ];

    const docxBytes = createDocx(paragraphs, { title: 'Docx Test' });
    const parsed = await parseDocx(docxBytes);

    expect(parsed.elements.length).toBeGreaterThanOrEqual(1);
    expect(parsed.elements.some((e) => e.text.includes('Welcome to JustPDFCraft'))).toBe(true);
  });

  it('should round-trip parse generated PPTX presentation slides', async () => {
    const slides = [
      { title: 'Project Overview', bullets: ['Key Deliverables', 'Timeline and Milestones'] },
      { title: 'Architecture', bullets: ['Client-Side WebAssembly', 'Zero Cloud Uploads'] },
    ];

    const pptxBytes = await createPptx(slides, { presentationTitle: 'Tech Presentation' });
    expect(pptxBytes).toBeInstanceOf(Uint8Array);
    expect(pptxBytes.length).toBeGreaterThan(500);

    const parsed = await parsePptx(pptxBytes, 'presentation.pptx');
    expect(parsed.slides.length).toBe(2);
    expect(parsed.slides[0].title).toBe('Project Overview');
    expect(parsed.slides[0].bullets).toContain('Key Deliverables');
    expect(parsed.slides[1].title).toBe('Architecture');

    const pdfFromPptx = await renderPptxToPdf(parsed.slides, { title: 'Presentation PDF' });
    expect(pdfFromPptx).toBeInstanceOf(Uint8Array);
    expect(pdfFromPptx.length).toBeGreaterThan(500);
    expect(pdfFromPptx[0]).toBe(0x25); // %
    expect(pdfFromPptx[1]).toBe(0x50); // P
  });

  it('should parse HTML blocks and render formatted PDF', async () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Article</title></head>
        <body>
          <h1>Main Article Headline</h1>
          <p>This is the first paragraph with important text.</p>
          <h2>Subheading Details</h2>
          <ul>
            <li>First list item</li>
            <li>Second list item</li>
          </ul>
        </body>
      </html>
    `;

    const { title, blocks } = parseHtmlBlocks(sampleHtml);
    expect(title).toBe('Test Article');
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    expect(blocks.some((b) => b.type === 'h1' && b.text.includes('Main Article Headline'))).toBe(true);

    const pdfBytes = await renderHtmlToPdf(sampleHtml, { title: 'Exported Article' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(500);
    expect(pdfBytes[0]).toBe(0x25); // %
    expect(pdfBytes[1]).toBe(0x50); // P
  });
});
