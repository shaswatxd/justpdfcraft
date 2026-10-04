import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateIdCardSheet } from '../../core/image/student-resizer';

describe('ID Card Front + Back Merger Engine', () => {
  let originalDocument: any;

  beforeEach(() => {
    originalDocument = (globalThis as any).document;
  });

  afterEach(() => {
    (globalThis as any).document = originalDocument;
  });

  it('should generate A4 portrait vertical sheet with front and back cards', () => {
    const mockContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      }),
    };

    const frontImg = { width: 800, height: 500 } as HTMLImageElement;
    const backImg = { width: 800, height: 500 } as HTMLImageElement;

    const result = generateIdCardSheet(frontImg, backImg, {
      sheetSize: 'a4',
      orientation: 'portrait',
      layout: 'vertical',
      showCutLines: true,
      showLabels: true,
      title: 'COLLEGE ID CARD COPY',
    });

    expect(result.width).toBe(2480);
    expect(result.height).toBe(3508);
    expect(mockContext.drawImage).toHaveBeenCalledTimes(2);
    expect(mockContext.fillText).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('should generate horizontal layout for landscape orientation', () => {
    const mockContext = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    (globalThis as any).document = {
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      }),
    };

    const frontImg = { width: 856, height: 540 } as HTMLImageElement;
    const backImg = { width: 856, height: 540 } as HTMLImageElement;

    const result = generateIdCardSheet(frontImg, backImg, {
      sheetSize: 'a4',
      orientation: 'landscape',
      layout: 'horizontal',
      showCutLines: true,
      showLabels: false,
    });

    expect(result.width).toBe(3508);
    expect(result.height).toBe(2480);
    expect(mockContext.drawImage).toHaveBeenCalledTimes(2);
  });
});
