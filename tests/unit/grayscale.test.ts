import { describe, it, expect, vi } from 'vitest';
import { applyGrayscaleToImageData, convertToGrayscalePdf } from '../../core/pdf/grayscale';
import { PDFEngine } from '../../core/pdf/engine.interface';

describe('PDF to Grayscale Engine & Luma Transform', () => {
  it('should transform color RGB pixels to accurate BT.601 grayscale values', () => {
    // Red, Green, Blue, White, Black pixels
    const pixels = [
      255, 0, 0, 255,     // Red
      0, 255, 0, 255,     // Green
      0, 0, 255, 255,     // Blue
      255, 255, 255, 255, // White
      0, 0, 0, 255,       // Black
    ];

    applyGrayscaleToImageData(pixels);

    // Red: 0.299 * 255 = 76
    expect(pixels[0]).toBe(76);
    expect(pixels[1]).toBe(76);
    expect(pixels[2]).toBe(76);

    // Green: 0.587 * 255 = 150
    expect(pixels[4]).toBe(150);
    expect(pixels[5]).toBe(150);
    expect(pixels[6]).toBe(150);

    // Blue: 0.114 * 255 = 29
    expect(pixels[8]).toBe(29);
    expect(pixels[9]).toBe(29);
    expect(pixels[10]).toBe(29);

    // White: stays 255
    expect(pixels[12]).toBe(255);
    expect(pixels[13]).toBe(255);
    expect(pixels[14]).toBe(255);

    // Black: stays 0
    expect(pixels[16]).toBe(0);
    expect(pixels[17]).toBe(0);
    expect(pixels[18]).toBe(0);
  });

  it('should convert document pages to valid PDF document using mock engine', async () => {
    // 1x1 base64 valid JPEG pixel
    const onePixelJpgBase64 =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const mockEngine: Partial<PDFEngine> = {
      getPageCount: vi.fn().mockReturnValue(2),
      getPageDimensions: vi.fn().mockResolvedValue({
        pageNumber: 1,
        width: 612,
        height: 792,
        rotation: 0,
      }),
      renderPage: vi.fn().mockResolvedValue({
        pageIndex: 0,
        canvas: null,
        imageDataUrl: onePixelJpgBase64,
        width: 612,
        height: 792,
        scale: 2.0,
      }),
    };

    const onProgress = vi.fn();
    const pdfBytes = await convertToGrayscalePdf(
      'doc_test_123',
      { scale: 2.0, onProgress },
      mockEngine as PDFEngine
    );

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(100);

    // PDF Magic Number header %PDF-
    const header = String.fromCharCode(...pdfBytes.subarray(0, 5));
    expect(header).toBe('%PDF-');

    expect(mockEngine.getPageCount).toHaveBeenCalledWith('doc_test_123');
    expect(mockEngine.renderPage).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(1, 2);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });
});
