import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('FallbackPDFEngine Direct In-Place Text Editor', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createSamplePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([600, 800]);

    page.drawText('Original Price: $499.00 USD', {
      x: 50,
      y: 700,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Customer Name: John Doe', {
      x: 50,
      y: 650,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    return await doc.save();
  };

  it('should replace existing text on page with new content in-place', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    // Initial check
    const initialText = await engine.extractPageText(documentId, 0);
    expect(initialText.text).toContain('Original Price: $499.00 USD');

    // In-place replace "$499.00" with "$299.00"
    await engine.replaceTextOnPage(documentId, {
      pageIndex: 0,
      rect: [50, 695, 250, 22],
      originalText: 'Original Price: $499.00 USD',
      newText: 'Special Price: $299.00 USD',
      fontSize: 16,
      color: '#008000', // green
    });

    const updatedText = await engine.extractPageText(documentId, 0);
    expect(updatedText.text).toContain('Special Price: $299.00 USD');

    // Save and verify persistence
    const savedBytes = await engine.saveDocument(documentId);
    expect(savedBytes).toBeInstanceOf(Uint8Array);

    const { documentId: reloadedId } = await engine.openDocument(savedBytes);
    const reloadedText = await engine.extractPageText(reloadedId, 0);
    expect(reloadedText.text).toContain('Special Price: $299.00 USD');

    await engine.closeDocument(documentId);
    await engine.closeDocument(reloadedId);
  });

  it('should support modifying names and dates with matched font family', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.replaceTextOnPage(documentId, {
      pageIndex: 0,
      rect: [50, 645, 200, 20],
      originalText: 'Customer Name: John Doe',
      newText: 'Customer Name: Jane Smith',
      fontSize: 14,
      fontFamily: 'Helvetica',
      color: '#000000',
    });

    const text = await engine.extractPageText(documentId, 0);
    expect(text.text).toContain('Customer Name: Jane Smith');

    await engine.closeDocument(documentId);
  });
});
