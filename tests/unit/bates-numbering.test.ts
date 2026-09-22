import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('FallbackPDFEngine Bates Numbering & Header/Footer', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createMultiPagePdf = async (count: number = 3): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < count; i++) {
      const page = doc.addPage([595.28, 841.89]); // A4
      page.drawText(`Document Page ${i + 1}`, { x: 50, y: 750, size: 14 });
    }
    return await doc.save();
  };

  it('should apply sequential Bates numbering across all pages with padding', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addBatesNumbering(documentId, {
      prefix: 'LEGAL-',
      suffix: '-CONFIDENTIAL',
      startNumber: 101,
      digitsCount: 6,
      position: 'bottom-right',
      fontSize: 10,
      color: '#000000',
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);

    // Verify text extraction contains stamped sequential bates numbers
    const p1 = await engine.extractPageText(documentId, 0);
    const p2 = await engine.extractPageText(documentId, 1);
    const p3 = await engine.extractPageText(documentId, 2);

    expect(p1.text).toContain('LEGAL-000101-CONFIDENTIAL');
    expect(p2.text).toContain('LEGAL-000102-CONFIDENTIAL');
    expect(p3.text).toContain('LEGAL-000103-CONFIDENTIAL');
  });

  it('should position Bates numbers in various quadrants', async () => {
    const pdfBytes = await createMultiPagePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addBatesNumbering(documentId, {
      prefix: 'TOP-',
      startNumber: 1,
      digitsCount: 4,
      position: 'top-center',
      fontSize: 9,
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);

    const p1 = await engine.extractPageText(documentId, 0);
    expect(p1.text).toContain('TOP-0001');
  });

  it('should expand dynamic header/footer macros like {page} and {totalPages}', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addHeaderFooter(documentId, {
      text: 'Page {page} of {totalPages}',
      position: 'bottom-center',
      fontSize: 9,
      color: '#475569',
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);

    const p1 = await engine.extractPageText(documentId, 0);
    const p2 = await engine.extractPageText(documentId, 1);
    const p3 = await engine.extractPageText(documentId, 2);

    expect(p1.text).toContain('Page 1 of 3');
    expect(p2.text).toContain('Page 2 of 3');
    expect(p3.text).toContain('Page 3 of 3');
  });

  it('should apply Bates numbering only to specified page ranges', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    // Only stamp page 1 (index 0) and page 3 (index 2)
    await engine.addBatesNumbering(documentId, {
      prefix: 'EVID-',
      startNumber: 1,
      digitsCount: 5,
      position: 'bottom-left',
      pageIndices: [0, 2],
    });

    const p1 = await engine.extractPageText(documentId, 0);
    const p2 = await engine.extractPageText(documentId, 1);
    const p3 = await engine.extractPageText(documentId, 2);

    expect(p1.text).toContain('EVID-00001');
    expect(p2.text).not.toContain('EVID-');
    expect(p3.text).toContain('EVID-00002');
  });
});
