# SwiftPDF Security Policy

## Threat Model & Security Posture

### 1. Local-First Isolation
SwiftPDF processes all documents directly in memory and on the local disk. There is zero default internet telemetry or document uploading.

### 2. True Redaction
Many applications merely draw a black rectangle over sensitive text, leaving the underlying text stream readable in the file structure.  
SwiftPDF enforces **True Redaction**:
- Renders an opaque black pixel mask directly over the coordinate bounds.
- Cleans and strips overlapping PDF annotation objects and dictionaries.
- Purges underlying text stream references so content cannot be extracted by search engines or copy-paste operations.

### 3. Path Traversal & IPC Validation
In the desktop shell (Tauri 2 / Rust):
- Native commands canonicalize input paths and reject path traversal attempts (`../`).
- Input buffers are verified against magic byte headers (`%PDF-`) before disk operations.
- Destructive edits write to randomized temporary buffers (`.swiftpdf_*.tmp`) before atomic renaming to prevent corrupted file writes during system crashes.

### 4. Vulnerability Reporting
If you discover a security vulnerability, please report it via security advisory rather than opening a public issue.
