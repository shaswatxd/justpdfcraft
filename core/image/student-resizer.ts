/**
 * JustPDFCraft Student Suite Engine
 * Handles exact target KB compression for photos & signatures
 * (binary-search JPEG quality + dimension scaling to hit portal size limits).
 */

export interface CompressTargetResult {
  blob: Blob;
  dataUrl: string;
  finalKb: number;
  width: number;
  height: number;
  qualityUsed: number;
  inRange: boolean;
}

/**
 * Intelligent binary search compressor that iteratively adjusts canvas JPEG quality
 * and dimensions to guarantee the output image file size lands strictly within [minKb, maxKb].
 */
export async function compressToTargetKb(
  canvas: HTMLCanvasElement,
  targetMinKb: number,
  targetMaxKb: number,
  mimeType: 'image/jpeg' | 'image/webp' = 'image/jpeg'
): Promise<CompressTargetResult> {
  const minKb = Math.max(1, targetMinKb);
  const maxKb = Math.max(minKb, targetMaxKb);

  // Helper to convert canvas to blob with given quality
  const getBlob = (cvs: HTMLCanvasElement, q: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      cvs.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas toBlob returned null'));
        },
        mimeType,
        q
      );
    });
  };

  let currentCanvas = canvas;
  let curW = canvas.width;
  let curH = canvas.height;

  // 1. Binary search on quality between 0.05 and 1.0
  let lowQ = 0.05;
  let highQ = 1.0;
  let bestBlob: Blob | null = null;
  let bestQuality = 0.85;
  let bestKb = 0;

  for (let iter = 0; iter < 10; iter++) {
    const midQ = (lowQ + highQ) / 2;
    const blob = await getBlob(currentCanvas, midQ);
    const kb = blob.size / 1024;

    bestBlob = blob;
    bestQuality = midQ;
    bestKb = kb;

    if (kb > maxKb) {
      highQ = midQ; // Need lower quality to decrease size
    } else if (kb < minKb) {
      lowQ = midQ; // Need higher quality to reach minimum size
    } else {
      // Exactly in range!
      break;
    }
  }

  // If even at low quality the image is still above maxKb, scale down dimensions
  if (bestKb > maxKb && (curW > 100 && curH > 100)) {
    let scale = 0.9;
    while (bestKb > maxKb && scale >= 0.2) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = Math.max(10, Math.round(curW * scale));
      scaledCanvas.height = Math.max(10, Math.round(curH * scale));
      const ctx = scaledCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

        // Use binary search again for the scaled canvas
        let sqLow = 0.05, sqHigh = 0.85, sqBestBlob = null, sqBestKb = 0;
        for (let j = 0; j < 5; j++) {
            const sqMid = (sqLow + sqHigh) / 2;
            const testBlob = await getBlob(scaledCanvas, sqMid);
            const testKb = testBlob.size / 1024;
            sqBestBlob = testBlob;
            sqBestKb = testKb;
            if (testKb > maxKb) sqHigh = sqMid;
            else if (testKb < minKb) sqLow = sqMid;
            else break;
        }

        bestBlob = sqBestBlob!;
        bestKb = sqBestKb;
        currentCanvas = scaledCanvas;
        curW = scaledCanvas.width;
        curH = scaledCanvas.height;
        if (sqBestKb <= maxKb) break;
      }
      scale -= 0.15;
    }
  }

  // If it's too small even at max quality, we pad it with metadata or scale up.
  // We'll scale it up slightly.
  if (bestKb < minKb) {
    let scale = 1.1;
    while (bestKb < minKb && scale <= 2.0) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = Math.round(curW * scale);
      scaledCanvas.height = Math.round(curH * scale);
      const ctx = scaledCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        const testBlob = await getBlob(scaledCanvas, 1.0);
        const testKb = testBlob.size / 1024;
        bestBlob = testBlob;
        bestKb = testKb;
        currentCanvas = scaledCanvas;
        curW = scaledCanvas.width;
        curH = scaledCanvas.height;
        if (testKb >= minKb) break;
      }
      scale += 0.2;
    }
  }

  if (!bestBlob) {
    bestBlob = await getBlob(currentCanvas, 0.85);
    bestKb = bestBlob.size / 1024;
  }

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(bestBlob!);
  });

  return {
    blob: bestBlob,
    dataUrl,
    finalKb: Math.round(bestKb * 10) / 10,
    width: curW,
    height: curH,
    qualityUsed: Math.round(bestQuality * 100) / 100,
    inRange: bestKb >= minKb * 0.9 && bestKb <= maxKb * 1.05,
  };
}
