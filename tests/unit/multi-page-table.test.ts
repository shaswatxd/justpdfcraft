import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { extractTableFromPages } from '../../core/pdf/table-extractor';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('Multi-Page Table Extractor', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createMultiPageTablePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1
    const page1 = doc.addPage([600, 800]);
    page1.drawText('Product', { x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page1.drawText('Qty', { x: 250, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page1.drawText('Price', { x: 400, y: 700, size: 12, font, color: rgb(0, 0, 0) });

    page1.drawText('Widget A', { x: 50, y: 660, size: 12, font, color: rgb(0, 0, 0) });
    page1.drawText('10', { x: 250, y: 660, size: 12, font, color: rgb(0, 0, 0) });
    page1.drawText('$100.00', { x: 400, y: 660, size: 12, font, color: rgb(0, 0, 0) });

    // Page 2
    const page2 = doc.addPage([600, 800]);
    page2.drawText('Widget B', { x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page2.drawText('20', { x: 250, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page2.drawText('$200.00', { x: 400, y: 700, size: 12, font, color: rgb(0, 0, 0) });

    return await doc.save();
  };

  it('should combine tables across multiple pages with page headers', async () => {
    const pdfBytes = await createMultiPageTablePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    const result = await extractTableFromPages(documentId, [0, 1], 6, engine);

    expect(result.colCount).toBe(3);
    // Page 1 has header + row + delimiter, Page 2 has row + delimiter
    expect(result.rowCount).toBeGreaterThanOrEqual(4);

    // CSV format check
    expect(result.csv).toContain('--- Page 1 ---');
    expect(result.csv).toContain('Widget A');
    expect(result.csv).toContain('--- Page 2 ---');
    expect(result.csv).toContain('Widget B');

    // TSV format check
    expect(result.tsv).toContain('\t');
    expect(result.tsv).toContain('Widget A\t10\t$100.00');
    expect(result.tsv).toContain('Widget B\t20\t$200.00');

    await engine.closeDocument(documentId);
  });

  it('should extract single page without page delimiter headers', async () => {
    const pdfBytes = await createMultiPageTablePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    const result = await extractTableFromPages(documentId, [0], 6, engine);

    expect(result.colCount).toBe(3);
    expect(result.csv).not.toContain('--- Page 1 ---');
    expect(result.csv).toContain('Widget A');

    await engine.closeDocument(documentId);
  });
});
