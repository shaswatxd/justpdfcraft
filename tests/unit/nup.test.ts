import { describe, it, expect, vi } from 'vitest';
import { createNUpPdf } from '../../core/pdf/nup';
import { PDFEngine } from '../../core/pdf/engine.interface';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('N-Up Multi-Page Layout Engine', () => {
  it('should compile a 4-page PDF into a single 4-up sheet', async () => {
    // Generate a real 4-page source PDF
    const srcDoc = await PDFDocument.create();
    const font = await srcDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 4; i++) {
      const p = srcDoc.addPage([400, 600]);
      p.drawText(`Slide ${i + 1}`, { x: 50, y: 500, font, size: 20 });
    }
    const srcBytes = await srcDoc.save();

    const mockEngine: Partial<PDFEngine> = {
      saveDocument: vi.fn().mockResolvedValue(srcBytes),
    };

    const outBytes = await createNUpPdf(
      'doc-1',
      {
        layout: '4-up',
        pageSize: 'A4',
        orientation: 'landscape',
        drawBorder: true,
      },
      mockEngine as PDFEngine
    );

    expect(outBytes).toBeInstanceOf(Uint8Array);
    expect(outBytes.length).toBeGreaterThan(100);

    // Verify output document structure
    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1); // 4 pages fit onto 1 sheet
  });

  it('should split 6 pages into 3 sheets in 2-up mode', async () => {
    const srcDoc = await PDFDocument.create();
    const font = await srcDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 6; i++) {
      const p = srcDoc.addPage([400, 600]);
      p.drawText(`Page ${i + 1}`, { x: 50, y: 500, font, size: 20 });
    }
    const srcBytes = await srcDoc.save();

    const mockEngine: Partial<PDFEngine> = {
      saveDocument: vi.fn().mockResolvedValue(srcBytes),
    };

    const outBytes = await createNUpPdf(
      'doc-2',
      {
        layout: '2-up',
        pageSize: 'A4',
      },
      mockEngine as PDFEngine
    );

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(3); // 6 pages / 2 per sheet = 3 sheets
  });

  it('should respect custom pageIndices selection', async () => {
    const srcDoc = await PDFDocument.create();
    const font = await srcDoc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 8; i++) {
      const p = srcDoc.addPage([400, 600]);
      p.drawText(`Slide ${i + 1}`, { x: 50, y: 500, font, size: 20 });
    }
    const srcBytes = await srcDoc.save();

    const mockEngine: Partial<PDFEngine> = {
      saveDocument: vi.fn().mockResolvedValue(srcBytes),
    };

    const outBytes = await createNUpPdf(
      'doc-3',
      {
        layout: '4-up',
        pageIndices: [0, 1], // only 2 slides chosen
      },
      mockEngine as PDFEngine
    );

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });
});
