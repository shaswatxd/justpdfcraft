import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOptimalWorkerCount, OCRWorkerPool } from '../../core/ocr/ocr-pool';

describe('OCR Worker Pool & Multi-Threaded Batch Queue', () => {
  let pool: OCRWorkerPool;

  beforeEach(() => {
    pool = new OCRWorkerPool();
  });

  describe('Optimal Worker Count Calculation', () => {
    it('should return 1 worker for single page jobs', () => {
      expect(getOptimalWorkerCount(1)).toBe(1);
      expect(getOptimalWorkerCount(0)).toBe(1);
    });

    it('should clamp worker count to sensible bounds', () => {
      const count = getOptimalWorkerCount(10);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(4);
    });
  });

  describe('Worker Pool Batch Execution & Ordering', () => {
    it('should process multi-page queue and return results strictly in page order', async () => {
      // Mock worker recognize implementation
      const mockWorkers: any[] = [
        {
          setParameters: vi.fn().mockResolvedValue(undefined),
          recognize: vi.fn().mockImplementation(async (canvas: any) => ({
            data: {
              text: `Recognized text for ${canvas.id}`,
              confidence: 95,
              lines: [{ text: `Recognized text for ${canvas.id}`, confidence: 95 }],
            },
          })),
          terminate: vi.fn().mockResolvedValue(undefined),
        },
        {
          setParameters: vi.fn().mockResolvedValue(undefined),
          recognize: vi.fn().mockImplementation(async (canvas: any) => ({
            data: {
              text: `Recognized text for ${canvas.id}`,
              confidence: 90,
              lines: [{ text: `Recognized text for ${canvas.id}`, confidence: 90 }],
            },
          })),
          terminate: vi.fn().mockResolvedValue(undefined),
        },
      ];

      vi.spyOn(pool, 'initPool').mockResolvedValue(mockWorkers);

      const pageIndices = [0, 1, 2, 3];
      const completedPages: number[] = [];

      const results = await pool.processBatchStreaming(
        pageIndices,
        async (pIdx) => {
          return { id: `page-${pIdx}`, width: 100, height: 100 } as any;
        },
        {
          concurrency: 2,
          preprocess: false,
          onPageComplete: (res) => {
            completedPages.push(res.pageIndex);
          },
        }
      );

      // Verify all 4 pages were recognized
      expect(results.length).toBe(4);
      // Strictly ordered by pageIndex
      expect(results[0].pageIndex).toBe(0);
      expect(results[1].pageIndex).toBe(1);
      expect(results[2].pageIndex).toBe(2);
      expect(results[3].pageIndex).toBe(3);

      expect(results[0].text).toBe('Recognized text for page-0');
      expect(results[3].text).toBe('Recognized text for page-3');
    });

    it('should handle cooperative cancellation midway through batch queue', async () => {
      const abortController = new AbortController();

      const mockWorker: any = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockImplementation(async (canvas: any) => {
          if (canvas.id === 'page-1') {
            abortController.abort();
          }
          return {
            data: {
              text: `Text for ${canvas.id}`,
              confidence: 90,
            },
          };
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(pool, 'initPool').mockResolvedValue([mockWorker]);

      const pageIndices = [0, 1, 2, 3, 4];
      const results = await pool.processBatchStreaming(
        pageIndices,
        async (pIdx) => ({ id: `page-${pIdx}`, width: 50, height: 50 } as any),
        {
          concurrency: 1,
          abortSignal: abortController.signal,
          preprocess: false,
        }
      );

      // Should stop early once aborted and return only completed results
      expect(results.length).toBeLessThan(pageIndices.length);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should clean up worker threads on terminate and reset isTerminated on init', async () => {
      const mockWorker: any = {
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      (pool as any).workers = [mockWorker];
      await pool.terminate();

      expect(mockWorker.terminate).toHaveBeenCalled();
      expect(pool.activeWorkerCount).toBe(0);
      expect((pool as any).isTerminated).toBe(true);

      // Now mock initPool's internal worker creation
      const newMockWorker: any = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'First run text', confidence: 92, lines: [] },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(pool, 'initPool').mockImplementation(async () => {
        (pool as any).isTerminated = false;
        (pool as any).workers = [newMockWorker];
        return [newMockWorker];
      });

      // Verify the very first run succeeds and is not prematurely broken by isTerminated
      const firstRunResults = await pool.processBatchStreaming(
        [0],
        async () => ({ width: 10, height: 10 } as any),
        { concurrency: 1, preprocess: false }
      );

      expect(firstRunResults.length).toBe(1);
      expect(firstRunResults[0].text).toBe('First run text');
    });

    it('should continue processing remaining pages if a single page canvas is empty or fails', async () => {
      const mockWorker: any = {
        setParameters: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: { text: 'Page 2 content', confidence: 88, lines: [] },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      vi.spyOn(pool, 'initPool').mockResolvedValue([mockWorker]);

      const results = await pool.processBatchStreaming(
        [0, 1],
        async (pIdx) => (pIdx === 0 ? null : ({ width: 10, height: 10 } as any)),
        { concurrency: 1, preprocess: false }
      );

      expect(results.length).toBe(2);
      expect(results[0].text).toContain('[Page 1 empty canvas]');
      expect(results[1].text).toBe('Page 2 content');
    });
  });
});
