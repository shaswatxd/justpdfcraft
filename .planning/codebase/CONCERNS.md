# Codebase Concerns & Technical Debt

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Resolved Issues & Hardened Areas

1. **Virtual Page Virtualization (Fixed):**
   - Off-screen pages previously accumulated in memory during continuous scroll. Resolved with a 600px `IntersectionObserver` unmounting window in `VirtualPageWrapper`.
2. **Text Layer Selection Ghosting (Fixed):**
   - Browser default selection previously turned transparent text layer into white monospace text over black canvas text. Resolved with strict CSS selection transparency and proportional font metrics.
3. **Student Suite Tab Switch Blank Screens (Fixed):**
   - `<canvas>` unmounting previously blanked the preview upon tab switching. Resolved by binding persistent base64 `dataUrl` reactive image tags.
4. **Slider Loop UI Freezing (Fixed):**
   - High-frequency pixel scans debounced to 60ms/150ms in `StudentToolsDialog.tsx`.
5. **Rotated Text Font Height Collapse (Fixed):**
   - Replaced naive `transform[3]` scalar with 2D Euclidean norm `Math.hypot(transform[2], transform[3])`.

## Monitored Areas & Future Improvements

1. **Tesseract.js WASM Bundle Size:**
   - Client-side OCR worker downloads language traineddata (~15–20 MB) on first demand. A persistent Cache API wrapper is in place, but network timeout fallbacks on slow connections should be monitored.
2. **Large Scanned PDF Memory Thresholds:**
   - 200+ page high-resolution scanned PDFs (300 DPI images) require careful memory handling. Keeping `imageDataUrl` lazy in `renderPage()` has reduced memory overhead by over 70%.
3. **Mobile Screen Real Estate in Heavy Dialogs:**
   - Tools like `PhotoEditorDialog` and `StudentToolsDialog` have multi-control sidebars. On screens under 640px, tab bars scroll horizontally. Responsive collapses should continue to be tested across low-end mobile viewports.
