import { create } from 'zustand';
import { DocumentMetadata, PageDimensions, RenderResult, FormFieldData, DocumentOutlineItem } from '@core/pdf/engine.interface';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { localDb } from '@core/db/database';

export interface DocumentHistoryEntry {
  description: string;
  bytes: Uint8Array;
  timestamp: number;
}

export interface UserBookmark {
  id: string;
  title: string;
  pageIndex: number;
  createdAt: string;
}

const BOOKMARKS_STORAGE_PREFIX = 'justpdfcraft_bm_';
const LEGACY_BOOKMARKS_STORAGE_PREFIX = 'swifteditoo_bm_';

function getBookmarkStorageKey(filePath: string | null, fileName: string | null, legacy: boolean = false): string | null {
  const key = filePath || fileName;
  const prefix = legacy ? LEGACY_BOOKMARKS_STORAGE_PREFIX : BOOKMARKS_STORAGE_PREFIX;
  return key ? `${prefix}${key}` : null;
}

export function loadBookmarksFromStorage(filePath: string | null, fileName: string | null): UserBookmark[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const key = getBookmarkStorageKey(filePath, fileName);
    const legacyKey = getBookmarkStorageKey(filePath, fileName, true);
    if (!key) return [];
    const saved = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load user bookmarks from storage:', e);
  }
  return [];
}

export function saveBookmarksToStorage(filePath: string | null, fileName: string | null, bookmarks: UserBookmark[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = getBookmarkStorageKey(filePath, fileName);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(bookmarks));
  } catch (e) {
    console.warn('Failed to save user bookmarks to storage:', e);
  }
}

export interface DocumentTab {
  id: string;
  documentId: string;
  fileName: string;
  filePath: string | null;
  fileBytes: Uint8Array;
  metadata: DocumentMetadata | null;
  pageCount: number;
  currentPage: number;
  pageDimensions: PageDimensions[];
  formFields: FormFieldData[];
  documentOutline: DocumentOutlineItem[];
  userBookmarks: UserBookmark[];
  highlightFormFields: boolean;
  zoom: number;
  viewMode: 'single' | 'continuous' | 'organize' | 'spread';
  selectedPageIndices: number[];
  undoStack: DocumentHistoryEntry[];
  redoStack: DocumentHistoryEntry[];
  isDirty: boolean;
}

interface DocumentState {
  // Tabs
  tabs: DocumentTab[];
  activeTabId: string | null;

  // Document status
  documentId: string | null;
  fileName: string | null;
  filePath: string | null;
  fileBytes: Uint8Array | null;
  metadata: DocumentMetadata | null;
  pageCount: number;
  currentPage: number;
  pageDimensions: PageDimensions[];
  documentOutline: DocumentOutlineItem[];
  userBookmarks: UserBookmark[];
  
  // Form Fields
  formFields: FormFieldData[];
  highlightFormFields: boolean;

  // View & Navigation
  zoom: number;
  viewMode: 'single' | 'continuous' | 'organize' | 'spread';
  selectedPageIndices: number[]; // for multi-select in organizer
  renderedPages: Map<number, RenderResult>;
  
  // Search
  searchQuery: string;
  searchResults: Array<{ pageIndex: number; textSnippet: string; matchIndex: number }>;
  currentSearchMatch: number;
  isSearching: boolean;

  // Undo / Redo
  undoStack: DocumentHistoryEntry[];
  redoStack: DocumentHistoryEntry[];
  isDirty: boolean;
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  loadDocument: (bytes: Uint8Array, fileName: string, filePath?: string, password?: string) => Promise<void>;
  closeCurrentDocument: () => Promise<void>;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => Promise<void>;
  closeOtherTabs: (tabId: string) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setViewMode: (mode: 'single' | 'continuous' | 'organize' | 'spread') => void;
  togglePageSelection: (pageIndex: number, isMulti?: boolean) => void;
  setSelectedPages: (indices: number[]) => void;
  selectAllPages: () => void;
  clearPageSelection: () => void;
  
  // Custom Bookmarks Actions
  addUserBookmark: (title: string, pageIndex?: number) => void;
  deleteUserBookmark: (id: string) => void;

  // Form Actions
  toggleHighlightFormFields: () => void;
  updateFormField: (fieldName: string, value: string | boolean) => Promise<void>;
  flattenDocumentForms: () => Promise<void>;
  clearAllForms: () => Promise<void>;
  refreshFormFields: () => Promise<void>;

  // Page Operations
  rotateSelectedPages: (degrees: number) => Promise<void>;
  deleteSelectedPages: () => Promise<void>;
  duplicateSelectedPages: () => Promise<void>;
  insertBlankPageAt: (atIndex: number) => Promise<void>;
  reorderPages: (newOrder: number[]) => Promise<void>;
  movePage: (fromIndex: number, toIndex: number) => Promise<void>;
  rotatePage: (pageIndex: number, degrees: number) => Promise<void>;
  deletePage: (pageIndex: number) => Promise<void>;
  duplicatePage: (pageIndex: number) => Promise<void>;
  reverseAllPages: () => Promise<void>;

  // Search
  setSearchQuery: (query: string) => void;
  executeSearch: (query: string) => Promise<void>;
  nextSearchMatch: () => void;
  prevSearchMatch: () => void;

  // Undo / Redo
  pushHistory: (description: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  markDirty: () => void;
  saveCurrentDocument: () => Promise<Uint8Array>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  documentId: null,
  fileName: null,
  filePath: null,
  fileBytes: null,
  metadata: null,
  pageCount: 0,
  currentPage: 1,
  pageDimensions: [],
  documentOutline: [],
  userBookmarks: [],
  formFields: [],
  highlightFormFields: true,
  zoom: 1.0,
  viewMode: 'continuous',
  selectedPageIndices: [],
  renderedPages: new Map(),
  searchQuery: '',
  searchResults: [],
  currentSearchMatch: 0,
  isSearching: false,
  undoStack: [],
  redoStack: [],
  isDirty: false,
  isLoading: false,
  errorMessage: null,

  loadDocument: async (bytes: Uint8Array, fileName: string, filePath?: string, password?: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const engine = getPDFEngine();
      const { documentId, metadata } = await engine.openDocument(bytes, password);
      const pageCount = engine.getPageCount(documentId);

      const dimensions: PageDimensions[] = [];
      for (let i = 0; i < pageCount; i++) {
        dimensions.push(await engine.getPageDimensions(documentId, i));
      }

      let formFields: FormFieldData[] = [];
      try {
        formFields = await engine.getFormFields(documentId);
      } catch (e) {
        console.warn('Form field detection notice:', e);
      }

      let documentOutline: DocumentOutlineItem[] = [];
      try {
        documentOutline = await engine.getDocumentOutline(documentId);
      } catch (e) {
        console.warn('Document outline extraction notice:', e);
      }

      const userBookmarks = loadBookmarksFromStorage(filePath || null, fileName);

      // Save to local recents
      localDb.addRecentDocument({
        filePath: filePath || fileName,
        fileName,
        fileSizeBytes: bytes.byteLength,
        pageCount,
        lastPageViewed: 1,
        isFavorite: false,
      });

      const { tabs, activeTabId, ...currentState } = get();

      // Check if we are updating/reloading the currently active document tab
      const isReloadingActive = Boolean(
        activeTabId &&
        currentState.documentId &&
        currentState.fileName === fileName
      );

      if (isReloadingActive) {
        // Update current tab in-place, preserving viewMode, page, undo/redo stacks, zoom, etc.
        const preservedViewMode = currentState.viewMode || 'continuous';
        const preservedPage = Math.max(1, Math.min(currentState.currentPage || 1, pageCount));
        const preservedZoom = currentState.zoom || 1.0;
        const preservedSelected = (currentState.selectedPageIndices || [0])
          .filter((idx) => idx < pageCount);
        const validSelected = preservedSelected.length > 0 ? preservedSelected : [0];
        const preservedUndo = currentState.undoStack;
        const preservedRedo = currentState.redoStack;
        const preservedDirty = currentState.isDirty;

        const updatedTabs = tabs.map((tab) => {
          if (tab.id === activeTabId) {
            return {
              ...tab,
              documentId,
              fileBytes: bytes,
              metadata,
              pageCount,
              pageDimensions: dimensions,
              formFields,
              documentOutline,
              userBookmarks,
              currentPage: preservedPage,
              zoom: preservedZoom,
              viewMode: preservedViewMode,
              selectedPageIndices: validSelected,
              undoStack: preservedUndo,
              redoStack: preservedRedo,
              isDirty: preservedDirty,
            };
          }
          return tab;
        });

        set({
          tabs: updatedTabs,
          documentId,
          fileName,
          filePath: filePath || null,
          fileBytes: bytes,
          metadata,
          pageCount,
          currentPage: preservedPage,
          pageDimensions: dimensions,
          formFields,
          documentOutline,
          userBookmarks,
          highlightFormFields: true,
          selectedPageIndices: validSelected,
          renderedPages: new Map(),
          undoStack: preservedUndo,
          redoStack: preservedRedo,
          isDirty: preservedDirty,
          isLoading: false,
          zoom: preservedZoom,
          viewMode: preservedViewMode,
        });
        return;
      }

      // Opening a new document tab
      const updatedTabs = tabs.map((tab) => {
        if (tab.id === activeTabId) {
          return {
            ...tab,
            currentPage: currentState.currentPage,
            zoom: currentState.zoom,
            viewMode: currentState.viewMode,
            formFields: currentState.formFields,
            documentOutline: currentState.documentOutline,
            userBookmarks: currentState.userBookmarks,
            selectedPageIndices: currentState.selectedPageIndices,
            undoStack: currentState.undoStack,
            redoStack: currentState.redoStack,
            isDirty: currentState.isDirty,
          };
        }
        return tab;
      });

      const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newTab: DocumentTab = {
        id: newTabId,
        documentId,
        fileName,
        filePath: filePath || null,
        fileBytes: bytes,
        metadata,
        pageCount,
        currentPage: 1,
        pageDimensions: dimensions,
        formFields,
        documentOutline,
        userBookmarks,
        highlightFormFields: true,
        zoom: 1.0,
        viewMode: 'continuous',
        selectedPageIndices: [0],
        undoStack: [],
        redoStack: [],
        isDirty: false,
      };

      set({
        tabs: [...updatedTabs, newTab],
        activeTabId: newTabId,
        documentId,
        fileName,
        filePath: filePath || null,
        fileBytes: bytes,
        metadata,
        pageCount,
        currentPage: 1,
        pageDimensions: dimensions,
        formFields,
        documentOutline,
        userBookmarks,
        highlightFormFields: true,
        selectedPageIndices: [0],
        renderedPages: new Map(),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        isLoading: false,
        zoom: 1.0,
        viewMode: 'continuous',
      });
    } catch (err: any) {
      set({
        isLoading: false,
        errorMessage: err?.message || 'Failed to load PDF document.',
      });
      throw err;
    }
  },

  switchTab: (tabId: string) => {
    const { tabs, activeTabId, ...currentState } = get();
    if (tabId === activeTabId) return;

    // 1. Snapshot current active tab state
    const updatedTabs = tabs.map((t) => {
      if (t.id === activeTabId) {
        return {
          ...t,
          currentPage: currentState.currentPage,
          zoom: currentState.zoom,
          viewMode: currentState.viewMode,
          formFields: currentState.formFields,
          documentOutline: currentState.documentOutline,
          userBookmarks: currentState.userBookmarks,
          selectedPageIndices: currentState.selectedPageIndices,
          undoStack: currentState.undoStack,
          redoStack: currentState.redoStack,
          isDirty: currentState.isDirty,
        };
      }
      return t;
    });

    // 2. Find target tab
    const target = updatedTabs.find((t) => t.id === tabId);
    if (!target) return;

    set({
      tabs: updatedTabs,
      activeTabId: tabId,
      documentId: target.documentId,
      fileName: target.fileName,
      filePath: target.filePath,
      fileBytes: target.fileBytes,
      metadata: target.metadata,
      pageCount: target.pageCount,
      currentPage: target.currentPage,
      pageDimensions: target.pageDimensions,
      formFields: target.formFields,
      documentOutline: target.documentOutline || [],
      userBookmarks: target.userBookmarks || [],
      highlightFormFields: target.highlightFormFields,
      zoom: target.zoom,
      viewMode: target.viewMode,
      selectedPageIndices: target.selectedPageIndices,
      renderedPages: new Map(),
      undoStack: target.undoStack,
      redoStack: target.redoStack,
      isDirty: target.isDirty,
      searchQuery: '',
      searchResults: [],
      currentSearchMatch: 0,
      isSearching: false,
    });
  },

  closeTab: async (tabId: string) => {
    const { tabs, activeTabId } = get();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    try {
      const engine = getPDFEngine();
      const otherSameDoc = tabs.filter((t) => t.id !== tabId && t.documentId === tabToClose.documentId);
      if (otherSameDoc.length === 0) {
        await engine.closeDocument(tabToClose.documentId);
      }
    } catch (e) {
      console.warn('Error closing tab document:', e);
    }

    const remainingTabs = tabs.filter((t) => t.id !== tabId);

    if (remainingTabs.length === 0) {
      set({
        tabs: [],
        activeTabId: null,
        documentId: null,
        fileName: null,
        filePath: null,
        fileBytes: null,
        metadata: null,
        pageCount: 0,
        currentPage: 1,
        pageDimensions: [],
        documentOutline: [],
        userBookmarks: [],
        formFields: [],
        selectedPageIndices: [],
        renderedPages: new Map(),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        isLoading: false,
        errorMessage: null,
      });
    } else if (activeTabId === tabId) {
      const nextTab = remainingTabs[remainingTabs.length - 1];
      set({
        tabs: remainingTabs,
        activeTabId: nextTab.id,
        documentId: nextTab.documentId,
        fileName: nextTab.fileName,
        filePath: nextTab.filePath,
        fileBytes: nextTab.fileBytes,
        metadata: nextTab.metadata,
        pageCount: nextTab.pageCount,
        currentPage: nextTab.currentPage,
        pageDimensions: nextTab.pageDimensions,
        formFields: nextTab.formFields,
        documentOutline: nextTab.documentOutline || [],
        userBookmarks: nextTab.userBookmarks || [],
        highlightFormFields: nextTab.highlightFormFields,
        zoom: nextTab.zoom,
        viewMode: nextTab.viewMode,
        selectedPageIndices: nextTab.selectedPageIndices,
        renderedPages: new Map(),
        undoStack: nextTab.undoStack,
        redoStack: nextTab.redoStack,
        isDirty: nextTab.isDirty,
      });
    } else {
      set({ tabs: remainingTabs });
    }
  },

  closeOtherTabs: async (keepTabId: string) => {
    const { tabs } = get();
    for (const t of tabs) {
      if (t.id !== keepTabId) {
        await get().closeTab(t.id);
      }
    }
  },

  closeCurrentDocument: async () => {
    const { activeTabId } = get();
    if (activeTabId) {
      await get().closeTab(activeTabId);
    } else {
      const { documentId } = get();
      if (documentId) {
        const engine = getPDFEngine();
        await engine.closeDocument(documentId);
      }
      set({
        tabs: [],
        activeTabId: null,
        documentId: null,
        fileName: null,
        filePath: null,
        fileBytes: null,
        metadata: null,
        pageCount: 0,
        currentPage: 1,
        pageDimensions: [],
        documentOutline: [],
        userBookmarks: [],
        formFields: [],
        selectedPageIndices: [],
        renderedPages: new Map(),
        undoStack: [],
        redoStack: [],
        isDirty: false,
        isLoading: false,
        errorMessage: null,
      });
    }
  },

  setCurrentPage: (page: number) => {
    const { pageCount } = get();
    const clamped = Math.max(1, Math.min(page, pageCount || 1));
    set({ currentPage: clamped });
  },

  setZoom: (zoomOrFn) => {
    set((state) => {
      const next = typeof zoomOrFn === 'function' ? zoomOrFn(state.zoom) : zoomOrFn;
      return { zoom: Math.max(0.2, Math.min(4.0, Number(next.toFixed(2)))) };
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  togglePageSelection: (pageIndex: number, isMulti = false) => {
    set((state) => {
      if (!isMulti) {
        return { selectedPageIndices: [pageIndex] };
      }
      const exists = state.selectedPageIndices.includes(pageIndex);
      return {
        selectedPageIndices: exists
          ? state.selectedPageIndices.filter((idx) => idx !== pageIndex)
          : [...state.selectedPageIndices, pageIndex],
      };
    });
  },

  setSelectedPages: (indices: number[]) => set({ selectedPageIndices: indices }),

  selectAllPages: () => {
    const { pageCount } = get();
    set({ selectedPageIndices: Array.from({ length: pageCount }, (_, i) => i) });
  },

  clearPageSelection: () => set({ selectedPageIndices: [] }),

  toggleHighlightFormFields: () => {
    set((state) => ({ highlightFormFields: !state.highlightFormFields }));
  },

  refreshFormFields: async () => {
    const { documentId } = get();
    if (!documentId) return;
    const engine = getPDFEngine();
    const formFields = await engine.getFormFields(documentId);
    set({ formFields });
  },

  updateFormField: async (fieldName: string, value: string | boolean) => {
    const { documentId, formFields } = get();
    if (!documentId) return;
    const engine = getPDFEngine();
    await engine.setFormFieldValue(documentId, fieldName, value);
    set({
      formFields: formFields.map((f) => (f.name === fieldName ? { ...f, value } : f)),
      isDirty: true,
    });
  },

  flattenDocumentForms: async () => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;
    await pushHistory('Flatten interactive form fields');
    const engine = getPDFEngine();
    await engine.flattenForms(documentId);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  clearAllForms: async () => {
    const { documentId, pushHistory, refreshFormFields } = get();
    if (!documentId) return;
    await pushHistory('Clear all form fields');
    const engine = getPDFEngine();
    await engine.clearFormFields(documentId);
    await refreshFormFields();
  },

  pushHistory: async (description: string) => {
    const { documentId, fileBytes, undoStack } = get();
    if (!documentId || !fileBytes) return;

    set({
      undoStack: [
        ...undoStack.slice(-20), // limit to 20 history states
        { description, bytes: fileBytes, timestamp: Date.now() },
      ],
      redoStack: [],
      isDirty: true,
    });
  },

  undo: async () => {
    const { undoStack, redoStack, fileBytes, loadDocument, fileName, filePath } = get();
    if (undoStack.length === 0 || !fileBytes || !fileName) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    const newRedo = [
      ...redoStack,
      { description: 'Current State', bytes: fileBytes, timestamp: Date.now() },
    ];

    set({ undoStack: newUndo, redoStack: newRedo });
    await loadDocument(previous.bytes, fileName, filePath || undefined);
    set({ isDirty: true });
  },

  redo: async () => {
    const { redoStack, undoStack, fileBytes, loadDocument, fileName, filePath } = get();
    if (redoStack.length === 0 || !fileBytes || !fileName) return;

    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    const newUndo = [
      ...undoStack,
      { description: 'Undone State', bytes: fileBytes, timestamp: Date.now() },
    ];

    set({ undoStack: newUndo, redoStack: newRedo });
    await loadDocument(next.bytes, fileName, filePath || undefined);
    set({ isDirty: true });
  },

  rotateSelectedPages: async (degrees: number) => {
    const { documentId, selectedPageIndices, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId || selectedPageIndices.length === 0) return;

    await pushHistory(`Rotate pages ${selectedPageIndices.join(', ')} by ${degrees}°`);
    const engine = getPDFEngine();
    await engine.rotatePages(documentId, selectedPageIndices, degrees);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  deleteSelectedPages: async () => {
    const { documentId, selectedPageIndices, pageCount, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId || selectedPageIndices.length === 0) return;
    if (selectedPageIndices.length >= pageCount) {
      throw new Error('Cannot delete all pages from the document.');
    }

    await pushHistory(`Delete pages ${selectedPageIndices.join(', ')}`);
    const engine = getPDFEngine();
    await engine.deletePages(documentId, selectedPageIndices);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
      set({ selectedPageIndices: [0], currentPage: 1 });
    }
  },

  duplicateSelectedPages: async () => {
    const { documentId, selectedPageIndices, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId || selectedPageIndices.length === 0) return;

    await pushHistory(`Duplicate pages`);
    const engine = getPDFEngine();
    await engine.duplicatePages(documentId, selectedPageIndices);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  insertBlankPageAt: async (atIndex: number) => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;

    await pushHistory(`Insert blank page at ${atIndex}`);
    const engine = getPDFEngine();
    await engine.insertBlankPage(documentId, atIndex);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  reorderPages: async (newOrder: number[]) => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;

    await pushHistory('Reorder pages');
    const engine = getPDFEngine();
    await engine.reorderPages(documentId, newOrder);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  movePage: async (fromIndex: number, toIndex: number) => {
    const { pageCount, reorderPages } = get();
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= pageCount || toIndex >= pageCount) return;
    const order = Array.from({ length: pageCount }, (_, i) => i);
    const [moved] = order.splice(fromIndex, 1);
    order.splice(toIndex, 0, moved);
    await reorderPages(order);
  },

  rotatePage: async (pageIndex: number, degrees: number) => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;
    await pushHistory(`Rotate page ${pageIndex + 1} by ${degrees}°`);
    const engine = getPDFEngine();
    await engine.rotatePages(documentId, [pageIndex], degrees);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  deletePage: async (pageIndex: number) => {
    const { documentId, pageCount, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;
    if (pageCount <= 1) {
      throw new Error('Cannot delete the only page in the document.');
    }
    await pushHistory(`Delete page ${pageIndex + 1}`);
    const engine = getPDFEngine();
    await engine.deletePages(documentId, [pageIndex]);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
      set({ selectedPageIndices: [0], currentPage: Math.max(1, Math.min(pageIndex + 1, pageCount - 1)) });
    }
  },

  duplicatePage: async (pageIndex: number) => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;
    await pushHistory(`Duplicate page ${pageIndex + 1}`);
    const engine = getPDFEngine();
    await engine.duplicatePages(documentId, [pageIndex]);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  reverseAllPages: async () => {
    const { documentId, pushHistory, fileName, filePath, loadDocument } = get();
    if (!documentId) return;

    await pushHistory('Reverse pages');
    const engine = getPDFEngine();
    await engine.reversePages(documentId);
    const updatedBytes = await engine.saveDocument(documentId);
    if (fileName) {
      await loadDocument(updatedBytes, fileName, filePath || undefined);
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  executeSearch: async (query: string) => {
    const { documentId } = get();
    if (!documentId || !query.trim()) {
      set({ searchResults: [], currentSearchMatch: 0, isSearching: false });
      return;
    }

    set({ isSearching: true });
    try {
      const engine = getPDFEngine();
      const results = await engine.searchDocument(documentId, query);
      set({
        searchResults: results,
        currentSearchMatch: results.length > 0 ? 0 : -1,
        isSearching: false,
      });

      if (results.length > 0) {
        set({ currentPage: results[0].pageIndex + 1 });
      }
    } catch {
      set({ isSearching: false });
    }
  },

  nextSearchMatch: () => {
    const { searchResults, currentSearchMatch } = get();
    if (searchResults.length === 0) return;
    const next = (currentSearchMatch + 1) % searchResults.length;
    set({
      currentSearchMatch: next,
      currentPage: searchResults[next].pageIndex + 1,
    });
  },

  prevSearchMatch: () => {
    const { searchResults, currentSearchMatch } = get();
    if (searchResults.length === 0) return;
    const prev = (currentSearchMatch - 1 + searchResults.length) % searchResults.length;
    set({
      currentSearchMatch: prev,
      currentPage: searchResults[prev].pageIndex + 1,
    });
  },

  markDirty: () => {
    const { activeTabId, tabs } = get();
    set({
      isDirty: true,
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, isDirty: true } : t)),
    });
  },

  saveCurrentDocument: async () => {
    const { documentId, activeTabId, tabs } = get();
    if (!documentId) throw new Error('No document loaded');
    const engine = getPDFEngine();
    const bytes = await engine.saveDocument(documentId);
    set({
      fileBytes: bytes,
      isDirty: false,
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, fileBytes: bytes, isDirty: false } : t)),
    });
    return bytes;
  },

  addUserBookmark: (title: string, pageIndex?: number) => {
    const { currentPage, userBookmarks, activeTabId, tabs, filePath, fileName } = get();
    const targetPageIndex = pageIndex !== undefined ? pageIndex : Math.max(0, currentPage - 1);
    const newBookmark: UserBookmark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim() || `Bookmark Page ${targetPageIndex + 1}`,
      pageIndex: targetPageIndex,
      createdAt: new Date().toISOString(),
    };
    const updated = [...userBookmarks, newBookmark].sort((a, b) => a.pageIndex - b.pageIndex);
    saveBookmarksToStorage(filePath, fileName, updated);
    set({
      userBookmarks: updated,
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, userBookmarks: updated } : t)),
    });
  },

  deleteUserBookmark: (id: string) => {
    const { userBookmarks, activeTabId, tabs, filePath, fileName } = get();
    const updated = userBookmarks.filter((bm) => bm.id !== id);
    saveBookmarksToStorage(filePath, fileName, updated);
    set({
      userBookmarks: updated,
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, userBookmarks: updated } : t)),
    });
  },
}));
