import { describe, it, expect } from 'vitest';
import { createMiniXeroxPdf, createNotesChitsPdf, parsePageRange } from '../../core/pdf/miniXerox';
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
      pageOrder: 'horizontal',
      autoRotate: true,
      drawCutGuides: true,
      drawPageNumbers: true,
      drawBorders: true,
    });

    expect(outBytes).toBeInstanceOf(Uint8Array);
    expect(outBytes.length).toBeGreaterThan(500);

    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1); // 8 pages fit on 1 sheet
  });

  it('should support N-Order (vertical column-first) for stackable scissor strips', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 16; i++) {
      const p = doc.addPage([300, 400]);
      p.drawText(`Page ${i + 1}`, { x: 30, y: 300, font, size: 14 });
    }
    const bytes = await doc.save();

    const outBytes = await createMiniXeroxPdf([bytes], {
      layout: '16-in-1',
      pageSize: 'A4',
      pageOrder: 'vertical',
      autoRotate: true,
      drawCutGuides: true,
      drawPageNumbers: true,
    });

    expect(outBytes).toBeInstanceOf(Uint8Array);
    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);
  });

  it('should parse page ranges correctly with parsePageRange', () => {
    expect(parsePageRange('all', 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(parsePageRange('1-4', 10)).toEqual([0, 1, 2, 3]);
    expect(parsePageRange('1, 3, 5-7', 10)).toEqual([0, 2, 4, 5, 6]);
    expect(parsePageRange('odd', 6)).toEqual([0, 2, 4]);
    expect(parsePageRange('even', 6)).toEqual([1, 3, 5]);
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
      pageOrder: 'horizontal',
      autoRotate: true,
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
      autoRotate: true,
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

  it('should handle documents with throwOnInvalidObject: false gracefully', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 200]);
    page.drawText('Stream Decompress Resilience Test');
    const bytes = await doc.save({ useObjectStreams: false });

    const outBytes = await createMiniXeroxPdf([bytes], {
      layout: '4-in-1',
      pageSize: 'A4',
      drawCutGuides: true,
      drawPageNumbers: true,
    });
    expect(outBytes).toBeInstanceOf(Uint8Array);
    const outDoc = await PDFDocument.load(outBytes, { throwOnInvalidObject: false });
    expect(outDoc.getPageCount()).toBe(1);
  });

  it('should apply hard PDF clipping (W n) and inner cell safety padding to prevent card overlap', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 450]);
    page.drawRectangle({ x: 0, y: 0, width: 300, height: 450 });
    const bytes = await doc.save();

    const outBytes = await createMiniXeroxPdf([bytes], {
      layout: '16-in-1',
      pageSize: 'A4',
      orientation: 'portrait',
      pageOrder: 'horizontal',
      contentZoom: 1.25, // even when zoomed, clipping must enclose it
      trimMargins: true,
      drawCutGuides: true,
      drawPageNumbers: true,
      drawBorders: true,
    });

    expect(outBytes).toBeInstanceOf(Uint8Array);
    const outDoc = await PDFDocument.load(outBytes);
    expect(outDoc.getPageCount()).toBe(1);

    // Verify stream contains hard clipping sequence 're W n'
    const zlib = await import('zlib');
    const page0 = outDoc.getPage(0);
    const contentsArr = page0.node.Contents() as any;
    let decompressedStreams = '';
    if (contentsArr && typeof contentsArr.size === 'function') {
      for (let k = 0; k < contentsArr.size(); k++) {
        const s = outDoc.context.lookup(contentsArr.get(k)) as any;
        if (s && s.contents) {
          try {
            decompressedStreams += zlib.inflateSync(s.contents).toString() + '\n';
          } catch {
            decompressedStreams += s.contents.toString() + '\n';
          }
        }
      }
    } else if (contentsArr && contentsArr.contents) {
      try {
        decompressedStreams += zlib.inflateSync(contentsArr.contents).toString() + '\n';
      } catch {
        decompressedStreams += contentsArr.contents.toString() + '\n';
      }
    }
    expect(decompressedStreams).toMatch(/re\s+W\s+n/);
  });
});
