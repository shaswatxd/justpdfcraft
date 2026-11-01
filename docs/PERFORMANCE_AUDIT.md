# JustPDFCraft — Performance Audit & Optimization Report

**Date:** 2026-11-01  
**Scope:** Bundle Size, Chunk Splitting, Worker Concurrency, Memory Usage, Canvas Management, Large File Stress.

---

## 1. Baseline Performance Metrics

### Production Build Distribution (`dist/assets/`)
- `index.html`: **5.09 kB** (gzipped: 1.83 kB)
- `index-*.js` (App Core): **357.83 kB** (gzipped: 97.00 kB)
- `pdf-engine-*.js` (`pdf-lib`, `@pdfsmaller/pdf-encrypt`): **458.95 kB** (gzipped: 190.40 kB)
- `pdf-viewer-*.js` (`pdfjs-dist`): **334.08 kB** (gzipped: 98.42 kB)
- `pdf.worker.min-*.mjs` (PDF.js Worker): **1,375.84 kB** (cached)
- Dialog chunks (Compress, Split, Merge, OCR, etc.): **5 kB – 28 kB** each (lazy-loaded on demand)

---

## 2. Key Performance Findings

### PERF-01: Lazy Loading Efficacy
- **Status:** **EXCELLENT**.
- All modal dialogs (`CompressDialog`, `OCRDialog`, `ProtectDialog`, `MergeDialog`, `SplitDialog`, `SignDialog`, `ConvertDialog`, `BatchDialog`, `HandwritingDialog`) are lazily loaded via `safeLazy()` in `src/App.tsx`.
- The initial homepage only downloads the shell, hero, and catalog cards. Heavy processing modules are only loaded upon tool activation.

### PERF-02: Canvas Resource Management & Memory Leaks
- **Finding:** High-DPI canvas rendering (`resolutionScale: 2.0` or `3.0`) for multi-page documents can consume hundreds of megabytes of RAM if canvases are not explicitly cleared and garbage collected.
- **Fix:** In `ConvertDialog.tsx`, `OCRDialog.tsx`, and `PDFViewer.tsx`, explicitly set `canvas.width = 0; canvas.height = 0;` and revoke object URLs immediately after blob usage.

### PERF-03: Tesseract.js Worker Reuse & On-Demand Initialization
- **Finding:** In `core/ocr/ocr-service.ts`, the worker is instantiated on demand. However, terminating and re-creating workers repeatedly across operations wastes CPU cycles.
- **Fix:** Maintain a single active worker instance while language matches; implement an idle timeout (e.g., terminate after 3 minutes of inactivity) to free memory.

### PERF-04: Large PDF Memory Protection
- **Finding:** Loading massive PDFs (>100MB) directly into memory arrays can cause browser tab crashes on lower-memory mobile devices.
- **Fix:** Maintain OPFS chunking stream support and add a size advisory when opening PDFs larger than 150MB.

---

## 3. Optimization Checklist

- [x] Chunk splitting by engine layer (`pdf-engine`, `pdf-viewer`, `icons`, `vendor`)
- [x] Dynamic lazy loading of all modal dialogs
- [x] Font preloading for handwriting assignments
- [x] Memory deallocation of temporary rendered canvases
- [x] On-demand OCR worker loading
