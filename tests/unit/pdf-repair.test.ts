import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { repairPdf } from '../../src/utils/repairPdf';

describe('PDF Repair & Recovery Engine', () => {
  it('should repair a valid document and rebuild xref table', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const bytes = await doc.save();

    const result = await repairPdf(bytes);
    expect(result.success).toBe(true);
    expect(result.pageCount).toBe(1);
    expect(result.data).toBeDefined();
    expect(result.data![0]).toBe(0x25); // %
    expect(result.data![1]).toBe(0x50); // P
  });

  it('should recover a PDF with leading junk bytes (displaced header)', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const bytes = await doc.save();

    // Add 128 bytes of garbage before %PDF
    const junk = new TextEncoder().encode('HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\n\r\n');
    const corrupted = new Uint8Array(junk.length + bytes.length);
    corrupted.set(junk, 0);
    corrupted.set(bytes, junk.length);

    const result = await repairPdf(corrupted);
    expect(result.success).toBe(true);
    expect(result.pageCount).toBe(1);
  });

  it('should recover a PDF with a truncated or missing %%EOF trailer', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const bytes = await doc.save();

    // Strip the last 15 bytes to simulate chopped transfer
    const truncated = bytes.slice(0, bytes.length - 15);
    const result = await repairPdf(truncated);
    expect(result.success).toBe(true);
  });

  it('should return helpful error for completely invalid non-PDF binary', async () => {
    const randomGarbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const result = await repairPdf(randomGarbage);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
