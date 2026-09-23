import { create } from 'zustand';

interface RecentToolsState {
  recentToolIds: string[];
  trackTool: (toolId: string) => void;
  clearRecents: () => void;
}

const STORAGE_KEY = 'justpdfcraft_recent_tools';
const MAX_RECENTS = 8;

const OLD_RECENTS_SEEDS = [
  'handwriting-generator',
  'compress-pdf',
  'target-kb-resizer',
  'cgpa-calculator',
  'merge-pdf',
];

const getInitialRecents = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    localStorage.removeItem('swifteditoo_recent_tools');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const isOldSeed =
          parsed.length === OLD_RECENTS_SEEDS.length &&
          parsed.every((id) => OLD_RECENTS_SEEDS.includes(id));
        if (isOldSeed) {
          localStorage.removeItem(STORAGE_KEY);
          return [];
        }
        return parsed;
      }
    }
  } catch {}
  return [];
};

export const useRecentToolsStore = create<RecentToolsState>((set) => ({
  recentToolIds: getInitialRecents(),

  trackTool: (toolId: string) => {
    set((state) => {
      // Remove if exists, then prepend to top
      const filtered = state.recentToolIds.filter((id) => id !== toolId);
      const updated = [toolId, ...filtered].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { recentToolIds: updated };
    });
  },

  clearRecents: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({ recentToolIds: [] });
  },
}));
