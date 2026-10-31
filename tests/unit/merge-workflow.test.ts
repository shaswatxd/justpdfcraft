import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('PDF Merge Engine & Ordering Contract', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createDoc = async (label: string, pages: number): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < pages; i++) {
      const page = doc.addPage([500, 700]);
      page.drawText(`${label} - Page ${i + 1}`, { x: 50, y: 650, font, size: 14 });
    }
    return await doc.save();
  };

  it('should merge 3 distinct documents in exact sequence preserving page counts', async () => {
    const doc1 = await createDoc('DocA', 2);
    const doc2 = await createDoc('DocB', 1);
    const doc3 = await createDoc('DocC', 3);

    const mergedBytes = await engine.mergeDocuments([doc1, doc2, doc3]);
    const { metadata } = await engine.openDocument(mergedBytes);

    expect(metadata.pageCount).toBe(6);
  });

  it('should fail cleanly if one file in the merge batch is corrupted', async () => {
    const valid = await createDoc('Valid', 1);
    const corrupt = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    await expect(engine.mergeDocuments([valid, corrupt])).rejects.toThrow();
  });
});
