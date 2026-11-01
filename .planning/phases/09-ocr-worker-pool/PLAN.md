# Phase 9: Multi-Threaded Web Worker OCR Batch Queue

## Objective
Implement a multi-threaded Web Worker pool for Tesseract.js OCR to process multi-page PDFs in parallel with bounded memory consumption, progressive streaming results, and instant cooperative cancellation.

---

## Technical Specifications & Architecture

### 1. OCR Worker Pool (`core/ocr/ocr-pool.ts`)
- **Dynamic Threading**:
  - Automatically detect hardware concurrency (`navigator.hardwareConcurrency || 2`).
  - Safe worker clamping: 2 workers on mobile devices (<768px or touch), up to 4 workers on multi-core desktops.
- **Worker Management**:
  - Lazily initialize Tesseract `Worker` instances matching the target language.
  - Parameter configuration: optimal DPI (`300`), uniform page segmentation (`psm: 6`), and interword space preservation.
  - Graceful worker reuse across jobs to avoid repeated WASM instantiation overhead.
  - Complete `.terminate()` lifecycle to purge worker threads and free WebAssembly heap memory when idle.
- **Bounded Memory Producer-Consumer Pipeline**:
  - Avoid rendering all 50+ PDF pages into canvas bitmaps simultaneously (prevents mobile browser tab crashes / OOM).
  - Bounded concurrency pipeline: render pages on-demand just-in-time as workers become available (at most `poolSize + 1` canvases in memory).
  - Immediate canvas bitmap de-allocation (`canvas.width = 1; canvas.height = 1`) as soon as a worker completes a page.
- **Strict Page Ordering**:
  - Guarantee deterministic output ordering where `results[i]` corresponds to the exact document page index, regardless of worker completion order.
- **Cancellation**:
  - Support `AbortSignal` / cooperative cancellation token.
  - Cancelling immediately drains the queue, cancels in-flight work, and retains partial progress without throwing unhandled promise rejections.

### 2. Service Integration (`core/ocr/ocr-service.ts`)
- Retain existing `OCRService` singleton contract for backward compatibility.
- Route batch recognition (`recognizePages` / `recognizeBatch`) through `OCRWorkerPool`.
- Support options for concurrency override, preprocessing flags, and granular progress reporting.

### 3. Dialog UI Integration (`src/components/dialogs/OCRDialog.tsx`)
- Detect multi-page jobs in Deep Visual OCR mode.
- Dispatch jobs via the worker pool.
- Display multi-worker progress feedback (e.g. "Processing across 3 parallel workers... 4/12 pages completed").
- Stream progressive text updates into the preview pane as each page finishes.
- Cancel button gracefully stops the pool and keeps already-processed text.

### 4. Verification & Testing
- Unit tests in `tests/unit/ocr-worker-pool.test.ts`:
  - Worker pool creation and concurrency clamping.
  - Parallel task execution and correct page sequence resolution.
  - Bounded queue execution and progress tracking.
  - Immediate cancellation handling.
- Verify TypeScript compilation (`tsc && vite build`).
- Verify full test suite passes (`npm test`).
