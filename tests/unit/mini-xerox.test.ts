import { describe, it, expect } from 'vitest';
import { createMiniXeroxPdf } from '../../core/pdf/miniXerox';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('Mini Xerox / Pocket Notes PDF Engine', () => {
  it('should compile an 8-page document into a single 8-in-1 sheet with cut guides & page badges', async () => {
    const srcDoc = await PDFDocument.create();
    const font = await srcDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 8; i++) {
      const p = srcDoc.addPage([300, 450]);
      p.drawText(`Unit Notes Page ${i + 1}`, { x: 30, y: 350, font, size: 18 });
    }
    const srcBytes = await srcDoc.save();

    const outBytes = await createMiniXeroxPdf([srcBytes], {
      layout: '8-in-1',
      pageSize: 'A4',
      orientation: 'landscape',
      drawCutGuides: true,
      drawPageNumbers: true,
      drawBorders: true,
    });

    expect(outBytes).toBeInstanceOf(Uint8Array);
    expect(outBytes.length).toBeGreaterThan(500);

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1); // 8 pages fit on 1 sheet
  });

  it('should merge multiple PDF documents into a 16-in-1 micro xerox grid', async () => {
    // Document 1 (10 pages)
    const doc1 = await PDFDocument.create();
    const font1 = await doc1.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 10; i++) {
      const p = doc1.addPage([300, 400]);
      p.drawText(`Chapter 1 - Page ${i + 1}`, { x: 30, y: 300, font: font1, size: 14 });
    }
    const bytes1 = await doc1.save();

    // Document 2 (6 pages)
    const doc2 = await PDFDocument.create();
    const font2 = await doc2.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 6; i++) {
      const p = doc2.addPage([300, 400]);
      p.drawText(`Chapter 2 - Page ${i + 1}`, { x: 30, y: 300, font: font2, size: 14 });
    }
    const bytes2 = await doc2.save();

    // Total = 16 pages -> exactly 1 sheet in 16-in-1 layout
    const outBytes = await createMiniXeroxPdf([bytes1, bytes2], {
      layout: '16-in-1',
      pageSize: 'A4',
      orientation: 'portrait',
      drawCutGuides: true,
      drawPageNumbers: true,
      duplexCutSafe: true,
    });

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it('should correctly calculate sheets across multiple pages in 4-in-1 mode', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 9; i++) {
      const p = doc.addPage([300, 400]);
      p.drawText(`Page ${i + 1}`, { x: 30, y: 300, font, size: 14 });
    }
    const bytes = await doc.save();

    // 9 pages with 4-in-1 -> ceil(9/4) = 3 sheets
    const outBytes = await createMiniXeroxPdf([bytes], {
      layout: '4-in-1',
      pageSize: 'A4',
    });

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(3);
  });
});
