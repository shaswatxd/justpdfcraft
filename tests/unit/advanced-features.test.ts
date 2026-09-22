import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('Advanced Workflows: Sticky Notes, Watermarks & Convert Capabilities', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createMultiPagePdf = async (pageCount: number = 3): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([595.28, 841.89]);
      page.drawText(`Page ${i + 1} Content - SwiftPDF Document Analysis`, {
        x: 50,
        y: 800,
        size: 14,
      });
    }
    return await doc.save();
  };

  it('should add sticky notes to document pages and persist in engine', async () => {
    const pdfBytes = await createMultiPagePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'note-101',
      pageIndex: 0,
      type: 'note',
      content: 'Review section 4 on legal indemnification.',
      rect: [100, 500, 120, 34],
      color: '#fef08a',
      opacity: 1.0,
      createdAt: new Date().toISOString(),
    });

    const annots = await engine.getAnnotations(documentId, 0);
    const note = annots.find((a) => a.id === 'note-101');
    expect(note).toBeDefined();
    expect(note?.content).toBe('Review section 4 on legal indemnification.');
    expect(note?.type).toBe('note');

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should apply watermark with skipCoverPage enabled', async () => {
    const pdfBytes = await createMultiPagePdf(3);
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addWatermark(documentId, {
      text: 'CONFIDENTIAL',
      fontSize: 50,
      opacity: 0.3,
      skipCoverPage: true,
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should support image watermarking on document pages', async () => {
    const pdfBytes = await createMultiPagePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    // Create a 1x1 transparent PNG buffer
    const minimalPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binaryStr = atob(minimalPngBase64);
    const pngBuffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      pngBuffer[i] = binaryStr.charCodeAt(i);
    }

    await engine.addWatermark(documentId, {
      imageBuffer: pngBuffer,
      imageMimeType: 'image/png',
      imageWidth: 150,
      opacity: 0.5,
      rotationDegrees: 0,
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should extract text per page for conversion to plain text and markdown', async () => {
    const pdfBytes = await createMultiPagePdf(2);
    const { documentId } = await engine.openDocument(pdfBytes);

    const page1 = await engine.extractPageText(documentId, 0);
    expect(page1.pageIndex).toBe(0);

    const page2 = await engine.extractPageText(documentId, 1);
    expect(page2.pageIndex).toBe(1);
  });
});
