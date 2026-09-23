import { create } from 'zustand';

interface FavoritesState {
  favorites: string[];
  isFavorite: (toolId: string) => boolean;
  toggleFavorite: (toolId: string) => void;
  addFavorite: (toolId: string) => void;
  removeFavorite: (toolId: string) => void;
}

const STORAGE_KEY = 'justpdfcraft_favorites';

const OLD_DEFAULT_SEEDS = [
  'handwriting-generator',
  'compress-pdf',
  'merge-pdf',
  'target-kb-resizer',
  'cgpa-calculator',
  'attendance-calculator',
];

const getInitialFavorites = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    // Clean up legacy storage key
    localStorage.removeItem('swifteditoo_favorites');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // If stored favorites match old hardcoded defaults, reset to empty
        const isOldDefaultList =
          parsed.length === OLD_DEFAULT_SEEDS.length &&
          parsed.every((id) => OLD_DEFAULT_SEEDS.includes(id));

        if (isOldDefaultList) {
          localStorage.removeItem(STORAGE_KEY);
          return [];
        }
        return parsed;
      }
    }
  } catch {}
  // Default to empty array: no tools are pre-favorited
  return [];
};

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: getInitialFavorites(),

  isFavorite: (toolId: string) => {
    return get().favorites.includes(toolId);
  },

  toggleFavorite: (toolId: string) => {
    set((state) => {
      const exists = state.favorites.includes(toolId);
      const updated = exists
        ? state.favorites.filter((id) => id !== toolId)
        : [...state.favorites, toolId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { favorites: updated };
    });
  },

  addFavorite: (toolId: string) => {
    set((state) => {
      if (state.favorites.includes(toolId)) return state;
      const updated = [...state.favorites, toolId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { favorites: updated };
    });
  },

  removeFavorite: (toolId: string) => {
    set((state) => {
      const updated = state.favorites.filter((id) => id !== toolId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { favorites: updated };
    });
  },
}));
