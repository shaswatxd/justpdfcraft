import { create } from 'zustand';
import { migrateLegacyStorageKey } from '@/utils/legacy-storage';

export type PaperTone = 'default' | 'sepia' | 'dark' | 'mint';
export type ActiveView = 'home' | 'editor';

export type SidebarTab = 'thumbnails' | 'search' | 'bookmarks' | 'annotations' | 'forms';
export type ModalType = 
  | 'compress' 
  | 'ocr' 
  | 'protect' 
  | 'compare' 
  | 'settings' 
  | 'merge' 
  | 'split' 
  | 'sign'
  | 'convert'
  | 'watermark'
  | 'scan'
  | 'bates'
  | 'page-number'
  | 'batch'
  | 'crop'
  | 'extract-table'
  | 'shortcuts'
  | 'student-resizer'
  | 'handwriting'
  | 'legal'
  | 'student-tools'
  | 'developer-tools'
  | 'image-tools'
  | 'document-tools'
  | 'ai-tools'
  | 'pricing'
  | 'auth'
  | 'admin'
  | 'contact'
  | 'about'
  | null;

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  durationMs?: number;
}

/** Deferred PWA install prompt captured from the browser's beforeinstallprompt event. */
export interface InstallPromptEvent {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface UIState {
  isSidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  activeModal: ModalType;
  isCommandPaletteOpen: boolean;
  toasts: ToastMessage[];
  paperTone: PaperTone;
  activeView: ActiveView;
  isFullscreen: boolean;
  isLaserPointerActive: boolean;
  isSpotlightActive: boolean;

  // Active Photo Editor image URL
  activePhotoUrl: string | null;
  setActivePhotoUrl: (url: string | null) => void;

  // Deferred PWA install prompt (null until the browser offers installation)
  installPrompt: InstallPromptEvent | null;
  setInstallPrompt: (prompt: InstallPromptEvent | null) => void;

  // Dropped image file for modal consumption (e.g. Convert img-to-pdf, Image Tools)
  pendingImageFile: File | null;
  setPendingImageFile: (file: File | null) => void;

  // Sub-tabs for modal hubs
  activeLegalTab: string | null;
  setActiveLegalTab: (tab: string | null) => void;
  activeConvertTab: string | null;
  setActiveConvertTab: (tab: string | null) => void;
  activeStudentTab: string | null;
  setActiveStudentTab: (tab: string | null) => void;
  activeDeveloperTab: string | null;
  setActiveDeveloperTab: (tab: string | null) => void;
  activeImageTab: string | null;
  setActiveImageTab: (tab: string | null) => void;
  activeDocTab: string | null;
  setActiveDocTab: (tab: string | null) => void;
  activeAITab: string | null;
  setActiveAITab: (tab: string | null) => void;

  setPaperTone: (tone: PaperTone) => void;
  setActiveView: (view: ActiveView) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setActiveModal: (modal: ModalType) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleFullscreen: () => void;
  setFullscreen: (fullscreen: boolean) => void;
  toggleLaserPointer: () => void;
  setLaserPointer: (active: boolean) => void;
  toggleSpotlight: () => void;
  setSpotlight: (active: boolean) => void;
  
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

// One-time cleanup of legacy theme keys from pre-rebrand migrations
// (the app ships a fixed clean-light theme; no runtime theme switching)
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('justpdfcraft_theme');
    localStorage.removeItem('swifteditoo_theme');
    localStorage.removeItem('swiftpdf_theme');
  } catch {}
}

const PAPER_TONES: PaperTone[] = ['default', 'sepia', 'dark', 'mint'];

// One-time migration: carry the paper tone over from old brand keys, then read
// only the current key below.
if (typeof window !== 'undefined') {
  migrateLegacyStorageKey(['swifteditoo_papertone', 'swiftpdf_papertone'], 'justpdfcraft_papertone', {
    validate: (raw) => PAPER_TONES.includes(raw as PaperTone),
  });
}

const getInitialPaperTone = (): PaperTone => {
  if (typeof window === 'undefined') return 'default';
  try {
    const saved = localStorage.getItem('justpdfcraft_papertone') as PaperTone | null;
    if (saved && PAPER_TONES.includes(saved)) {
      return saved;
    }
  } catch {}
  return 'default';
};

export const useUIStore = create<UIState>((set) => ({
  paperTone: getInitialPaperTone(),
  activeView: 'home',
  setActiveView: (activeView) => set({ activeView }),
  isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  activeSidebarTab: 'thumbnails',
  activeModal: null,
  isCommandPaletteOpen: false,
  toasts: [],
  isFullscreen: false,
  isLaserPointerActive: false,
  isSpotlightActive: false,
  activePhotoUrl: null,
  setActivePhotoUrl: (activePhotoUrl) =>
    set((state) => {
      if (
        state.activePhotoUrl &&
        typeof state.activePhotoUrl === 'string' &&
        state.activePhotoUrl.startsWith('blob:') &&
        state.activePhotoUrl !== activePhotoUrl
      ) {
        try {
          URL.revokeObjectURL(state.activePhotoUrl);
        } catch {}
      }
      return { activePhotoUrl };
    }),
  pendingImageFile: null,
  setPendingImageFile: (pendingImageFile) => set({ pendingImageFile }),

  installPrompt: null,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),

  activeLegalTab: null,
  setActiveLegalTab: (activeLegalTab) => set({ activeLegalTab }),
  activeConvertTab: null,
  setActiveConvertTab: (activeConvertTab) => set({ activeConvertTab }),
  activeStudentTab: null,
  setActiveStudentTab: (activeStudentTab) => set({ activeStudentTab }),
  activeDeveloperTab: null,
  setActiveDeveloperTab: (activeDeveloperTab) => set({ activeDeveloperTab }),
  activeImageTab: null,
  setActiveImageTab: (activeImageTab) => set({ activeImageTab }),
  activeDocTab: null,
  setActiveDocTab: (activeDocTab) => set({ activeDocTab }),
  activeAITab: null,
  setActiveAITab: (activeAITab) => set({ activeAITab }),

  setPaperTone: (paperTone: PaperTone) => {
    try {
      localStorage.setItem('justpdfcraft_papertone', paperTone);
    } catch {}
    set({ paperTone });
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarOpen: true }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
  setFullscreen: (fullscreen: boolean) => set({ isFullscreen: fullscreen }),
  toggleLaserPointer: () =>
    set((state) => ({ isLaserPointerActive: !state.isLaserPointerActive })),
  setLaserPointer: (active: boolean) => set({ isLaserPointerActive: active }),
  toggleSpotlight: () =>
    set((state) => ({ isSpotlightActive: !state.isSpotlightActive })),
  setSpotlight: (active: boolean) => set({ isSpotlightActive: active }),

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.durationMs || 3500);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

if (typeof window !== 'undefined') {
  (window as any).__JUSTPDFCRAFT_UI_STORE__ = useUIStore;
}
