# Building JustPDFCraft

This document describes how to build JustPDFCraft for development, testing, and production distribution.

---

## Toolchain Requirements

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

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
The output in `dist/` is what the GitHub Pages deployment workflow publishes.
