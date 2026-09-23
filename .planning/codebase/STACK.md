# Technology Stack

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Core Technologies

### Languages & Runtime
- **TypeScript:** 5.7.3 (`tsconfig.json` target ES2022, bundler module resolution, strict mode)
- **Node.js Environment:** Node 18+ / 20+ support
- **Browser Runtime:** Pure client-side, 100% in-browser processing with Web Workers & WebAssembly

### Build & Bundling
- **Build Tool:** Vite 6.2.0 (`vite.config.ts`)
- **Plugin:** `@vitejs/plugin-react` 4.3.4
- **CSS Engine:** TailwindCSS 3.4.17, PostCSS 8.4.49, Autoprefixer 10.4.20
- **Build Scripts:**
  - `npm run dev`: Vite local dev server (default port 1420)
  - `npm run build`: `tsc && vite build`
  - `npm run test`: `vitest run`
  - `npm run preview`: `vite preview`

## Core Frameworks & Libraries

### UI & Component Layer
- **UI Framework:** React 18.3.1 & React-DOM 18.3.1
- **Icons:** `lucide-react` 1.47.0 (Crisp SVG vector iconography)
- **Class Utilities:** `clsx` 2.1.1, `tailwind-merge` 3.7.0
- **Delight Effects:** `canvas-confetti` 1.9.4

### State Management
- **Store Library:** `zustand` 5.0.15
- **Stores:**
  - `src/stores/documentStore.ts`: Active PDF document, pages, bookmarks, undo/redo history, form fields
  - `src/stores/toolStore.ts`: Active tool, stroke colors, line widths, annotations
  - `src/stores/uiStore.ts`: Modals, active tabs, toasts, dark/light AMOLED theme, sidebars
  - `src/stores/ttsStore.ts`: Text-to-speech engine, voice selection, playback controls

### PDF Engines & Processing
- **PDF Viewing & Rasterization:** `pdfjs-dist` 4.10.38 (with custom `pdf.worker.min` bundle)
- **PDF Manipulation & Assembly:** `pdf-lib` 1.17.1 (Page insertion, merging, splitting, Bates numbering, AcroForm fields)
- **PDF Encryption & Password Security:** `@pdfsmaller/pdf-encrypt` 1.2.0

### OCR & Image Processing
- **Optical Character Recognition:** `tesseract.js` 7.0.0 (Client-side WebAssembly OCR worker)
- **Area Extraction & Canvas Processing:** Custom canvas engine in `@core/ocr/area-extractor.ts` & `@core/image/student-resizer.ts`

### Local Database & Persistence
- **Client Database:** `sql.js` 1.14.2 (SQLite compiled to WebAssembly)
- **Local Cache:** `localStorage` & IndexedDB backing via `core/db/database.ts`

### Search Engine
- **Fuzzy Search:** `fuse.js` 7.5.0 (Instant tool explorer and PDF text search)

### Testing Framework
- **Test Runner:** `vitest` 2.1.8
- **Test Suites:** 37 test suites, 153 tests passing across unit, core engine, and UI contracts
