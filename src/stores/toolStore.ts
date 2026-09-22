import { create } from 'zustand';
import { RedactionArea } from '@core/pdf/engine.interface';
import { DynamicStampConfig, DEFAULT_DYNAMIC_STAMP } from '@/types/dynamicStamp';

export type ToolMode = 
  | 'select' 
  | 'hand' 
  | 'text' 
  | 'edit_text' 
  | 'draw' 
  | 'highlight' 
  | 'underline' 
  | 'strikethrough'
  | 'rectangle' 
  | 'circle' 
  | 'line'
  | 'arrow'
  | 'stamp'
  | 'note'
  | 'redact'
  | 'eraser' 
  | 'snip_ocr' 
  | 'measure'
  | 'form_text' 
  | 'form_checkbox' 
  | 'form_dropdown';

interface ToolState {
  currentTool: ToolMode;
  color: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
  selectedStamp: string;
  dynamicStampConfig: DynamicStampConfig;
  eraserRadius: number;
  
  // Measurement & Dimension Tool state
  measureUnit: 'mm' | 'cm' | 'in' | 'pt';
  measureScale: number; // e.g. 1.0 (1:1), 10.0 (1:10), etc.

  // OCR Language (defaults to eng+hin for comprehensive bilingual recognition)
  ocrLanguage: string;
  setOcrLanguage: (lang: string) => void;

  // Staged redactions awaiting permanent destruction
  stagedRedactions: RedactionArea[];
  
  setTool: (tool: ToolMode) => void;
  setCurrentTool: (tool: ToolMode) => void;
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: 'Helvetica' | 'TimesRoman' | 'Courier') => void;
  setSelectedStamp: (stamp: string) => void;
  setDynamicStampConfig: (config: Partial<DynamicStampConfig>) => void;
  setEraserRadius: (radius: number) => void;
  setMeasureUnit: (unit: 'mm' | 'cm' | 'in' | 'pt') => void;
  setMeasureScale: (scale: number) => void;
  
  addStagedRedaction: (area: RedactionArea) => void;
  removeStagedRedaction: (index: number) => void;
  clearStagedRedactions: () => void;
}

export const useToolStore = create<ToolState>((set) => ({
  currentTool: 'select',
  color: '#0C8DE9',
  strokeWidth: 2,
  opacity: 1.0,
  fontSize: 14,
  fontFamily: 'Helvetica',
  selectedStamp: 'RECEIVED',
  dynamicStampConfig: DEFAULT_DYNAMIC_STAMP,
  eraserRadius: 16,
  measureUnit: 'mm',
  measureScale: 1.0,
  ocrLanguage: 'eng+hin',
  setOcrLanguage: (ocrLanguage) => set({ ocrLanguage }),
  stagedRedactions: [],

  setTool: (tool) => set({ currentTool: tool }),
  setCurrentTool: (tool) => set({ currentTool: tool }),
  setColor: (color) => set({ color }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity: (opacity) => set({ opacity }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setSelectedStamp: (selectedStamp) => set({ selectedStamp }),
  setDynamicStampConfig: (partial) =>
    set((state) => ({
      dynamicStampConfig: { ...state.dynamicStampConfig, ...partial },
      selectedStamp: partial.preset || state.dynamicStampConfig.preset,
      color: partial.color || state.color,
    })),
  setEraserRadius: (eraserRadius) => set({ eraserRadius }),
  setMeasureUnit: (measureUnit) => set({ measureUnit }),
  setMeasureScale: (measureScale) => set({ measureScale }),

  addStagedRedaction: (area) =>
    set((state) => ({ stagedRedactions: [...state.stagedRedactions, area] })),

  removeStagedRedaction: (index) =>
    set((state) => ({
      stagedRedactions: state.stagedRedactions.filter((_, i) => i !== index),
    })),

  clearStagedRedactions: () => set({ stagedRedactions: [] }),
}));
