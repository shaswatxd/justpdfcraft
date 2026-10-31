import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';

describe('FallbackPDFEngine Error Boundaries & Malformed Files', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  it('should cleanly reject 0-byte buffer on openDocument', async () => {
    const emptyBytes = new Uint8Array(0);
    await expect(engine.openDocument(emptyBytes)).rejects.toThrow();
  });

  it('should cleanly reject corrupted non-PDF byte streams', async () => {
    const corruptBytes = new Uint8Array([0x00, 0x12, 0xff, 0x4a, 0x59, 0x90]);
    await expect(engine.openDocument(corruptBytes)).rejects.toThrow();
  });

  it('should reject mergeDocuments when input array is empty', async () => {
    await expect(engine.mergeDocuments([])).rejects.toThrow(/No PDF documents provided for merge/);
  });

  it('should return valid compression result without NaN when input bytes are minimal', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]);
    const bytes = await doc.save();

    const { documentId } = await engine.openDocument(bytes);
    const result = await engine.compressDocument(documentId, { preset: 'balanced', stripMetadata: true });

    expect(Number.isNaN(result.compressionRatio)).toBe(false);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.data.byteLength).toBeGreaterThan(0);
  });
});
