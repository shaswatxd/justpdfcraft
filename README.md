# JustPDFCraft 📄✨

**JustPDFCraft** is a private, client-side document studio built with **Vite**, **React 18**, **TypeScript**, and **Tailwind CSS**.

100% of PDF processing, manipulation, OCR, conversion, and encryption executes **locally inside your browser** using WebAssembly, `pdf-lib`, `pdfjs-dist`, `docx`, and `xlsx`. **No files or telemetry ever leave your device.**

---

## 🎨 Brand & Design System

- **Brand Name**: JustPDFCraft
- **Visual Style**: Clean glassmorphism, modern Indigo & Violet accents, Plus Jakarta Sans typography, deep slate contrast.
- **Zero Authentication**: Open access with zero logins, signups, or paywalls.
- **Privacy Guarantee**: 100% in-browser WebAssembly execution.

---

## 🛠️ Complete Suite of 26 Studio Tools

### 1. Organize
- **Merge PDF**: Combine multiple PDFs into a single document in any custom order.
- **Split PDF**: Extract page ranges or burst all pages into individual files in a ZIP archive.
- **Organize Pages**: Visual thumbnail workspace to reorder, duplicate, rotate, and delete pages.
- **Rotate PDF**: Permanently rotate pages clockwise or counter-clockwise (90°, 180°, 270°).

### 2. Optimize
- **Compress PDF**: Optimize streams and downsample imagery with tailored compression profiles.
- **Repair PDF**: Rebuild damaged xref cross-reference tables and recover corrupted objects.
- **OCR Text Extractor**: Extract raw text streams and generate searchable document layers.

### 3. Convert to PDF
- **Images to PDF**: Convert JPG, PNG, WebP, and BMP graphics into clean PDF documents.
- **Word to PDF**: Transform Microsoft Word (.docx/.doc) and rich text files into universal PDFs.
- **Excel to PDF**: Render Microsoft Excel (.xlsx/.xls/.csv) spreadsheets into formatted PDF tables.
- **PowerPoint to PDF**: Convert presentation slides (.pptx/.ppt) into portable PDF documents.
- **HTML to PDF**: Convert raw HTML code or web snippets into styled PDF documents.

### 4. Convert from PDF
- **PDF to Images**: Render pages into high-resolution JPG/PNG images or ZIP archives.
- **PDF to Word**: Extract formatted text and layout into editable Microsoft Word (.docx).
- **PDF to Excel**: Pull tables and structured data directly into Microsoft Excel spreadsheets (.xlsx).
- **PDF to PowerPoint**: Transform PDF pages into editable slide decks (.ppt).
- **PDF to PDF/A**: Convert PDF to ISO 19005-1 compliant PDF/A-1b archiving format.

### 5. Security & Studio
- **Sign Document**: Interactive signature pad to draw with bezier smoothing or type legal signatures.
- **Edit PDF**: Add text annotations, review notes, and yellow highlights directly onto pages.
- **Watermark**: Stamp custom security watermarks with 9-point grid alignment and opacity.
- **Page Numbers**: Insert sequential page numbers with flexible positioning and format presets.
- **Protect PDF**: Military-grade AES-256 standard encryption with custom passwords.
- **Unlock PDF**: Strip security restrictions and decrypt protected PDF files client-side.
- **Scan to PDF**: Capture physical documents using your device webcam or camera.
- **Compare PDFs**: Inspect two documents side-by-side to detect structural and page differences.
- **Redact PDF**: Permanently blackout confidential and sensitive personal information.

---

## 🚀 Running Locally

```bash
# Start development server
npm run dev

# Run automated verification tests
node scripts/verify-all-11-tools.js
node scripts/verify-extended-tools.js

# Build production bundle
npm run build
```

Available locally at:
**`http://localhost:5173/`**
