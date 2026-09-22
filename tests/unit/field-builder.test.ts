import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('FallbackPDFEngine AcroForm Field Builder', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  const createBlankPdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]);
    return await doc.save();
  };

  it('should create and add interactive text fields to a PDF page', async () => {
    const pdfBytes = await createBlankPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addFormField(documentId, {
      pageIndex: 0,
      type: 'text',
      name: 'Client_FullName',
      rect: [50, 600, 200, 30],
      defaultValue: 'John Doe',
    });

    const fields = await engine.getFormFields(documentId);
    expect(fields.length).toBe(1);
    expect(fields[0].name).toBe('Client_FullName');
    expect(fields[0].type).toBe('text');
    expect(fields[0].value).toBe('John Doe');

    await engine.closeDocument(documentId);
  });

  it('should create checkbox and dropdown fields with options', async () => {
    const pdfBytes = await createBlankPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.addFormField(documentId, {
      pageIndex: 0,
      type: 'checkbox',
      name: 'Agreement_Terms',
      rect: [50, 500, 20, 20],
      defaultValue: 'true',
    });

    await engine.addFormField(documentId, {
      pageIndex: 0,
      type: 'dropdown',
      name: 'Country_Select',
      rect: [50, 450, 150, 30],
      options: ['United States', 'Canada', 'United Kingdom', 'Germany'],
      defaultValue: 'Canada',
    });

    const fields = await engine.getFormFields(documentId);
    expect(fields.length).toBe(2);

    const checkField = fields.find((f) => f.name === 'Agreement_Terms');
    expect(checkField).toBeDefined();
    expect(checkField?.type).toBe('checkbox');
    expect(checkField?.value).toBe(true);

    const dropField = fields.find((f) => f.name === 'Country_Select');
    expect(dropField).toBeDefined();
    expect(dropField?.type).toBe('dropdown');
    expect(dropField?.value).toBe('Canada');

    await engine.closeDocument(documentId);
  });
});
