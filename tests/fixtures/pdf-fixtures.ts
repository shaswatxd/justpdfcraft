import { PDFDocument, rgb, degrees } from 'pdf-lib';

/**
 * Deterministic Test PDF Fixtures as specified in Section 7:
 * PDF-1: 1 page, text content
 * PDF-2: 3 pages, different text
 * PDF-3: 10+ pages
 * PDF-4: scanned/image-like PDF
 * PDF-5: different page dimensions
 * PDF-6: rotated page
 * PDF-7: corrupted/invalid PDF
 * PDF-8: very large test document (50 pages)
 */

export async function createPdf1_SinglePageText(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  page.drawText('JustPDFCraft Test Document 1 - Single Page Text', {
    x: 50,
    y: 780,
    size: 16,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText('This is deterministic body text for validation, search, and export testing.', {
    x: 50,
    y: 740,
    size: 12,
    color: rgb(0.2, 0.2, 0.2),
  });
  return await doc.save();
}

export async function createPdf2_ThreePagesDifferentText(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  
  const p1 = doc.addPage([600, 400]);
  p1.drawText('Page 1: Alpha introduction and overview.', { x: 40, y: 350, size: 14, color: rgb(0, 0, 0) });

  const p2 = doc.addPage([600, 400]);
  p2.drawText('Page 2: Beta detailed tabular specifications.', { x: 40, y: 350, size: 14, color: rgb(0, 0, 0) });

  const p3 = doc.addPage([600, 400]);
  p3.drawText('Page 3: Gamma conclusion and references.', { x: 40, y: 350, size: 14, color: rgb(0, 0, 0) });

  return await doc.save();
}

export async function createPdf3_TenPlusPages(pageCount = 12): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Multi-Page Document - Section ${i + 1} of ${pageCount}`, {
      x: 50,
      y: 800,
      size: 16,
      color: rgb(0.1, 0.1, 0.3),
    });
    page.drawText(`Page content payload index ${i} with deterministic checksum verification.`, {
      x: 50,
      y: 760,
      size: 11,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  return await doc.save();
}

export async function createPdf4_ScannedImageLike(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);

  // Create an embedded small raster PNG (1x1 red pixel or embedded PNG bytes)
  // 1x1 red PNG base64
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0));
  const embeddedPng = await doc.embedPng(pngBytes);

  page.drawImage(embeddedPng, {
    x: 50,
    y: 50,
    width: 400,
    height: 400,
  });

  return await doc.save();
}

export async function createPdf5_MixedDimensions(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Page 1: A4 Portrait
  doc.addPage([595.28, 841.89]);
  // Page 2: Letter Landscape
  doc.addPage([792.0, 612.0]);
  // Page 3: Square Custom
  doc.addPage([500.0, 500.0]);
  return await doc.save();
}

export async function createPdf6_RotatedPages(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  
  const p1 = doc.addPage([600, 400]);
  p1.setRotation(degrees(0));
  p1.drawText('Rotation 0 degrees', { x: 50, y: 300, size: 14 });

  const p2 = doc.addPage([600, 400]);
  p2.setRotation(degrees(90));
  p2.drawText('Rotation 90 degrees', { x: 50, y: 300, size: 14 });

  const p3 = doc.addPage([600, 400]);
  p3.setRotation(degrees(180));
  p3.drawText('Rotation 180 degrees', { x: 50, y: 300, size: 14 });

  return await doc.save();
}

export function createPdf7_CorruptedInvalid(): Uint8Array {
  // Invalid header & truncated content
  return new TextEncoder().encode('%PDF-NOT-A-REAL-PDF-CONTENT-CORRUPT-HEADER\x00\xFF\xAA\xBB');
}

export async function createPdf8_VeryLargeDocument(pageCount = 50): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Large Document Test Page ${i + 1}`, { x: 50, y: 800, size: 14 });
    page.drawRectangle({
      x: 50,
      y: 500,
      width: 495,
      height: 250,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
  }
  return await doc.save();
}
