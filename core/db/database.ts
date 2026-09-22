/**
 * Local Database & Metadata Persistence Service
 * Local-First: Stores recent files, favorites, app preferences, signatures, and recovery checkpoints.
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

export interface RecoveryCheckpoint {
  id: string;
  originalPath: string;
  fileName: string;
  timestamp: number;
  status: 'pending' | 'restored' | 'discarded';
  dataBase64?: string;
}

export interface AppPreferences {
  theme: 'system' | 'light' | 'dark';
  accentColor: string;
  defaultZoom: number;
  defaultViewMode: 'single' | 'continuous' | 'organize';
  enableCrashRecovery: boolean;
  enableAnonymousDiagnostics: boolean;
  autoSaveIntervalSeconds: number;
}

const STORAGE_KEYS = {
  RECENTS: 'swiftpdf_recent_documents',
  SIGNATURES: 'swiftpdf_saved_signatures',
  CHECKPOINTS: 'swiftpdf_recovery_checkpoints',
  SETTINGS: 'swiftpdf_app_settings',
};

const DEFAULT_SETTINGS: AppPreferences = {
  theme: 'dark',
  accentColor: '#0C8DE9',
  defaultZoom: 1.0,
  defaultViewMode: 'continuous',
  enableCrashRecovery: true,
  enableAnonymousDiagnostics: false,
  autoSaveIntervalSeconds: 60,
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

  toggleFavorite(filePath: string): void {
    const list = this.getRecentDocuments();
    const doc = list.find((d) => d.filePath === filePath);
    if (doc) {
      doc.isFavorite = !doc.isFavorite;
      safeStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(list));
    }
  }

  removeRecentDocument(filePath: string): void {
    const list = this.getRecentDocuments().filter((d) => d.filePath !== filePath);
    safeStorage.setItem(STORAGE_KEYS.RECENTS, JSON.stringify(list));
  }

  clearRecentDocuments(): void {
    safeStorage.removeItem(STORAGE_KEYS.RECENTS);
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

  // Recovery Checkpoints (Crash Protection)
  saveRecoveryCheckpoint(checkpoint: Omit<RecoveryCheckpoint, 'id' | 'timestamp' | 'status'>): RecoveryCheckpoint {
    const list = this.getRecoveryCheckpoints();
    const rec: RecoveryCheckpoint = {
      ...checkpoint,
      id: `recov_${Date.now()}`,
      timestamp: Date.now(),
      status: 'pending',
    };
    // Keep max 5 recovery records
    const updated = [rec, ...list.filter((c) => c.originalPath !== checkpoint.originalPath)].slice(0, 5);
    safeStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(updated));
    return rec;
  }

  getRecoveryCheckpoints(): RecoveryCheckpoint[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  clearRecoveryCheckpoint(originalPath: string): void {
    const list = this.getRecoveryCheckpoints().filter((c) => c.originalPath !== originalPath);
    safeStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(list));
  }

  // App Settings
  getSettings(): AppPreferences {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  updateSettings(settings: Partial<AppPreferences>): AppPreferences {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    safeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  }
}

export const localDb = new LocalDatabaseService();
