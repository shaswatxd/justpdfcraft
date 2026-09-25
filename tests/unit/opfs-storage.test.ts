import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveDraftToOPFS,
  loadDraftFromOPFS,
  listOPFSDrafts,
  deleteDraftFromOPFS,
  clearAllOPFSDrafts,
  estimateOPFSQuota,
  isOPFSSupported,
} from '../../core/storage/opfs';
import {
  isNativeFSSupported,
  saveToExistingHandle,
  saveWithNativePicker,
} from '../../core/storage/native-fs';
import { useDocumentStore } from '../../src/stores/documentStore';
import { PDFDocument } from 'pdf-lib';

describe('OPFS & Native File System Storage Subsystem', () => {
  beforeEach(async () => {
    await clearAllOPFSDrafts();
    await useDocumentStore.getState().closeCurrentDocument();
  });

  const createSamplePdfBytes = async (title: string): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    doc.setTitle(title);
    doc.addPage([400, 400]);
    return await doc.save();
  };

  describe('OPFS Engine & Fallback Store', () => {
    it('detects OPFS environment availability safely without throwing', () => {
      const supported = isOPFSSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('saves, retrieves, and lists drafts accurately in OPFS storage', async () => {
      const testBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const draftId = 'test_draft_101';
      const fileName = 'Contract_Draft.pdf';

      await saveDraftToOPFS(draftId, fileName, testBytes, {
        currentPage: 3,
        isDirty: true,
      });

      const loaded = await loadDraftFromOPFS(draftId);
      expect(loaded).not.toBeNull();
      expect(loaded?.meta.id).toBe(draftId);
      expect(loaded?.meta.fileName).toBe(fileName);
      expect(loaded?.meta.currentPage).toBe(3);
      expect(loaded?.meta.byteLength).toBe(testBytes.byteLength);
      expect(loaded?.bytes).toEqual(testBytes);

      const draftsList = await listOPFSDrafts();
      expect(draftsList.length).toBe(1);
      expect(draftsList[0].id).toBe(draftId);
      expect(draftsList[0].fileName).toBe(fileName);
    });

    it('deletes a specific draft and clears all drafts cleanly', async () => {
      const b1 = new Uint8Array([10, 20]);
      const b2 = new Uint8Array([30, 40]);

      await saveDraftToOPFS('d1', 'Doc1.pdf', b1);
      await saveDraftToOPFS('d2', 'Doc2.pdf', b2);

      let list = await listOPFSDrafts();
      expect(list.length).toBe(2);

      await deleteDraftFromOPFS('d1');
      list = await listOPFSDrafts();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('d2');

      await clearAllOPFSDrafts();
      list = await listOPFSDrafts();
      expect(list.length).toBe(0);
    });

    it('estimates OPFS storage quota reliably', async () => {
      const quota = await estimateOPFSQuota();
      expect(quota).toBeDefined();
      expect(typeof quota.usage).toBe('number');
      expect(typeof quota.quota).toBe('number');
      expect(typeof quota.percentUsed).toBe('number');
      expect(quota.percentUsed).toBeGreaterThanOrEqual(0);
      expect(quota.percentUsed).toBeLessThanOrEqual(100);
      expect(quota.usageFormatted).toBeTruthy();
      expect(quota.quotaFormatted).toBeTruthy();
    });
  });

  describe('Native File System Access API Layer', () => {
    it('checks window support for File System Access API', () => {
      const supported = isNativeFSSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('writes PDF bytes directly to an existing FileSystemFileHandle', async () => {
      const writtenChunks: any[] = [];
      let streamClosed = false;

      const mockWritable = {
        write: vi.fn(async (data: any) => {
          writtenChunks.push(data);
        }),
        close: vi.fn(async () => {
          streamClosed = true;
        }),
      };

      const mockHandle = {
        kind: 'file',
        name: 'Report.pdf',
        queryPermission: vi.fn(async () => 'granted'),
        createWritable: vi.fn(async () => mockWritable),
      } as unknown as FileSystemFileHandle;

      const sampleBytes = new Uint8Array([7, 8, 9, 10]);
      const success = await saveToExistingHandle(mockHandle, sampleBytes);

      expect(success).toBe(true);
      expect(mockHandle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalledWith(sampleBytes);
      expect(mockWritable.close).toHaveBeenCalled();
      expect(streamClosed).toBe(true);
    });

    it('prompts native save picker and writes to returned handle', async () => {
      const writtenChunks: any[] = [];
      const mockWritable = {
        write: vi.fn(async (data: any) => {
          writtenChunks.push(data);
        }),
        close: vi.fn(async () => {}),
      };

      const mockHandle = {
        kind: 'file',
        name: 'Exported.pdf',
        createWritable: vi.fn(async () => mockWritable),
      };

      (globalThis as any).window = (globalThis as any).window || {};
      (globalThis as any).window.showSaveFilePicker = vi.fn(async () => mockHandle);
      (globalThis as any).window.showOpenFilePicker = vi.fn(async () => [mockHandle]);

      const testBytes = new Uint8Array([50, 60, 70]);
      const savedHandle = await saveWithNativePicker(testBytes, 'Exported.pdf');

      expect(savedHandle).toBe(mockHandle);
      expect(mockWritable.write).toHaveBeenCalledWith(testBytes);
      expect(mockWritable.close).toHaveBeenCalled();
    });
  });

  describe('DocumentStore Direct Save & Recovery Drafts Integration', () => {
    it('auto-saves draft to OPFS and allows restoring session', async () => {
      const pdfBytes = await createSamplePdfBytes('Sample Recovery');
      await useDocumentStore.getState().loadDocument(pdfBytes, 'SampleRecovery.pdf');

      const docId = useDocumentStore.getState().documentId!;
      expect(docId).toBeTruthy();

      // Trigger manual draft save
      useDocumentStore.getState().markDirty();
      await useDocumentStore.getState().triggerAutoSaveDraft();

      // Verify draft was saved
      const drafts = await useDocumentStore.getState().checkAndLoadAvailableDrafts();
      expect(drafts.length).toBeGreaterThanOrEqual(1);
      const matchingDraft = drafts.find((d) => d.id === docId);
      expect(matchingDraft).toBeDefined();
      expect(matchingDraft?.fileName).toBe('SampleRecovery.pdf');

      // Close current document to simulate browser close / crash
      await useDocumentStore.getState().closeCurrentDocument();
      expect(useDocumentStore.getState().documentId).toBeNull();

      // Re-save draft back to OPFS to simulate crash (where closeTab was never called)
      await saveDraftToOPFS(docId, 'SampleRecovery.pdf', pdfBytes, { currentPage: 1, isDirty: true });
      await useDocumentStore.getState().checkAndLoadAvailableDrafts();
      expect(useDocumentStore.getState().availableDrafts.length).toBeGreaterThanOrEqual(1);

      // Restore session
      const restored = await useDocumentStore.getState().restoreDraft(docId);
      expect(restored).toBe(true);
      expect(useDocumentStore.getState().documentId).toBeTruthy();
      expect(useDocumentStore.getState().fileName).toBe('SampleRecovery.pdf');
      expect(useDocumentStore.getState().isDirty).toBe(true);
    });

    it('performs direct disk save when fileHandle is bound to the document', async () => {
      const pdfBytes = await createSamplePdfBytes('Direct Save Document');
      const writtenChunks: any[] = [];
      const mockWritable = {
        write: vi.fn(async (data: any) => {
          writtenChunks.push(data);
        }),
        close: vi.fn(async () => {}),
      };
      const mockHandle = {
        kind: 'file',
        name: 'DirectDoc.pdf',
        queryPermission: vi.fn(async () => 'granted'),
        createWritable: vi.fn(async () => mockWritable),
      } as unknown as FileSystemFileHandle;

      // Load document with native fileHandle
      await useDocumentStore.getState().loadDocument(
        pdfBytes,
        'DirectDoc.pdf',
        undefined,
        undefined,
        mockHandle
      );

      expect(useDocumentStore.getState().fileHandle).toBe(mockHandle);
      useDocumentStore.getState().markDirty();
      expect(useDocumentStore.getState().isDirty).toBe(true);

      // Direct save
      const saved = await useDocumentStore.getState().saveDirectly();
      expect(saved).toBe(true);
      expect(mockWritable.write).toHaveBeenCalled();
      expect(useDocumentStore.getState().isDirty).toBe(false);
    });

    it('cleans up OPFS draft when tab is explicitly closed', async () => {
      const pdfBytes = await createSamplePdfBytes('Temp Doc');
      await useDocumentStore.getState().loadDocument(pdfBytes, 'TempDoc.pdf');
      const docId = useDocumentStore.getState().documentId!;
      const activeTabId = useDocumentStore.getState().activeTabId!;

      // Force save a draft to OPFS
      await saveDraftToOPFS(docId, 'TempDoc.pdf', pdfBytes, { currentPage: 1, isDirty: true });
      let drafts = await listOPFSDrafts();
      expect(drafts.some((d) => d.id === docId)).toBe(true);

      // Close the tab
      await useDocumentStore.getState().closeTab(activeTabId);

      // The draft should now be removed from OPFS
      drafts = await listOPFSDrafts();
      expect(drafts.some((d) => d.id === docId)).toBe(false);
    });
  });
});
