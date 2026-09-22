# Building SwiftPDF

This document describes how to build SwiftPDF for development, testing, and production distribution.

---

## Toolchain Requirements

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Rust toolchain** (optional for desktop binary bundling):
  - Rust 1.75+ (via `rustup`)
  - Windows C++ Build Tools (MSVC) or WebView2 runtime

---

## Build Commands

### 1. Development Mode
Runs the Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Access at: `http://localhost:1420`

### 2. Type Checking
Validates strict TypeScript types across the entire project:
```bash
npx tsc --noEmit
```

### 3. Automated Test Suite
Executes unit tests and integration tests via Vitest:
```bash
npm run test
```

### 4. Frontend Production Bundle
Compiles and tree-shakes assets to `/dist`:
```bash
npm run build
```

### 5. Desktop Application Packaging (Tauri 2)
Builds the standalone native Windows installer (`.msi` / `.exe`):
```bash
npm run tauri build
```
The resulting installer is generated in `src-tauri/target/release/bundle/`.
