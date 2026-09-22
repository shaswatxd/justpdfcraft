import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('FallbackPDFEngine Page Cropping & Margin Trimmer', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createMultiPagePdf = async (count: number = 3): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < count; i++) {
      const page = doc.addPage([600, 800]); // 600 x 800 pt
      page.drawText(`Page Content ${i + 1}`, { x: 100, y: 700, size: 16 });
    }
    return await doc.save();
  };

  it('should crop specific page to specified rectangle dimensions', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    // Crop only page 0 (first page)
    await engine.cropPages(documentId, {
      pageIndices: [0],
      x: 50,
      y: 50,
      width: 400,
      height: 600,
    });

    const savedBytes = await engine.saveDocument(documentId);
    const checkDoc = await PDFDocument.load(savedBytes);
    const pages = checkDoc.getPages();

    // Page 0 should have new cropped dimensions
    const p0Crop = pages[0].getCropBox();
    expect(p0Crop.x).toBe(50);
    expect(p0Crop.y).toBe(50);
    expect(p0Crop.width).toBe(400);
    expect(p0Crop.height).toBe(600);

    // Page 1 should remain original (600 x 800)
    const p1Crop = pages[1].getCropBox();
    expect(p1Crop.width).toBe(600);
    expect(p1Crop.height).toBe(800);
  });

  it('should crop all pages uniformly when pageIndices is omitted', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.cropPages(documentId, {
      x: 20,
      y: 30,
      width: 500,
      height: 700,
    });

    const savedBytes = await engine.saveDocument(documentId);
    const checkDoc = await PDFDocument.load(savedBytes);
    const pages = checkDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const crop = pages[i].getCropBox();
      expect(crop.x).toBe(20);
      expect(crop.y).toBe(30);
      expect(crop.width).toBe(500);
      expect(crop.height).toBe(700);
    }
  });

  it('should trim uniform margins from document pages', async () => {
    const pdfBytes = await createMultiPagePdf(2); // 600 x 800 pt
    const { documentId } = await engine.openDocument(pdfBytes);

    // Trim 50pt left, 50pt right, 100pt top, 100pt bottom
    await engine.trimMargins(documentId, {
      left: 50,
      right: 50,
      top: 100,
      bottom: 100,
    });

    const savedBytes = await engine.saveDocument(documentId);
    const checkDoc = await PDFDocument.load(savedBytes);
    const pages = checkDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const crop = pages[i].getCropBox();
      expect(crop.x).toBe(50);
      expect(crop.y).toBe(100);
      // Width: 600 - (50 + 50) = 500
      expect(crop.width).toBe(500);
      // Height: 800 - (100 + 100) = 600
      expect(crop.height).toBe(600);
    }
  });

  it('should preserve text and content after page cropping round-trip', async () => {
    const pdfBytes = await createMultiPagePdf(1);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.cropPages(documentId, {
      x: 50,
      y: 50,
      width: 450,
      height: 650,
    });

    const savedBytes = await engine.saveDocument(documentId);
    const checkEngine = new FallbackPDFEngine();
    const { documentId: newDocId, metadata } = await checkEngine.openDocument(savedBytes);

    expect(metadata.pageCount).toBe(1);
    const dims = await checkEngine.getPageDimensions(newDocId, 0);
    expect(dims.width).toBe(450);
    expect(dims.height).toBe(650);
  });
});
