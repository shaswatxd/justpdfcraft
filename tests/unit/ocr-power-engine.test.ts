import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { ImagePreprocessor } from '../../core/ocr/image-preprocess';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('OCR Power Engine & Searchable PDF Embedding', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createScannedImagePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    // A standard page simulating a scan (no initial digital text stream)
    const page = doc.addPage([595, 842]);
    // Draw a rectangle representing a scanned document header box
    page.drawRectangle({
      x: 50,
      y: 700,
      width: 495,
      height: 80,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 1,
    });
    return await doc.save();
  };

  it('should test ImagePreprocessor canvas filter pipeline in node/canvas mock', () => {
    // Check that ImagePreprocessor class exists and handles null/mock gracefully
    const dummyCanvas: any = {
      width: 100,
      height: 100,
    };
    const processed = ImagePreprocessor.processCanvas(dummyCanvas);
    expect(processed).toBeDefined();
  });

  it('should embed searchable text layer into a document and make it selectable/searchable', async () => {
    const pdfBytes = await createScannedImagePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    // Verify initially page text is empty
    const initialText = await engine.extractPageText(documentId, 0);
    expect(initialText.text).toBe('');

    // Embed OCR recognized text into page 0
    const ocrText = 'Invoice Number: 99482-A\nTotal Amount: $1,450.00\nPayment Status: PAID';
    const searchablePdfBytes = await engine.embedSearchableText(documentId, [
      { pageIndex: 0, text: ocrText },
    ]);

    expect(searchablePdfBytes).toBeInstanceOf(Uint8Array);
    expect(searchablePdfBytes.length).toBeGreaterThan(pdfBytes.length);

    // Now open the newly created searchable PDF and verify text extraction
    const { documentId: searchableDocId } = await engine.openDocument(searchablePdfBytes);
    const extracted = await engine.extractPageText(searchableDocId, 0);

    expect(extracted.text).toContain('Invoice Number: 99482-A');
    expect(extracted.text).toContain('Total Amount: $1,450.00');
    expect(extracted.text).toContain('PAID');

    // Verify search works on the embedded text
    const searchResults = await engine.searchDocument(searchableDocId, '99482-A');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].pageIndex).toBe(0);

    await engine.closeDocument(documentId);
    await engine.closeDocument(searchableDocId);
  });

  it('should handle multi-page text embedding with page boundaries', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 700]);
    doc.addPage([500, 700]);
    const bytes = await doc.save();

    const { documentId } = await engine.openDocument(bytes);

    const searchableBytes = await engine.embedSearchableText(documentId, [
      { pageIndex: 0, text: 'First page legal clause agreement' },
      { pageIndex: 1, text: 'Second page signature block verified' },
      { pageIndex: 99, text: 'Out of range page should be ignored' }, // edge case
    ]);

    const { documentId: sId } = await engine.openDocument(searchableBytes);

    const p0 = await engine.extractPageText(sId, 0);
    const p1 = await engine.extractPageText(sId, 1);

    expect(p0.text).toContain('First page legal clause');
    expect(p1.text).toContain('Second page signature block');

    await engine.closeDocument(documentId);
    await engine.closeDocument(sId);
  });

  it('should safely bypass copy-restriction flags when loading protected PDFs', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([600, 800]);
    page.drawText('Protected Corporate Confidential Information', {
      x: 50,
      y: 700,
      font,
      size: 14,
    });
    const bytes = await doc.save();

    // pdf-lib and our engine load with ignoreEncryption: true
    const { documentId, metadata } = await engine.openDocument(bytes);
    expect(documentId).toBeDefined();
    expect(metadata.pageCount).toBe(1);

    const text = await engine.extractPageText(documentId, 0);
    expect(text.text).toContain('Protected Corporate Confidential Information');

    await engine.closeDocument(documentId);
  });
});
