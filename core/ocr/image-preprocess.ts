/**
 * SwiftPDF — High-Performance Image Preprocessing Engine for OCR
 * 
 * Provides canvas pixel-level enhancements prior to Tesseract OCR:
 * 1. Grayscale conversion & luminance weighting
 * 2. Adaptive contrast stretching & histogram equalization
 * 3. Otsu binarization / dynamic thresholding
 * 4. 3x3 unsharp convolution sharpening
 * 5. Inversion detection (dark mode / light text on dark background)
 */

export interface PreprocessOptions {
  grayscale?: boolean;
  enhanceContrast?: boolean;
  binarize?: boolean;
  sharpen?: boolean;
  autoInvert?: boolean;
}

export class ImagePreprocessor {
  /**
   * Adds solid white border padding around canvas to guarantee Tesseract
   * line and word segmentation does not clip perimeter glyphs.
   */
  static addWhitePadding(sourceCanvas: HTMLCanvasElement, paddingPx: number = 32): HTMLCanvasElement {
    if (typeof document === 'undefined') return sourceCanvas;
    const padded = document.createElement('canvas');
    padded.width = sourceCanvas.width + paddingPx * 2;
    padded.height = sourceCanvas.height + paddingPx * 2;
    const ctx = padded.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, padded.width, padded.height);
    ctx.drawImage(sourceCanvas, paddingPx, paddingPx);
    return padded;
  }

  /**
   * High-quality bilinear upscale of a region or canvas for high-DPI OCR recognition.
   */
  static upscaleCanvas(
    sourceCanvas: HTMLCanvasElement,
    scaleFactor: number = 2.0,
    srcX: number = 0,
    srcY: number = 0,
    srcW?: number,
    srcH?: number
  ): HTMLCanvasElement {
    if (typeof document === 'undefined') return sourceCanvas;
    const sW = srcW || sourceCanvas.width;
    const sH = srcH || sourceCanvas.height;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.round(sW * scaleFactor);
    outCanvas.height = Math.round(sH * scaleFactor);
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, srcX, srcY, sW, sH, 0, 0, outCanvas.width, outCanvas.height);
    return outCanvas;
  }

  /**
   * Applies the requested enhancement filters to a canvas in-place or returns a new enhanced canvas.
   */
  static processCanvas(
    sourceCanvas: HTMLCanvasElement,
    options: PreprocessOptions = {}
  ): HTMLCanvasElement {
    const {
      grayscale = true,
      enhanceContrast = true,
      binarize = false,
      sharpen = false,
      autoInvert = true,
    } = options;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Create an offscreen working canvas
    let targetCanvas: HTMLCanvasElement;
    if (typeof document !== 'undefined') {
      targetCanvas = document.createElement('canvas');
      targetCanvas.width = width;
      targetCanvas.height = height;
    } else {
      return sourceCanvas;
    }

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    // Draw source canvas onto target
    ctx.drawImage(sourceCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // 1. Grayscale conversion (Rec. 601 luma formula)
    if (grayscale) {
      for (let i = 0; i < len; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
    }

    // 2. Dynamic Contrast Stretching (Percentile Normalization: 2nd - 98th percentile)
    if (enhanceContrast) {
      const hist = new Array(256).fill(0);
      let sampled = 0;
      const step = Math.max(4, Math.floor(len / 40000) * 4);
      for (let i = 0; i < len; i += step) {
        hist[data[i]]++;
        sampled++;
      }

      let cum = 0;
      let minVal = 0;
      let maxVal = 255;
      const lowerCut = sampled * 0.02;
      const upperCut = sampled * 0.98;
      let minFound = false;

      for (let v = 0; v < 256; v++) {
        cum += hist[v];
        if (!minFound && cum >= lowerCut) {
          minVal = v;
          minFound = true;
        }
        if (cum >= upperCut) {
          maxVal = v;
          break;
        }
      }

      if (maxVal > minVal && maxVal - minVal < 235) {
        const range = maxVal - minVal;
        for (let i = 0; i < len; i += 4) {
          const stretched = Math.min(255, Math.max(0, ((data[i] - minVal) / range) * 255));
          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }
      }
    }

    // 3. Auto-Invert Detection (If dark background with light text)
    if (autoInvert) {
      let darkCount = 0;
      let lightCount = 0;
      const step = Math.max(4, Math.floor(len / 20000) * 4);
      for (let i = 0; i < len; i += step) {
        if (data[i] < 128) darkCount++;
        else lightCount++;
      }

      // If more than 60% of pixels are dark, invert so text becomes black on white
      if (darkCount > lightCount * 1.5) {
        for (let i = 0; i < len; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }
    }

    // 4. Adaptive Binarization (Otsu's Thresholding)
    if (binarize) {
      const threshold = this.calculateOtsuThreshold(data, len);
      for (let i = 0; i < len; i += 4) {
        const val = data[i] >= threshold ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 5. Sharpening filter via convolution (gentle)
    if (sharpen && !binarize) {
      return this.applySharpen(targetCanvas);
    }

    return targetCanvas;
  }

  /**
   * Calculates Otsu's optimal global binarization threshold
   */
  private static calculateOtsuThreshold(data: Uint8ClampedArray, len: number): number {
    const histogram = new Array(256).fill(0);
    let total = 0;

    for (let i = 0; i < len; i += 4) {
      histogram[data[i]]++;
      total++;
    }

    let sum = 0;
    for (let t = 0; t < 256; t++) {
      sum += t * histogram[t];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 128;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;

      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = t;
      }
    }

    return threshold;
  }

  /**
   * 3x3 unsharp convolution kernel:
   *  [  0, -1,  0 ]
   *  [ -1,  5, -1 ]
   *  [  0, -1,  0 ]
   */
  private static applySharpen(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const w = canvas.width;
    const h = canvas.height;
    const srcData = ctx.getImageData(0, 0, w, h);
    const src = srcData.data;

    let outCanvas: HTMLCanvasElement;
    if (typeof document !== 'undefined') {
      outCanvas = document.createElement('canvas');
      outCanvas.width = w;
      outCanvas.height = h;
    } else {
      return canvas;
    }

    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return canvas;

    const outImgData = outCtx.createImageData(w, h);
    const dst = outImgData.data;

    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dstIdx = (y * w + x) * 4;
        let r = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const srcIdx = ((y + ky) * w + (x + kx)) * 4;
            const weight = kernel[(ky + 1) * 3 + (kx + 1)];
            r += src[srcIdx] * weight;
          }
        }

        const clamped = Math.min(255, Math.max(0, r));
        dst[dstIdx] = clamped;
        dst[dstIdx + 1] = clamped;
        dst[dstIdx + 2] = clamped;
        dst[dstIdx + 3] = src[dstIdx + 3];
      }
    }

    outCtx.putImageData(outImgData, 0, 0);
    return outCanvas;
  }
}
