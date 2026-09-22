import { describe, it, expect, beforeEach } from 'vitest';
import { FallbackPDFEngine } from '../../core/pdf/engines/fallback-engine';
import { PDFDocument } from 'pdf-lib';

describe('FallbackPDFEngine AcroForms Operations', () => {
  let engine: FallbackPDFEngine;

  beforeEach(() => {
    engine = new FallbackPDFEngine();
  });

  // Helper to create a PDF with interactive form fields
  const createSampleFormPdf = async (): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 400]);
    const form = doc.getForm();

    const tf = form.createTextField('applicant.name');
    tf.setText('Jane Doe');
    tf.addToPage(page, { x: 50, y: 300, width: 220, height: 28 });

    const emailField = form.createTextField('applicant.email');
    emailField.setText('jane@example.com');
    emailField.addToPage(page, { x: 50, y: 250, width: 220, height: 28 });

    const cb = form.createCheckBox('terms.accepted');
    cb.check();
    cb.addToPage(page, { x: 50, y: 200, width: 20, height: 20 });

    const dropdown = form.createDropdown('preferred.contact');
    dropdown.addOptions(['Email', 'Phone', 'Postal Mail']);
    dropdown.select('Email');
    dropdown.addToPage(page, { x: 50, y: 150, width: 150, height: 25 });

    return await doc.save();
  };

  it('should detect all form fields with accurate types, names, values, and coordinates', async () => {
    const pdfBytes = await createSampleFormPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    const fields = await engine.getFormFields(documentId);
    expect(fields.length).toBe(4);

    const nameField = fields.find((f) => f.name === 'applicant.name');
    expect(nameField).toBeDefined();
    expect(nameField?.type).toBe('text');
    expect(nameField?.value).toBe('Jane Doe');
    expect(nameField?.pageIndex).toBe(0);
    expect(nameField?.rect.width).toBeGreaterThanOrEqual(215);

    const cbField = fields.find((f) => f.name === 'terms.accepted');
    expect(cbField).toBeDefined();
    expect(cbField?.type).toBe('checkbox');
    expect(cbField?.value).toBe(true);

    const ddField = fields.find((f) => f.name === 'preferred.contact');
    expect(ddField).toBeDefined();
    expect(ddField?.type).toBe('dropdown');
    expect(ddField?.value).toBe('Email');
    expect(ddField?.options).toContain('Phone');
  });

  it('should update form field values for text, checkbox, and dropdown', async () => {
    const pdfBytes = await createSampleFormPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.setFormFieldValue(documentId, 'applicant.name', 'Alex Mercer');
    await engine.setFormFieldValue(documentId, 'terms.accepted', false);
    await engine.setFormFieldValue(documentId, 'preferred.contact', 'Phone');

    const fields = await engine.getFormFields(documentId);
    const nameField = fields.find((f) => f.name === 'applicant.name');
    const cbField = fields.find((f) => f.name === 'terms.accepted');
    const ddField = fields.find((f) => f.name === 'preferred.contact');

    expect(nameField?.value).toBe('Alex Mercer');
    expect(cbField?.value).toBe(false);
    expect(ddField?.value).toBe('Phone');
  });

  it('should export all filled form data as key-value JSON', async () => {
    const pdfBytes = await createSampleFormPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    const data = await engine.exportFormData(documentId);
    expect(data['applicant.name']).toBe('Jane Doe');
    expect(data['terms.accepted']).toBe(true);
    expect(data['preferred.contact']).toBe('Email');
  });

  it('should clear all form fields', async () => {
    const pdfBytes = await createSampleFormPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.clearFormFields(documentId);
    const fields = await engine.getFormFields(documentId);

    const nameField = fields.find((f) => f.name === 'applicant.name');
    const cbField = fields.find((f) => f.name === 'terms.accepted');

    expect(nameField?.value).toBe('');
    expect(cbField?.value).toBe(false);
  });

  it('should flatten form fields permanently into page content', async () => {
    const pdfBytes = await createSampleFormPdf();
    const { documentId } = await engine.openDocument(pdfBytes);

    await engine.flattenForms(documentId);

    // After flattening, getFormFields should find 0 interactive fields
    const fields = await engine.getFormFields(documentId);
    expect(fields.length).toBe(0);

    // Document should still have 1 valid page with content
    expect(engine.getPageCount(documentId)).toBe(1);
    const saved = await engine.saveDocument(documentId);
    expect(saved.byteLength).toBeGreaterThan(0);
  });
});
