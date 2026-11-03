import { describe, it, expect, beforeEach } from 'vitest';
import {
  useDocumentStore,
  loadBookmarksFromStorage,
  saveBookmarksToStorage,
  UserBookmark,
} from '@/stores/documentStore';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => { storageMap.set(key, value); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
};

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = localStorageMock as any;
}

describe('Custom User Bookmarks & Study Annotations', () => {
  beforeEach(() => {
    storageMap.clear();
    useDocumentStore.setState({
      tabs: [],
      activeTabId: null,
      documentId: 'doc_test_123',
      fileName: 'test-document.pdf',
      filePath: '/path/to/test-document.pdf',
      currentPage: 1,
      pageCount: 10,
      userBookmarks: [],
    });
  });

  it('should add a bookmark for the current page and sort by pageIndex', () => {
    const store = useDocumentStore.getState();
    store.addUserBookmark('Chapter 5 Summary', 4);
    store.addUserBookmark('Introduction', 0);
    store.addUserBookmark('Conclusion', 9);

    const bookmarks = useDocumentStore.getState().userBookmarks;
    expect(bookmarks).toHaveLength(3);
    expect(bookmarks[0].title).toBe('Introduction');
    expect(bookmarks[0].pageIndex).toBe(0);
    expect(bookmarks[1].title).toBe('Chapter 5 Summary');
    expect(bookmarks[1].pageIndex).toBe(4);
    expect(bookmarks[2].title).toBe('Conclusion');
    expect(bookmarks[2].pageIndex).toBe(9);
  });

  it('should auto-name bookmark if title is blank', () => {
    useDocumentStore.setState({ currentPage: 3 });
    useDocumentStore.getState().addUserBookmark('');

    const bookmarks = useDocumentStore.getState().userBookmarks;
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].title).toBe('Bookmark Page 3');
    expect(bookmarks[0].pageIndex).toBe(2);
  });

  it('should delete a bookmark by id', () => {
    const store = useDocumentStore.getState();
    store.addUserBookmark('Key Quote', 2);
    store.addUserBookmark('Formulas', 5);

    let bookmarks = useDocumentStore.getState().userBookmarks;
    expect(bookmarks).toHaveLength(2);

    const firstId = bookmarks[0].id;
    useDocumentStore.getState().deleteUserBookmark(firstId);

    bookmarks = useDocumentStore.getState().userBookmarks;
    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].title).toBe('Formulas');
  });

  it('should persist and load bookmarks from localStorage keyed by filePath/fileName', () => {
    const mockBookmarks: UserBookmark[] = [
      { id: 'bm_1', title: 'Executive Summary', pageIndex: 0, createdAt: '2026-09-20T10:00:00Z' },
      { id: 'bm_2', title: 'Financial Projections', pageIndex: 7, createdAt: '2026-09-20T10:05:00Z' },
    ];

    saveBookmarksToStorage('/path/to/test-document.pdf', 'test-document.pdf', mockBookmarks);

    const loaded = loadBookmarksFromStorage('/path/to/test-document.pdf', 'test-document.pdf');
    expect(loaded).toHaveLength(2);
    expect(loaded[0].title).toBe('Executive Summary');
    expect(loaded[1].title).toBe('Financial Projections');
  });

  it('should sync bookmarks with the active tab snapshot', () => {
    const tabId = 'tab_1';
    useDocumentStore.setState({
      activeTabId: tabId,
      tabs: [
        {
          id: tabId,
          documentId: 'doc_test_123',
          fileName: 'test-document.pdf',
          filePath: '/path/to/test-document.pdf',
          fileBytes: new Uint8Array(),
          metadata: null,
          pageCount: 5,
          currentPage: 1,
          pageDimensions: [],
          formFields: [],
          documentOutline: [],
          userBookmarks: [],
          highlightFormFields: true,
          zoom: 1.0,
          viewMode: 'continuous',
          selectedPageIndices: [0],
          undoStack: [],
          redoStack: [],
          isDirty: false,
        },
      ],
      userBookmarks: [],
    });

    useDocumentStore.getState().addUserBookmark('Tab Sync Bookmark', 1);

    const activeTab = useDocumentStore.getState().tabs.find((t) => t.id === tabId);
    expect(activeTab?.userBookmarks).toHaveLength(1);
    expect(activeTab?.userBookmarks[0].title).toBe('Tab Sync Bookmark');
  });

  it('should prevent bookmark collisions between two different files with identical names using file size', () => {
    const file1Bookmarks: UserBookmark[] = [
      { id: 'b1', title: 'File 1 BM', pageIndex: 0, createdAt: new Date().toISOString() },
    ];
    const file2Bookmarks: UserBookmark[] = [
      { id: 'b2', title: 'File 2 BM', pageIndex: 3, createdAt: new Date().toISOString() },
    ];

    // In browsers, filePath is null, but files have different byte lengths (e.g. 50000 bytes vs 120000 bytes)
    saveBookmarksToStorage(null, 'assignment.pdf', file1Bookmarks, 50000);
    saveBookmarksToStorage(null, 'assignment.pdf', file2Bookmarks, 120000);

    const loaded1 = loadBookmarksFromStorage(null, 'assignment.pdf', 50000);
    const loaded2 = loadBookmarksFromStorage(null, 'assignment.pdf', 120000);

    expect(loaded1).toHaveLength(1);
    expect(loaded1[0].title).toBe('File 1 BM');

    expect(loaded2).toHaveLength(1);
    expect(loaded2[0].title).toBe('File 2 BM');
  });

  it('should enforce MAX_UNDO_STEPS cap of 12 on undoStack', async () => {
    useDocumentStore.setState({
      documentId: 'doc_undo_test',
      fileBytes: new Uint8Array([1, 2, 3]),
      undoStack: [],
      tabs: [{
        id: 'tab_undo',
        documentId: 'doc_undo_test',
        fileName: 'test.pdf',
        filePath: null,
        fileBytes: new Uint8Array([1, 2, 3]),
        metadata: null,
        pageCount: 1,
        currentPage: 1,
        pageDimensions: [],
        formFields: [],
        documentOutline: [],
        userBookmarks: [],
        highlightFormFields: true,
        zoom: 1.0,
        viewMode: 'continuous',
        selectedPageIndices: [0],
        undoStack: [],
        redoStack: [],
        isDirty: false,
      }],
      activeTabId: 'tab_undo',
    });

    // Push 18 history actions
    for (let i = 1; i <= 18; i++) {
      await useDocumentStore.getState().pushHistory(`Action ${i}`);
    }

    const state = useDocumentStore.getState();
    expect(state.undoStack).toHaveLength(12);
    expect(state.undoStack[0].description).toBe('Action 7');
    expect(state.undoStack[11].description).toBe('Action 18');

    // Active tab in tabs array must also have 12 items
    const activeTab = state.tabs.find((t) => t.id === 'tab_undo');
    expect(activeTab?.undoStack).toHaveLength(12);
  });
});
