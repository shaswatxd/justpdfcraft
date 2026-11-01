import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OCRModelCache, SUPPORTED_OCR_LANGUAGES } from '../../core/ocr/model-cache';

describe('OCR Model Cache & Offline Storage', () => {
  let cache: OCRModelCache;

  beforeEach(() => {
    cache = new OCRModelCache();
  });

  it('should define all major regional and international languages', () => {
    expect(SUPPORTED_OCR_LANGUAGES['eng']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['hin']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['ben']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['tam']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['spa']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['fra']).toBeDefined();
    expect(SUPPORTED_OCR_LANGUAGES['deu']).toBeDefined();
  });

  it('should save, retrieve, and detect cached model buffers', async () => {
    const dummyBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;

    expect(await cache.hasModel('hin')).toBe(false);

    await cache.saveModelBuffer('hin', dummyBuffer);

    expect(await cache.hasModel('hin')).toBe(true);

    const retrieved = await cache.getModelBuffer('hin');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.byteLength).toBe(8);
  });

  it('should list cached models with names and byte sizes', async () => {
    const engBuf = new Uint8Array([10, 20, 30]).buffer;
    const hinBuf = new Uint8Array([40, 50, 60, 70]).buffer;

    await cache.saveModelBuffer('eng', engBuf);
    await cache.saveModelBuffer('hin', hinBuf);

    const models = await cache.getCachedModels();
    expect(models.length).toBe(2);

    const engModel = models.find((m) => m.lang === 'eng');
    expect(engModel).toBeDefined();
    expect(engModel?.name).toBe('English');
    expect(engModel?.sizeBytes).toBe(3);

    const hinModel = models.find((m) => m.lang === 'hin');
    expect(hinModel).toBeDefined();
    expect(hinModel?.name).toBe('Hindi');
    expect(hinModel?.sizeBytes).toBe(4);
  });

  it('should delete a single model from cache', async () => {
    const buf = new Uint8Array([1, 2]).buffer;
    await cache.saveModelBuffer('spa', buf);
    expect(await cache.hasModel('spa')).toBe(true);

    await cache.deleteModel('spa');
    expect(await cache.hasModel('spa')).toBe(false);
  });

  it('should clear all models in one call', async () => {
    await cache.saveModelBuffer('eng', new Uint8Array([1]).buffer);
    await cache.saveModelBuffer('fra', new Uint8Array([2]).buffer);

    await cache.clearAllModels();

    expect(await cache.hasModel('eng')).toBe(false);
    expect(await cache.hasModel('fra')).toBe(false);
    const models = await cache.getCachedModels();
    expect(models.length).toBe(0);
  });

  it('should report progress when downloadAndCache is called', async () => {
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const progressSpy = vi.fn();

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) => (h === 'content-length' ? '4' : null),
      },
      arrayBuffer: async () => dummyBuffer,
      body: null,
    } as any);

    const success = await cache.downloadAndCache('ben', progressSpy);
    expect(success).toBe(true);
    expect(await cache.hasModel('ben')).toBe(true);
    expect(progressSpy).toHaveBeenCalledWith(100);
  });
});
