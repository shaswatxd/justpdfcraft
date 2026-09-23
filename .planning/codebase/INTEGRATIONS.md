# External & Internal Integrations

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Integration Architecture

JustPDFCraft is designed as a **100% Client-Side Local-First** application. No user documents or sensitive student exam files are ever transmitted to any remote servers.

### 1. PDF.js Engine (`pdfjs-dist`)
- **Integration Point:** `core/pdf/engines/fallback-engine.ts`
- **Worker Configuration:** Configured to load dedicated `pdf.worker.min` bundle via Vite.
- **Capabilities:**
  - Fast page rasterization to `<canvas>` viewports.
  - Digital text extraction with affine transform matrices (`extractPageText`).
  - Search document and bounding box coordinate mapping.

### 2. PDF-Lib Manipulation (`pdf-lib`)
- **Integration Point:** `core/pdf/engines/fallback-engine.ts`, `core/pdf/bates-numbering.ts`
- **Capabilities:**
  - Create blank documents and insert standard A4/Letter pages.
  - Page rotation, deletion, reordering, and extraction.
  - Document merging and multi-file assembly.
  - Dynamic Bates numbering and header/footer macro expansion (`{page}`, `{totalPages}`).
  - AcroForm builder (text fields, checkboxes, dropdowns).

### 3. Client-Side OCR (`tesseract.js`)
- **Integration Point:** `core/ocr/area-extractor.ts`, `src/components/dialogs/OCRDialog.tsx`
- **Capabilities:**
  - Browser-based Tesseract WebAssembly worker.
  - Scanned PDF to searchable text conversion.
  - Snip OCR tool on viewer canvas for targeted text recognition.

### 4. SQLite WASM (`sql.js`)
- **Integration Point:** `core/db/database.ts`
- **Capabilities:**
  - In-memory SQLite relational database in WebAssembly.
  - Persists recent documents, metadata, and user preferences into browser storage.

### 5. Browser Native Web APIs
- **Web Workers:** Multi-threaded OCR and compression.
- **Canvas 2D Context:** Real-time student photo resizing, joint card merging, signature background whitening.
- **IntersectionObserver:** Virtualized continuous scrolling in `PDFViewer.tsx`.
- **SpeechSynthesis:** Text-to-Speech (TTS) reading aloud selected text or document pages.
- **Clipboard API:** Instant copy from SelectionHUD and tool dialogs.
