import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/stores/documentStore';
import { DocumentOutlineItem } from '@core/pdf/engine.interface';

describe('PDF Document Outlines & Bookmarks Tree', () => {
  const mockOutline: DocumentOutlineItem[] = [
    {
      title: 'Chapter 1: Executive Summary',
      pageIndex: 0,
      items: [
        {
          title: '1.1 Key Highlights',
          pageIndex: 1,
          items: [],
        },
        {
          title: '1.2 Market Overview',
          pageIndex: 2,
          items: [],
        },
      ],
    },
    {
      title: 'Chapter 2: Financial Performance',
      pageIndex: 3,
      items: [],
    },
  ];

  beforeEach(() => {
    useDocumentStore.setState({
      documentId: 'doc_mock_123',
      pageCount: 5,
      currentPage: 1,
      documentOutline: mockOutline,
    });
  });

  it('should store and access document outlines in documentStore', () => {
    const outline = useDocumentStore.getState().documentOutline;
    expect(outline).toHaveLength(2);
    expect(outline[0]?.title).toBe('Chapter 1: Executive Summary');
    expect(outline[0]?.items).toHaveLength(2);
    expect(outline[0]?.items?.[0]?.title).toBe('1.1 Key Highlights');
  });

  it('should navigate to page when an outline item is selected', () => {
    const targetPage = (mockOutline[0]?.items?.[1]?.pageIndex ?? 0) + 1; // page 3
    useDocumentStore.getState().setCurrentPage(targetPage);
    expect(useDocumentStore.getState().currentPage).toBe(3);
  });

  it('should handle documents with empty outline gracefully', () => {
    useDocumentStore.setState({ documentOutline: [] });
    expect(useDocumentStore.getState().documentOutline).toEqual([]);
  });
});
