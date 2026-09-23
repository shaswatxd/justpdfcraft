# Directory & Code Structure

**Analysis Date:** 2026-09-23
**Project:** JustPDFCraft

## Directory Tree

```
JustPDFCraft/
├── core/                         # Core PDF, Image & OCR Engines (Framework Agnostic)
│   ├── compare/                  # Visual and text PDF diffing
│   ├── db/                       # Local SQLite WASM database
│   ├── image/                    # Student photo resizer, joint combiner, signature cleaner
│   ├── ocr/                      # Tesseract OCR & area extractor
│   ├── pdf/                      # PDF engine factory, interfaces, and fallback engine
│   └── security/                 # Document encryption and sanitation
├── src/                          # React Application Source
│   ├── components/               # React UI Components
│   │   ├── app-shell/            # AppHeader, MobileBottomBar
│   │   ├── command-palette/      # Global keyboard launcher
│   │   ├── dialogs/              # 26 Tool Dialogs (Student, Compress, Merge, etc.)
│   │   ├── home/                 # HomeDashboard, HeroSection, ToolExplorer, ToolCard
│   │   ├── organizer/            # PageOrganizer drag & drop page management
│   │   ├── sidebar/              # Thumbnails, bookmarks, annotations, search sidebar
│   │   └── viewer/               # PDFViewer, PageCanvas, SelectionHUD
│   ├── data/                     # Tools catalog metadata (45 registered tools)
│   ├── hooks/                    # Custom React hooks
│   ├── stores/                   # Zustand Global Stores (documentStore, toolStore, uiStore, ttsStore)
│   ├── types/                    # TypeScript interfaces & types
│   ├── utils/                    # Spline utils, download helpers
│   ├── App.tsx                   # Top-level application shell & modal orchestrator
│   ├── index.css                 # Pure AMOLED black (#000000) styles & text-layer CSS
│   └── main.tsx                  # React DOM entry point
├── tests/                        # Vitest Test Suites
│   └── unit/                     # 37 Unit & integration test files
├── public/                       # Static public assets (Favicon, SW, Fonts)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # Path aliases (@/* -> src/*, @core/* -> core/*)
└── vite.config.ts                # Vite build and worker configuration
```

## Key Entry Points
- `src/main.tsx`: React DOM mount.
- `src/App.tsx`: Central coordinator managing active document view vs. HomeDashboard, global keyboard shortcuts, and modal registry.
- `src/components/home/HomeDashboard.tsx`: Landing hub with dual upload workspaces (PDF vs Photo).
- `src/components/viewer/PDFViewer.tsx`: Canvas rendering, continuous page virtualization, and text selection overlay.
- `core/pdf/engine.factory.ts`: Singleton factory returning the active PDF engine.
