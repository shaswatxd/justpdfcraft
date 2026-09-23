import { describe, it, expect } from 'vitest';
import { createZip } from '@/utils/zip';

describe('createZip Utility', () => {
  it('should generate a valid ZIP buffer from files', () => {
    const encoder = new TextEncoder();
    const files = [
      { name: 'hello.txt', data: encoder.encode('Hello World!') },
      { name: 'doc.pdf', data: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }, // %PDF
    ];

    const zipBytes = createZip(files);
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.length).toBeGreaterThan(0);

    // Verify ZIP magic numbers: PK\x03\x04
    expect(zipBytes[0]).toBe(0x50); // P
    expect(zipBytes[1]).toBe(0x4b); // K
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);
  });

  it('should handle empty file list gracefully', () => {
    const zipBytes = createZip([]);
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    // Even an empty ZIP has the 22-byte End of Central Directory record: PK\x05\x06
    expect(zipBytes.length).toBe(22);
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x05);
    expect(zipBytes[3]).toBe(0x06);
  });
});
