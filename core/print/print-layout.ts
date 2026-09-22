import { PageDimensions } from '../pdf/engine.interface';

export type PagesPerSheet = 1 | 2 | 4 | 6 | 8;
export type PrintOrientation = 'portrait' | 'landscape' | 'auto';
export type PageRangeOption = 'all' | 'current' | 'custom' | 'odd' | 'even';

export interface PrintSettings {
  printerName?: string;
  copies: number;
  duplex: boolean;
  orientation: PrintOrientation;
  paperSize: 'Letter' | 'A4' | 'Legal' | 'Custom';
  pagesPerSheet: PagesPerSheet;
  isBooklet: boolean;
  grayscale: boolean;
  fitToPage: boolean;
  rangeOption: PageRangeOption;
  customRangeString?: string;
}

export interface PrinterSafeCheckResult {
  isSafe: boolean;
  warnings: string[];
  recommendations: string[];
}

export class PrintLayoutEngine {
  calculatePageIndices(
    totalCount: number,
    currentPage: number,
    settings: PrintSettings
  ): number[] {
    switch (settings.rangeOption) {
      case 'current':
        return [currentPage - 1];
      case 'odd':
        return Array.from({ length: totalCount }, (_, i) => i).filter((i) => (i + 1) % 2 !== 0);
      case 'even':
        return Array.from({ length: totalCount }, (_, i) => i).filter((i) => (i + 1) % 2 === 0);
      case 'custom':
        return this.parseRangeString(settings.customRangeString || '', totalCount);
      case 'all':
      default:
        return Array.from({ length: totalCount }, (_, i) => i);
    }
  }

  parseRangeString(rangeStr: string, totalCount: number): number[] {
    const indices = new Set<number>();
    const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(totalCount, end); i++) {
            indices.add(i - 1);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalCount) {
          indices.add(num - 1);
        }
      }
    }

    return Array.from(indices).sort((a, b) => a - b);
  }

  runPrinterSafeCheck(
    pages: PageDimensions[],
    settings: PrintSettings
  ): PrinterSafeCheckResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (pages.length === 0) {
      return { isSafe: false, warnings: ['No pages available to print.'], recommendations: [] };
    }

    // Check for mixed orientations
    const orientations = new Set(
      pages.map((p) => ((p.rotation % 180 !== 0 ? p.height : p.width) > (p.rotation % 180 !== 0 ? p.width : p.height) ? 'landscape' : 'portrait'))
    );
    if (orientations.size > 1) {
      warnings.push('Document contains mixed portrait and landscape pages.');
      recommendations.push('Consider setting orientation to "Auto" so pages rotate to fit automatically.');
    }

    // Check 2-up or 4-up with booklet
    if (settings.pagesPerSheet > 1 && settings.isBooklet) {
      warnings.push('Booklet printing automatically sets pages per sheet. Custom N-up may cause overlapping layouts.');
    }

    // Check odd/even duplex matching
    if (settings.duplex && pages.length % 2 !== 0) {
      recommendations.push('The document has an odd number of pages. A blank back-side will be produced for the last sheet.');
    }

    return {
      isSafe: warnings.length === 0,
      warnings,
      recommendations,
    };
  }
}

export const printLayoutEngine = new PrintLayoutEngine();
