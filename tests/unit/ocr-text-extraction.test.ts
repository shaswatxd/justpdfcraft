import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('FallbackPDFEngine Text Extraction & Search', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createSamplePdfWithText = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Page 1 with text
    const page1 = doc.addPage([600, 800]);
    page1.drawText('SwiftPDF Fast Desktop Engine', {
      x: 50,
      y: 700,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
    page1.drawText('Invoice #INV-2026-001', {
      x: 50,
      y: 650,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Page 2 with different text
    const page2 = doc.addPage([600, 800]);
    page2.drawText('Confidential Agreement Document', {
      x: 50,
      y: 700,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });

    return await doc.save();
  };

  it('should extract digital text from document pages', async () => {
    const pdfBytes = await createSamplePdfWithText();
    const { documentId } = await engine.openDocument(pdfBytes);

    const page1Text = await engine.extractPageText(documentId, 0);
    expect(page1Text.pageIndex).toBe(0);
    expect(page1Text.text).toContain('SwiftPDF');
    expect(page1Text.text).toContain('INV-2026-001');

    const page2Text = await engine.extractPageText(documentId, 1);
    expect(page2Text.pageIndex).toBe(1);
    expect(page2Text.text).toContain('Confidential Agreement Document');

    await engine.closeDocument(documentId);
  });

  it('should search text across all pages case-insensitively', async () => {
    const pdfBytes = await createSamplePdfWithText();
    const { documentId } = await engine.openDocument(pdfBytes);

    const results = await engine.searchDocument(documentId, 'swiftpdf', false);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].pageIndex).toBe(0);
    expect(results[0].textSnippet.toLowerCase()).toContain('swiftpdf');

    const invResults = await engine.searchDocument(documentId, 'inv-2026', false);
    expect(invResults.length).toBeGreaterThanOrEqual(1);
    expect(invResults[0].pageIndex).toBe(0);

    const confResults = await engine.searchDocument(documentId, 'confidential', false);
    expect(confResults.length).toBeGreaterThanOrEqual(1);
    expect(confResults[0].pageIndex).toBe(1);

    await engine.closeDocument(documentId);
  });

  it('should handle search queries not found gracefully', async () => {
    const pdfBytes = await createSamplePdfWithText();
    const { documentId } = await engine.openDocument(pdfBytes);

    const notFound = await engine.searchDocument(documentId, 'NonExistentString12345');
    expect(notFound).toEqual([]);

    await engine.closeDocument(documentId);
  });

  it('should handle blank pages safely without errors', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]); // completely blank page
    const bytes = await doc.save();

    const { documentId } = await engine.openDocument(bytes);
    const textResult = await engine.extractPageText(documentId, 0);
    expect(textResult.text).toBe('');
    expect(textResult.pageIndex).toBe(0);

    await engine.closeDocument(documentId);
  });
});
