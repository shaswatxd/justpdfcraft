# JustPDFCraft — Bug Tracker & Issue Resolution Ledger

This ledger tracks all confirmed bugs, unexpected behaviors, security risks, and regressions across the JustPDFCraft codebase.

---

## Issue Status Legend
- **OPEN**: Identified and confirmed, pending fix.
- **IN_PROGRESS**: Fix currently being implemented.
- **RESOLVED**: Fix implemented, tested, and verified.
- **VERIFIED**: End-to-end verified with automated tests passing.

---

## 1. Active & Historical Bug Register

### BUG-001: Redaction Text Stream Residual Leak
- **Severity:** `Critical`
- **Component:** `core/pdf/engines/fallback-engine.ts` (`applyRedactions`)
- **Description:** Drawing a black rectangle via `page.drawRectangle` obscures visible pixels on rendered canvas, but original PDF text elements (`Tj`/`TJ` operators) remain present in the underlying content stream. Users could select, copy, or programmatically extract the redacted text.
- **Root Cause:** Missing content stream parsing or page rasterization during redaction application.
- **Fix:** Implement dual-pass true redaction:
  1. Strip overlapping vector text from stream / purge annotations.
  2. Provide option to rasterize the redacted page to a high-DPI canvas and re-embed as an image so no text operators survive.
- **Status:** `IN_PROGRESS` (Phase 2 & 4)
- **Verification:** Test extraction with `PDF.js` `extractPageText` on redacted PDF to assert 0 residual occurrences of redacted string.

---

### BUG-002: Mocked Gemini AI API Implementation
- **Severity:** `High`
- **Component:** `src/components/dialogs/AIToolsDialog.tsx`
- **Description:** Selecting Google Gemini as provider in AI Tools dialog returned a static mock string instead of calling the Generative Language API.
- **Root Cause:** Stub code left from initial prototyping.
- **Fix:** Wire up the authentic Google Gemini API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`) with user-provided API key, JSON request payload, and proper error handling.
- **Status:** `IN_PROGRESS` (Phase 2)
- **Verification:** Unit and manual tests with mock fetch and real endpoint responses.

---

### BUG-003: Direct URL 404 on Static Hosting
- **Severity:** `High`
- **Component:** `public/`, `src/utils/deepLink.ts`
- **Description:** Direct visits to clean URLs like `https://justpdfcraft.xyz/merge-pdf` return 404 from GitHub Pages because GitHub Pages only natively serves static files matching the path.
- **Root Cause:** Absence of a GitHub Pages SPA `404.html` redirection trampoline script and missing path-based router support.
- **Fix:** 
  1. Add `public/404.html` with SPA redirect handler that stores the intended pathname in `sessionStorage` or query string and redirects to `index.html`.
  2. Update `deepLink.ts` to inspect both clean pathnames (`/merge-pdf`) and query parameters (`?tool=merge-pdf`).
- **Status:** `IN_PROGRESS` (Phase 7)
- **Verification:** Test browser URL navigation with clean paths in Playwright.

---

### BUG-004: Tesseract Language Dual-Download Overhead
- **Severity:** `Medium`
- **Component:** `core/ocr/ocr-service.ts`
- **Description:** Default OCR initialization loaded both English and Hindi language data simultaneously (`eng+hin`), causing an unneeded 15-25MB network download when the user only needed English.
- **Root Cause:** Hardcoded `eng+hin` default language in `OCRService.initWorker()`.
- **Fix:** Default to `'eng'` with user-selectable language switch (`'eng'`, `'hin'`, or `'eng+hin'`), downloading only the selected language on demand.
- **Status:** `OPEN` (Phase 5)
- **Verification:** Network request assertion in test.

---

### BUG-005: Handwriting Canvas Unmount Race Condition
- **Severity:** `Medium`
- **Component:** `src/components/dialogs/HandwritingDialog.tsx`
- **Description:** Closing or unmounting the dialog while fonts were loading asynchronously triggered `Cannot read properties of null (reading 'getContext')`.
- **Root Cause:** Asynchronous gap between `ensureFontLoaded` and `canvasRef.current` access.
- **Fix:** Added null check on `targetCanvas` in `drawPage` and `canvasRef.current` check immediately following font loading await.
- **Status:** `VERIFIED`
- **Verification:** Verified in Playwright full suite audit (0 console errors).

---

### BUG-006: Missing Office Conversion Fidelity Disclaimers
- **Severity:** `Low`
- **Component:** `src/components/dialogs/ConvertDialog.tsx`, `DocumentToolsDialog.tsx`
- **Description:** Users expecting 100% exact vector reproduction of complex Word `.docx` or PowerPoint `.pptx` documents might be surprised by client-side text/layout reconstruction.
- **Root Cause:** Absence of explicit capability indicators on client-side conversion tools.
- **Fix:** Add informative badge: "Client-Side Document Reconstruction • 100% Private".
- **Status:** `OPEN` (Phase 3)
- **Verification:** UI visual inspection.
