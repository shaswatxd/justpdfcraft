import { PDFEngine } from './engine.interface';
import { FallbackPDFEngine } from './engines/fallback-engine';

export type EngineType = 'fallback' | 'commercial';

class EngineManager {
  private currentEngine: PDFEngine | null = null;
  private engineType: EngineType = 'fallback';

  getEngine(): PDFEngine {
    if (!this.currentEngine) {
      // Default to high-performance fallback engine (pdf-lib + PDF.js)
      this.currentEngine = new FallbackPDFEngine();
    }
    return this.currentEngine;
  }

  setEngine(engine: PDFEngine, type: EngineType = 'commercial'): void {
    this.currentEngine = engine;
    this.engineType = type;
  }

  getEngineType(): EngineType {
    return this.engineType;
  }
}

export const engineManager = new EngineManager();
export const getPDFEngine = (): PDFEngine => engineManager.getEngine();
