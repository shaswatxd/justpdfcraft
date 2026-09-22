# SwiftPDF Optical Character Recognition (OCR)

SwiftPDF integrates **Tesseract.js** in dedicated background Web Worker threads to provide on-device character recognition for scanned and image-heavy PDF files.

## OCR Pipeline

1. **Pre-processing**: Rasterizes the target PDF page onto an OffscreenCanvas at 2.0x scale (144 DPI equivalent) to maximize OCR character separation.
2. **Worker Dispatch**: Hands the bitmap to the Tesseract worker thread, keeping the main UI thread completely fluid.
3. **Progress Reporting**: Streams recognition progress percentages (`0%` to `100%`) back to the user interface.
4. **Export & Insertion**: Allows copying recognized text, saving as plain text `.txt`, or generating a searchable text layer overlay.
