import { createWorker, Worker } from 'tesseract.js';
import { ImagePreprocessor } from './image-preprocess';
import { OCROptions, OCRLineItem, OCRPageResult } from './ocr-service';

export interface BatchOCROptions extends OCROptions {
  concurrency?: number;
  abortSignal?: AbortSignal;
  onPageComplete?: (result: OCRPageResult, completedCount: number, totalCount: number) => void;
}

/**
 * Calculates optimal worker concurrency based on available CPU cores and device category.
 * Prevents mobile device thermal throttling / OOM while maximizing desktop performance.
 */
export function getOptimalWorkerCount(pageCount: number = 1): number {
  if (pageCount <= 1) return 1;

  const isMobile =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 ||
      (typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)));

  const cores =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 2;

  // Clamped bounds: max 2 on mobile, max 4 on desktop
  const maxAllowed = isMobile ? 2 : 4;
  return Math.max(1, Math.min(cores, maxAllowed, pageCount));
}

export class OCRWorkerPool {
  private workers: Worker[] = [];
  private currentLanguage: string = '';
  private isTerminated = false;
  private initPromise: Promise<Worker[]> | null = null;

  /**
   * Initializes or resizes the worker pool to the target concurrency and language.
   */
  async initPool(language: string = 'eng+hin', targetCount: number = 1): Promise<Worker[]> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInitPool(language, targetCount).finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  private async _doInitPool(language: string = 'eng+hin', targetCount: number = 1): Promise<Worker[]> {
    this.isTerminated = false;
    const clampedCount = Math.max(1, Math.min(targetCount, 8));

    // If language changed or pool count changed, tear down old workers
    if (this.currentLanguage !== language || this.workers.length !== clampedCount) {
      await this.terminate();
    }

    if (this.workers.length === clampedCount && this.currentLanguage === language) {
      return this.workers;
    }

    const localLangPath =
      typeof window !== 'undefined' && window.location.protocol.startsWith('http')
        ? `${window.location.origin}/tessdata`
        : undefined;

    const createSingleWorker = async (): Promise<Worker> => {
      try {
        return await createWorker(language, 1, {
          langPath: localLangPath,
          gzip: true,
        });
      } catch (localErr) {
        console.warn('Local traineddata load failed, falling back to default worker:', localErr);
        return await createWorker(language);
      }
    };

    // Instantiate pool in parallel
    const workerPromises: Promise<Worker>[] = [];
    for (let i = 0; i < clampedCount; i++) {
      workerPromises.push(createSingleWorker());
    }

    this.workers = await Promise.all(workerPromises);
    this.currentLanguage = language;
    return this.workers;
  }

  /**
   * Recognizes a single canvas with pre-processing using an assigned worker.
   */
  async recognizeWithWorker(
    worker: Worker,
    sourceCanvas: HTMLCanvasElement,
    options?: OCROptions
  ): Promise<Omit<OCRPageResult, 'pageIndex'>> {
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: (options?.psm || '6') as any,
        preserve_interword_spaces: options?.preserveInterwordSpaces !== false ? '1' : '0',
        user_defined_dpi: '300',
      });
    } catch (paramErr) {
      console.warn('Could not set Tesseract worker parameters:', paramErr);
    }

    let processedCanvas = sourceCanvas;
    let wasPreprocessed = false;
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
        wasPreprocessed = processedCanvas !== sourceCanvas;
      } catch (err) {
        console.warn('OCR image preprocessing warning (using raw canvas):', err);
        processedCanvas = sourceCanvas;
        wasPreprocessed = false;
      }
    }

    try {
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
    } finally {
      if (wasPreprocessed && processedCanvas) {
        processedCanvas.width = 1;
        processedCanvas.height = 1;
      }
    }
  }

  /**
   * High-throughput bounded producer-consumer batch processor.
   * Renders pages just-in-time as workers become available to prevent high memory consumption (OOM).
   *
   * @param pageIndices Array of zero-based page indices to process
   * @param renderPage Async function that renders a single page canvas on-demand
   * @param options Batch and recognition options
   */
  async processBatchStreaming(
    pageIndices: number[],
    renderPage: (pageIndex: number) => Promise<HTMLCanvasElement | null>,
    options?: BatchOCROptions
  ): Promise<OCRPageResult[]> {
    if (pageIndices.length === 0) return [];

    const language = options?.language || 'eng+hin';
    const concurrency = options?.concurrency ?? getOptimalWorkerCount(pageIndices.length);
    const workers = await this.initPool(language, concurrency);

    const totalToProcess = pageIndices.length;
    const queue = [...pageIndices];
    const resultsMap = new Map<number, OCRPageResult>();
    let completedCount = 0;

    // Worker consumer loop with per-page error boundary & clean abort handling
    const runWorkerLoop = async (worker: Worker) => {
      while (queue.length > 0) {
        if (options?.abortSignal?.aborted || this.isTerminated) {
          break;
        }

        const pIdx = queue.shift();
        if (pIdx === undefined) break;

        let canvas: HTMLCanvasElement | null = null;
        try {
          // 1. Render page canvas just-in-time
          canvas = await renderPage(pIdx);
        } catch (renderErr) {
          console.error(`Failed to render page ${pIdx + 1}:`, renderErr);
          continue;
        }

        if (!canvas || options?.abortSignal?.aborted || this.isTerminated) {
          if (canvas) { canvas.width = 1; canvas.height = 1; }
          break;
        }

        try {
          // 2. Perform parallel OCR recognition
          const res = await this.recognizeWithWorker(worker, canvas, options);

          const pageResult: OCRPageResult = {
            pageIndex: pIdx,
            text: res.text,
            confidence: res.confidence,
            lines: res.lines,
            wordCount: res.wordCount,
            charCount: res.charCount,
          };

          resultsMap.set(pIdx, pageResult);
          completedCount++;

          if (options?.onPageComplete) {
            options.onPageComplete(pageResult, completedCount, totalToProcess);
          }

          if (options?.onProgress) {
            const percent = Math.round((completedCount / totalToProcess) * 100);
            options.onProgress(
              percent,
              `Page ${pIdx + 1} processed (${completedCount}/${totalToProcess})`,
              res.confidence
            );
          }
        } catch (err) {
          // If cancelled/aborted, exit loop gracefully without rejecting batch
          if (options?.abortSignal?.aborted || this.isTerminated) {
            break;
          }
          console.error(`OCR error on page ${pIdx + 1}:`, err);
          // Fallback result so document order is preserved
          resultsMap.set(pIdx, {
            pageIndex: pIdx,
            text: `[OCR failed on page ${pIdx + 1}]`,
            confidence: 0,
            lines: [],
            wordCount: 0,
            charCount: 0,
          });
          completedCount++;
        } finally {
          // 3. Immediately deallocate canvas memory
          if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
          }
        }
      }
    };

    // Run parallel consumer loops across all initialized workers
    await Promise.all(workers.map((w) => runWorkerLoop(w)));

    // Return results strictly in document page order
    const orderedResults: OCRPageResult[] = [];
    for (const pIdx of pageIndices) {
      const res = resultsMap.get(pIdx);
      if (res) {
        orderedResults.push(res);
      }
    }

    return orderedResults;
  }

  /**
   * Recognizes an array of existing page canvases concurrently.
   */
  async recognizePages(
    pageCanvases: Array<{ pageIndex: number; canvas: HTMLCanvasElement }>,
    options?: BatchOCROptions
  ): Promise<OCRPageResult[]> {
    const indices = pageCanvases.map((p) => p.pageIndex);
    const canvasMap = new Map<number, HTMLCanvasElement>();
    pageCanvases.forEach((p) => canvasMap.set(p.pageIndex, p.canvas));

    return this.processBatchStreaming(
      indices,
      async (pIdx) => canvasMap.get(pIdx) || null,
      options
    );
  }

  /**
   * Terminate all workers and release WASM memory.
   */
  async terminate(): Promise<void> {
    this.isTerminated = true;
    if (this.workers.length > 0) {
      const toTerminate = [...this.workers];
      this.workers = [];
      await Promise.all(
        toTerminate.map(async (w) => {
          try {
            await w.terminate();
          } catch (e) {
            console.warn('Error terminating OCR worker:', e);
          }
        })
      );
    }
  }

  get activeWorkerCount(): number {
    return this.workers.length;
  }
}

export const ocrWorkerPool = new OCRWorkerPool();
