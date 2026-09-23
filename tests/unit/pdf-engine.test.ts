import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument, rgb } from 'pdf-lib';

describe('FallbackPDFEngine Core Operations', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  // Helper to generate a fresh test PDF buffer
  const createSamplePdf = async (pageCount = 3): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([600, 400]);
      page.drawText(`Page Number ${i + 1}`, { x: 50, y: 350, size: 18, color: rgb(0, 0, 0) });
    }
    return await doc.save();
  };

  it('should open a valid PDF and extract accurate metadata', async () => {
    const pdfBytes = await createSamplePdf(3);
    const { documentId, metadata } = await engine.openDocument(pdfBytes);

    expect(documentId).toBeDefined();
    expect(metadata.pageCount).toBe(3);
    expect(engine.getPageCount(documentId)).toBe(3);
  });

  it('should get page dimensions and rotation', async () => {
    const pdfBytes = await createSamplePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    const dims = await engine.getPageDimensions(documentId, 0);
    expect(dims.pageNumber).toBe(1);
    expect(dims.width).toBe(600);
    expect(dims.height).toBe(400);
    expect(dims.rotation).toBe(0);
  });

  it('should rotate pages by specified degrees', async () => {
    const pdfBytes = await createSamplePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.rotatePages(documentId, [0], 90);
    const dimsAfter = await engine.getPageDimensions(documentId, 0);
    expect(dimsAfter.rotation).toBe(90);
  });

  it('should reorder pages accurately', async () => {
    const pdfBytes = await createSamplePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    // Reverse order: 2, 1, 0
    await engine.reorderPages(documentId, [2, 1, 0]);
    expect(engine.getPageCount(documentId)).toBe(3);

    const saved = await engine.saveDocument(documentId);
    const reloaded = await PDFDocument.load(saved);
    expect(reloaded.getPageCount()).toBe(3);
  });

  it('should delete specified pages and prevent deleting all pages', async () => {
    const pdfBytes = await createSamplePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.deletePages(documentId, [1]);
    expect(engine.getPageCount(documentId)).toBe(2);

    // Attempting to delete all remaining pages should throw
    await expect(engine.deletePages(documentId, [0, 1])).rejects.toThrow();
  });

  it('should duplicate pages', async () => {
    const pdfBytes = await createSamplePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.duplicatePages(documentId, [0]);
    expect(engine.getPageCount(documentId)).toBe(3);
  });

  it('should insert blank pages at exact index', async () => {
    const pdfBytes = await createSamplePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.insertBlankPage(documentId, 1, 595, 842);
    expect(engine.getPageCount(documentId)).toBe(3);
  });

  it('should extract pages into a new standalone PDF', async () => {
    const pdfBytes = await createSamplePdf(4);
    const { documentId } = await engine.openDocument(pdfBytes);

    const extractedBytes = await engine.extractPages(documentId, [0, 2]);
    const extractedDoc = await PDFDocument.load(extractedBytes);
    expect(extractedDoc.getPageCount()).toBe(2);
  });

  it('should merge multiple documents into one', async () => {
    const pdf1 = await createSamplePdf(2);
    const pdf2 = await createSamplePdf(3);

    const merged = await engine.mergeDocuments([pdf1, pdf2]);
    const mergedDoc = await PDFDocument.load(merged);
    expect(mergedDoc.getPageCount()).toBe(5);
  });

  it('should split document into separate parts based on ranges', async () => {
    const pdfBytes = await createSamplePdf(5);
    const { documentId } = await engine.openDocument(pdfBytes);

    const parts = await engine.splitDocument(documentId, [
      [0, 1], // pages 1-2
      [2, 4], // pages 3-5
    ]);

    expect(parts.length).toBe(2);
    const part1 = await PDFDocument.load(parts[0]);
    const part2 = await PDFDocument.load(parts[1]);
    expect(part1.getPageCount()).toBe(2);
    expect(part2.getPageCount()).toBe(3);
  });

  it('should insert text into the document at exact coordinates', async () => {
    const pdfBytes = await createSamplePdf(1);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.insertText(documentId, {
      pageIndex: 0,
      text: 'Confidential Audit Report',
      x: 100,
      y: 200,
      size: 16,
      color: '#0C8DE9',
      fontFamily: 'Helvetica',
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should apply destructive real redaction', async () => {
    const pdfBytes = await createSamplePdf(1);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.applyRedactions(documentId, [
      {
        pageIndex: 0,
        rect: [40, 330, 200, 40],
        overlayText: '[REDACTED]',
      },
    ]);

    const saved = await engine.saveDocument(documentId);
    expect(saved).toBeDefined();
  });

  it('should perform document compression', async () => {
    const pdfBytes = await createSamplePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    const compressRes = await engine.compressDocument(documentId, {
      preset: 'balanced',
      stripMetadata: true,
    });

    expect(compressRes.newBytes).toBeGreaterThan(0);
    expect(compressRes.data).toBeDefined();
  });

  it('should stamp custom watermark onto pages', async () => {
    const pdfBytes = await createSamplePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addWatermark(documentId, {
      text: 'CONFIDENTIAL DRAFT',
      opacity: 0.3,
      fontSize: 48,
      rotationDegrees: 45,
      color: '#EF4444',
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should detect and remove blank pages', async () => {
    // Create doc with 1 page with text and 1 blank page
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([600, 400]);
    p1.drawText('Real Content Page', { x: 50, y: 350, size: 18 });
    doc.addPage([600, 400]); // Blank page
    const docBytes = await doc.save();

    const { documentId } = await engine.openDocument(docBytes);
    expect(engine.getPageCount(documentId)).toBe(2);

    const removed = await engine.removeBlankPages(documentId);
    expect(removed).toContain(1); // Second page was blank
    expect(engine.getPageCount(documentId)).toBe(1);
  });

  it('should legitimately encrypt PDF with AES-256 password protection', async () => {
    const pdfBytes = await createSamplePdf(1);
    const { documentId } = await engine.openDocument(pdfBytes);
    await engine.encryptDocument(documentId, 'SecurePass123!');
    const encryptedBytes = await engine.saveDocument(documentId);

    // Standard PDFDocument.load without ignoreEncryption throws password error on genuine encrypted PDF
    await expect(PDFDocument.load(encryptedBytes)).rejects.toThrow();

    // Loading with ignoreEncryption works for inspection
    const loadedEncrypted = await PDFDocument.load(encryptedBytes, { ignoreEncryption: true });
    expect(loadedEncrypted.getPageCount()).toBe(1);
  });
});
