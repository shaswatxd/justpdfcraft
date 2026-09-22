# SwiftPDF Testing Strategy

SwiftPDF employs a multi-tiered testing methodology:

## 1. Unit Testing
- Located in `tests/unit/`.
- Tests core PDF manipulation (`FallbackPDFEngine`): open, dimensions, rotations, reorder, delete, duplicate, insert text, real redactions, merge, split, and compression.
- Tests `DocumentComparator` and `PrintLayoutEngine`.

Run unit tests:
```bash
npm run test
```

## 2. Type Safety
- Enforced via strict TypeScript compiler settings:
```bash
npx tsc --noEmit
```

## 3. Production Build Validation
- Validates bundling and code chunk generation:
```bash
npm run build
```
