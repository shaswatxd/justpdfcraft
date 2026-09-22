# SwiftPDF Developer Guide

## Coding Standards & Conventions

1. **Strict Typing**: All TypeScript code must pass `tsc --noEmit` with zero errors. Do not disable strict mode or use `any` unless wrapping un-typed third-party libraries.
2. **Local-First Verification**: Never introduce external HTTP/WebSocket network calls for core document operations.
3. **Engine Decoupling**: If adding a new PDF feature:
   - Declare the method in `core/pdf/engine.interface.ts`.
   - Implement the method in `core/pdf/engines/fallback-engine.ts`.
   - Expose the method via `documentStore` or modal action.
   - Add a unit test in `tests/unit/`.
4. **Accessible UI**: All buttons must include accessible labels, tooltips, or screen-reader titles.

---

## Folder Organization

- `core/pdf/`: Engine interfaces, fallback engine, and document model.
- `core/ocr/`: OCR worker lifecycle and language pack management.
- `core/print/`: Smart print layout and preflight safety checks.
- `core/compare/`: PDF comparison algorithms.
- `core/db/`: Local-first SQLite / persistence for recents, favorites, and recovery checkpoints.
- `src/components/`: Reusable, modular UI components.
- `src/stores/`: Zustand state management.
- `src-tauri/`: Native Rust desktop shell and secure file system bridge.
- `tests/`: Automated unit and integration tests.
