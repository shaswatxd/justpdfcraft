# SwiftPDF System Architecture

## Architectural Principles

1. **Local-First by Design**: The application functions without external network connectivity. All PDF parsing, manipulation, OCR, and storage occur on the user's workstation.
2. **Strict Boundary Isolation**:
   - The UI never directly calls vendor PDF SDKs or low-level file APIs.
   - All PDF tasks execute through the `PDFEngine` interface.
   - All filesystem tasks route through atomic transaction services.
3. **Pluggable Engine Core**: Enables running either the open-source fallback engine (`pdf-lib` + `PDF.js` + `Tesseract.js`) or swapping in a proprietary enterprise SDK (Apryse, Nutrient) via configuration without touching UI components.
4. **Crash Safety**: Non-destructive workflows save modified documents to randomized `.tmp` buffers first, validate the PDF stream trailer and xref table, and atomically rename over the destination.

---

## Component Boundaries

```
[UI Layer]
  - Components (React 18, Radix Primitives, Tailwind CSS)
  - Layouts (AppHeader, Sidebar, MainToolbar, PDFViewer, PageOrganizer)
  - Modals (Compress, OCR, Print, Protect, Compare, Merge, Split, Settings)
  - Command Palette (Ctrl+K fuzzy runner)

[State Management Layer]
  - Zustand Stores:
    * documentStore: Document buffer, active ID, page dimensions, undo/redo history, search results
    * toolStore: Active editing tool, stroke width, opacity, color, staged redactions
    * uiStore: Active modals, sidebar open/closed, tabs, toast queue

[Domain & Engine Layer]
  - PDFEngine Interface
  - FallbackPDFEngine (pdf-lib & pdfjs-dist)
  - OCRService (Tesseract worker threadpool)
  - DocumentComparator (Structural & text page diffing)
  - PrintLayoutEngine (N-up layout, booklet sequence, safety validation)
  - LocalDatabaseService (SQLite / local persistence)

[Native Shell & OS Integration (Tauri 2)]
  - Window control & native decorators
  - Atomic filesystem write operations
  - Security path canonicalization & magic byte verification
  - Windows Shell Explorer reveal
```
