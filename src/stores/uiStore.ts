import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'oled';
export type PaperTone = 'default' | 'sepia' | 'dark' | 'mint';

export type SidebarTab = 'thumbnails' | 'search' | 'bookmarks' | 'annotations' | 'forms';
export type ModalType = 
  | 'compress' 
  | 'ocr' 
  | 'print' 
  | 'protect' 
  | 'compare' 
  | 'metadata' 
  | 'settings' 
  | 'merge' 
  | 'split' 
  | 'sign'
  | 'convert'
  | 'watermark'
  | 'scan'
  | 'bates'
  | 'sanitize'
  | 'batch'
  | 'crop'
  | 'extract-table'
  | 'field-builder'
  | 'shortcuts'
  | 'extract-images'
  | 'photo-editor'
  | 'student-resizer'
  | 'student-calculators'
  | 'image-tools'
  | 'handwriting'
  | 'legal'
  | null;

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  durationMs?: number;
}

interface UIState {
  theme: ThemeMode;
  isSidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  isPropertiesPanelOpen: boolean;
  activeModal: ModalType;
  isCommandPaletteOpen: boolean;
  toasts: ToastMessage[];
  paperTone: PaperTone;
  isFullscreen: boolean;
  isLaserPointerActive: boolean;
  isSpotlightActive: boolean;

  // Active Photo Editor image URL
  activePhotoUrl: string | null;
  setActivePhotoUrl: (url: string | null) => void;

  // Dropped image file for modal consumption (e.g. Convert img-to-pdf, Image Tools)
  pendingImageFile: File | null;
  setPendingImageFile: (file: File | null) => void;

  // Sub-tabs for modal hubs
  activeStudentTab: string | null;
  setActiveStudentTab: (tab: string | null) => void;
  activeLegalTab: string | null;
  setActiveLegalTab: (tab: string | null) => void;
  activeImageTab: string | null;
  setActiveImageTab: (tab: string | null) => void;
  activeConvertTab: string | null;
  setActiveConvertTab: (tab: string | null) => void;

  setTheme: (theme: ThemeMode) => void;
  setPaperTone: (tone: PaperTone) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  togglePropertiesPanel: () => void;
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

const applyThemeToDOM = (theme: ThemeMode = 'oled') => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'oled');
  if (theme === 'light') {
    root.classList.add('light');
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.add('dark', 'oled');
  }
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'oled';
  try {
    const saved = localStorage.getItem('justpdfcraft_theme') as ThemeMode;
    if (['dark', 'light', 'oled'].includes(saved)) {
      applyThemeToDOM(saved);
      return saved;
    }
  } catch {}
  applyThemeToDOM('oled');
  return 'oled';
};

const getInitialPaperTone = (): PaperTone => {
  if (typeof window === 'undefined') return 'default';
  try {
    const saved = (localStorage.getItem('justpdfcraft_papertone') || localStorage.getItem('swifteditoo_papertone') || localStorage.getItem('swiftpdf_papertone')) as PaperTone;
    if (['default', 'sepia', 'dark', 'mint'].includes(saved)) {
      return saved;
    }
  } catch {}
  return 'default';
};

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  paperTone: getInitialPaperTone(),
  isSidebarOpen: true,
  activeSidebarTab: 'thumbnails',
  isPropertiesPanelOpen: false,
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

  activeStudentTab: null,
  setActiveStudentTab: (activeStudentTab) => set({ activeStudentTab }),
  activeLegalTab: null,
  setActiveLegalTab: (activeLegalTab) => set({ activeLegalTab }),
  activeImageTab: null,
  setActiveImageTab: (activeImageTab) => set({ activeImageTab }),
  activeConvertTab: null,
  setActiveConvertTab: (activeConvertTab) => set({ activeConvertTab }),

  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem('justpdfcraft_theme', theme);
    } catch {}
    applyThemeToDOM(theme);
    set({ theme });
  },

  setPaperTone: (paperTone: PaperTone) => {
    try {
      localStorage.setItem('justpdfcraft_papertone', paperTone);
    } catch {}
    set({ paperTone });
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setSidebarTab: (tab) => set({ activeSidebarTab: tab, isSidebarOpen: true }),
  togglePropertiesPanel: () =>
    set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
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
