import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('FallbackPDFEngine Annotation Operations', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createSamplePdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);
    page.drawText('Sample Contract & Audit Report', { x: 50, y: 350, size: 16 });
    return await doc.save();
  };

  it('should add a highlight annotation', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'hl-1',
      pageIndex: 0,
      type: 'highlight',
      rect: [50, 345, 200, 20],
      color: '#FACC15', // Yellow
      opacity: 0.35,
      createdAt: new Date().toISOString(),
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should add underline and strikethrough annotations', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'ul-1',
      pageIndex: 0,
      type: 'underline',
      rect: [50, 345, 100, 20],
      color: '#0C8DE9',
      opacity: 1.0,
      strokeWidth: 2,
      createdAt: new Date().toISOString(),
    });

    await engine.addAnnotation(documentId, {
      id: 'st-1',
      pageIndex: 0,
      type: 'strikethrough',
      rect: [160, 345, 80, 20],
      color: '#EF4444',
      opacity: 1.0,
      strokeWidth: 2,
      createdAt: new Date().toISOString(),
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should add circle, line, and arrow annotations', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'circ-1',
      pageIndex: 0,
      type: 'circle',
      rect: [80, 200, 60, 60],
      color: '#10B981',
      opacity: 0.9,
      strokeWidth: 3,
      createdAt: new Date().toISOString(),
    });

    await engine.addAnnotation(documentId, {
      id: 'arrow-1',
      pageIndex: 0,
      type: 'arrow',
      rect: [200, 200, 100, 50],
      endPoint: { x: 300, y: 250 },
      color: '#EF4444',
      opacity: 1.0,
      strokeWidth: 2.5,
      createdAt: new Date().toISOString(),
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should add status stamp annotation', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'stamp-1',
      pageIndex: 0,
      type: 'stamp',
      stampText: 'APPROVED',
      rect: [350, 280, 140, 40],
      color: '#10B981', // Green
      opacity: 0.85,
      createdAt: new Date().toISOString(),
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should add sticky note annotation', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'note-1',
      pageIndex: 0,
      type: 'note',
      content: 'Reviewed by legal department',
      rect: [50, 100, 120, 36],
      color: '#F59E0B',
      opacity: 1.0,
      createdAt: new Date().toISOString(),
    });

    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(pdfBytes.byteLength);
  });

  it('should delete an annotation and cleanly remove it from the document', async () => {
    const pdfBytes = await createSamplePdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addAnnotation(documentId, {
      id: 'rect-to-delete',
      pageIndex: 0,
      type: 'rectangle',
      rect: [100, 100, 50, 50],
      color: '#EF4444',
      opacity: 1.0,
      createdAt: new Date().toISOString(),
    });

    let annots = await engine.getAnnotations(documentId, 0);
    expect(annots.some((a) => a.id === 'rect-to-delete')).toBe(true);

    await engine.deleteAnnotation(documentId, 'rect-to-delete');
    annots = await engine.getAnnotations(documentId, 0);
    expect(annots.some((a) => a.id === 'rect-to-delete')).toBe(false);
  });
});

