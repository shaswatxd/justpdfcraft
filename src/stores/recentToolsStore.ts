import { create } from 'zustand';

interface RecentToolsState {
  recentToolIds: string[];
  trackTool: (toolId: string) => void;
  clearRecents: () => void;
}

const STORAGE_KEY = 'justpdfcraft_recent_tools';
const MAX_RECENTS = 8;

const getInitialRecents = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('swifteditoo_recent_tools');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return ['handwriting-generator', 'compress-pdf', 'target-kb-resizer', 'cgpa-calculator', 'merge-pdf'];
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
