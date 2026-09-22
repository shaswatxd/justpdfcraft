import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../../src/stores/documentStore';
import { PDFDocument } from 'pdf-lib';

describe('Page Organizer & In-Place State Preservation', () => {
  beforeEach(async () => {
    await useDocumentStore.getState().closeCurrentDocument();
  });

  const createMultiPagePdf = async (numPages: number): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < numPages; i++) {
      const page = doc.addPage([500, 700]);
      page.drawText(`Page ${i + 1}`);
    }
    return await doc.save();
  };

  it('should maintain organize viewMode and avoid duplicate tabs when reordering pages', async () => {
    const bytes = await createMultiPagePdf(4);
    await useDocumentStore.getState().loadDocument(bytes, 'MultiPage.pdf');

    // Enter organize mode
    useDocumentStore.getState().setViewMode('organize');
    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().tabs.length).toBe(1);

    // Reorder: swap page 0 and page 1
    await useDocumentStore.getState().reorderPages([1, 0, 2, 3]);

    // Verify organize viewMode is preserved and NOT kicked to continuous!
    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageCount).toBe(4);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
  });

  it('should maintain organize viewMode when rotating selected pages', async () => {
    const bytes = await createMultiPagePdf(3);
    await useDocumentStore.getState().loadDocument(bytes, 'RotateDoc.pdf');

    useDocumentStore.getState().setViewMode('organize');
    useDocumentStore.getState().setSelectedPages([0, 2]);

    await useDocumentStore.getState().rotateSelectedPages(90);

    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageDimensions[0].rotation).toBe(90);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
  });

  it('should maintain organize viewMode when inserting a blank page', async () => {
    const bytes = await createMultiPagePdf(2);
    await useDocumentStore.getState().loadDocument(bytes, 'InsertDoc.pdf');

    useDocumentStore.getState().setViewMode('organize');
    expect(useDocumentStore.getState().pageCount).toBe(2);

    await useDocumentStore.getState().insertBlankPageAt(1);

    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageCount).toBe(3);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
  });

  it('should maintain organize viewMode when reversing all pages', async () => {
    const bytes = await createMultiPagePdf(3);
    await useDocumentStore.getState().loadDocument(bytes, 'ReverseDoc.pdf');

    useDocumentStore.getState().setViewMode('organize');
    await useDocumentStore.getState().reverseAllPages();

    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageCount).toBe(3);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
  });

  it('should maintain organize viewMode when duplicating and deleting pages', async () => {
    const bytes = await createMultiPagePdf(3);
    await useDocumentStore.getState().loadDocument(bytes, 'DupDelDoc.pdf');

    useDocumentStore.getState().setViewMode('organize');
    useDocumentStore.getState().setSelectedPages([1]);

    // Duplicate page 1
    await useDocumentStore.getState().duplicateSelectedPages();
    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageCount).toBe(4);
    expect(useDocumentStore.getState().tabs.length).toBe(1);

    // Delete page 0
    useDocumentStore.getState().setSelectedPages([0]);
    await useDocumentStore.getState().deleteSelectedPages();
    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().pageCount).toBe(3);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
  });
});
