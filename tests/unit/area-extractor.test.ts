import { describe, it, expect, beforeEach } from 'vitest';
import { extractDigitalTextFromItems, extractTextFromArea } from '../../core/ocr/area-extractor';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { TextItem } from '../../core/pdf/engine.interface';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

describe('Area Text Extractor & High-Precision Dual Engine', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  it('should extract digital text from item stream within bounding box with 100% confidence', () => {
    const items: TextItem[] = [
      {
        str: 'Ralph Loop ka ye problem ho rha hai',
        dir: 'ltr',
        width: 250,
        height: 14,
        transform: [14, 0, 0, 14, 50, 700],
        x: 50,
        y: 700,
      },
      {
        str: 'SwiftPDF max power extraction is active',
        dir: 'ltr',
        width: 260,
        height: 14,
        transform: [14, 0, 0, 14, 50, 680],
        x: 50,
        y: 680,
      },
      {
        str: 'Unrelated footer out of box',
        dir: 'ltr',
        width: 150,
        height: 10,
        transform: [10, 0, 0, 10, 50, 100],
        x: 50,
        y: 100,
      },
    ];

    // Select the first sentence: x: [40, 310], y: [690, 720]
    const result = extractDigitalTextFromItems(
      items,
      { left: 40, right: 310, bottom: 690, top: 720 },
      3
    );

    expect(result.isDigital).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.text).toBe('Ralph Loop ka ye problem ho rha hai');
    expect(result.wordCount).toBe(8);
  });

  it('should cleanly extract sub-words from a composite line when dragging over a subset', () => {
    // 8 words spanning x=50 to x=350 (width=300)
    // Characters: 40 chars -> approx 7.5 width per char
    const items: TextItem[] = [
      {
        str: 'Ralph Loop ka ye problem ho rha hai',
        dir: 'ltr',
        width: 320,
        height: 14,
        transform: [14, 0, 0, 14, 50, 700],
        x: 50,
        y: 700,
      },
    ];

    // Select only "problem ho rha" which is in the middle of the string
    // "problem ho rha hai" starts at char 17 (approx x: 50 + 17*8.8 = 200)
    const result = extractDigitalTextFromItems(
      items,
      { left: 170, right: 320, bottom: 690, top: 720 },
      2
    );

    expect(result.isDigital).toBe(true);
    expect(result.text).toContain('problem');
    expect(result.text).toContain('ho');
  });

  it('should properly cluster multi-line selections and preserve top-to-bottom reading order', () => {
    const items: TextItem[] = [
      // Line 2 (Y = 660)
      {
        str: 'Second line of legal document',
        dir: 'ltr',
        width: 200,
        height: 12,
        transform: [12, 0, 0, 12, 50, 660],
        x: 50,
        y: 660,
      },
      // Line 1 (Y = 680)
      {
        str: 'First line of legal document',
        dir: 'ltr',
        width: 200,
        height: 12,
        transform: [12, 0, 0, 12, 50, 680],
        x: 50,
        y: 680,
      },
      // Line 3 (Y = 640)
      {
        str: 'Third line of legal document',
        dir: 'ltr',
        width: 200,
        height: 12,
        transform: [12, 0, 0, 12, 50, 640],
        x: 50,
        y: 640,
      },
    ];

    const result = extractDigitalTextFromItems(
      items,
      { left: 40, right: 300, bottom: 630, top: 700 },
      3
    );

    expect(result.lineCount).toBe(3);
    const lines = result.text.split('\n');
    expect(lines[0]).toBe('First line of legal document');
    expect(lines[1]).toBe('Second line of legal document');
    expect(lines[2]).toBe('Third line of legal document');
  });

  it('should return empty result when bounding box contains no items', () => {
    const items: TextItem[] = [
      {
        str: 'Header text',
        dir: 'ltr',
        width: 100,
        height: 12,
        transform: [12, 0, 0, 12, 50, 750],
        x: 50,
        y: 750,
      },
    ];

    const result = extractDigitalTextFromItems(
      items,
      { left: 400, right: 500, bottom: 100, top: 200 },
      3
    );

    expect(result.text).toBe('');
    expect(result.wordCount).toBe(0);
  });

  it('should extract text from a real document via extractTextFromArea', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.addPage([600, 800]);

    page.drawText('Invoice Summary 2026', {
      x: 50,
      y: 720,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Client: Acme Corporation', {
      x: 50,
      y: 690,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    const pdfBytes = await doc.save();
    const { documentId } = await engine.openDocument(pdfBytes);

    const dims = await engine.getPageDimensions(documentId, 0);

    const result = await extractTextFromArea({
      engine,
      documentId,
      pageIndex: 0,
      pdfRect: {
        x: 40,
        y: 670,
        width: 300,
        height: 70,
      },
      dimensions: dims,
    });

    expect(result.isDigital).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.text).toContain('Invoice Summary');
    expect(result.text).toContain('Acme Corporation');

    await engine.closeDocument(documentId);
  });

  it('should extract Hindi Devanagari text cleanly from bilingual item stream within bounding box', () => {
    const items: TextItem[] = [
      {
        str: 'यदि यह कार्ड खो जाता है तो कृपया इसे डाउनलोड करें',
        dir: 'ltr',
        width: 320,
        height: 14,
        transform: [14, 0, 0, 14, 50, 700],
        x: 50,
        y: 700,
      },
      {
        str: 'this card is lost kindly download it from www.abha.abdm.gov.in',
        dir: 'ltr',
        width: 340,
        height: 12,
        transform: [12, 0, 0, 12, 50, 680],
        x: 50,
        y: 680,
      },
    ];

    const result = extractDigitalTextFromItems(
      items,
      { left: 40, right: 360, bottom: 670, top: 720 },
      3
    );

    expect(result.isDigital).toBe(true);
    expect(result.confidence).toBe(100);
    expect(result.text).toContain('यदि यह कार्ड खो जाता है');
    expect(result.text).toContain('this card is lost kindly download');
  });
});
