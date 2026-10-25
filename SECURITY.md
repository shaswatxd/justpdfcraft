# JustPDFCraft Security Policy

## Threat Model & Security Posture

### 1. Local-First Isolation
JustPDFCraft processes all documents directly in browser memory. There is zero default internet telemetry or document uploading.

### 2. True Redaction
Many applications merely draw a black rectangle over sensitive text, leaving the underlying text stream readable in the file structure.  
JustPDFCraft enforces **True Redaction**:
- Renders an opaque black pixel mask directly over the coordinate bounds.
- Cleans and strips overlapping PDF annotation objects and dictionaries.
- Purges underlying text stream references so content cannot be extracted by search engines or copy-paste operations.

### 3. Sandboxed Browser Isolation
- All processing happens inside the browser renderer sandbox; the app never touches the native file system beyond the documents the user explicitly opens (and grants via the File System Access API).
- Snapshots, recovery drafts, and preferences persist in OPFS (Origin Private File System) / browser-local storage, which the OS sandboxes per website origin.
- PDF buffers are validated against the `%PDF-` magic byte header before any engine operation.

### 4. Vulnerability Reporting
If you discover a security vulnerability, please report it via security advisory rather than opening a public issue.
