/**
 * JustPDFCraft — Multi-Language OCR Model Auto-Caching Engine
 * Caches Tesseract traineddata language models in CacheStorage & IndexedDB
 * for instant, 100% offline neural OCR.
 */

export interface CachedModelInfo {
  lang: string;
  name: string;
  sizeBytes: number;
  cachedAt: number;
}

export const SUPPORTED_OCR_LANGUAGES: Record<string, { name: string; estSizeMB: number }> = {
  eng: { name: 'English', estSizeMB: 4.1 },
  hin: { name: 'Hindi', estSizeMB: 11.8 },
  ben: { name: 'Bengali', estSizeMB: 12.2 },
  tam: { name: 'Tamil', estSizeMB: 10.5 },
  spa: { name: 'Spanish', estSizeMB: 4.8 },
  fra: { name: 'French', estSizeMB: 4.9 },
  deu: { name: 'German', estSizeMB: 5.2 },
  chi_sim: { name: 'Chinese Simplified', estSizeMB: 22.1 },
  jpn: { name: 'Japanese', estSizeMB: 23.5 },
};

const CACHE_NAME = 'justpdfcraft-ocr-models-v1';
const DB_NAME = 'justpdfcraft_ocr_db';
const STORE_NAME = 'traineddata';
const TESSDATA_BASE_URL = 'https://tessdata.projectnaptha.com/4.0.0';

export class OCRModelCache {
  // In-memory fallback map for environments without CacheStorage/IndexedDB (e.g. Node tests)
  private memoryCache = new Map<string, { buffer: ArrayBuffer; cachedAt: number }>();

  /**
   * Returns true if the language model is present in CacheStorage, IndexedDB, or memory.
   */
  async hasModel(lang: string): Promise<boolean> {
    if (this.memoryCache.has(lang)) return true;

    // 1. Check CacheStorage
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(`${TESSDATA_BASE_URL}/${lang}.traineddata.gz`);
        if (match) return true;
      } catch (e) {
        // Fall through to IndexedDB
      }
    }

    // 2. Check IndexedDB
    try {
      const db = await this.openDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(lang);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Retrieves the raw traineddata buffer from cache.
   */
  async getModelBuffer(lang: string): Promise<ArrayBuffer | null> {
    const mem = this.memoryCache.get(lang);
    if (mem) return mem.buffer;

    // 1. Try CacheStorage
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(`${TESSDATA_BASE_URL}/${lang}.traineddata.gz`);
        if (match) {
          const buf = await match.arrayBuffer();
          this.memoryCache.set(lang, { buffer: buf, cachedAt: Date.now() });
          return buf;
        }
      } catch (e) {
        // Fall through
      }
    }

    // 2. Try IndexedDB
    try {
      const db = await this.openDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(lang);
        req.onsuccess = () => {
          if (req.result && req.result.buffer) {
            this.memoryCache.set(lang, { buffer: req.result.buffer, cachedAt: req.result.cachedAt || Date.now() });
            resolve(req.result.buffer);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Saves an ArrayBuffer into persistent cache layers.
   */
  async saveModelBuffer(lang: string, buffer: ArrayBuffer): Promise<void> {
    this.memoryCache.set(lang, { buffer, cachedAt: Date.now() });

    // 1. Save to CacheStorage
    if (typeof caches !== 'undefined' && typeof Response !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        const resp = new Response(buffer.slice(0), {
          headers: {
            'Content-Type': 'application/gzip',
            'Content-Length': buffer.byteLength.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
        await cache.put(`${TESSDATA_BASE_URL}/${lang}.traineddata.gz`, resp);
      } catch (e) {
        console.warn('Could not store model in CacheStorage:', e);
      }
    }

    // 2. Save to IndexedDB
    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put({ lang, buffer, sizeBytes: buffer.byteLength, cachedAt: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    } catch (e) {
      console.warn('Could not store model in IndexedDB:', e);
    }
  }

  /**
   * Pre-downloads and stores traineddata model with download progress reporting.
   */
  async downloadAndCache(
    lang: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<boolean> {
    // If already cached, notify 100% and exit
    if (await this.hasModel(lang)) {
      onProgress?.(100);
      return true;
    }

    const url = `${TESSDATA_BASE_URL}/${lang}.traineddata.gz`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch model from ${url}: HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body || totalBytes === 0) {
        const buffer = await response.arrayBuffer();
        await this.saveModelBuffer(lang, buffer);
        onProgress?.(100);
        return true;
      }

      // Stream with download progress
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            onProgress(percent);
          }
        }
      }

      // Concatenate chunks
      const combined = new Uint8Array(receivedBytes);
      let position = 0;
      for (const chunk of chunks) {
        combined.set(chunk, position);
        position += chunk.length;
      }

      await this.saveModelBuffer(lang, combined.buffer);
      onProgress?.(100);
      return true;
    } catch (err) {
      console.error(`Error downloading OCR model "${lang}":`, err);
      return false;
    }
  }

  /**
   * Lists all cached models with human-readable language names and byte sizes.
   */
  async getCachedModels(): Promise<CachedModelInfo[]> {
    const results: CachedModelInfo[] = [];

    // From memory
    for (const [lang, item] of this.memoryCache.entries()) {
      results.push({
        lang,
        name: SUPPORTED_OCR_LANGUAGES[lang]?.name || lang.toUpperCase(),
        sizeBytes: item.buffer.byteLength,
        cachedAt: item.cachedAt,
      });
    }

    // From IndexedDB
    try {
      const db = await this.openDB();
      if (db) {
        const items = await new Promise<any[]>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        for (const item of items) {
          if (!results.some((r) => r.lang === item.lang)) {
            results.push({
              lang: item.lang,
              name: SUPPORTED_OCR_LANGUAGES[item.lang]?.name || item.lang.toUpperCase(),
              sizeBytes: item.sizeBytes || item.buffer?.byteLength || 0,
              cachedAt: item.cachedAt || Date.now(),
            });
          }
        }
      }
    } catch (e) {
      // Ignore
    }

    return results;
  }

  /**
   * Deletes a single language model from all storage tiers.
   */
  async deleteModel(lang: string): Promise<void> {
    this.memoryCache.delete(lang);

    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.delete(`${TESSDATA_BASE_URL}/${lang}.traineddata.gz`);
      } catch (e) {
        // Ignore
      }
    }

    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(lang);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Clears all cached models.
   */
  async clearAllModels(): Promise<void> {
    this.memoryCache.clear();

    if (typeof caches !== 'undefined') {
      try {
        await caches.delete(CACHE_NAME);
      } catch (e) {
        // Ignore
      }
    }

    try {
      const db = await this.openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Internal IndexedDB helper.
   */
  private async openDB(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'lang' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
}

export const ocrModelCache = new OCRModelCache();
