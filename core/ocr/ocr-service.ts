import { createWorker, Worker } from 'tesseract.js';
import { ImagePreprocessor, PreprocessOptions } from './image-preprocess';

export interface OCROptions {
  language?: string;
  preprocess?: boolean;
  preprocessOptions?: PreprocessOptions;
  scale?: number;
  psm?: string;
  preserveInterwordSpaces?: boolean;
  onProgress?: (progress: number, status: string, currentConfidence?: number) => void;
}

export interface OCRLineItem {
  text: string;
  confidence: number;
}

export interface OCRPageResult {
  pageIndex: number;
  text: string;
  confidence: number;
  lines: OCRLineItem[];
  wordCount: number;
  charCount: number;
}

export class OCRService {
  private worker: Worker | null = null;
  private currentLanguage: string = 'eng+hin';

  async initWorker(language: string = 'eng+hin'): Promise<Worker> {
    if (this.worker && this.currentLanguage === language) {
      return this.worker;
    }

    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    let worker: Worker;
    try {
      const localLangPath = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}/tessdata`
        : undefined;

      worker = await createWorker(language, 1, {
        langPath: localLangPath,
        gzip: true,
      });
    } catch (localErr) {
      console.warn('Local traineddata load failed, falling back to default:', localErr);
      worker = await createWorker(language);
    }

    this.worker = worker;
    this.currentLanguage = language;
    return worker;
  }

  /**
   * Recognizes text from a single canvas or image source with optional pre-processing.
   */
  async recognizeImage(
    sourceCanvas: HTMLCanvasElement,
    options?: OCROptions
  ): Promise<Omit<OCRPageResult, 'pageIndex'>> {
    const lang = options?.language || 'eng+hin';
    const worker = await this.initWorker(lang);

    // Apply optimal OCR worker parameters (preserve spacing, uniform block PSM 6, 300 DPI)
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: (options?.psm || '6') as any,
        preserve_interword_spaces: options?.preserveInterwordSpaces !== false ? '1' : '0',
        user_defined_dpi: '300',
      });
    } catch (paramErr) {
      console.warn('Could not set Tesseract worker parameters:', paramErr);
    }

    // Apply pixel-level enhancement pre-processing if enabled (default true)
    let processedCanvas = sourceCanvas;
    if (options?.preprocess !== false) {
      try {
        processedCanvas = ImagePreprocessor.processCanvas(
          sourceCanvas,
          options?.preprocessOptions || {
            grayscale: true,
            enhanceContrast: true,
            binarize: false,
            sharpen: false,
            autoInvert: true,
          }
        );
      } catch (err) {
        console.warn('OCR image preprocessing warning (using raw canvas):', err);
        processedCanvas = sourceCanvas;
      }
    }

    const result = await worker.recognize(processedCanvas);
    const data = result.data;

    const rawText = data.text || '';
    const confidence = Math.round(data.confidence || 0);

    const lines: OCRLineItem[] = [];
    const dataAny = data as any;
    if (dataAny.lines && Array.isArray(dataAny.lines)) {
      for (const line of dataAny.lines) {
        if (line.text && line.text.trim().length > 0) {
          lines.push({
            text: line.text.trim(),
            confidence: Math.round(line.confidence || confidence),
          });
        }
      }
    }

    const words = rawText.trim().split(/\s+/).filter((w) => w.length > 0);

    return {
      text: rawText.trim(),
      confidence,
      lines,
      wordCount: words.length,
      charCount: rawText.length,
    };
  }

  /**
   * Recognizes an array of rendered page canvases with real-time streaming progress.
   */
  async recognizePages(
    pageCanvases: Array<{ pageIndex: number; canvas: HTMLCanvasElement }>,
    options?: OCROptions
  ): Promise<OCRPageResult[]> {
    const results: OCRPageResult[] = [];
    const total = pageCanvases.length;

    for (let i = 0; i < total; i++) {
      const { pageIndex, canvas } = pageCanvases[i];
      const startPercent = Math.round((i / total) * 100);

      if (options?.onProgress) {
        options.onProgress(
          startPercent,
          `Scanning & enhancing page ${pageIndex + 1} of ${total}...`
        );
      }

      const res = await this.recognizeImage(canvas, options);

      results.push({
        pageIndex,
        text: res.text,
        confidence: res.confidence,
        lines: res.lines,
        wordCount: res.wordCount,
        charCount: res.charCount,
      });

      if (options?.onProgress) {
        const endPercent = Math.round(((i + 1) / total) * 100);
        options.onProgress(
          endPercent,
          `Page ${pageIndex + 1} done (${res.confidence}% confidence, ${res.wordCount} words)`,
          res.confidence
        );
      }
    }

    if (options?.onProgress) {
      options.onProgress(100, 'OCR Recognition Complete');
    }

    return results;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
