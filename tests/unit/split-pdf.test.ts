import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('Split PDF Feature & Edge Cases', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  async function createTestPdf(pageCount: number): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([400, 600]);
      // Add simple marker text so pages aren't identical
      page.drawText(`Page ${i + 1}`, { x: 50, y: 550, size: 24 });
    }
    return await doc.save();
  }

  it('splits a 6-page document into custom page ranges', async () => {
    const bytes = await createTestPdf(6);
    const { documentId } = await engine.openDocument(bytes);

    // Ranges: pages 1-2 ([0, 1]), pages 3-4 ([2, 3]), pages 5-6 ([4, 5])
    const results = await engine.splitDocument(documentId, [
      [0, 1],
      [2, 3],
      [4, 5],
    ]);

    expect(results.length).toBe(3);

    const doc1 = await PDFDocument.load(results[0]);
    const doc2 = await PDFDocument.load(results[1]);
    const doc3 = await PDFDocument.load(results[2]);

    expect(doc1.getPageCount()).toBe(2);
    expect(doc2.getPageCount()).toBe(2);
    expect(doc3.getPageCount()).toBe(2);
  });

  it('splits into every individual page', async () => {
    const bytes = await createTestPdf(4);
    const { documentId } = await engine.openDocument(bytes);

    const individualRanges: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ];

    const results = await engine.splitDocument(documentId, individualRanges);
    expect(results.length).toBe(4);

    for (const part of results) {
      const doc = await PDFDocument.load(part);
      expect(doc.getPageCount()).toBe(1);
    }
  });

  it('gracefully ignores out-of-bounds ranges without crashing or creating 0-page PDFs', async () => {
    const bytes = await createTestPdf(3);
    const { documentId } = await engine.openDocument(bytes);

    // Range [0, 1] is valid, [10, 15] is completely out-of-bounds
    const results = await engine.splitDocument(documentId, [
      [0, 1],
      [10, 15],
    ]);

    expect(results.length).toBe(1);
    const doc1 = await PDFDocument.load(results[0]);
    expect(doc1.getPageCount()).toBe(2);
  });

  it('clamps range ends that exceed total document page count', async () => {
    const bytes = await createTestPdf(3);
    const { documentId } = await engine.openDocument(bytes);

    // Range [1, 99] should copy pages 1 and 2 (indices 1, 2)
    const results = await engine.splitDocument(documentId, [[1, 99]]);

    expect(results.length).toBe(1);
    const doc1 = await PDFDocument.load(results[0]);
    expect(doc1.getPageCount()).toBe(2);
  });
});
