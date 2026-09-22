# SwiftPDF Security Architecture

## Threat Analysis & Countermeasures

| Vector | Risk | SwiftPDF Defense |
|---|---|---|
| **Path Traversal via IPC** | Unauthorized file reading / writing outside sandbox. | Paths are canonicalized with `PathBuf::canonicalize()`; directory traversal characters (`..`) are rejected. |
| **Fake Redaction Leak** | Cosmetic black box allows copying underlying text. | Real redaction overwrites raw stream bytes with opaque masks and purges underlying text dictionaries. |
| **Partial / Crash Corruption** | App crashes during large document save, leaving zero-byte file. | Transaction pipeline writes to `.tmp` file first, validates `%PDF-` header and `%%EOF` marker, then atomically renames. |
| **Data Exfiltration** | Sensitive documents sent to cloud telemetry. | No analytics or crash reporter network calls. Zero outbound telemetry. |
