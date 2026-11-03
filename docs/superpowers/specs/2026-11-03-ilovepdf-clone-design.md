# iLovePDF Clone - Design Specification

## Overview
A client-side web application cloning https://www.ilovepdf.com/. It replicates iLovePDF's authentic branding, visual layout, and tool suite with in-browser PDF manipulation.

## Core Architecture
- **Framework**: Vite + React 18 + TypeScript + Tailwind CSS
- **Iconography**: Lucide React
- **PDF Engine**: `pdf-lib` (Document assembly, manipulation, watermarking, page numbers, encryption)
- **PDF Rendering**: `pdfjs-dist` + HTML5 Canvas (Page preview thumbnails, PDF to JPG)
- **Packaging**: `jszip` + `file-saver` (Batch downloads)
- **Deployment**: Zero-backend Single Page Application (100% private client-side execution)

## Key Tools Implemented
1. **Merge PDF**: Combine multiple PDFs in custom order
2. **Split PDF**: Extract ranges or burst pages
3. **Compress PDF**: Optimize streams and image quality
4. **Rotate PDF**: Rotate selected or all pages (90°, 180°, 270°)
5. **Organize PDF**: Reorder, duplicate, and delete pages visually
6. **Watermark PDF**: Text/image watermark with opacity, position, rotation
7. **Page Numbers**: Add customizable page numbers
8. **Protect PDF**: Password encrypt PDFs
9. **Unlock PDF**: Decrypt password-protected PDFs
10. **JPG to PDF**: Convert images to PDF
11. **PDF to JPG**: Export PDF pages as images (ZIP bundle)

## UI & UX Design
- Authentic iLovePDF red (`#e5322d`) and gray theme
- Header with categorized tool dropdown mega-menu
- Hero section with title and search bar
- Categorized tool card grid
- Unified 3-stage tool workspace (Select -> Configure/Arrange -> Complete/Download)
- Responsive layout for desktop and mobile
