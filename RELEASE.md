# SwiftPDF Release Process

## Release Steps

1. **Version Bump**: Update version in `package.json` and `src-tauri/tauri.conf.json`.
2. **Quality Gates**:
   - `npm run test` (must achieve 100% pass rate)
   - `npx tsc --noEmit` (zero errors)
   - `npm run build` (successful bundle)
3. **Packaging**:
   - Run `npm run tauri build` to generate signed Windows installers (`.msi` / `.exe`).
4. **Publishing**:
   - Create release tag `vX.Y.Z`.
   - Publish artifacts with SHA-256 checksums and release changelog.
