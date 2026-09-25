/**
 * OPFS (Origin Private File System) Engine for JustPDFCraft
 * Provides fast, 100% private, client-side auto-save drafts and crash recovery.
 */

export interface OPFSDraftMeta {
  id: string;
  fileName: string;
  timestamp: number;
  byteLength: number;
  currentPage?: number;
  isDirty?: boolean;
}

export interface OPFSDraftItem {
  meta: OPFSDraftMeta;
  bytes: Uint8Array;
}

const DRAFTS_DIR = 'justpdfcraft_drafts';

// In-memory fallback for environments where OPFS is unavailable (e.g. testing, restricted iframes)
const memoryFallback = new Map<string, { meta: OPFSDraftMeta; bytes: Uint8Array }>();

/**
 * Checks whether OPFS is supported and accessible in the current browser context.
 */
export function isOPFSSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage && typeof navigator.storage.getDirectory === 'function';
}

/**
 * Gets the dedicated drafts directory handle inside OPFS.
 */
async function getDraftsDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(DRAFTS_DIR, { create: true });
  } catch (err) {
    console.warn('OPFS getDirectory error, falling back to memory:', err);
    return null;
  }
}

/**
 * Saves a document draft and its metadata into OPFS.
 */
export async function saveDraftToOPFS(
  id: string,
  fileName: string,
  bytes: Uint8Array,
  options: { currentPage?: number; isDirty?: boolean } = {}
): Promise<void> {
  const meta: OPFSDraftMeta = {
    id,
    fileName,
    timestamp: Date.now(),
    byteLength: bytes.byteLength,
    currentPage: options.currentPage || 1,
    isDirty: options.isDirty !== false,
  };

  const dir = await getDraftsDirectory();
  if (!dir) {
    memoryFallback.set(id, { meta, bytes: new Uint8Array(bytes) });
    return;
  }

  try {
    // 1. Write PDF payload file
    const fileHandle = await dir.getFileHandle(`${id}.bin`, { create: true });
    if ('createWritable' in fileHandle) {
      const writable = await (fileHandle as any).createWritable();
      await writable.write(bytes);
      await writable.close();
    }

    // 2. Write Metadata JSON file
    const metaHandle = await dir.getFileHandle(`${id}.meta.json`, { create: true });
    if ('createWritable' in metaHandle) {
      const metaWritable = await (metaHandle as any).createWritable();
      await metaWritable.write(JSON.stringify(meta));
      await metaWritable.close();
    }
  } catch (err) {
    console.warn('Failed to write draft to OPFS, caching in memory fallback:', err);
    memoryFallback.set(id, { meta, bytes: new Uint8Array(bytes) });
  }
}

/**
 * Loads a document draft and its metadata from OPFS by ID.
 */
export async function loadDraftFromOPFS(id: string): Promise<OPFSDraftItem | null> {
  const dir = await getDraftsDirectory();
  if (!dir) {
    return memoryFallback.get(id) || null;
  }

  try {
    const fileHandle = await dir.getFileHandle(`${id}.bin`);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let meta: OPFSDraftMeta = {
      id,
      fileName: 'Recovered_Document.pdf',
      timestamp: file.lastModified,
      byteLength: bytes.byteLength,
    };

    try {
      const metaHandle = await dir.getFileHandle(`${id}.meta.json`);
      const metaFile = await metaHandle.getFile();
      const metaText = await metaFile.text();
      meta = JSON.parse(metaText);
    } catch {}

    return { meta, bytes };
  } catch {
    return memoryFallback.get(id) || null;
  }
}

/**
 * Lists all active drafts stored in OPFS.
 */
export async function listOPFSDrafts(): Promise<OPFSDraftMeta[]> {
  const dir = await getDraftsDirectory();
  if (!dir) {
    return Array.from(memoryFallback.values()).map((v) => v.meta);
  }

  const results: OPFSDraftMeta[] = [];
  try {
    for await (const [name, handle] of (dir as any).entries()) {
      if (name.endsWith('.meta.json') && handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          const text = await file.text();
          const meta: OPFSDraftMeta = JSON.parse(text);
          results.push(meta);
        } catch {}
      }
    }
  } catch {
    return Array.from(memoryFallback.values()).map((v) => v.meta);
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Deletes a draft from OPFS by document ID.
 */
export async function deleteDraftFromOPFS(id: string): Promise<void> {
  memoryFallback.delete(id);
  const dir = await getDraftsDirectory();
  if (!dir) return;

  try {
    await dir.removeEntry(`${id}.bin`).catch(() => {});
    await dir.removeEntry(`${id}.meta.json`).catch(() => {});
  } catch {}
}

/**
 * Clears all drafts from OPFS.
 */
export async function clearAllOPFSDrafts(): Promise<void> {
  memoryFallback.clear();
  const dir = await getDraftsDirectory();
  if (!dir) return;

  try {
    for await (const [name] of (dir as any).entries()) {
      await dir.removeEntry(name).catch(() => {});
    }
  } catch {}
}

/**
 * Estimates storage usage and quota from navigator.storage.
 */
export async function getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; percentage: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
    try {
      const est = await navigator.storage.estimate();
      const usedBytes = est.usage || 0;
      const quotaBytes = est.quota || 0;
      const percentage = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0;
      return { usedBytes, quotaBytes, percentage };
    } catch {}
  }
  return { usedBytes: 0, quotaBytes: 0, percentage: 0 };
}

export interface OPFSQuotaInfo {
  usage: number;
  quota: number;
  percentUsed: number;
  usageFormatted: string;
  quotaFormatted: string;
}

/**
 * Estimates storage usage and quota from navigator.storage with formatted strings.
 */
export async function estimateOPFSQuota(): Promise<OPFSQuotaInfo> {
  const { usedBytes, quotaBytes, percentage } = await getStorageEstimate();
  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 MB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return {
    usage: usedBytes,
    quota: quotaBytes,
    percentUsed: percentage,
    usageFormatted: formatBytes(usedBytes),
    quotaFormatted: formatBytes(quotaBytes),
  };
}

