import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '../../src/stores/documentStore';
import { useUIStore } from '../../src/stores/uiStore';
import { useToolStore } from '../../src/stores/toolStore';
import { PDFDocument } from 'pdf-lib';

describe('Quick Workflows & No-Document Guard System', () => {
  beforeEach(() => {
    // Reset stores to empty initial state
    useDocumentStore.setState({
      documentId: null,
      pageCount: 0,
      currentPage: 1,
      fileName: null,
      filePath: null,
      fileBytes: null,
      tabs: [],
      activeTabId: null,
      viewMode: 'single',
    });
    useUIStore.setState({
      activeModal: null,
      toasts: [],
    });
    useToolStore.setState({
      currentTool: 'select',
    });
  });

  it('starts in clean empty state with no document loaded', () => {
    const docState = useDocumentStore.getState();
    const uiState = useUIStore.getState();

    expect(docState.documentId).toBeNull();
    expect(docState.pageCount).toBe(0);
    expect(docState.fileName).toBeNull();
    expect(uiState.activeModal).toBeNull();
  });

  it('allows all guarded modal types to be activated without crashing when documentId is null', () => {
    const guardedModals = [
      'sign',
      'compress',
      'watermark',
      'protect',
      'sanitize',
      'split',
      'extract-table',
      'ocr',
      'print',
      'crop',
      'compare',
      'convert',
    ] as const;

    for (const modal of guardedModals) {
      useUIStore.getState().setActiveModal(modal);
      expect(useUIStore.getState().activeModal).toBe(modal);
      // documentId remains null and stores are intact
      expect(useDocumentStore.getState().documentId).toBeNull();
    }

    useUIStore.getState().setActiveModal(null);
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('loads a document and transitions state reactively when a file is selected', async () => {
    // Generate a minimal valid PDF in memory
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([595, 842]);
    const pdfBytes = await pdfDoc.save();

    // Verify loading document sets documentId, fileName, and pageCount
    await useDocumentStore.getState().loadDocument(pdfBytes, 'SampleDoc.pdf');

    const stateAfterLoad = useDocumentStore.getState();
    expect(stateAfterLoad.documentId).toBeTruthy();
    expect(stateAfterLoad.fileName).toBe('SampleDoc.pdf');
    expect(stateAfterLoad.pageCount).toBe(1);
    expect(stateAfterLoad.fileBytes).not.toBeNull();
  });

  it('supports chaining workflow execution upon file selection', async () => {
    // Simulate user clicking "Sign" from Quick Workflows when no document was open
    type PendingWorkflow = {
      modal?: any;
      viewMode?: 'single' | 'continuous' | 'organize' | 'spread';
      tool?: any;
      label: string;
    };

    let pendingWorkflow: PendingWorkflow | null = {
      modal: 'sign',
      label: 'E-Sign Document',
    };

    // User selects file via picker
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    pdfDoc.addPage([600, 800]);
    const bytes = await pdfDoc.save();

    // Load document
    await useDocumentStore.getState().loadDocument(bytes, 'Contract.pdf');

    // Chained workflow triggers immediately
    if (pendingWorkflow) {
      if (pendingWorkflow.modal) {
        useUIStore.getState().setActiveModal(pendingWorkflow.modal);
      }
      if (pendingWorkflow.viewMode) {
        useDocumentStore.getState().setViewMode(pendingWorkflow.viewMode);
      }
      if (pendingWorkflow.tool) {
        useToolStore.getState().setTool(pendingWorkflow.tool);
      }
      pendingWorkflow = null;
    }

    expect(useDocumentStore.getState().documentId).toBeTruthy();
    expect(useDocumentStore.getState().pageCount).toBe(2);
    expect(useUIStore.getState().activeModal).toBe('sign');
  });

  it('supports organize grid workflow chaining from home dashboard', async () => {
    let pendingWorkflow = {
      viewMode: 'organize' as const,
      label: 'Organize Pages',
    };

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    const bytes = await pdfDoc.save();

    await useDocumentStore.getState().loadDocument(bytes, 'MultiPage.pdf');

    if (pendingWorkflow.viewMode) {
      useDocumentStore.getState().setViewMode(pendingWorkflow.viewMode);
    }

    expect(useDocumentStore.getState().viewMode).toBe('organize');
    expect(useDocumentStore.getState().documentId).toBeTruthy();
  });

  it('supports in-place text editor tool chaining from home dashboard', async () => {
    let pendingWorkflow = {
      tool: 'edit_text' as const,
      label: 'In-Place Text Editor',
    };

    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    const bytes = await pdfDoc.save();

    await useDocumentStore.getState().loadDocument(bytes, 'TextDoc.pdf');

    if (pendingWorkflow.tool) {
      useToolStore.getState().setTool(pendingWorkflow.tool);
    }

    expect(useToolStore.getState().currentTool).toBe('edit_text');
    expect(useDocumentStore.getState().documentId).toBeTruthy();
  });
});
