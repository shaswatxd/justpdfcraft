import { describe, it, expect } from 'vitest';
import { createXlsx } from '../../src/utils/xlsx';

describe('Excel (.xlsx) Utility', () => {
  it('should generate valid .xlsx binary output for table data', () => {
    const tableRows = [
      ['Name', 'Roll No', 'Score', 'Status'],
      ['Rahul Sharma', '101', '89.5', 'Pass'],
      ['Priya Verma', '102', '94.0', 'Pass'],
      ['Amit Kumar & Son', '103', '72.0', 'Pass <with distinction>'],
    ];

    const xlsxBytes = createXlsx(tableRows, 'StudentMarks');
    expect(xlsxBytes).toBeInstanceOf(Uint8Array);
    expect(xlsxBytes.length).toBeGreaterThan(500);

    // Verify ZIP magic header PK\x03\x04
    expect(xlsxBytes[0]).toBe(0x50); // P
    expect(xlsxBytes[1]).toBe(0x4b); // K
    expect(xlsxBytes[2]).toBe(0x03);
    expect(xlsxBytes[3]).toBe(0x04);
  });
});
