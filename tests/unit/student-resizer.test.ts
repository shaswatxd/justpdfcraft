import { describe, it, expect, vi } from 'vitest';
import {
  EXAM_PRESETS,
  addNameAndDateBanner,
  combinePhotoAndSignature,
  cleanPaperSignature,
} from '../../core/image/student-resizer';

describe('SwiftEditoo Student & Exam Admission Suite', () => {
  it('should provide comprehensive exam presets with valid dimensions and size constraints', () => {
    expect(EXAM_PRESETS.length).toBeGreaterThanOrEqual(10);

    const sscPhoto = EXAM_PRESETS.find((p) => p.id === 'ssc-photo');
    expect(sscPhoto).toBeDefined();
    expect(sscPhoto?.minKb).toBe(20);
    expect(sscPhoto?.maxKb).toBe(50);
    expect(sscPhoto?.widthPx).toBe(200);
    expect(sscPhoto?.heightPx).toBe(230);

    const sscSign = EXAM_PRESETS.find((p) => p.id === 'ssc-sign');
    expect(sscSign).toBeDefined();
    expect(sscSign?.minKb).toBe(10);
    expect(sscSign?.maxKb).toBe(20);

    const upscPhoto = EXAM_PRESETS.find((p) => p.id === 'upsc-photo');
    expect(upscPhoto).toBeDefined();
    expect(upscPhoto?.minKb).toBe(20);
    expect(upscPhoto?.maxKb).toBe(300);

    const ntaSign = EXAM_PRESETS.find((p) => p.id === 'nta-sign');
    expect(ntaSign).toBeDefined();
    expect(ntaSign?.minKb).toBe(4);
    expect(ntaSign?.maxKb).toBe(30);

    // Verify all presets have valid constraints
    for (const preset of EXAM_PRESETS) {
      expect(preset.minKb).toBeGreaterThan(0);
      expect(preset.maxKb).toBeGreaterThanOrEqual(preset.minKb);
      expect(preset.widthPx).toBeGreaterThan(0);
      expect(preset.heightPx).toBeGreaterThan(0);
    }
  });

  it('should generate Name and Date of Photo (DOP) banner correctly', () => {
    // Create mock canvas
    const mockContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
    };

    const mockCanvas = {
      width: 300,
      height: 400,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    const originalCreateElement = globalThis.document?.createElement;
    if (typeof document !== 'undefined') {
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 300,
            height: 400,
            getContext: vi.fn().mockReturnValue(mockContext),
          } as unknown as HTMLCanvasElement;
        }
        return originalCreateElement ? originalCreateElement.call(document, tag) : ({} as any);
      });

      const resCanvas = addNameAndDateBanner(mockCanvas, {
        candidateName: 'RAHUL SHARMA',
        dateOfPhoto: '22/09/2026',
        datePrefix: 'DOP: ',
      });

      expect(resCanvas).toBeDefined();
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'RAHUL SHARMA',
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'DOP: 22/09/2026',
        expect.any(Number),
        expect.any(Number)
      );
    }
  });

  it('should combine photo and signature into unified admission card', () => {
    const mockContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
    };

    const photoCanvas = {
      width: 200,
      height: 230,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    const signCanvas = {
      width: 140,
      height: 60,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    if (typeof document !== 'undefined') {
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 400,
            height: 500,
            getContext: vi.fn().mockReturnValue(mockContext),
          } as unknown as HTMLCanvasElement;
        }
        return {} as any;
      });

      const combined = combinePhotoAndSignature(photoCanvas, signCanvas, {
        layout: 'stacked',
      });

      expect(combined).toBeDefined();
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    }
  });

  it('should whiten paper background and enhance signature ink strokes', () => {
    const width = 10;
    const height = 10;
    // 10x10 dummy RGBA pixels
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill background with light yellowish paper (R=210, G=205, B=195)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 210;
      data[i + 1] = 205;
      data[i + 2] = 195;
      data[i + 3] = 255;
    }

    // Put a dark ink pixel in the middle (R=40, G=40, B=40)
    const midIdx = (5 * width + 5) * 4;
    data[midIdx] = 40;
    data[midIdx + 1] = 40;
    data[midIdx + 2] = 40;
    data[midIdx + 3] = 255;

    const imgData = {
      width,
      height,
      data,
    };

    const mockCtx = {
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(imgData),
      putImageData: vi.fn(),
      fillStyle: '',
      fillRect: vi.fn(),
    };

    const mockCanvas = {
      width,
      height,
      getContext: vi.fn().mockReturnValue(mockCtx),
    } as unknown as HTMLCanvasElement;

    if (typeof document !== 'undefined') {
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') {
          return {
            width,
            height,
            getContext: vi.fn().mockReturnValue(mockCtx),
          } as unknown as HTMLCanvasElement;
        }
        return {} as any;
      });

      const cleaned = cleanPaperSignature(mockCanvas, {
        threshold: 180,
        inkEnhance: 'black',
        autoCropPadding: 0,
      });

      expect(cleaned).toBeDefined();
      expect(mockCtx.putImageData).toHaveBeenCalled();

      // Paper background should now be converted to pure white (255, 255, 255)
      expect(data[0]).toBe(255);
      expect(data[1]).toBe(255);
      expect(data[2]).toBe(255);

      // Ink pixel should be darkened
      expect(data[midIdx]).toBeLessThanOrEqual(40);
    }
  });
});
