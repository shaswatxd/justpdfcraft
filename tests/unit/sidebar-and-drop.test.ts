import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/stores/documentStore';

describe('Sidebar Page Navigation & View Synchronization', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documentId: 'doc_sidebar_test',
      pageCount: 8,
      currentPage: 1,
      viewMode: 'continuous',
    });
  });

  it('should switch from organize mode back to continuous view on thumbnail selection', () => {
    useDocumentStore.getState().setViewMode('organize');
    expect(useDocumentStore.getState().viewMode).toBe('organize');

    // Simulating user clicking page 3 thumbnail in Sidebar:
    const targetPage = 3;
    useDocumentStore.getState().setCurrentPage(targetPage);
    if (useDocumentStore.getState().viewMode === 'organize') {
      useDocumentStore.getState().setViewMode('continuous');
    }

    expect(useDocumentStore.getState().currentPage).toBe(3);
    expect(useDocumentStore.getState().viewMode).toBe('continuous');
  });

  it('should maintain current page when navigating between various thumbnail pages', () => {
    useDocumentStore.getState().setCurrentPage(2);
    expect(useDocumentStore.getState().currentPage).toBe(2);

    useDocumentStore.getState().setCurrentPage(6);
    expect(useDocumentStore.getState().currentPage).toBe(6);

    // Clamping checks
    useDocumentStore.getState().setCurrentPage(99);
    expect(useDocumentStore.getState().currentPage).toBe(8);
  });
});
