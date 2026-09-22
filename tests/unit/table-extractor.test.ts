import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { extractTableFromPage } from '../../core/pdf/table-extractor';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('PDF Table Extractor', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createTablePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([600, 800]);

    // Table Header
    page.drawText('Item Description', { x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('Quantity', { x: 250, y: 700, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('Price', { x: 400, y: 700, size: 12, font, color: rgb(0, 0, 0) });

    // Row 1
    page.drawText('Pro Subscription', { x: 50, y: 660, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('2', { x: 250, y: 660, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('$199.00', { x: 400, y: 660, size: 12, font, color: rgb(0, 0, 0) });

    // Row 2
    page.drawText('Cloud Storage Pack', { x: 50, y: 620, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('5', { x: 250, y: 620, size: 12, font, color: rgb(0, 0, 0) });
    page.drawText('$49.00', { x: 400, y: 620, size: 12, font, color: rgb(0, 0, 0) });

    return await doc.save();
  };

  it('should extract structured tabular rows and columns from page text coordinates', async () => {
    const pdfBytes = await createTablePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    const result = await extractTableFromPage(documentId, 0, 6, engine);

    expect(result.rowCount).toBeGreaterThanOrEqual(3);
    expect(result.colCount).toBe(3);

    // CSV format check
    expect(result.csv).toContain('Item Description');
    expect(result.csv).toContain('Quantity');
    expect(result.csv).toContain('Price');
    expect(result.csv).toContain('Pro Subscription');
    expect(result.csv).toContain('Cloud Storage Pack');

    // TSV format check for Excel clipboard
    expect(result.tsv).toContain('\t');

    await engine.closeDocument(documentId);
  });
});
