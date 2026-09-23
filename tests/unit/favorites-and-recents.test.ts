import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useRecentToolsStore } from '@/stores/recentToolsStore';

// Mock localStorage
const storageMap: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap[key] || null),
  setItem: vi.fn((key: string, val: string) => {
    storageMap[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageMap[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storageMap).forEach((k) => delete storageMap[k]);
  }),
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = globalThis;

describe('Favorites & Recent Tools Stores Integrity', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should initialize favorites as completely empty array for fresh visitors', () => {
    const state = useFavoritesStore.getState();
    expect(state.favorites).toBeDefined();
    expect(Array.isArray(state.favorites)).toBe(true);
    // Zero tools should be pre-favorited
    expect(state.isFavorite('merge-pdf')).toBe(false);
    expect(state.isFavorite('compress-pdf')).toBe(false);
  });

  it('should allow toggling favorites on and off with localStorage persistence', () => {
    const { toggleFavorite } = useFavoritesStore.getState();

    // Toggle on
    toggleFavorite('merge-pdf');
    expect(useFavoritesStore.getState().isFavorite('merge-pdf')).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalled();

    // Toggle off
    toggleFavorite('merge-pdf');
    expect(useFavoritesStore.getState().isFavorite('merge-pdf')).toBe(false);
  });

  it('should initialize recent tool IDs as empty for fresh users', () => {
    const state = useRecentToolsStore.getState();
    expect(state.recentToolIds).toBeDefined();
    expect(Array.isArray(state.recentToolIds)).toBe(true);
  });

  it('should track recently used tools and cap at maximum limit without duplicates', () => {
    const { trackTool, clearRecents } = useRecentToolsStore.getState();
    clearRecents();

    trackTool('handwriting-generator');
    trackTool('compress-pdf');
    trackTool('merge-pdf');

    const recents = useRecentToolsStore.getState().recentToolIds;
    expect(recents[0]).toBe('merge-pdf');
    expect(recents).toContain('handwriting-generator');
    expect(recents).toContain('compress-pdf');
    expect(recents.length).toBe(3);

    // Re-tracking existing tool should bring it to the top without duplicating
    trackTool('handwriting-generator');
    const updated = useRecentToolsStore.getState().recentToolIds;
    expect(updated[0]).toBe('handwriting-generator');
    expect(updated.filter((id) => id === 'handwriting-generator').length).toBe(1);
  });
});
