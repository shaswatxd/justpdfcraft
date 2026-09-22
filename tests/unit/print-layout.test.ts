import { describe, it, expect } from 'vitest';
import { printLayoutEngine, PrintSettings } from '../../core/print/print-layout';

describe('PrintLayoutEngine', () => {
  it('should parse range strings accurately', () => {
    const indices = printLayoutEngine.parseRangeString('1-3, 5, 8-9', 10);
    expect(indices).toEqual([0, 1, 2, 4, 7, 8]);
  });

  it('should calculate odd and even page subsets', () => {
    const baseSettings: PrintSettings = {
      copies: 1,
      duplex: true,
      orientation: 'auto',
      paperSize: 'Letter',
      pagesPerSheet: 1,
      isBooklet: false,
      grayscale: false,
      fitToPage: true,
      rangeOption: 'odd',
    };

    const oddIndices = printLayoutEngine.calculatePageIndices(6, 1, baseSettings);
    expect(oddIndices).toEqual([0, 2, 4]);

    const evenIndices = printLayoutEngine.calculatePageIndices(6, 1, {
      ...baseSettings,
      rangeOption: 'even',
    });
    expect(evenIndices).toEqual([1, 3, 5]);
  });

  it('should run printer safe check for mixed orientations', () => {
    const pages = [
      { pageNumber: 1, width: 600, height: 800, rotation: 0 },
      { pageNumber: 2, width: 800, height: 600, rotation: 0 }, // landscape
    ];

    const res = printLayoutEngine.runPrinterSafeCheck(pages, {
      copies: 1,
      duplex: false,
      orientation: 'portrait',
      paperSize: 'Letter',
      pagesPerSheet: 1,
      isBooklet: false,
      grayscale: false,
      fitToPage: true,
      rangeOption: 'all',
    });

    expect(res.isSafe).toBe(false);
    expect(res.warnings[0]).toContain('mixed portrait and landscape');
  });
});
