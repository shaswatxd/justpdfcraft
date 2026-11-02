import { describe, it, expect } from 'vitest';
import { createMiniXeroxPdf, createNotesChitsPdf } from '../../core/pdf/miniXerox';
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
      contentZoom: 1.15,
      trimMargins: true,
    });

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it('should compile 25 pages into 1 sheet in 25-in-1 ultra micro layout', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 25; i++) {
      const p = doc.addPage([300, 400]);
      p.drawText(`Page ${i + 1}`, { x: 30, y: 300, font, size: 14 });
    }
    const bytes = await doc.save();

    const outBytes = await createMiniXeroxPdf([bytes], {
      layout: '25-in-1',
      pageSize: 'A4',
    });

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it('should typeset raw formula/notes text into compact micro chits with font size control', async () => {
    const formulas = `
# PHYSICS FORMULAS
E = mc^2
F = ma
v = u + at
s = ut + (1/2)at^2
v^2 = u^2 + 2as
W = F * d * cos(theta)
P = W / t

# THERMODYNAMICS
PV = nRT
dQ = dU + dW
Delta S = dQ / T

# CALCULUS DERIVATIVES
d/dx(x^n) = n*x^(n-1)
d/dx(sin x) = cos x
d/dx(cos x) = -sin x
d/dx(e^x) = e^x
d/dx(ln x) = 1/x
    `;

    const outBytes = await createNotesChitsPdf({
      text: formulas,
      fontSize: 7, // chota text
      columnsPerChit: 2,
      layout: '16-in-1',
      drawCutGuides: true,
      drawPageNumbers: true,
    });

    expect(outBytes).toBeInstanceOf(Uint8Array);
    expect(outBytes.length).toBeGreaterThan(100);

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
