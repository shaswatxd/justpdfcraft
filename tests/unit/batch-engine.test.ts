import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';
import { BatchItem } from '../../core/pdf/engine.interface';

describe('FallbackPDFEngine Batch Processing Automation', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createSamplePdf = async (text: string): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);
    page.drawText(text, { x: 50, y: 350, size: 14 });
    return await doc.save();
  };

  it('should batch watermark multiple documents with progress tracking', async () => {
    const pdf1 = await createSamplePdf('Document Alpha');
    const pdf2 = await createSamplePdf('Document Beta');

    const items: BatchItem[] = [
      {
        id: 'item-1',
        fileName: 'alpha.pdf',
        fileSizeBytes: pdf1.length,
        fileBytes: pdf1,
        status: 'idle',
        progress: 0,
      },
      {
        id: 'item-2',
        fileName: 'beta.pdf',
        fileSizeBytes: pdf2.length,
        fileBytes: pdf2,
        status: 'idle',
        progress: 0,
      },
    ];

    const progressReports: Array<{ id: string; p: number }> = [];

    const results = await engine.processBatch(items, {
      operation: 'watermark',
      watermarkOptions: {
        text: 'CONFIDENTIAL BATCH',
        opacity: 0.3,
        fontSize: 32,
      },
      onProgress: (id, progress) => {
        progressReports.push({ id, p: progress });
      },
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('completed');
    expect(results[0].outputFileName).toBe('alpha-watermarked.pdf');
    expect(results[0].outputBytes).toBeDefined();
    expect(results[0].outputBytes!.length).toBeGreaterThan(0);

    expect(results[1].status).toBe('completed');
    expect(results[1].outputFileName).toBe('beta-watermarked.pdf');
    expect(results[1].outputBytes).toBeDefined();
    expect(results[1].outputBytes!.length).toBeGreaterThan(0);

    expect(progressReports.length).toBeGreaterThanOrEqual(4);
  });

  it('should batch sanitize multiple sensitive documents', async () => {
    const doc1 = await PDFDocument.create();
    doc1.setAuthor('John Secret');
    doc1.setTitle('Private Doc');
    doc1.addPage([500, 500]);
    const pdf1 = await doc1.save();

    const doc2 = await PDFDocument.create();
    doc2.setAuthor('Jane Secret');
    doc2.setTitle('Confidential Dossier');
    doc2.addPage([500, 500]);
    const pdf2 = await doc2.save();

    const items: BatchItem[] = [
      {
        id: 'item-1',
        fileName: 'secret1.pdf',
        fileSizeBytes: pdf1.length,
        fileBytes: pdf1,
        status: 'idle',
        progress: 0,
      },
      {
        id: 'item-2',
        fileName: 'secret2.pdf',
        fileSizeBytes: pdf2.length,
        fileBytes: pdf2,
        status: 'idle',
        progress: 0,
      },
    ];

    const results = await engine.processBatch(items, {
      operation: 'sanitize',
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('completed');
    expect(results[0].outputFileName).toBe('secret1-sanitized.pdf');
    expect(results[1].status).toBe('completed');
    expect(results[1].outputFileName).toBe('secret2-sanitized.pdf');

    // Verify sanitized outputs by re-opening
    const checkEngine = new FallbackPDFEngine();
    const { metadata: meta1 } = await checkEngine.openDocument(results[0].outputBytes!);
    expect(meta1.author).toBeUndefined();
    expect(meta1.title).toBeUndefined();

    const { metadata: meta2 } = await checkEngine.openDocument(results[1].outputBytes!);
    expect(meta2.author).toBeUndefined();
    expect(meta2.title).toBeUndefined();
  });

  it('should batch compress documents and track output savings', async () => {
    const pdf1 = await createSamplePdf('Compressible Document 1');
    const pdf2 = await createSamplePdf('Compressible Document 2');

    const items: BatchItem[] = [
      {
        id: 'c-1',
        fileName: 'report-a.pdf',
        fileSizeBytes: pdf1.length,
        fileBytes: pdf1,
        status: 'idle',
        progress: 0,
      },
      {
        id: 'c-2',
        fileName: 'report-b.pdf',
        fileSizeBytes: pdf2.length,
        fileBytes: pdf2,
        status: 'idle',
        progress: 0,
      },
    ];

    const results = await engine.processBatch(items, {
      operation: 'compress',
      compressOptions: { preset: 'balanced' },
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('completed');
    expect(results[0].outputFileName).toBe('report-a-compressed.pdf');
    expect(results[0].outputBytes).toBeDefined();

    expect(results[1].status).toBe('completed');
    expect(results[1].outputFileName).toBe('report-b-compressed.pdf');
    expect(results[1].outputBytes).toBeDefined();
  });

  it('should isolate errors gracefully when a corrupted file is in the batch', async () => {
    const validPdf = await createSamplePdf('Valid Document');
    const corruptBytes = new Uint8Array([0x00, 0x12, 0x34, 0x56, 0x78]); // corrupt header

    const items: BatchItem[] = [
      {
        id: 'bad-1',
        fileName: 'corrupt.pdf',
        fileSizeBytes: corruptBytes.length,
        fileBytes: corruptBytes,
        status: 'idle',
        progress: 0,
      },
      {
        id: 'good-2',
        fileName: 'good.pdf',
        fileSizeBytes: validPdf.length,
        fileBytes: validPdf,
        status: 'idle',
        progress: 0,
      },
    ];

    const results = await engine.processBatch(items, {
      operation: 'sanitize',
    });

    expect(results).toHaveLength(2);

    // Corrupt item fails gracefully
    expect(results[0].status).toBe('error');
    expect(results[0].errorMessage).toBeDefined();
    expect(results[0].outputBytes).toBeUndefined();

    // Good item succeeds despite earlier failure
    expect(results[1].status).toBe('completed');
    expect(results[1].outputFileName).toBe('good-sanitized.pdf');
    expect(results[1].outputBytes).toBeDefined();
  });
});
