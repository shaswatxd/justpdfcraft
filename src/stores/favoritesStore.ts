import { create } from 'zustand';

interface FavoritesState {
  favorites: string[];
  isFavorite: (toolId: string) => boolean;
  toggleFavorite: (toolId: string) => void;
  addFavorite: (toolId: string) => void;
  removeFavorite: (toolId: string) => void;
}

const STORAGE_KEY = 'justpdfcraft_favorites';

const getInitialFavorites = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('swifteditoo_favorites');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  // Default popular favorites for fresh users
  return ['handwriting-generator', 'compress-pdf', 'merge-pdf', 'target-kb-resizer', 'cgpa-calculator', 'attendance-calculator'];
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
