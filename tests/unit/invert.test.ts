import { describe, it, expect, vi } from 'vitest';
import { applyInvertToImageData, convertToInvertedPdf } from '../../core/pdf/invert';
import { PDFEngine } from '../../core/pdf/engine.interface';
import { PDFDocument } from 'pdf-lib';

describe('PDF Invert & Dark Mode Engine', () => {
  it('should accurately invert RGBA pixel color values', () => {
    // Pure White, Pure Black, Red, Green
    const pixels = [
      255, 255, 255, 255, // White -> Black
      0, 0, 0, 255,       // Black -> White
      200, 50, 10, 255,   // Custom RGB
    ];

    applyInvertToImageData(pixels);

    // White inverted: 255 - 255 = 0
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBe(0);
    expect(pixels[2]).toBe(0);
    expect(pixels[3]).toBe(255); // Alpha preserved

    // Black inverted: 255 - 0 = 255
    expect(pixels[4]).toBe(255);
    expect(pixels[5]).toBe(255);
    expect(pixels[6]).toBe(255);
    expect(pixels[7]).toBe(255);

    // Custom RGB inverted
    expect(pixels[8]).toBe(55);
    expect(pixels[9]).toBe(205);
    expect(pixels[10]).toBe(245);
  });

  it('should generate valid inverted PDF from document pages using mock engine', async () => {
    const onePixelJpg =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const mockEngine: Partial<PDFEngine> = {
      getPageCount: vi.fn().mockReturnValue(2),
      getPageDimensions: vi.fn().mockResolvedValue({
        pageNumber: 1,
        width: 595,
        height: 842,
        rotation: 0,
      }),
      renderPage: vi.fn().mockResolvedValue({
        pageIndex: 0,
        canvas: null,
        imageDataUrl: onePixelJpg,
        width: 595,
        height: 842,
        scale: 2.0,
      }),
    };

    const outBytes = await convertToInvertedPdf(
      'doc-invert',
      {},
      mockEngine as PDFEngine
    );

    expect(outBytes).toBeInstanceOf(Uint8Array);
    const loaded = await PDFDocument.load(outBytes);
    expect(loaded.getPageCount()).toBe(2);
  });
});
