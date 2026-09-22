import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { uint8ArrayToBase64, base64ToUint8Array } from '../../core/pdf/image-extractor';
import { PDFDocument } from 'pdf-lib';

// Minimal 1x1 transparent PNG data bytes for test embedding
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('SwiftPDF Photo & Image Extraction Engine', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  it('should accurately encode and decode bytes to/from Base64', () => {
    const original = new Uint8Array([72, 101, 108, 108, 111, 32, 80, 68, 70, 33]);
    const b64 = uint8ArrayToBase64(original);
    expect(b64).toBe('SGVsbG8gUERGIQ==');

    const restored = base64ToUint8Array(b64);
    expect(restored).toEqual(original);
  });

  it('should extract embedded images from a PDF document', async () => {
    // 1. Create a PDF and embed an image
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 700]);

    const pngBytes = base64ToUint8Array(TINY_PNG_BASE64);
    const pngImage = await doc.embedPng(pngBytes);

    page.drawImage(pngImage, {
      x: 50,
      y: 100,
      width: 100,
      height: 100,
    });

    const pdfBytes = await doc.save();
    const { documentId } = await engine.openDocument(pdfBytes);

    // 2. Extract images using engine
    const images = await engine.extractImages(documentId);

    expect(images.length).toBeGreaterThanOrEqual(1);
    const first = images[0];
    expect(first.width).toBeGreaterThanOrEqual(1);
    expect(first.height).toBeGreaterThanOrEqual(1);
    expect(first.mimeType).toBe('image/png');
    expect(first.dataUrl).toContain('data:image/png;base64,');
    expect(first.sizeBytes).toBeGreaterThan(0);
    expect(first.pageIndex).toBe(0);
  });

  it('should extract multiple images across different pages', async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([400, 600]);
    const p2 = doc.addPage([400, 600]);

    const pngBytes = base64ToUint8Array(TINY_PNG_BASE64);
    const img1 = await doc.embedPng(pngBytes);
    const img2 = await doc.embedPng(pngBytes);

    p1.drawImage(img1, { x: 20, y: 40, width: 80, height: 80 });
    p2.drawImage(img2, { x: 50, y: 50, width: 120, height: 120 });

    const pdfBytes = await doc.save();
    const { documentId } = await engine.openDocument(pdfBytes);

    const images = await engine.extractImages(documentId);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('should fallback to high-resolution page rendering when PDF is a scanned document without XObjects', async () => {
    // Plain PDF without image XObjects (simulates scanned text/vector page)
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 500]);
    page.drawText('Scanned Document Content', { x: 50, y: 400, size: 14 });

    const pdfBytes = await doc.save();
    const { documentId } = await engine.openDocument(pdfBytes);

    const images = await engine.extractImages(documentId);
    // Should fallback to page render so extraction never leaves the user with an empty set for scanned docs
    expect(images.length).toBe(1);
    expect(images[0].name).toContain('Full_Photo');
    expect(images[0].pageIndex).toBe(0);
    expect(images[0].dataUrl).toContain('data:image/');
  });
});
