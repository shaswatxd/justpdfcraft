# JustPDFCraft — iLovePDF-Parity Redesign Plan

**Date:** 2026-10-24
**Goal:** "Just like iLovePDF" — minimal, fast, stable toolkit. Only iLovePDF-grade tools remain (plus the two explicitly requested holds: the exact-KB photo resizer and the handwriting generator). Everything else is removed from the UI, the catalog, the tests and the bundle.
**Bug being fixed in the same pass:** on phone, after selecting a photo, the dialog content could not scroll (root cause: desktop `grid-cols-12 h-full` + `overflow-hidden` preview cell rendered on mobile → cell 256px clamps 491px content → nothing below the fold is reachable; see `docs/scroll-probe` findings summarized in the review report).

---

## 1. Tool catalog decision: 52 → 23 tools

### KEEP (23) — iLovePDF parity + the 2 user calls

| # | Tool id | iLovePDF equivalent |
|---|---------|--------------------|
| 1 | merge-pdf | Merge PDF |
| 2 | split-pdf | Split PDF |
| 3 | compress-pdf | Compress PDF |
| 4 | convert-pdf | PDF→JPG / PDF→PNG / PowerPoint-style exports |
| 5 | pdf-to-word-doc | PDF to Word |
| 6 | image-to-pdf-tool | JPG to PDF / Image to PDF |
| 7 | text-to-pdf-compiler | HTML/Text to PDF |
| 8 | organize-pdf | Organize PDF (reorder + rotate) |
| 9 | direct-text-editor | Edit PDF |
| 10 | ocr-pdf | OCR PDF |
| 11 | sign-pdf | Sign PDF |
| 12 | protect-pdf | Protect PDF |
| 13 | unlock-pdf | Unlock PDF |
| 14 | watermark-pdf | Watermark |
| 15 | add-page-numbers | Page numbers |
| 16 | bates-numbering | Bates numbering (professional-grade extra, keep) |
| 17 | crop-pdf | (extra, professional-grade, keep) |
| 18 | scan-pdf | Scan to PDF |
| 19 | table-extract | PDF to Excel |
| 20 | compare-pdf | Compare PDF |
| 21 | batch-pdf | Batch processing |
| 22 | target-kb-resizer | **user-mandated** photo resize (exam KB limits) |
| 23 | handwriting-generator | **user-mandated** handwritten assignments |

### REMOVE (29)

- **PDF (6):** pdf-to-grayscale, extract-images, stamps-pdf, sanitize-pdf, flatten-pdf-forms, print-pdf
- **Image (9):** exam-photo-presets, passport-photo-sheet, id-card-merger, paper-sign-cleaner, photo-sign-combiner, dop-strip-banner, photo-cropper-studio, image-converter-formats, bulk-image-compressor
- **Student calculators/utilities (14):** cgpa, sgpa, attendance, percentage-marks, age-eligibility, unit-converter, date-difference, timetable, countdown, gpa-scale, quick-notes, qr-code, password-generator, random-picker

### Deferred new engines (iLovePDF parity, later phases — need heavy libs)

- Word → PDF (mammoth + render) — easy, do in a follow-up phase
- Excel → PDF (SheetJS render) — medium
- PDF → PowerPoint / PowerPoint → PDF — medium/hard client-side; defer
- PDF/A convert, Repair PDF — light attempts possible later
- Chat with PDF — needs a backend, violates the 100% client-side privacy promise → **skipped deliberately**

---

## 2. Modal registry cleanup

Dead modals removed from `ModalType` (uiStore) and all entry points:
`print`, `metadata`, `sanitize`, `extract-images`, `photo-editor`, `student-calculators`, `image-tools`, `field-builder`

Kept modals: compress, ocr, protect, compare, merge, split, sign, convert, watermark, scan, bates, page-number, batch, crop, extract-table, student-resizer, handwriting, legal, settings, shortcuts.

Related code paths cleaned:

- `App.tsx`: remove dialog imports/mounts for PrintDialog, SanitizeDialog, ExtractImagesDialog, PhotoEditorDialog, StudentCalculatorsDialog, ImageToolsDialog; drop the custom Ctrl+P intercept (browser print takes over).
- `CommandPalette.tsx`: drop extract_photos, photo_studio, print, sanitize_doc commands; retitle student_suite.
- `MainToolbar.tsx`: drop Photos / Print buttons and the extract-images / photo-editor / sanitize entries in More Tools.
- `AppHeader.tsx`: drop "Student Tools" (calculators) nav + mobile menu entry; "Exam Photo & Sign" stays.
- `HomeDashboard.tsx`: drop `photo-editor` / `image-tools` pending branches and `setActiveImageTab`.
- `ToolCard.tsx`: drop image-tools branch.
- BatchDialog keeps its internal batch "sanitize" *operation* (it is a batch-mode feature, not the standalone modal).

Dropped dialog files: PrintDialog.tsx, SanitizeDialog.tsx, ExtractImagesDialog.tsx, PhotoEditorDialog.tsx, StudentCalculatorsDialog.tsx, ImageToolsDialog.tsx (each was already a lazy chunk, so bundle size drops accordingly).

---

## 3. Scroll-bug fix (phone photo flow)

`StudentToolsDialog.tsx` is rewritten as a single-purpose **Photo & Signature Resizer** (same modal id `student-resizer`, so every existing entry point keeps working):

- Tab bar with 6 tabs → gone (resizer was the only iLovePDF-parity survival; the other 5 tabs are removed tools).
- The buggy `grid grid-cols-1 lg:grid-cols-12 gap-6 h-full` + `lg:col-span-7 … overflow-hidden` layout is gone.
- Mobile-first single-column flow: upload zone → live result → settings → Download. Everything sits inside the dialog's `flex-1 overflow-y-auto` body, so content flows naturally and scrolling works by construction (no fixed-height grid rows, no overflow-hidden cells).
- Desktop keeps a simple two-column arrangement without `h-full`/`overflow-hidden` so it can only grow, never clip.

Photo routing from the home dropzone stays: image without pending workflow → `student-resizer` (now the lean, scroll-fixed resizer).

---

## 4. Homepage: iLovePDF-style simplicity

- **Hero:** honest one-liner + privacy chips (kept).
- **One unified drop zone:** Open PDF / Select a photo buttons + drag & drop + blank PDF affordance. Crash-recovery banner kept when drafts exist.
- **Removed:** 6-button "Common tasks" quick-action row and the 2×2 secondary cards (the tools grid below is the navigation; on iLovePDF the grid *is* the menu).
- **Tool grid:** search + recents + favorites + 23 tools via ToolExplorer (unchanged structure, smaller catalog).
- **FAQ:** trimmed to 4 entries matching the surviving toolset (no calculators/cleaner claims).
- **Footer:** unchanged (already compact).

---

## 5. Tests & audit scripts to update in the same commit

- `tests/unit/tools-catalog.test.ts`: category counts (pdf ≥ 15 still true with 20; image = 2; student = 1; total 23), drop cgpa search expectation.
- `tests/unit/tools-search-tokens.test.ts`: length 52 → 23; drop `paper-sign-cleaner` / `cgpa` token rows.
- `tests/unit/tools-catalog-routing.test.ts`: VALID_MODALS list pruned to the surviving registry.
- `scripts/playwright-audit.cjs`: calculators section → resizer/mobile-flow checks; modal list pruned.
- `scripts/playwright-deep-tools-audit.cjs`: drop calculators / sanitize / extract-images / photo-editor phases.
- `scripts/playwright-full-suite-audit.cjs`: same pruning.
- `scripts/playwright-viewer-audit.cjs`: prune docTools list (`sanitize`, etc.).

**Gates:** `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run audit:playwright`, `npm run audit:responsive`, `npm run audit:full` must all pass before push.

---

## 6. Risk & safety notes

- No storage keys or store shapes used by persisted data change — user favorites/recents/theme survive.
- `student-resizer` modal id survives so existing recents shortcuts don't dead-end.
- Bundle wins: six lazy dialog chunks vanish (StudentCalculatorsDialog ≈ 62 kB, StudentToolsDialog shrinks from ≈ 58 kB to a few kB, plus print/sanitize/extract/photo-editor/image-tools chunks).
- All processing stays 100% client-side; nothing new is uploaded.
