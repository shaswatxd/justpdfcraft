import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFName,
  PDFDict,
  PDFArray,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { encryptPDF, EncryptPDFOptions } from '@pdfsmaller/pdf-encrypt';
import {
  PDFEngine,
  DocumentMetadata,
  PageDimensions,
  RenderResult,
  PageTextContent,
  TextItem,
  AnnotationObject,
  FormFieldData,
  RedactionArea,
  CompressOptions,
  CompressResult,
  InsertTextOptions,
  InsertImageOptions,
  WatermarkOptions,
  BatesNumberingOptions,
  HeaderFooterOptions,
  HeaderFooterPosition,
  SanitizeResult,
  BatchItem,
  BatchProcessOptions,
  CropBoxOptions,
  MarginTrimOptions,
  ReplaceTextOptions,
  FormFieldCreateOptions,
  DocumentOutlineItem,
  ExtractedImageItem,
} from '../engine.interface';
import { extractImagesFromDocument } from '../image-extractor';

// Configure pdfjs worker if in browser environment
if (typeof window !== 'undefined') {
  // Use worker from local bundle or CDN fallback
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

interface LoadedDocRecord {
  id: string;
  pdfLibDoc: PDFDocument;
  pdfjsDoc: any | null;
  rawBytes: Uint8Array;
  baseBytes: Uint8Array;
  metadata: DocumentMetadata;
  annotations: Map<string, AnnotationObject>;
  pendingPassword?: string;
  pendingEncryptionOptions?: EncryptPDFOptions;
}

export class FallbackPDFEngine implements PDFEngine {
  readonly engineName = 'JustPDFCraft Native Open-Source Engine (pdf-lib + PDF.js)';
  readonly isCommercial = false;

  private activeDocuments: Map<string, LoadedDocRecord> = new Map();

  async openDocument(
    source: Uint8Array,
    password?: string
  ): Promise<{ documentId: string; metadata: DocumentMetadata }> {
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let pdfLibDoc: PDFDocument;
    try {
      pdfLibDoc = await PDFDocument.load(source, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
    } catch (err: any) {
      throw new Error(`Failed to parse PDF binary stream: ${err?.message || err}`);
    }

    let pdfjsDoc: any = null;
    let isEncrypted = false;
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: source.slice(),
        password: password || '',
      });
      pdfjsDoc = await loadingTask.promise;
    } catch (err: any) {
      if (err?.name === 'PasswordException') {
        isEncrypted = true;
      }
      // If in Node/test environment without canvas, pdfjsDoc might fail gracefully
    }

    const title = pdfLibDoc.getTitle() || undefined;
    const author = pdfLibDoc.getAuthor() || undefined;
    const subject = pdfLibDoc.getSubject() || undefined;
    const creator = pdfLibDoc.getCreator() || undefined;
    const producer = pdfLibDoc.getProducer() || 'JustPDFCraft Engine';
    const creationDate = pdfLibDoc.getCreationDate() || undefined;
    const modificationDate = pdfLibDoc.getModificationDate() || undefined;
    const pageCount = pdfLibDoc.getPageCount();

    const metadata: DocumentMetadata = {
      title,
      author,
      subject,
      creator,
      producer,
      creationDate,
      modificationDate,
      isEncrypted,
      pageCount,
      pdfVersion: '1.7',
      fileSizeBytes: source.byteLength,
    };

    this.activeDocuments.set(documentId, {
      id: documentId,
      pdfLibDoc,
      pdfjsDoc,
      rawBytes: source,
      baseBytes: source.slice(0),
      metadata,
      annotations: new Map(),
    });

    return { documentId, metadata };
  }

  async closeDocument(documentId: string): Promise<void> {
    const doc = this.activeDocuments.get(documentId);
    if (doc?.pdfjsDoc) {
      try {
        await doc.pdfjsDoc.destroy();
      } catch {
        // ignore
      }
    }
    this.activeDocuments.delete(documentId);
  }

  async saveDocument(documentId: string): Promise<Uint8Array> {
    const doc = this.getDoc(documentId);
    let bytes = await doc.pdfLibDoc.save({ useObjectStreams: true });
    if (doc.pendingPassword) {
      bytes = await encryptPDF(bytes, doc.pendingPassword, {
        algorithm: 'AES-256',
        ...doc.pendingEncryptionOptions,
      });
      doc.pendingPassword = undefined;
      doc.pendingEncryptionOptions = undefined;
    }
    doc.rawBytes = bytes;
    doc.metadata.fileSizeBytes = bytes.byteLength;
    return bytes;
  }

  async getMetadata(documentId: string): Promise<DocumentMetadata> {
    return this.getDoc(documentId).metadata;
  }

  async updateMetadata(
    documentId: string,
    metadata: Partial<DocumentMetadata>
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    if (metadata.title !== undefined) doc.pdfLibDoc.setTitle(metadata.title);
    if (metadata.author !== undefined) doc.pdfLibDoc.setAuthor(metadata.author);
    if (metadata.subject !== undefined) doc.pdfLibDoc.setSubject(metadata.subject);
    if (metadata.creator !== undefined) doc.pdfLibDoc.setCreator(metadata.creator);
    if (metadata.producer !== undefined) doc.pdfLibDoc.setProducer(metadata.producer);

    doc.metadata = {
      ...doc.metadata,
      ...metadata,
      modificationDate: new Date(),
    };
  }

  getPageCount(documentId: string): number {
    return this.getDoc(documentId).pdfLibDoc.getPageCount();
  }

  async getPageDimensions(
    documentId: string,
    pageIndex: number
  ): Promise<PageDimensions> {
    const doc = this.getDoc(documentId);
    const page = doc.pdfLibDoc.getPage(pageIndex);
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;
    return {
      pageNumber: pageIndex + 1,
      width,
      height,
      rotation,
    };
  }

  async renderPage(
    documentId: string,
    pageIndex: number,
    scale: number = 1.0
  ): Promise<RenderResult> {
    const doc = this.getDoc(documentId);

    // If PDF.js document is available and running in DOM environment
    if (doc.pdfjsDoc && typeof document !== 'undefined') {
      const page = await doc.pdfjsDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        return {
          pageIndex,
          canvas,
          imageDataUrl: '',
          width: canvas.width,
          height: canvas.height,
          scale,
        };
      }
    }

    // Fallback: Calculate dimensions and provide empty canvas representation
    const pageDims = await this.getPageDimensions(documentId, pageIndex);
    const width = Math.floor(pageDims.width * scale);
    const height = Math.floor(pageDims.height * scale);

    let dataUrl = '';
    let canvas: HTMLCanvasElement | null = null;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#64748B';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${pageIndex + 1}`, width / 2, height / 2);
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    return {
      pageIndex,
      canvas,
      imageDataUrl: dataUrl,
      width,
      height,
      scale,
    };
  }

  async extractPageText(
    documentId: string,
    pageIndex: number
  ): Promise<PageTextContent> {
    const doc = this.getDoc(documentId);

    if (doc.pdfjsDoc) {
      try {
        const page = await doc.pdfjsDoc.getPage(pageIndex + 1);
        const textContent = await page.getTextContent();
        const items: TextItem[] = [];
        let fullText = '';

        for (const item of textContent.items as any[]) {
          if (typeof item.str === 'string') {
            fullText += item.str + ' ';
            const scaleY = item.transform ? Math.hypot(item.transform[2], item.transform[3]) : 0;
            const fontHeight = item.height || scaleY || 12;
            items.push({
              str: item.str,
              dir: item.dir || 'ltr',
              width: item.width || 0,
              height: fontHeight,
              transform: item.transform || [1, 0, 0, 1, 0, 0],
              x: item.transform ? item.transform[4] : 0,
              y: item.transform ? item.transform[5] : 0,
            });
          }
        }

        return {
          pageIndex,
          text: fullText.trim(),
          items,
        };
      } catch (e) {
        console.warn('PDF.js text extraction error:', e);
      }
    }

    return {
      pageIndex,
      text: '',
      items: [],
    };
  }

  async searchDocument(
    documentId: string,
    query: string,
    caseSensitive: boolean = false
  ): Promise<Array<{ pageIndex: number; textSnippet: string; matchIndex: number }>> {
    const results: Array<{ pageIndex: number; textSnippet: string; matchIndex: number }> = [];
    const count = this.getPageCount(documentId);

    const needle = caseSensitive ? query : query.toLowerCase();

    for (let i = 0; i < count; i++) {
      const pageText = await this.extractPageText(documentId, i);
      const hay = caseSensitive ? pageText.text : pageText.text.toLowerCase();
      let pos = hay.indexOf(needle);
      let matchIdx = 0;

      while (pos !== -1 && pos < hay.length) {
        const start = Math.max(0, pos - 30);
        const end = Math.min(hay.length, pos + needle.length + 30);
        const snippet = '...' + pageText.text.substring(start, end).replace(/\s+/g, ' ') + '...';

        results.push({
          pageIndex: i,
          textSnippet: snippet,
          matchIndex: matchIdx++,
        });

        pos = hay.indexOf(needle, pos + needle.length);
      }
    }

    return results;
  }

  async reorderPages(documentId: string, pageIndices: number[]): Promise<void> {
    const doc = this.getDoc(documentId);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(doc.pdfLibDoc, pageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    doc.pdfLibDoc = newDoc;
    doc.metadata.pageCount = newDoc.getPageCount();
    await this.refreshInternalPdfjs(documentId);
  }

  async rotatePages(
    documentId: string,
    pageIndices: number[],
    deg: number
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    for (const idx of pageIndices) {
      if (idx >= 0 && idx < doc.pdfLibDoc.getPageCount()) {
        const page = doc.pdfLibDoc.getPage(idx);
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + deg) % 360));
      }
    }
    await this.refreshInternalPdfjs(documentId);
  }

  async deletePages(documentId: string, pageIndices: number[]): Promise<void> {
    const doc = this.getDoc(documentId);
    const total = doc.pdfLibDoc.getPageCount();
    const removeSet = new Set(pageIndices);

    const remainingIndices: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!removeSet.has(i)) {
        remainingIndices.push(i);
      }
    }

    if (remainingIndices.length === 0) {
      throw new Error('Cannot delete all pages in a document. At least one page must remain.');
    }

    await this.reorderPages(documentId, remainingIndices);
  }

  async insertBlankPage(
    documentId: string,
    atIndex: number,
    width: number = 595.28,
    height: number = 841.89
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    doc.pdfLibDoc.insertPage(atIndex, [width, height]);
    doc.metadata.pageCount = doc.pdfLibDoc.getPageCount();
    await this.refreshInternalPdfjs(documentId);
  }

  async duplicatePages(documentId: string, pageIndices: number[]): Promise<void> {
    const doc = this.getDoc(documentId);
    const count = doc.pdfLibDoc.getPageCount();
    const newIndices: number[] = [];

    for (let i = 0; i < count; i++) {
      newIndices.push(i);
      if (pageIndices.includes(i)) {
        newIndices.push(i);
      }
    }

    await this.reorderPages(documentId, newIndices);
  }

  async extractPages(documentId: string, pageIndices: number[]): Promise<Uint8Array> {
    const doc = this.getDoc(documentId);
    const extractedDoc = await PDFDocument.create();
    const pages = await extractedDoc.copyPages(doc.pdfLibDoc, pageIndices);
    pages.forEach((p) => extractedDoc.addPage(p));
    return await extractedDoc.save();
  }

  async reversePages(documentId: string): Promise<void> {
    const count = this.getPageCount(documentId);
    const reversed = Array.from({ length: count }, (_, i) => count - 1 - i);
    await this.reorderPages(documentId, reversed);
  }

  async mergeDocuments(sources: Uint8Array[]): Promise<Uint8Array> {
    const mergedDoc = await PDFDocument.create();

    for (const src of sources) {
      const srcDoc = await PDFDocument.load(src, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      pages.forEach((p) => mergedDoc.addPage(p));
    }

    return await mergedDoc.save({ useObjectStreams: true });
  }

  async splitDocument(
    documentId: string,
    pageRanges: Array<[number, number]>
  ): Promise<Uint8Array[]> {
    const doc = this.getDoc(documentId);
    const results: Uint8Array[] = [];

    for (const [start, end] of pageRanges) {
      const splitDoc = await PDFDocument.create();
      const indices: number[] = [];
      for (let i = start; i <= end && i < doc.pdfLibDoc.getPageCount(); i++) {
        indices.push(i);
      }
      const pages = await splitDoc.copyPages(doc.pdfLibDoc, indices);
      pages.forEach((p) => splitDoc.addPage(p));
      results.push(await splitDoc.save());
    }

    return results;
  }

  async insertText(
    documentId: string,
    options: InsertTextOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const page = doc.pdfLibDoc.getPage(options.pageIndex);

    let font = await doc.pdfLibDoc.embedFont(StandardFonts.Helvetica);
    if (options.fontFamily === 'TimesRoman') {
      font = await doc.pdfLibDoc.embedFont(StandardFonts.TimesRoman);
    } else if (options.fontFamily === 'Courier') {
      font = await doc.pdfLibDoc.embedFont(StandardFonts.Courier);
    }

    const { r, g, b } = hexToRgb(options.color || '#000000');

    page.drawText(options.text, {
      x: options.x,
      y: options.y,
      size: options.size || 12,
      font,
      color: rgb(r, g, b),
    });

    await this.refreshInternalPdfjs(documentId);
  }

  async insertImage(
    documentId: string,
    options: InsertImageOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const page = doc.pdfLibDoc.getPage(options.pageIndex);

    const embeddedImage =
      options.mimeType === 'image/png'
        ? await doc.pdfLibDoc.embedPng(options.imageBuffer)
        : await doc.pdfLibDoc.embedJpg(options.imageBuffer);

    page.drawImage(embeddedImage, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    });

    await this.refreshInternalPdfjs(documentId);
  }

  private async drawAnnotationOnPage(
    pdfLibDoc: PDFDocument,
    annotation: AnnotationObject
  ): Promise<void> {
    if (annotation.pageIndex >= pdfLibDoc.getPageCount()) return;
    const page = pdfLibDoc.getPage(annotation.pageIndex);
    const [x, y, w, h] = annotation.rect;
    const { r, g, b } = hexToRgb(annotation.color || '#0C8DE9');

    if (annotation.type === 'rectangle') {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(r, g, b),
        borderWidth: annotation.strokeWidth || 2,
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'circle') {
      page.drawEllipse({
        x: x + w / 2,
        y: y + h / 2,
        xScale: Math.max(1, Math.abs(w / 2)),
        yScale: Math.max(1, Math.abs(h / 2)),
        borderColor: rgb(r, g, b),
        borderWidth: annotation.strokeWidth || 2,
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'line') {
      const start = { x, y };
      const end = annotation.endPoint ? annotation.endPoint : { x: x + w, y: y + h };
      page.drawLine({
        start,
        end,
        thickness: annotation.strokeWidth || 2,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'arrow') {
      const start = { x, y };
      const end = annotation.endPoint ? annotation.endPoint : { x: x + w, y: y + h };
      page.drawLine({
        start,
        end,
        thickness: annotation.strokeWidth || 2,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
      // Vector arrow wings
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx);
      const arrowLen = Math.max(8, (annotation.strokeWidth || 2) * 4);
      const wingAngle = Math.PI / 6;
      page.drawLine({
        start: end,
        end: {
          x: end.x - arrowLen * Math.cos(angle - wingAngle),
          y: end.y - arrowLen * Math.sin(angle - wingAngle),
        },
        thickness: annotation.strokeWidth || 2,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
      page.drawLine({
        start: end,
        end: {
          x: end.x - arrowLen * Math.cos(angle + wingAngle),
          y: end.y - arrowLen * Math.sin(angle + wingAngle),
        },
        thickness: annotation.strokeWidth || 2,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'highlight') {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(r, g, b),
        opacity: Math.min(annotation.opacity || 0.35, 0.6),
      });
    } else if (annotation.type === 'underline') {
      page.drawLine({
        start: { x, y },
        end: { x: x + w, y },
        thickness: annotation.strokeWidth || 1.5,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'strikethrough') {
      page.drawLine({
        start: { x, y: y + h / 2 },
        end: { x: x + w, y: y + h / 2 },
        thickness: annotation.strokeWidth || 1.5,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });
    } else if (annotation.type === 'stamp') {
      const rawText = (annotation.stampText || annotation.content || 'APPROVED').trim();
      const lines = rawText.includes('\n')
        ? rawText.split('\n').map((l) => l.trim()).filter(Boolean)
        : rawText.split(' | ').map((l) => l.trim()).filter(Boolean);

      const isFlag =
        rawText.includes('SIGN HERE') ||
        rawText.includes('INITIAL HERE') ||
        rawText.includes('DATE HERE') ||
        (annotation as any).isFlag;

      const boldFont = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfLibDoc.embedFont(StandardFonts.Helvetica);

      if (isFlag) {
        // Flag-style arrow stamp (e.g. SIGN HERE ▶)
        const flagW = Math.max(w, 130);
        const flagH = Math.max(h, 30);
        page.drawRectangle({
          x,
          y,
          width: flagW,
          height: flagH,
          color: rgb(r, g, b),
          opacity: Math.max(0.85, annotation.opacity),
        });

        const flagText = lines[0] || 'SIGN HERE';
        const flagSize = 10.5;
        const textW = boldFont.widthOfTextAtSize(flagText, flagSize);
        page.drawText(flagText, {
          x: x + 10,
          y: y + (flagH - flagSize) / 2 + 1,
          size: flagSize,
          font: boldFont,
          color: rgb(1, 1, 1),
          opacity: 1,
        });

        // Arrow indicator on the right side of the flag
        const arrowX = x + textW + 18;
        page.drawText('>>>', {
          x: Math.min(x + flagW - 25, arrowX),
          y: y + (flagH - flagSize) / 2 + 1,
          size: flagSize,
          font: boldFont,
          color: rgb(1, 1, 1),
          opacity: 0.9,
        });
      } else {
        // Classic Double-Border Office Rubber Stamp with optional Date & Signer
        const stampW = Math.max(w, lines.length > 1 ? 145 : 120);
        const stampH = Math.max(h, lines.length > 2 ? 52 : lines.length > 1 ? 44 : 34);

        // Outer border box with soft background tint
        page.drawRectangle({
          x,
          y,
          width: stampW,
          height: stampH,
          borderColor: rgb(r, g, b),
          borderWidth: 2.2,
          color: rgb(r, g, b),
          opacity: 0.08,
        });

        // Inner fine border line
        page.drawRectangle({
          x: x + 2.5,
          y: y + 2.5,
          width: stampW - 5,
          height: stampH - 5,
          borderColor: rgb(r, g, b),
          borderWidth: 0.8,
        });

        if (lines.length === 1) {
          // Single line title
          const titleText = lines[0].toUpperCase();
          const textSize = Math.max(11, Math.min(16, stampH * 0.42));
          const textWidth = boldFont.widthOfTextAtSize(titleText, textSize);
          page.drawText(titleText, {
            x: x + (stampW - textWidth) / 2,
            y: y + (stampH - textSize) / 2 + 1,
            size: textSize,
            font: boldFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity,
          });
        } else if (lines.length === 2) {
          // Title + Date/Time
          const titleText = lines[0].toUpperCase();
          const titleSize = 12.5;
          const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
          page.drawText(titleText, {
            x: x + (stampW - titleWidth) / 2,
            y: y + stampH - 18,
            size: titleSize,
            font: boldFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity,
          });

          const subText = lines[1].toUpperCase();
          const subSize = 8.5;
          const subWidth = regularFont.widthOfTextAtSize(subText, subSize);
          page.drawText(subText, {
            x: x + (stampW - subWidth) / 2,
            y: y + 9,
            size: subSize,
            font: regularFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity * 0.9,
          });
        } else {
          // Title + Date + Signer
          const titleText = lines[0].toUpperCase();
          const titleSize = 11.5;
          const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
          page.drawText(titleText, {
            x: x + (stampW - titleWidth) / 2,
            y: y + stampH - 16,
            size: titleSize,
            font: boldFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity,
          });

          const dateText = lines[1].toUpperCase();
          const dateSize = 8;
          const dateWidth = regularFont.widthOfTextAtSize(dateText, dateSize);
          page.drawText(dateText, {
            x: x + (stampW - dateWidth) / 2,
            y: y + stampH - 28,
            size: dateSize,
            font: regularFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity * 0.9,
          });

          const signerText = lines[2].toUpperCase();
          const signerSize = 7.5;
          const signerWidth = regularFont.widthOfTextAtSize(signerText, signerSize);
          page.drawText(signerText, {
            x: x + (stampW - signerWidth) / 2,
            y: y + 7,
            size: signerSize,
            font: regularFont,
            color: rgb(r, g, b),
            opacity: annotation.opacity * 0.85,
          });
        }
      }
    } else if (annotation.type === 'note') {
      const font = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
      const noteW = Math.max(w, 110);
      const noteH = Math.max(h, 32);
      page.drawRectangle({
        x,
        y,
        width: noteW,
        height: noteH,
        color: rgb(1, 0.95, 0.65), // Classic note yellow
        borderColor: rgb(0.85, 0.75, 0.3),
        borderWidth: 1,
        opacity: 0.95,
      });
      const snippet = annotation.content
        ? annotation.content.substring(0, 22) + (annotation.content.length > 22 ? '...' : '')
        : 'Note';
      page.drawText(snippet, {
        x: x + 6,
        y: y + noteH / 2 - 3,
        size: 9,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    } else if (annotation.type === 'text' && annotation.content) {
      const font = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
      page.drawText(annotation.content, {
        x,
        y,
        size: 11,
        font,
        color: rgb(r, g, b),
      });
    } else if (annotation.type === 'draw' && annotation.points && annotation.points.length > 1) {
      // Freehand drawing: render segments as lines
      for (let i = 0; i < annotation.points.length - 1; i++) {
        const p1 = annotation.points[i];
        const p2 = annotation.points[i + 1];
        page.drawLine({
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y },
          thickness: annotation.strokeWidth || 2,
          color: rgb(r, g, b),
          opacity: annotation.opacity,
        });
      }
    } else if (annotation.type === 'measure') {
      const start = { x, y };
      const end = annotation.endPoint ? annotation.endPoint : { x: x + w, y: y + h };
      const thick = annotation.strokeWidth || 1.5;

      // Draw main dimension line
      page.drawLine({
        start,
        end,
        thickness: thick,
        color: rgb(r, g, b),
        opacity: annotation.opacity,
      });

      // Draw perpendicular dimension extension ticks at both ends
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const perpX = (-dy / len) * 6;
        const perpY = (dx / len) * 6;

        page.drawLine({
          start: { x: start.x - perpX, y: start.y - perpY },
          end: { x: start.x + perpX, y: start.y + perpY },
          thickness: thick,
          color: rgb(r, g, b),
          opacity: annotation.opacity,
        });

        page.drawLine({
          start: { x: end.x - perpX, y: end.y - perpY },
          end: { x: end.x + perpX, y: end.y + perpY },
          thickness: thick,
          color: rgb(r, g, b),
          opacity: annotation.opacity,
        });
      }

      // Draw measurement badge text at center
      const label = annotation.dimensionText || annotation.content;
      if (label) {
        try {
          const font = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const fontSize = 8.5;
          const textW = font.widthOfTextAtSize(label, fontSize);

          // White backing pill
          page.drawRectangle({
            x: midX - textW / 2 - 3,
            y: midY - 6,
            width: textW + 6,
            height: 12,
            color: rgb(1, 1, 1),
            borderColor: rgb(r, g, b),
            borderWidth: 0.75,
            opacity: 0.95,
          });

          page.drawText(label, {
            x: midX - textW / 2,
            y: midY - 3,
            size: fontSize,
            font,
            color: rgb(r, g, b),
          });
        } catch {}
      }
    }
  }

  async addAnnotation(
    documentId: string,
    annotation: AnnotationObject
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    doc.annotations.set(annotation.id, annotation);

    await this.drawAnnotationOnPage(doc.pdfLibDoc, annotation);
    await this.refreshInternalPdfjs(documentId);
  }

  async getAnnotations(
    documentId: string,
    pageIndex?: number
  ): Promise<AnnotationObject[]> {
    const doc = this.getDoc(documentId);
    const all = Array.from(doc.annotations.values());
    if (pageIndex !== undefined) {
      return all.filter((a) => a.pageIndex === pageIndex);
    }
    return all;
  }

  async deleteAnnotation(
    documentId: string,
    annotationId: string
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    doc.annotations.delete(annotationId);

    // Cleanly re-instantiate pdfLibDoc from baseBytes without deleted annotation
    doc.pdfLibDoc = await PDFDocument.load(doc.baseBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    // Replay remaining active annotations
    for (const annot of doc.annotations.values()) {
      await this.drawAnnotationOnPage(doc.pdfLibDoc, annot);
    }
    await this.refreshInternalPdfjs(documentId);
  }

  async flattenAnnotations(_documentId: string): Promise<void> {
    // pdf-lib drawText/drawRectangle is already natively baked into content streams
  }

  /**
   * True Redaction: Destructive content removal.
   * Completely blacks out the rectangular region with 100% opaque cover and stamps [REDACTED],
   * and strips underlying Annots dictionaries in that region.
   */
  async applyRedactions(
    documentId: string,
    redactions: RedactionArea[]
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const font = await doc.pdfLibDoc.embedFont(StandardFonts.HelveticaBold);

    for (const redaction of redactions) {
      if (redaction.pageIndex < doc.pdfLibDoc.getPageCount()) {
        const page = doc.pdfLibDoc.getPage(redaction.pageIndex);
        const [x, y, w, h] = redaction.rect;

        // Draw pure opaque black rectangle over pixels
        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: rgb(0, 0, 0),
          opacity: 1.0,
        });

        // Overlay text if provided or stamp REDACTED
        const overlay = redaction.overlayText || '[REDACTED]';
        const fontSize = Math.max(6, Math.min(h * 0.5, 10));
        page.drawText(overlay, {
          x: x + 4,
          y: y + h / 2 - fontSize / 2,
          size: fontSize,
          font,
          color: rgb(1, 1, 1),
        });

        // Clean annotations covering this rectangle
        const pageDict = page.node;
        const annots = pageDict.lookupMaybe(PDFName.of('Annots'), PDFArray);
        if (annots) {
          // Remove only annotations actually overlapping this redaction rect
          for (let i = annots.size() - 1; i >= 0; i--) {
            const annotDict = annots.lookupMaybe(i, PDFDict);
            if (annotDict) {
              const rectArr = annotDict.lookupMaybe(PDFName.of('Rect'), PDFArray);
              if (rectArr && rectArr.size() === 4) {
                const getCoord = (idx: number): number => {
                  const item = rectArr.get(idx);
                  return typeof (item as any)?.asNumber === 'function' ? (item as any).asNumber() : Number(item) || 0;
                };
                const ax1 = getCoord(0);
                const ay1 = getCoord(1);
                const ax2 = getCoord(2);
                const ay2 = getCoord(3);

                const aMinX = Math.min(ax1, ax2);
                const aMaxX = Math.max(ax1, ax2);
                const aMinY = Math.min(ay1, ay2);
                const aMaxY = Math.max(ay1, ay2);

                const overlaps = !(aMaxX < x || aMinX > x + w || aMaxY < y || aMinY > y + h);
                if (overlaps) {
                  annots.remove(i);
                }
              }
            }
          }
        }

        // True Redaction: Purge underlying text operators from content streams
        try {
          const contents = page.node.Contents();
          const streams = contents instanceof PDFArray ? contents.asArray() : (contents ? [contents] : []);
          for (const s of streams) {
            const obj = doc.pdfLibDoc.context.lookup(s);
            if (!obj) continue;
            const rawStreamBytes = (obj as any).getContents ? (obj as any).getContents() : (obj as any).contents;
            if (!rawStreamBytes || rawStreamBytes.length === 0) continue;
            try {
              const decodedStream = decodePDFRawStream({ dict: (obj as any).dict, contents: rawStreamBytes } as any);
              const decodedBytes = decodedStream.decode();
              let streamText = '';
              for (let i = 0; i < decodedBytes.length; i++) {
                streamText += String.fromCharCode(decodedBytes[i]);
              }

              // Purge BT...ET text blocks whose position coordinates overlap [x, y, w, h]
              let modified = false;
              const btRegex = /BT[\s\S]*?ET/g;
              const updatedText = streamText.replace(btRegex, (btBlock) => {
                const tmMatch = btBlock.match(/([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm/);
                const tdMatch = btBlock.match(/([-\d.]+)\s+([-\d.]+)\s+Td/);
                let tx = NaN;
                let ty = NaN;
                if (tmMatch) {
                  tx = parseFloat(tmMatch[5]);
                  ty = parseFloat(tmMatch[6]);
                } else if (tdMatch) {
                  tx = parseFloat(tdMatch[1]);
                  ty = parseFloat(tdMatch[2]);
                }
                if (!isNaN(tx) && !isNaN(ty)) {
                  if (tx >= x - 5 && tx <= x + w + 5 && ty >= y - 5 && ty <= y + h + 5) {
                    modified = true;
                    return 'BT ET';
                  }
                }
                return btBlock;
              });

              if (modified) {
                const newBytes = new Uint8Array(updatedText.length);
                for (let i = 0; i < updatedText.length; i++) {
                  newBytes[i] = updatedText.charCodeAt(i) & 0xff;
                }
                (obj as any).contents = newBytes;
                (obj as any).dict.set(PDFName.of('Length'), PDFNumber.of(newBytes.length));
                (obj as any).dict.delete(PDFName.of('Filter'));
              }
            } catch {
              // Ignore non-standard stream decompression errors
            }
          }
        } catch {
          // Ignore content stream retrieval errors
        }
      }
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async encryptDocument(
    documentId: string,
    userPassword: string,
    ownerPassword?: string,
    permissions?: { allowPrinting?: boolean; allowModifying?: boolean; allowCopying?: boolean }
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    doc.pendingPassword = userPassword;
    doc.pendingEncryptionOptions = {
      algorithm: 'AES-256',
      ownerPassword: ownerPassword || userPassword,
      allowPrinting: permissions?.allowPrinting !== undefined ? permissions.allowPrinting : true,
      allowCopying: permissions?.allowCopying !== undefined ? permissions.allowCopying : false,
      allowModifying: permissions?.allowModifying !== undefined ? permissions.allowModifying : false,
      allowAnnotating: true,
      allowFillingForms: true,
    };
    doc.metadata.isEncrypted = true;
  }

  async removePassword(documentId: string): Promise<void> {
    const doc = this.getDoc(documentId);
    doc.pendingPassword = undefined;
    doc.pendingEncryptionOptions = undefined;
    doc.metadata.isEncrypted = false;
  }

  async getFormFields(documentId: string): Promise<FormFieldData[]> {
    const doc = this.getDoc(documentId);
    const form = doc.pdfLibDoc.getForm();
    const fields = form.getFields();

    const pageCount = doc.pdfLibDoc.getPageCount();
    const pageRefs = new Map<any, number>();
    for (let i = 0; i < pageCount; i++) {
      const p = doc.pdfLibDoc.getPage(i);
      pageRefs.set(p.ref, i);
    }

    const results: FormFieldData[] = [];

    for (const f of fields) {
      const name = f.getName();
      let type: FormFieldData['type'] = 'text';
      let value: string | boolean = '';
      let multiline = false;
      let maxLength: number | undefined;
      let options: string[] | undefined;

      const constructorName = f.constructor.name;
      if (constructorName.includes('CheckBox')) {
        type = 'checkbox';
        value = (f as any).isChecked?.() ?? false;
      } else if (constructorName.includes('Radio')) {
        type = 'radio';
        value = (f as any).getSelected?.() ?? '';
        options = (f as any).getOptions?.();
      } else if (constructorName.includes('Dropdown') || constructorName.includes('OptionList')) {
        type = 'dropdown';
        value = (f as any).getSelected?.()?.[0] ?? '';
        options = (f as any).getOptions?.();
      } else if (constructorName.includes('Button')) {
        type = 'button';
      } else {
        type = 'text';
        value = (f as any).getText?.() ?? '';
        multiline = (f as any).isMultiline?.() ?? false;
        maxLength = (f as any).getMaxLength?.();
      }

      const widgets = f.acroField.getWidgets();
      if (widgets.length === 0) {
        results.push({
          name,
          type,
          value,
          pageIndex: 0,
          rect: { x: 0, y: 0, width: 100, height: 25 },
          multiline,
          maxLength,
          options,
          readOnly: f.isReadOnly(),
        });
        continue;
      }

      for (const w of widgets) {
        let pageIndex = 0;
        const pRef = w.dict.get(PDFName.of('P'));
        if (pRef && pageRefs.has(pRef)) {
          pageIndex = pageRefs.get(pRef)!;
        } else {
          // Fallback: check which page's Annots contains this widget
          for (let i = 0; i < pageCount; i++) {
            const pageDict = doc.pdfLibDoc.getPage(i).node;
            const annots = pageDict.lookupMaybe(PDFName.of('Annots'), PDFArray);
            if (annots) {
              for (let aIdx = 0; aIdx < annots.size(); aIdx++) {
                if (annots.get(aIdx) === w.dict) {
                  pageIndex = i;
                  break;
                }
              }
            }
          }
        }

        const rawRect = w.getRectangle();
        const rect = {
          x: Math.round(rawRect.x),
          y: Math.round(rawRect.y),
          width: Math.round(rawRect.width),
          height: Math.round(rawRect.height),
        };

        results.push({
          name,
          type,
          value,
          pageIndex,
          rect,
          multiline,
          maxLength,
          options,
          readOnly: f.isReadOnly(),
        });
      }
    }

    return results;
  }

  async setFormFieldValue(
    documentId: string,
    fieldName: string,
    value: string | boolean
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const form = doc.pdfLibDoc.getForm();

    try {
      if (typeof value === 'boolean') {
        const cb = form.getCheckBox(fieldName);
        if (value) cb.check();
        else cb.uncheck();
      } else {
        // Try as dropdown first, then radio, then text field
        try {
          const dd = form.getDropdown(fieldName);
          dd.select(value);
        } catch {
          try {
            const rg = form.getRadioGroup(fieldName);
            rg.select(value);
          } catch {
            const tf = form.getTextField(fieldName);
            tf.setText(value);
          }
        }
      }
      await this.refreshInternalPdfjs(documentId);
    } catch (err: any) {
      console.warn(`Failed to set form field "${fieldName}":`, err);
    }
  }

  async clearFormFields(documentId: string): Promise<void> {
    const doc = this.getDoc(documentId);
    const form = doc.pdfLibDoc.getForm();

    for (const f of form.getFields()) {
      try {
        const constructorName = f.constructor.name;
        if (constructorName.includes('CheckBox')) {
          (f as any).uncheck?.();
        } else if (constructorName.includes('TextField')) {
          (f as any).setText?.('');
        } else if (constructorName.includes('Radio')) {
          (f as any).clear?.();
        } else if (constructorName.includes('Dropdown') || constructorName.includes('OptionList')) {
          const opts = (f as any).getOptions?.();
          if (opts && opts.length > 0) {
            (f as any).select?.(opts[0]);
          }
        }
      } catch {
        // ignore individual field clear errors
      }
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async exportFormData(documentId: string): Promise<Record<string, any>> {
    const fields = await this.getFormFields(documentId);
    const data: Record<string, any> = {};
    for (const f of fields) {
      data[f.name] = f.value;
    }
    return data;
  }

  async flattenForms(documentId: string): Promise<void> {
    const doc = this.getDoc(documentId);
    const form = doc.pdfLibDoc.getForm();
    form.flatten();
    await this.refreshInternalPdfjs(documentId);
  }

  private async downsampleJpegInBrowser(
    jpegBytes: Uint8Array,
    maxDimension: number,
    quality: number
  ): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
    if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') {
      return null;
    }
    let source: CanvasImageSource | null = null;
    try {
      const blob = new Blob([jpegBytes as unknown as BlobPart], { type: 'image/jpeg' });
      let originalWidth = 0;
      let originalHeight = 0;

      if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(blob);
        originalWidth = bmp.width;
        originalHeight = bmp.height;
        source = bmp;
      } else if (typeof Image !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
        });
        URL.revokeObjectURL(url);
        originalWidth = img.naturalWidth || img.width;
        originalHeight = img.naturalHeight || img.height;
        source = img;
      }

      if (!source || originalWidth <= 0 || originalHeight <= 0) return null;

      const maxDim = Math.max(originalWidth, originalHeight);
      const scale = maxDim > maxDimension ? maxDimension / maxDim : 1.0;
      const targetW = Math.max(1, Math.round(originalWidth * scale));
      const targetH = Math.max(1, Math.round(originalHeight * scale));

      if (scale >= 1.0 && jpegBytes.byteLength < 50000) {
        return null;
      }

      let compressedBlob: Blob | null = null;
      if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(targetW, targetH);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(source, 0, 0, targetW, targetH);
        compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
      } else if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(source, 0, 0, targetW, targetH);
        compressedBlob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality)
        );
      }

      if (compressedBlob) {
        const buffer = await compressedBlob.arrayBuffer();
        const resBytes = new Uint8Array(buffer);
        if (resBytes.byteLength < jpegBytes.byteLength) {
          return { bytes: resBytes, width: targetW, height: targetH };
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      if (source && 'close' in source && typeof (source as any).close === 'function') {
        (source as any).close();
      }
    }
  }

  async compressDocument(
    documentId: string,
    options: CompressOptions,
    onProgress?: (percent: number) => void
  ): Promise<CompressResult> {
    const doc = this.getDoc(documentId);
    const originalBytes = doc.rawBytes.byteLength;

    if (onProgress) onProgress(15);

    // Strip metadata if requested
    if (options.stripMetadata) {
      doc.pdfLibDoc.setTitle('');
      doc.pdfLibDoc.setAuthor('');
      doc.pdfLibDoc.setSubject('');
      doc.pdfLibDoc.setKeywords([]);
      doc.pdfLibDoc.setProducer('JustPDFCraft Compressor');
      doc.pdfLibDoc.setCreator('');
    }

    // Downsample embedded raster images for scanned / image-heavy PDFs
    try {
      const imagePresets: Record<string, { maxDim: number; quality: number }> = {
        max_quality: { maxDim: 1920, quality: 0.82 },
        balanced: { maxDim: 1280, quality: 0.70 },
        small_file: { maxDim: 960, quality: 0.55 },
        extreme: { maxDim: 640, quality: 0.40 },
      };
      const presetConfig = imagePresets[options.preset] || imagePresets.balanced;
      const indirectObjects = doc.pdfLibDoc.context.enumerateIndirectObjects();
      const totalObjs = indirectObjects.length;
      let processedCount = 0;

      for (const [, obj] of indirectObjects) {
        processedCount++;
        if (onProgress && totalObjs > 0 && processedCount % 5 === 0) {
          onProgress(20 + Math.round((processedCount / totalObjs) * 45));
        }

        if (obj instanceof PDFRawStream || (obj as any).contents) {
          const dict = (obj as any).dict || obj;
          const subtype = dict?.get?.(PDFName.of('Subtype'))?.toString();
          if (subtype === '/Image') {
            const filter = dict?.get?.(PDFName.of('Filter'))?.toString() || '';
            const rawBytes = (obj as any).getContents?.() || (obj as any).contents;
            if (rawBytes && rawBytes.byteLength > 2048) {
              if (filter === '/DCTDecode') {
                const optimized = await this.downsampleJpegInBrowser(
                  rawBytes,
                  presetConfig.maxDim,
                  presetConfig.quality
                );
                if (optimized && optimized.bytes.byteLength < rawBytes.byteLength) {
                  (obj as any).contents = optimized.bytes;
                  dict.set(PDFName.of('Length'), PDFNumber.of(optimized.bytes.byteLength));
                  dict.set(PDFName.of('Width'), PDFNumber.of(optimized.width));
                  dict.set(PDFName.of('Height'), PDFNumber.of(optimized.height));
                }
              }
            }
          }
        }
      }
    } catch {
      // Continue gracefully if image downsampling is not supported in current environment
    }

    if (onProgress) onProgress(75);

    // Recompress object streams and clean unused references
    const compressedData = await doc.pdfLibDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    if (onProgress) onProgress(100);

    const newBytes = compressedData.byteLength;
    const compressionRatio = Number(((1 - newBytes / originalBytes) * 100).toFixed(1));

    return {
      originalBytes,
      newBytes,
      compressionRatio: Math.max(0, compressionRatio),
      data: compressedData,
    };
  }

  async addWatermark(
    documentId: string,
    options: WatermarkOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const totalPages = doc.pdfLibDoc.getPageCount();
    let targets = options.pageIndices || Array.from({ length: totalPages }, (_, i) => i);
    if (options.skipCoverPage) {
      targets = targets.filter((idx) => idx !== 0);
    }

    const opacity = options.opacity !== undefined ? options.opacity : 0.25;
    const rotDeg = options.rotationDegrees !== undefined ? options.rotationDegrees : 45;

    // 1. Image / Logo Watermark
    if (options.imageBuffer) {
      let embeddedImage;
      try {
        if (options.imageMimeType === 'image/jpeg') {
          embeddedImage = await doc.pdfLibDoc.embedJpg(options.imageBuffer);
        } else {
          embeddedImage = await doc.pdfLibDoc.embedPng(options.imageBuffer);
        }
      } catch {
        embeddedImage = await doc.pdfLibDoc.embedPng(options.imageBuffer);
      }

      for (const pageIdx of targets) {
        if (pageIdx < totalPages) {
          const page = doc.pdfLibDoc.getPage(pageIdx);
          const { width, height } = page.getSize();

          const targetW = options.imageWidth || Math.min(width * 0.55, 320);
          const targetH = options.imageHeight || (targetW * embeddedImage.height) / embeddedImage.width;
          const x = (width - targetW) / 2;
          const y = (height - targetH) / 2;

          page.drawImage(embeddedImage, {
            x,
            y,
            width: targetW,
            height: targetH,
            opacity,
            rotate: degrees(rotDeg),
          });
        }
      }
    } else if (options.text) {
      // 2. Text Watermark
      const font = await doc.pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
      const { r, g, b } = hexToRgb(options.color || '#EF4444');
      const fontSize = options.fontSize || 54;

      for (const pageIdx of targets) {
        if (pageIdx < totalPages) {
          const page = doc.pdfLibDoc.getPage(pageIdx);
          const { width, height } = page.getSize();
          
          const textWidth = font.widthOfTextAtSize(options.text, fontSize);
          const textHeight = font.heightAtSize(fontSize);

          page.drawText(options.text, {
            x: width / 2 - (textWidth / 2) * Math.cos((rotDeg * Math.PI) / 180),
            y: height / 2 - (textHeight / 2) * Math.sin((rotDeg * Math.PI) / 180),
            size: fontSize,
            font,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(rotDeg),
          });
        }
      }
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async removeBlankPages(documentId: string): Promise<number[]> {
    const doc = this.getDoc(documentId);
    const totalPages = doc.pdfLibDoc.getPageCount();
    const blankPageIndices: number[] = [];

    for (let i = 0; i < totalPages; i++) {
      const textContent = await this.extractPageText(documentId, i);
      if (!textContent.text || textContent.text.trim().length === 0) {
        blankPageIndices.push(i);
      }
    }

    // Only delete if at least 1 non-blank page remains
    if (blankPageIndices.length > 0 && blankPageIndices.length < totalPages) {
      await this.deletePages(documentId, blankPageIndices);
      return blankPageIndices;
    }

    return [];
  }

  async addBatesNumbering(
    documentId: string,
    options: BatesNumberingOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const totalPages = doc.pdfLibDoc.getPageCount();

    let fontName = StandardFonts.Helvetica;
    if (options.fontFamily === 'TimesRoman') fontName = StandardFonts.TimesRoman;
    if (options.fontFamily === 'Courier') fontName = StandardFonts.Courier;
    const font = await doc.pdfLibDoc.embedFont(fontName);

    const fontSize = options.fontSize || 10;
    const colorHex = options.color || '#000000';
    const { r, g, b } = hexToRgb(colorHex);
    const margin = options.margin !== undefined ? options.margin : 24;

    const pageIndices =
      options.pageIndices && options.pageIndices.length > 0
        ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
        : Array.from({ length: totalPages }, (_, i) => i);

    for (let i = 0; i < pageIndices.length; i++) {
      const pageIndex = pageIndices[i];
      const page = doc.pdfLibDoc.getPage(pageIndex);
      const { width, height } = page.getSize();

      const currentNumber = options.startNumber + i;
      const formattedNum = String(currentNumber).padStart(options.digitsCount, '0');
      const batesText = `${options.prefix || ''}${formattedNum}${options.suffix || ''}`;

      const textWidth = font.widthOfTextAtSize(batesText, fontSize);
      const textHeight = fontSize;

      const { x, y } = calculateHeaderFooterCoords(
        options.position,
        width,
        height,
        textWidth,
        textHeight,
        margin
      );

      page.drawText(batesText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async addHeaderFooter(
    documentId: string,
    options: HeaderFooterOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const totalPages = doc.pdfLibDoc.getPageCount();

    let fontName = StandardFonts.Helvetica;
    if (options.fontFamily === 'TimesRoman') fontName = StandardFonts.TimesRoman;
    if (options.fontFamily === 'Courier') fontName = StandardFonts.Courier;
    const font = await doc.pdfLibDoc.embedFont(fontName);

    const fontSize = options.fontSize || 9;
    const colorHex = options.color || '#475569';
    const { r, g, b } = hexToRgb(colorHex);
    const margin = options.margin !== undefined ? options.margin : 20;

    const pageIndices =
      options.pageIndices && options.pageIndices.length > 0
        ? options.pageIndices.filter((idx) => idx >= 0 && idx < totalPages)
        : Array.from({ length: totalPages }, (_, i) => i);

    const now = new Date();
    const dateStr = now.toLocaleDateString();

    for (let i = 0; i < pageIndices.length; i++) {
      const pageIndex = pageIndices[i];
      const page = doc.pdfLibDoc.getPage(pageIndex);
      const { width, height } = page.getSize();

      const renderedText = options.text
        .replace(/\{page\}/gi, String(pageIndex + 1))
        .replace(/\{totalPages\}/gi, String(totalPages))
        .replace(/\{date\}/gi, dateStr);

      const textWidth = font.widthOfTextAtSize(renderedText, fontSize);
      const textHeight = fontSize;

      const { x, y } = calculateHeaderFooterCoords(
        options.position,
        width,
        height,
        textWidth,
        textHeight,
        margin
      );

      page.drawText(renderedText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async sanitizeDocument(documentId: string): Promise<SanitizeResult> {
    const doc = this.getDoc(documentId);
    const strippedFields: string[] = [];

    // 1. Detect and wipe standard document information dictionary
    const currentTitle = doc.pdfLibDoc.getTitle();
    if (currentTitle) {
      strippedFields.push('Title');
      doc.pdfLibDoc.setTitle('');
    }

    const currentAuthor = doc.pdfLibDoc.getAuthor();
    if (currentAuthor) {
      strippedFields.push('Author');
      doc.pdfLibDoc.setAuthor('');
    }

    const currentSubject = doc.pdfLibDoc.getSubject();
    if (currentSubject) {
      strippedFields.push('Subject');
      doc.pdfLibDoc.setSubject('');
    }

    const currentCreator = doc.pdfLibDoc.getCreator();
    if (currentCreator) {
      strippedFields.push('Creator');
      doc.pdfLibDoc.setCreator('');
    }

    const currentProducer = doc.pdfLibDoc.getProducer();
    if (currentProducer) {
      strippedFields.push('Producer');
      doc.pdfLibDoc.setProducer('SwiftPDF Sanitizer');
    }

    const currentKeywords = doc.pdfLibDoc.getKeywords();
    if (currentKeywords && currentKeywords.length > 0) {
      strippedFields.push('Keywords');
      doc.pdfLibDoc.setKeywords([]);
    }

    if (doc.metadata.creationDate) {
      strippedFields.push('Creation Date');
      doc.pdfLibDoc.setCreationDate(new Date(0));
    }

    if (doc.metadata.modificationDate) {
      strippedFields.push('Modification Date');
      doc.pdfLibDoc.setModificationDate(new Date(0));
    }

    // 2. Destructively purge Catalog XMP XML Metadata Stream
    let hasXmpStreamPurged = false;
    const catalog = doc.pdfLibDoc.catalog;
    if (catalog.has(PDFName.of('Metadata'))) {
      const metaRef = catalog.get(PDFName.of('Metadata'));
      catalog.delete(PDFName.of('Metadata'));
      if (metaRef) {
        doc.pdfLibDoc.context.delete(metaRef as any);
      }
      hasXmpStreamPurged = true;
      strippedFields.push('Raw XMP XML Metadata Stream');
    }

    // Also sweep and purge any orphaned /Type /Metadata streams across the context
    const entries = doc.pdfLibDoc.context.enumerateIndirectObjects();
    for (const [ref, obj] of entries) {
      const dict = (obj as any).dict || obj;
      const type = dict && typeof dict.get === 'function' ? dict.get(PDFName.of('Type')) : null;
      if (type && type.toString() === '/Metadata') {
        doc.pdfLibDoc.context.delete(ref);
        hasXmpStreamPurged = true;
      }
    }

    // Update internal metadata cache
    doc.metadata = {
      ...doc.metadata,
      title: undefined,
      author: undefined,
      subject: undefined,
      creator: undefined,
      producer: 'SwiftPDF Sanitizer',
      creationDate: undefined,
      modificationDate: undefined,
    };

    await this.refreshInternalPdfjs(documentId);

    return {
      strippedFields,
      hasXmpStreamPurged,
      cleanedMetadata: doc.metadata,
    };
  }

  async processBatch(items: BatchItem[], options: BatchProcessOptions): Promise<BatchItem[]> {
    const results: BatchItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemResult: BatchItem = {
        ...item,
        status: 'processing',
        progress: 10,
      };

      if (options.onProgress) {
        options.onProgress(item.id, 10);
      }

      let activeDocId: string | null = null;

      try {
        // 1. Open document
        const openRes = await this.openDocument(item.fileBytes);
        activeDocId = openRes.documentId;
        itemResult.progress = 30;
        if (options.onProgress) options.onProgress(item.id, 30);

        // 2. Perform requested operation
        let outputFileName = item.fileName;
        const nameParts = item.fileName.split('.');
        const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '.pdf';
        const baseName = nameParts.join('.');

        if (options.operation === 'compress') {
          const compressOpts = options.compressOptions || { preset: 'balanced' };
          const compResult = await this.compressDocument(activeDocId, compressOpts);
          itemResult.outputBytes = compResult.data;
          itemResult.savingsBytes = Math.max(0, compResult.originalBytes - compResult.newBytes);
          outputFileName = `${baseName}-compressed${ext}`;
        } else if (options.operation === 'watermark') {
          if (options.watermarkOptions) {
            await this.addWatermark(activeDocId, options.watermarkOptions);
          }
          const savedBytes = await this.saveDocument(activeDocId);
          itemResult.outputBytes = savedBytes;
          outputFileName = `${baseName}-watermarked${ext}`;
        } else if (options.operation === 'sanitize') {
          await this.sanitizeDocument(activeDocId);
          const savedBytes = await this.saveDocument(activeDocId);
          itemResult.outputBytes = savedBytes;
          outputFileName = `${baseName}-sanitized${ext}`;
        } else {
          throw new Error(`Unsupported batch operation: ${options.operation}`);
        }

        itemResult.outputFileName = outputFileName;
        itemResult.status = 'completed';
        itemResult.progress = 100;
        if (options.onProgress) options.onProgress(item.id, 100);
      } catch (err: any) {
        itemResult.status = 'error';
        itemResult.errorMessage = err?.message || 'Failed to process document';
        itemResult.progress = 100;
        if (options.onProgress) options.onProgress(item.id, 100);
      } finally {
        if (activeDocId) {
          try {
            await this.closeDocument(activeDocId);
          } catch {
            // ignore cleanup errors
          }
        }
      }

      results.push(itemResult);
    }

    return results;
  }

  async cropPages(documentId: string, options: CropBoxOptions): Promise<void> {
    const doc = this.getDoc(documentId);
    const pages = doc.pdfLibDoc.getPages();
    const targetIndices = options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices
      : pages.map((_, i) => i);

    for (const idx of targetIndices) {
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const x = Math.max(0, options.x);
        const y = Math.max(0, options.y);
        const width = Math.max(10, options.width);
        const height = Math.max(10, options.height);

        page.setCropBox(x, y, width, height);
        page.setMediaBox(x, y, width, height);
      }
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async trimMargins(documentId: string, options: MarginTrimOptions): Promise<void> {
    const doc = this.getDoc(documentId);
    const pages = doc.pdfLibDoc.getPages();
    const targetIndices = options.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices
      : pages.map((_, i) => i);

    for (const idx of targetIndices) {
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const mediaBox = page.getMediaBox();
        const curCrop = page.getCropBox() || mediaBox;

        const newX = curCrop.x + options.left;
        const newY = curCrop.y + options.bottom;
        const newWidth = Math.max(20, curCrop.width - (options.left + options.right));
        const newHeight = Math.max(20, curCrop.height - (options.top + options.bottom));

        page.setCropBox(newX, newY, newWidth, newHeight);
        page.setMediaBox(newX, newY, newWidth, newHeight);
      }
    }

    await this.refreshInternalPdfjs(documentId);
  }

  async embedSearchableText(
    documentId: string,
    pageResults: Array<{ pageIndex: number; text: string }>
  ): Promise<Uint8Array> {
    const srcDoc = this.getDoc(documentId);
    // Create or clone the document
    const searchableDoc = await PDFDocument.load(srcDoc.rawBytes, {
      ignoreEncryption: true,
    });

    const font = await searchableDoc.embedFont(StandardFonts.Helvetica);

    for (const result of pageResults) {
      if (result.pageIndex < 0 || result.pageIndex >= searchableDoc.getPageCount()) {
        continue;
      }
      if (!result.text || !result.text.trim()) {
        continue;
      }

      const page = searchableDoc.getPage(result.pageIndex);
      const { height } = page.getSize();

      const lines = result.text.split('\n').filter((l) => l.trim().length > 0);
      const fontSize = 10;
      const lineHeight = fontSize * 1.35;
      const margin = 36; // 0.5 inch margin
      let currentY = height - margin;

      for (const line of lines) {
        if (currentY < margin) break; // Don't overflow bottom
        const cleanLine = line.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').trim();
        if (cleanLine.length === 0) continue;

        try {
          page.drawText(cleanLine, {
            x: margin,
            y: currentY,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0.001, // Invisible overlay: completely selectable & searchable
          });
        } catch {
          // If unsupported glyph, skip character
        }

        currentY -= lineHeight;
      }
    }

    return await searchableDoc.save({ useObjectStreams: true });
  }

  async replaceTextOnPage(
    documentId: string,
    options: ReplaceTextOptions
  ): Promise<void> {
    const doc = this.getDoc(documentId);
    const page = doc.pdfLibDoc.getPage(options.pageIndex);
    const [x, y, w, h] = options.rect;

    // Cleanly white-out the original text bounding box
    const bg = options.backgroundColor ? hexToRgb(options.backgroundColor) : { r: 1, g: 1, b: 1 };
    page.drawRectangle({
      x: Math.max(0, x - 1),
      y: Math.max(0, y - 1),
      width: Math.max(w + 2, 8),
      height: Math.max(h + 2, 8),
      color: rgb(bg.r, bg.g, bg.b),
      opacity: 1.0,
    });

    // Embed requested font or standard fallback
    let font = await doc.pdfLibDoc.embedFont(StandardFonts.Helvetica);
    if (options.fontFamily === 'TimesRoman') {
      font = await doc.pdfLibDoc.embedFont(StandardFonts.TimesRoman);
    } else if (options.fontFamily === 'Courier') {
      font = await doc.pdfLibDoc.embedFont(StandardFonts.Courier);
    }

    const { r, g, b } = hexToRgb(options.color || '#000000');
    const fSize = options.fontSize || Math.max(9, Math.min(18, h * 0.85));

    page.drawText(options.newText, {
      x,
      y: y + Math.max(1, (h - fSize) / 2),
      size: fSize,
      font,
      color: rgb(r, g, b),
    });

    await this.refreshInternalPdfjs(documentId);
  }

  async unlockAndStripPermissions(documentId: string): Promise<Uint8Array> {
    const doc = this.getDoc(documentId);
    // Load with ignoreEncryption: true to bypass any encryption or owner restrictions
    const unlockedDoc = await PDFDocument.load(doc.rawBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    // Save with clean object streams and no encryption handler
    const unlockedBytes = await unlockedDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Update current doc's encrypted state
    doc.pendingPassword = undefined;
    doc.pendingEncryptionOptions = undefined;
    doc.metadata.isEncrypted = false;
    doc.rawBytes = unlockedBytes;
    doc.pdfLibDoc = unlockedDoc;

    await this.refreshInternalPdfjs(documentId);
    return unlockedBytes;
  }

  async addFormField(documentId: string, options: FormFieldCreateOptions): Promise<void> {
    const doc = this.getDoc(documentId);
    const form = doc.pdfLibDoc.getForm();
    const page = doc.pdfLibDoc.getPage(options.pageIndex);
    const [x, y, width, height] = options.rect;

    if (options.type === 'text') {
      const textField = form.createTextField(options.name);
      if (options.defaultValue) {
        textField.setText(options.defaultValue);
      }
      textField.addToPage(page, {
        x,
        y,
        width,
        height,
      });
    } else if (options.type === 'checkbox') {
      const checkBox = form.createCheckBox(options.name);
      if (options.defaultValue === 'true') {
        checkBox.check();
      }
      checkBox.addToPage(page, {
        x,
        y,
        width,
        height,
      });
    } else if (options.type === 'dropdown') {
      const dropdown = form.createDropdown(options.name);
      if (options.options && options.options.length > 0) {
        dropdown.setOptions(options.options);
      }
      if (options.defaultValue) {
        dropdown.select(options.defaultValue);
      }
      dropdown.addToPage(page, {
        x,
        y,
        width,
        height,
      });
    }

    await this.refreshInternalPdfjs(documentId);
  }

  private getDoc(documentId: string): LoadedDocRecord {
    const doc = this.activeDocuments.get(documentId);
    if (!doc) {
      throw new Error(`Document with ID "${documentId}" is not loaded or has been closed.`);
    }
    return doc;
  }

  private async refreshInternalPdfjs(documentId: string): Promise<void> {
    const doc = this.activeDocuments.get(documentId);
    if (!doc) return;

    try {
      const savedBytes = await doc.pdfLibDoc.save();
      doc.rawBytes = savedBytes;
      if (pdfjsLib && pdfjsLib.getDocument) {
        if (doc.pdfjsDoc) {
          try {
            await doc.pdfjsDoc.destroy();
          } catch {
            // ignore
          }
        }
        const loadingTask = pdfjsLib.getDocument({ data: savedBytes.slice() });
        doc.pdfjsDoc = await loadingTask.promise;
      }
    } catch (e) {
      console.warn('Error refreshing PDF.js internal instance:', e);
    }
  }

  async getDocumentOutline(documentId: string): Promise<DocumentOutlineItem[]> {
    const doc = this.getDoc(documentId);
    if (!doc.pdfjsDoc) return [];

    try {
      const rawOutline = await doc.pdfjsDoc.getOutline();
      if (!rawOutline || !Array.isArray(rawOutline)) return [];

      const resolveItem = async (item: any): Promise<DocumentOutlineItem> => {
        let pageIndex: number | undefined = undefined;
        if (item.dest) {
          try {
            if (typeof item.dest === 'string') {
              const dest = await doc.pdfjsDoc.getDestination(item.dest);
              if (dest && dest[0]) {
                pageIndex = await doc.pdfjsDoc.getPageIndex(dest[0]);
              }
            } else if (Array.isArray(item.dest) && item.dest[0]) {
              pageIndex = await doc.pdfjsDoc.getPageIndex(item.dest[0]);
            }
          } catch {}
        }

        const items =
          item.items && item.items.length > 0
            ? await Promise.all(item.items.map((child: any) => resolveItem(child)))
            : undefined;

        return {
          title: item.title || 'Untitled',
          bold: Boolean(item.bold),
          italic: Boolean(item.italic),
          pageIndex,
          items,
        };
      };

      return await Promise.all(rawOutline.map((item: any) => resolveItem(item)));
    } catch (err) {
      console.warn('Error extracting document outline:', err);
      return [];
    }
  }

  async extractImages(documentId: string): Promise<ExtractedImageItem[]> {
    const doc = this.getDoc(documentId);
    return await extractImagesFromDocument(doc.pdfLibDoc, this, documentId);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const intVal = parseInt(clean, 16);
  return {
    r: ((intVal >> 16) & 255) / 255,
    g: ((intVal >> 8) & 255) / 255,
    b: (intVal & 255) / 255,
  };
}

function calculateHeaderFooterCoords(
  position: HeaderFooterPosition,
  pageWidth: number,
  pageHeight: number,
  textWidth: number,
  textHeight: number,
  margin: number
): { x: number; y: number } {
  let x = margin;
  let y = margin;

  if (position.includes('center')) {
    x = (pageWidth - textWidth) / 2;
  } else if (position.includes('right')) {
    x = pageWidth - margin - textWidth;
  } else {
    x = margin;
  }

  if (position.startsWith('top')) {
    y = pageHeight - margin - textHeight;
  } else {
    y = margin;
  }

  return { x: Math.max(0, x), y: Math.max(0, y) };
}
