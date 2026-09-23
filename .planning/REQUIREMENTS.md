# Requirements Specification

**Project:** JustPDFCraft  
**Status:** Milestone 1.0 Complete & Hardened

## 1. Privacy & Security
- [x] **REQ-PRIV-1**: All PDF and image processing must execute strictly client-side.
- [x] **REQ-PRIV-2**: Zero external telemetry, tracking, or file transmission to third-party endpoints.
- [x] **REQ-PRIV-3**: Offline operation supported via Service Worker and browser caching.

## 2. Core PDF Operations
- [x] **REQ-PDF-1**: View, zoom, rotate, and navigate multi-page PDF documents.
- [x] **REQ-PDF-2**: Virtualized continuous rendering without memory leaks across 100+ pages.
- [x] **REQ-PDF-3**: Digital text selection with seamless clipboard copying and 0 double/ghost text artifacts.
- [x] **REQ-PDF-4**: Merge multiple PDFs, split documents, extract page ranges.
- [x] **REQ-PDF-5**: Direct in-place text editing and AcroForm field creation.
- [x] **REQ-PDF-6**: Sequential Bates numbering and custom dynamic header/footer stamps.

## 3. Student & Exam Tools
- [x] **REQ-STU-1**: Precise KB compressor (e.g., target 20–50 KB) using binary search JPEG quantization.
- [x] **REQ-STU-2**: Joint Photo + Signature card generator with customizable candidate name and date.
- [x] **REQ-STU-3**: Signature paper cleaner to whiten background and enhance ink strokes.
- [x] **REQ-STU-4**: Name & Date of Photo (DOP) banner generator complying with official government exam standards.
- [x] **REQ-STU-5**: Persistent tab state preventing black blank screens on tab switches.

## 4. Quality & Build
- [x] **REQ-QA-1**: 100% TypeScript compile pass with strict mode.
- [x] **REQ-QA-2**: Vitest unit test suite covering core engine and tool routing (153/153 tests passing).
- [x] **REQ-QA-3**: Pure AMOLED Black (`#000000`) visual consistency.
