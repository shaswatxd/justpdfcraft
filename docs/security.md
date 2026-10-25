# JustPDFCraft Security Architecture

## Threat Analysis & Countermeasures

| Vector | Risk | JustPDFCraft Defense |
|---|---|---|
| **Unintended Filesystem Access** | Reading or writing outside of user-granted files. | The app only touches files the user explicitly opens (file picker / File System Access API grant). No native filesystem access exists beyond that grant. |
| **Fake Redaction Leak** | Cosmetic black box allows copying underlying text. | Real redaction overwrites raw stream bytes with opaque masks and purges underlying text dictionaries. |
| **Data Exfiltration** | Sensitive documents sent to cloud telemetry. | No analytics or crash reporter network calls. Zero outbound telemetry. |
| **Cross-origin Storage Leakage** | Another website reading persisted documents. | Snapshots, drafts, and preferences live in OPFS / browser-local storage, sandboxed per website origin by the OS and browser. |
