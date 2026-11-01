# Phase 10: Multi-Language OCR Model Auto-Caching & Offline Storage

## Objective
Implement client-side caching and offline storage for Tesseract.js traineddata models (English, Hindi, Bengali, Tamil, Spanish, French, German, Chinese, Japanese) using Cache API and IndexedDB fallback to eliminate redundant multi-megabyte network downloads and ensure 100% offline OCR capability.

---

## Technical Specifications & Architecture

### 1. Model Cache Engine (`core/ocr/model-cache.ts`)
- **Dual-Layer Storage**:
  - Primary: Browser `CacheStorage` (`caches.open('justpdfcraft-ocr-models-v1')`).
  - Secondary/Fallback: IndexedDB (`justpdfcraft_ocr_db`, store: `traineddata`).
- **Core API**:
  - `hasModel(lang: string): Promise<boolean>`: Quick check if a language model is available locally.
  - `cacheModel(lang: string, buffer: ArrayBuffer): Promise<void>`: Stores compressed `.traineddata.gz`.
  - `getModelBlobUrl(lang: string): Promise<string | null>`: Retrieves local model as an object URL for Tesseract worker instantiation.
  - `downloadAndCache(lang: string, onProgress?: (percent: number) => void): Promise<boolean>`: Pre-downloads and stores traineddata model with download progress.
  - `getCachedModels(): Promise<Array<{ lang: string; sizeBytes: number; cachedAt: number }>>`: Lists cached models with disk usage.
  - `deleteModel(lang: string): Promise<void>`: Purges single language model.
  - `clearAllModels(): Promise<void>`: Wipes entire OCR model cache.

### 2. Supported Languages & Metadata
- `eng`: English (~4.1 MB)
- `hin`: Hindi (~11.8 MB)
- `ben`: Bengali (~12.2 MB)
- `tam`: Tamil (~10.5 MB)
- `spa`: Spanish (~4.8 MB)
- `fra`: French (~4.9 MB)
- `deu`: German (~5.2 MB)
- `chi_sim`: Chinese Simplified (~22.1 MB)
- `jpn`: Japanese (~23.5 MB)

### 3. Worker & Service Integration (`core/ocr/ocr-pool.ts` & `core/ocr/ocr-service.ts`)
- Check `modelCache.hasModel(lang)` before worker instantiation.
- If model is cached locally, serve via local path / blob URL or intercept fetch, avoiding network latency.
- Auto-cache downloaded models on successful completion of recognition jobs so subsequent runs are instant.

### 4. UI Controls in `OCRDialog.tsx`
- Language selector displays offline status badge (e.g. `✓ Offline Ready` vs `⬇ 11.8 MB`).
- 1-click "Download for Offline" button next to language dropdown with progress bar.
- "Manage Offline Models" collapsible drawer showing disk usage and cache deletion.

### 5. Tests & Verification
- Unit tests in `tests/unit/ocr-model-cache.test.ts`.
- Verification of test suite (`npm test`).
- Production build compilation (`npm run build`).
