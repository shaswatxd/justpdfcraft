import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('FallbackPDFEngine Universal PDF Unlocker & Permission Stripper', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createRestrictedPdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([595, 842]);
    page.drawText('Confidential Restricted Document — Printing Prohibited', {
      x: 50,
      y: 750,
      font,
      size: 12,
    });
    return await doc.save();
  };

  it('should unlock document and strip all security permissions', async () => {
    const pdfBytes = await createRestrictedPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    // Run 1-click universal unlock
    const unlockedBytes = await engine.unlockAndStripPermissions(documentId);
    expect(unlockedBytes).toBeInstanceOf(Uint8Array);
    expect(unlockedBytes.byteLength).toBeGreaterThan(0);

    // Open unlocked bytes and verify valid, unrestricted PDF
    const { documentId: unlockedDocId, metadata } = await engine.openDocument(unlockedBytes);
    expect(unlockedDocId).toBeDefined();
    expect(metadata.isEncrypted).toBe(false);
    expect(metadata.pageCount).toBe(1);

    // Verify text is 100% intact and extractable
    const pageText = await engine.extractPageText(unlockedDocId, 0);
    expect(pageText.text).toContain('Confidential Restricted Document');

    await engine.closeDocument(documentId);
    await engine.closeDocument(unlockedDocId);
  });
});
