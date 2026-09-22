import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/stores/documentStore';

describe('Page Navigation & Viewport Page State Sync', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documentId: 'doc_nav_test',
      pageCount: 10,
      currentPage: 1,
      viewMode: 'continuous',
    });
  });

  it('should navigate to valid page number and update currentPage', () => {
    useDocumentStore.getState().setCurrentPage(2);
    expect(useDocumentStore.getState().currentPage).toBe(2);

    useDocumentStore.getState().setCurrentPage(5);
    expect(useDocumentStore.getState().currentPage).toBe(5);
  });

  it('should clamp currentPage between 1 and pageCount', () => {
    useDocumentStore.getState().setCurrentPage(0);
    expect(useDocumentStore.getState().currentPage).toBe(1);

    useDocumentStore.getState().setCurrentPage(-10);
    expect(useDocumentStore.getState().currentPage).toBe(1);

    useDocumentStore.getState().setCurrentPage(100);
    expect(useDocumentStore.getState().currentPage).toBe(10);
  });

  it('should support switching between view modes while maintaining active page', () => {
    useDocumentStore.getState().setCurrentPage(4);
    useDocumentStore.getState().setViewMode('single');
    expect(useDocumentStore.getState().currentPage).toBe(4);
    expect(useDocumentStore.getState().viewMode).toBe('single');

    useDocumentStore.getState().setViewMode('continuous');
    expect(useDocumentStore.getState().currentPage).toBe(4);
    expect(useDocumentStore.getState().viewMode).toBe('continuous');

    useDocumentStore.getState().setViewMode('spread');
    expect(useDocumentStore.getState().currentPage).toBe(4);
    expect(useDocumentStore.getState().viewMode).toBe('spread');
  });
});
