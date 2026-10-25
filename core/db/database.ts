/**
 * Local Database & Metadata Persistence Service
 * Local-First: Stores recent files, signatures, and other metadata in localStorage.
 */

export interface RecentDocRecord {
  id: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  lastOpenedAt: number;
  lastPageViewed: number;
  isFavorite: boolean;
  thumbnailUrl?: string;
}

export interface SavedSignatureRecord {
  id: string;
  title: string;
  type: 'drawn' | 'typed' | 'image';
  dataUrl: string;
  createdAt: number;
}

const STORAGE_KEYS = {
  RECENTS: 'swiftpdf_recent_documents',
  SIGNATURES: 'swiftpdf_saved_signatures',
};

const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {}
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch {}
    memoryStore.delete(key);
  },
};

export class LocalDatabaseService {
  // Recent Documents
  getRecentDocuments(): RecentDocRecord[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.RECENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addRecentDocument(doc: Omit<RecentDocRecord, 'id' | 'lastOpenedAt'>): RecentDocRecord {
    const list = this.getRecentDocuments();
    const existingIndex = list.findIndex((d) => d.filePath === doc.filePath);

    const record: RecentDocRecord = {
      ...doc,
      id: existingIndex >= 0 ? list[existingIndex].id : `rec_${Date.now()}`,
      lastOpenedAt: Date.now(),
      isFavorite: existingIndex >= 0 ? list[existingIndex].isFavorite : (doc.isFavorite || false),
    };

    const filtered = list.filter((d) => d.filePath !== doc.filePath);
    filtered.unshift(record);

    // Keep top 50 recent documents
    const truncated = filtered.slice(0, 50);
    safeStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(truncated));
    return record;
  }

  // Saved Signatures
  getSavedSignatures(): SavedSignatureRecord[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.SIGNATURES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveSignature(sig: Omit<SavedSignatureRecord, 'id' | 'createdAt'>): SavedSignatureRecord {
    const list = this.getSavedSignatures();
    const newSig: SavedSignatureRecord = {
      ...sig,
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
    };
    list.unshift(newSig);
    safeStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(list.slice(0, 20)));
    return newSig;
  }

  deleteSignature(id: string): void {
    const list = this.getSavedSignatures().filter((s) => s.id !== id);
    safeStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(list));
  }
}

export const localDb = new LocalDatabaseService();
