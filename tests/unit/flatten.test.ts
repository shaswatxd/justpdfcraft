import { describe, it, expect, vi } from 'vitest';
import { flattenPdfDocument } from '../../core/pdf/flatten';
import { PDFEngine } from '../../core/pdf/engine.interface';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('PDF Flattening Engine', () => {
  it('should flatten form fields in forms-only mode', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Form test', { x: 50, y: 350, font, size: 14 });

    const form = doc.getForm();
    const textField = form.createTextField('testField');
    textField.setText('Hello World');
    textField.addToPage(page, { x: 50, y: 250, width: 200, height: 30 });

    const srcBytes = await doc.save();

    const mockEngine: Partial<PDFEngine> = {
      saveDocument: vi.fn().mockResolvedValue(srcBytes),
    };

    const outBytes = await flattenPdfDocument(
      'doc-form',
      { mode: 'forms-only' },
      mockEngine as PDFEngine
    );

    expect(outBytes).toBeInstanceOf(Uint8Array);

    const verifiedDoc = await PDFDocument.load(outBytes);
    expect(verifiedDoc.getPageCount()).toBe(1);
    // After flattening, fields are converted into page content streams
    const fieldsAfter = verifiedDoc.getForm().getFields();
    expect(fieldsAfter.length).toBe(0);
  });

  it('should produce read-only rasterized PDF in full-rasterize mode', async () => {
    const onePixelJpg =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    const mockEngine: Partial<PDFEngine> = {
      getPageCount: vi.fn().mockReturnValue(2),
      getPageDimensions: vi.fn().mockResolvedValue({
        pageNumber: 1,
        width: 612,
        height: 792,
        rotation: 0,
      }),
      renderPage: vi.fn().mockResolvedValue({
        pageIndex: 0,
        canvas: null,
        imageDataUrl: onePixelJpg,
        width: 612,
        height: 792,
        scale: 2.0,
      }),
    };

    const outBytes = await flattenPdfDocument(
      'doc-raster',
      { mode: 'full-rasterize', dpi: 200 },
      mockEngine as PDFEngine
    );

    expect(outBytes).toBeInstanceOf(Uint8Array);
    const loaded = await PDFDocument.load(outBytes);
    expect(loaded.getPageCount()).toBe(2);
  });
});
