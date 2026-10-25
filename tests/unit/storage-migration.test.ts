import { describe, it, expect } from 'vitest';
import {
  migrateLegacyStorageKey,
  isJsonStringArray,
  isJsonArrayOf,
  LegacyStorage,
} from '@/utils/legacy-storage';

/** Deterministic in-memory Storage double so tests never touch a real localStorage. */
function fakeStorage(initial: Record<string, string> = {}): LegacyStorage & { dump: Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial));
  const entries = (): Record<string, string> => Object.fromEntries(map);
  return {
    get dump(): Record<string, string> {
      return entries();
    },
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

const isBookmarked = (item: unknown): item is { id: string } =>
  typeof item === 'object' && item !== null && typeof (item as { id: unknown }).id === 'string';

describe('migrateLegacyStorageKey', () => {
  it('copies legacy data to the new key when the new key is empty, then removes the legacy key', () => {
    const storage = fakeStorage({ 'swifteditoo_favorites': '["merge-pdf"]' });

    migrateLegacyStorageKey('swifteditoo_favorites', 'justpdfcraft_favorites', { storage });

    expect(storage.dump).toEqual({ 'justpdfcraft_favorites': '["merge-pdf"]' });
  });

  it('lets the new key win: existing justpdfcraft_* data is never overwritten', () => {
    const storage = fakeStorage({
      'swifteditoo_favorites': '["old-tool"]',
      'justpdfcraft_favorites': '["new-tool"]',
    });

    migrateLegacyStorageKey('swifteditoo_favorites', 'justpdfcraft_favorites', { storage });

    expect(storage.dump).toEqual({ 'justpdfcraft_favorites': '["new-tool"]' });
  });

  it('deletes invalid legacy data instead of migrating it', () => {
    const storage = fakeStorage({ 'swiftpdf_garbage': '{not json' });

    migrateLegacyStorageKey('swiftpdf_garbage', 'justpdfcraft_data', { storage, validate: isJsonStringArray });

    expect(storage.dump).toEqual({});
  });

  it('migrates valid JSON string arrays via isJsonStringArray', () => {
    const storage = fakeStorage({ 'swifteditoo_recent_tools': '["crop","bates"]' });

    migrateLegacyStorageKey('swifteditoo_recent_tools', 'justpdfcraft_recent_tools', {
      storage,
      validate: isJsonStringArray,
    });

    expect(storage.dump['justpdfcraft_recent_tools']).toBe('["crop","bates"]');
  });

  it('uses the first legacy key that has data; later legacy keys only get deleted', () => {
    const storage = fakeStorage({
      'swifteditoo_papertone': 'sepia',
      'swiftpdf_papertone': 'mint',
    });

    migrateLegacyStorageKey(['swiftpdf_papertone', 'swifteditoo_papertone'], 'justpdfcraft_papertone', { storage });

    expect(storage.dump).toEqual({ 'justpdfcraft_papertone': 'mint' });
  });

  it('is a no-op when no legacy keys exist', () => {
    const storage = fakeStorage({ 'justpdfcraft_favorites': '[]' });

    migrateLegacyStorageKey(['swifteditoo_favorites', 'swiftpdf_favorites'], 'justpdfcraft_favorites', { storage });

    expect(storage.dump).toEqual({ 'justpdfcraft_favorites': '[]' });
  });

  it('rejects non-arrays with isJsonArrayOf guards', () => {
    const storage = fakeStorage({ 'swifteditoo_bm_x': '{"id":"not-an-array"}' });

    migrateLegacyStorageKey('swifteditoo_bm_x', 'justpdfcraft_bm_x', {
      storage,
      validate: isJsonArrayOf(isBookmarked),
    });

    expect(storage.dump).toEqual({});
  });
});
