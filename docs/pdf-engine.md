# PDFEngine Technical Specification

The `PDFEngine` interface abstracts the low-level PDF manipulation library away from the SwiftPDF presentation and application layers.

## Core Interface Methods

- `openDocument(source, password)`: Decodes PDF buffer and extracts metadata.
- `renderPage(documentId, pageIndex, scale)`: Rasterizes page to high-DPI canvas.
- `extractPageText(documentId, pageIndex)`: Extracts words, lines, and bounding boxes.
- `reorderPages(documentId, pageIndices)`: Permutes page order.
- `rotatePages(documentId, pageIndices, degrees)`: Rotates pages clockwise or counter-clockwise.
- `deletePages(documentId, pageIndices)`: Removes pages while enforcing minimum 1-page invariant.
- `insertBlankPage(documentId, atIndex, width, height)`: Inserts blank page.
- `insertText(documentId, options)`: Places text at specified PDF coordinate (from bottom-left origin).
- `applyRedactions(documentId, redactions)`: Destructively overwrites pixel bounds and strips overlapping annotation streams.
- `compressDocument(documentId, options)`: Re-encodes object streams and strips non-essential metadata.
- `mergeDocuments(sources)`: Combines multiple PDF streams.
- `splitDocument(documentId, ranges)`: Extracts specified page slices into standalone documents.
