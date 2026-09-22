import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../../src/stores/documentStore';
import { PDFDocument } from 'pdf-lib';

describe('useDocumentStore Multi-Tab Management', () => {
  beforeEach(async () => {
    // Reset store state
    await useDocumentStore.getState().closeCurrentDocument();
  });

  const createSamplePdf = async (title: string): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.addPage([500, 500]);
    return await doc.save();
  };

  it('should support opening multiple PDF tabs and switching between them', async () => {
    const pdf1Bytes = await createSamplePdf('Document 1');
    const pdf2Bytes = await createSamplePdf('Document 2');

    // 1. Open First Document
    await useDocumentStore.getState().loadDocument(pdf1Bytes, 'Doc1.pdf');
    expect(useDocumentStore.getState().tabs.length).toBe(1);
    expect(useDocumentStore.getState().fileName).toBe('Doc1.pdf');
    const tab1Id = useDocumentStore.getState().activeTabId;
    expect(tab1Id).toBeTruthy();

    // 2. Open Second Document
    await useDocumentStore.getState().loadDocument(pdf2Bytes, 'Doc2.pdf');
    expect(useDocumentStore.getState().tabs.length).toBe(2);
    expect(useDocumentStore.getState().fileName).toBe('Doc2.pdf');
    const tab2Id = useDocumentStore.getState().activeTabId;
    expect(tab2Id).not.toBe(tab1Id);

    // 3. Switch back to First Tab
    useDocumentStore.getState().switchTab(tab1Id!);
    expect(useDocumentStore.getState().activeTabId).toBe(tab1Id);
    expect(useDocumentStore.getState().fileName).toBe('Doc1.pdf');

    // 4. Switch to Second Tab
    useDocumentStore.getState().switchTab(tab2Id!);
    expect(useDocumentStore.getState().activeTabId).toBe(tab2Id);
    expect(useDocumentStore.getState().fileName).toBe('Doc2.pdf');

    // 5. Close Second Tab - should automatically switch to remaining tab
    await useDocumentStore.getState().closeTab(tab2Id!);
    expect(useDocumentStore.getState().tabs.length).toBe(1);
    expect(useDocumentStore.getState().activeTabId).toBe(tab1Id);
    expect(useDocumentStore.getState().fileName).toBe('Doc1.pdf');

    // 6. Close Last Tab - should reset to empty state
    await useDocumentStore.getState().closeTab(tab1Id!);
    expect(useDocumentStore.getState().tabs.length).toBe(0);
    expect(useDocumentStore.getState().activeTabId).toBeNull();
    expect(useDocumentStore.getState().documentId).toBeNull();
  });
});
