# SwiftPDF Troubleshooting Guide

## Common Issues & Solutions

### 1. "Failed to parse PDF binary stream"
- **Cause**: The file is corrupted, truncated, or is not a valid PDF.
- **Solution**: Open the document in a text editor to verify the `%PDF-` header exists. Re-download or recover from original source.

### 2. Password-Protected Document Prompt
- **Cause**: The PDF has user encryption enabled.
- **Solution**: Use the Password prompt or Security dialog to provide the correct credentials before editing.

### 3. OCR Worker Initialization Delays
- **Cause**: First-time OCR runs download the language model pack to local cache.
- **Solution**: Ensure internet connection is available on the first run for the selected language pack; subsequent runs will be completely cached and offline.

### 4. Build Errors on Tauri
- **Cause**: Rust toolchain or Windows C++ Build Tools (MSVC) missing.
- **Solution**: Run `winget install Rustlang.Rustup` and restart your shell.
