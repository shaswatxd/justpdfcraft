# Phase 8: Native File System Access & OPFS (Direct File Save & Crash Recovery Drafts)

## Objective
Implement direct in-place local disk saving via the File System Access API (`showOpenFilePicker` / `showSaveFilePicker` / `FileSystemFileHandle`) and automated browser crash recovery using the Origin Private File System (OPFS) API.

---

## Technical Specifications & Architecture

### 1. OPFS Engine (`src/core/storage/opfs.ts`)
- Use `navigator.storage.getDirectory()` to create and manage an isolated private directory `justpdfcraft_drafts/`.
- Store document bytes, metadata, timestamp, and edit state in OPFS.
- Provide clean API:
  - `saveDraft(id, fileName, bytes, metadata)`
  - `loadDraft(id)`
  - `listDrafts()`
  - `deleteDraft(id)`
  - `clearAllDrafts()`
  - `getStorageEstimate()`
- Robust fallback when OPFS is not available (in-memory / IndexedDB graceful degradation).

### 2. Native File System Access (`src/core/storage/native-fs.ts`)
- Check support: `typeof window !== 'undefined' && 'showOpenFilePicker' in window`.
- Open PDF: `showOpenFilePicker({ types: [{ description: 'PDF Documents', accept: { 'application/pdf': ['.pdf'] } }] })`.
- Direct In-Place Save:
  - Obtain writable stream: `await handle.createWritable()`.
  - Write bytes and close.
  - Return true on success.
- Permission query and request helper (`queryPermission({ mode: 'readwrite' })`).
- Fallback: fallback to `downloadBlob()` when handle is not present or user denies write permission.

### 3. Document Store Integration (`src/stores/documentStore.ts`)
- Store `fileHandle: FileSystemFileHandle | null` per tab and active document.
- Support `saveDirectly()` action: writes to `fileHandle` if available, or prompts `showSaveFilePicker()`, or falls back to download.
- Debounced auto-save listener that writes to OPFS whenever `isDirty` is true.
- Clear draft from OPFS when document is explicitly saved or closed.

### 4. Recovery & Autosave UI
- Subtle header indicator: "All changes saved locally" / "Saving draft...".
- Draft recovery banner on Home screen if an unrecovered draft is detected on startup.
- Keyboard shortcut `Ctrl+S` / `Cmd+S` bound to `saveDirectly()`.

### 5. Tests
- Unit tests for `opfs.ts` and `native-fs.ts` in `tests/unit/opfs-storage.test.ts`.
- E2E Playwright verification.
