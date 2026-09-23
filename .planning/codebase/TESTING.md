# Testing Architecture & Verification

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Test Strategy

JustPDFCraft maintains comprehensive unit and integration test coverage across the core PDF engine, student utilities, and UI tool routing contracts using **Vitest**.

### Test Runner
- **Runner:** `vitest` 2.1.8
- **Command:** `npm run test` (`vitest run`)
- **Current Metrics:** **37 Test Files, 153 Tests Passing (100% pass rate)**.

## Test Structure (`tests/unit/`)

| Test Suite File | Domain Covered | Tests |
| :--- | :--- | :---: |
| `bates-numbering.test.ts` | Sequential page numbering, prefix/suffix, dynamic macros | 4 |
| `direct-text-editor.test.ts` | In-place text replacement, font matching, name modifications | 2 |
| `ocr-text-extraction.test.ts` | Digital text extraction, case-insensitive search, missing query handling | 4 |
| `image-extractor.test.ts` | Image XObject extraction, fallback scanned page rasterization | 4 |
| `tools-catalog-routing.test.ts` | 45 tools registered, 0 dead modal routes, valid categories | 3 |
| `multi-page-table.test.ts` | Multi-page structured table coordinate extraction | 2 |
| `table-extractor.test.ts` | PDF tabular text bounding box parsing | 1 |
| `universal-unlocker.test.ts` | Security permission stripping & password unlocking | 1 |
| `measurement.test.ts` | Scale calibration, perimeter, area, distance calculations | 5 |
| `field-builder.test.ts` | AcroForm interactive form field generation | 2 |
| `advanced-features.test.ts` | Sticky notes persistence, watermark application, text export | 4 |
| `spline-utils.test.ts` | Spline smoothing and stroke distance calculation | 4 |
| `fullscreen-and-shortcuts.test.ts`| Keyboard shortcut mappings, fullscreen presentation | 3 |
| `presentation-tools.test.ts` | Laser pointer and presentation overlays | 4 |
| `print-layout.test.ts` | Print media queries and page unconstrained flow | 3 |
| `comparator.test.ts` | Visual document diffing | 1 |
| `outline.test.ts` | Table of contents outline parsing | 3 |
| `page-navigation-scroll.test.ts`| Viewport scrolling and page jump calculations | 3 |
| `sidebar-and-drop.test.ts` | Sidebar drawer tabs and dropzone event handlers | 2 |

## Verification Protocol
Every new feature or bug fix must satisfy:
1. `npx tsc --noEmit` — 0 TypeScript errors.
2. `npm run test` — 153/153 tests passing.
3. `npm run build` — Production Vite bundle compiles cleanly.
