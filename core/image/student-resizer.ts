/**
 * SwiftEditoo Student & Exam Admission Suite Engine
 * Handles exact target KB compression, paper signature cleaning,
 * photo + signature combining, and Name/Date-of-Photo (DOP) generation.
 */

export interface ExamPreset {
  id: string;
  name: string;
  category: 'photo' | 'signature' | 'postcard' | 'combined';
  board: string;
  widthPx: number;
  heightPx: number;
  widthCm: number;
  heightCm: number;
  minKb: number;
  maxKb: number;
  notes: string;
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'ssc-photo',
    name: 'SSC CGL / CHSL / MTS — Photo',
    board: 'Staff Selection Commission (SSC)',
    category: 'photo',
    widthPx: 200,
    heightPx: 230,
    widthCm: 3.5,
    heightCm: 4.5,
    minKb: 20,
    maxKb: 50,
    notes: '20 KB to 50 KB, 3.5 x 4.5 cm. Light/white background, Name & Date required.',
  },
  {
    id: 'ssc-sign',
    name: 'SSC CGL / CHSL / MTS — Signature',
    board: 'Staff Selection Commission (SSC)',
    category: 'signature',
    widthPx: 140,
    heightPx: 60,
    widthCm: 4.0,
    heightCm: 2.0,
    minKb: 10,
    maxKb: 20,
    notes: '10 KB to 20 KB, 4.0 x 2.0 cm. Black ink on white paper, no blur.',
  },
  {
    id: 'upsc-photo',
    name: 'UPSC Civil Services / NDA — Photo',
    board: 'Union Public Service Commission (UPSC)',
    category: 'photo',
    widthPx: 350,
    heightPx: 350,
    widthCm: 3.5,
    heightCm: 4.5,
    minKb: 20,
    maxKb: 300,
    notes: '20 KB to 300 KB, min 350x350 px. Clear face, plain light background.',
  },
  {
    id: 'upsc-sign',
    name: 'UPSC Civil Services / NDA — Signature',
    board: 'Union Public Service Commission (UPSC)',
    category: 'signature',
    widthPx: 350,
    heightPx: 350,
    widthCm: 4.0,
    heightCm: 2.0,
    minKb: 20,
    maxKb: 300,
    notes: '20 KB to 300 KB. High contrast black ink on clean white background.',
  },
  {
    id: 'nta-neet-jee-photo',
    name: 'NTA NEET / JEE Main — Photo',
    board: 'National Testing Agency (NTA)',
    category: 'photo',
    widthPx: 200,
    heightPx: 260,
    widthCm: 3.5,
    heightCm: 4.5,
    minKb: 10,
    maxKb: 200,
    notes: '10 KB to 200 KB. 80% face coverage with white background, ears visible.',
  },
  {
    id: 'nta-neet-postcard',
    name: 'NTA NEET — Postcard Size Photo (4x6)',
    board: 'National Testing Agency (NTA)',
    category: 'postcard',
    widthPx: 400,
    heightPx: 600,
    widthCm: 10.16,
    heightCm: 15.24,
    minKb: 50,
    maxKb: 300,
    notes: '50 KB to 300 KB, 4x6 inches postcard size photo.',
  },
  {
    id: 'nta-sign',
    name: 'NTA NEET / JEE Main — Signature',
    board: 'National Testing Agency (NTA)',
    category: 'signature',
    widthPx: 140,
    heightPx: 60,
    widthCm: 3.5,
    heightCm: 1.5,
    minKb: 4,
    maxKb: 30,
    notes: '4 KB to 30 KB. Running handwriting in black/blue ink, not in capital letters.',
  },
  {
    id: 'ibps-photo',
    name: 'IBPS / SBI Bank PO & Clerk — Photo',
    board: 'Institute of Banking Personnel Selection',
    category: 'photo',
    widthPx: 200,
    heightPx: 230,
    widthCm: 3.5,
    heightCm: 4.5,
    minKb: 20,
    maxKb: 50,
    notes: '20 KB to 50 KB, 200x230 pixels, white background.',
  },
  {
    id: 'ibps-sign',
    name: 'IBPS / SBI Bank PO & Clerk — Signature',
    board: 'Institute of Banking Personnel Selection',
    category: 'signature',
    widthPx: 140,
    heightPx: 60,
    widthCm: 3.5,
    heightCm: 1.5,
    minKb: 10,
    maxKb: 20,
    notes: '10 KB to 20 KB, 140x60 pixels, black ink on white paper.',
  },
  {
    id: 'passport-standard',
    name: 'Standard Indian Passport Photo (3.5 x 4.5 cm)',
    board: 'Passport Seva Kendra / Govt of India',
    category: 'photo',
    widthPx: 413,
    heightPx: 531,
    widthCm: 3.5,
    heightCm: 4.5,
    minKb: 30,
    maxKb: 150,
    notes: '3.5 x 4.5 cm (300 DPI), pure white background, no reflections.',
  },
  {
    id: 'us-visa',
    name: 'US / Schengen / International Visa (2x2 inch)',
    board: 'US Dept of State / Consular Affairs',
    category: 'photo',
    widthPx: 600,
    heightPx: 600,
    widthCm: 5.08,
    heightCm: 5.08,
    minKb: 50,
    maxKb: 240,
    notes: '2x2 inches (51x51 mm), 600x600 px, plain white/off-white background.',
  },
  {
    id: 'gate-combined',
    name: 'Gate / University Combined Photo + Sign',
    board: 'IIT GATE / University Admissions',
    category: 'combined',
    widthPx: 400,
    heightPx: 550,
    widthCm: 5.0,
    heightCm: 7.0,
    minKb: 50,
    maxKb: 200,
    notes: 'Single file containing photo on top with signature neatly placed below.',
  },
];

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

  // 1. Binary search on quality between 0.05 and 0.98
  let lowQ = 0.05;
  let highQ = 0.98;
  let bestBlob: Blob | null = null;
  let bestQuality = 0.85;
  let bestKb = 0;

  for (let iter = 0; iter < 9; iter++) {
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
    while (bestKb > maxKb && scale >= 0.4) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = Math.round(curW * scale);
      scaledCanvas.height = Math.round(curH * scale);
      const ctx = scaledCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
        ctx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
        const testBlob = await getBlob(scaledCanvas, 0.75);
        const testKb = testBlob.size / 1024;
        bestBlob = testBlob;
        bestKb = testKb;
        currentCanvas = scaledCanvas;
        curW = scaledCanvas.width;
        curH = scaledCanvas.height;
        if (testKb <= maxKb) break;
      }
      scale -= 0.15;
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

export interface SignatureCleanOptions {
  threshold?: number; // 0 - 255 (default ~180)
  transparentBg?: boolean;
  inkEnhance?: 'preserve' | 'black' | 'blue';
  autoCropPadding?: number;
}

/**
 * Clean signature photographed on paper via smartphone camera:
 * - Wipes away shadows, yellowish paper tone, and uneven lighting to pure white (#FFFFFF) or transparent.
 * - Enhances faint pen ink strokes into crisp, legible dark lines.
 * - Auto-crops surrounding paper margins with customizable padding.
 */
export function cleanPaperSignature(
  sourceCanvas: HTMLCanvasElement,
  options: SignatureCleanOptions = {}
): HTMLCanvasElement {
  const {
    threshold = 185,
    transparentBg = false,
    inkEnhance = 'black',
    autoCropPadding = 16,
  } = options;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = w;
  tempCanvas.height = h;
  const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hasInk = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (lum >= threshold) {
        // Paper background
        if (transparentBg) {
          data[idx + 3] = 0; // Alpha 0
        } else {
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      } else {
        // Ink detected
        hasInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        // Enhance ink contrast
        const inkFactor = Math.max(0, lum / threshold); // 0 (darkest) to 1 (near edge)
        if (inkEnhance === 'black') {
          const darkVal = Math.round(inkFactor * 40);
          data[idx] = darkVal;
          data[idx + 1] = darkVal;
          data[idx + 2] = darkVal;
          data[idx + 3] = 255;
        } else if (inkEnhance === 'blue') {
          data[idx] = Math.round(inkFactor * 25);
          data[idx + 1] = Math.round(inkFactor * 50);
          data[idx + 2] = Math.round(110 + (1 - inkFactor) * 110); // Deep royal blue
          data[idx + 3] = 255;
        } else {
          // Preserve original ink tone but punch contrast
          data[idx] = Math.round(r * 0.7);
          data[idx + 1] = Math.round(g * 0.7);
          data[idx + 2] = Math.round(b * 0.7);
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // If no ink was found or margins are invalid, return processed canvas
  if (!hasInk || minX >= maxX || minY >= maxY) {
    return tempCanvas;
  }

  // Auto crop bounding box with padding
  const cropX = Math.max(0, minX - autoCropPadding);
  const cropY = Math.max(0, minY - autoCropPadding);
  const right = Math.min(w, maxX + autoCropPadding);
  const bottom = Math.min(h, maxY + autoCropPadding);
  const cropW = Math.max(1, right - cropX);
  const cropH = Math.max(1, bottom - cropY);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return tempCanvas;

  if (!transparentBg) {
    croppedCtx.fillStyle = '#ffffff';
    croppedCtx.fillRect(0, 0, cropW, cropH);
  }
  croppedCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return croppedCanvas;
}

export interface DOPBannerOptions {
  candidateName: string;
  dateOfPhoto: string;
  datePrefix?: string; // 'DOP: ' | 'DOB: ' | ''
  bannerHeightPercent?: number; // default ~18% of photo height
  fontFamily?: string;
  uppercase?: boolean;
}

/**
 * Adds an official white name and date of photo (DOP) banner to the bottom of the photo.
 * Standard requirement for UPSC, SSC, and various government exams.
 */
export function addNameAndDateBanner(
  sourceCanvas: HTMLCanvasElement,
  options: DOPBannerOptions
): HTMLCanvasElement {
  const {
    candidateName,
    dateOfPhoto,
    datePrefix = 'DOP: ',
    bannerHeightPercent = 18,
    fontFamily = 'Inter, Arial, sans-serif',
    uppercase = true,
  } = options;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = w;
  resultCanvas.height = h;
  const ctx = resultCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // 1. Draw source photo
  ctx.drawImage(sourceCanvas, 0, 0);

  if (!candidateName.trim() && !dateOfPhoto.trim()) {
    return resultCanvas;
  }

  // 2. Compute banner dimensions at bottom
  const bannerHeight = Math.max(48, Math.round((h * bannerHeightPercent) / 100));
  const bannerY = h - bannerHeight;

  // White background strip with top hairline border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, bannerY, w, bannerHeight);

  ctx.strokeStyle = '#cbd5e1'; // light slate border
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, bannerY);
  ctx.lineTo(w, bannerY);
  ctx.stroke();

  // Text setup
  ctx.fillStyle = '#0f172a'; // dark solid black
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const nameText = uppercase ? candidateName.trim().toUpperCase() : candidateName.trim();
  const dateFormatted = dateOfPhoto.trim() ? `${datePrefix}${dateOfPhoto.trim()}` : '';

  const maxTextWidth = Math.max(20, w - 12);

  if (nameText && dateFormatted) {
    // 2 lines: Name on top, Date below
    const fontSizeName = Math.max(12, Math.round(bannerHeight * 0.32));
    const fontSizeDate = Math.max(11, Math.round(bannerHeight * 0.28));

    ctx.font = `bold ${fontSizeName}px ${fontFamily}`;
    ctx.fillText(nameText, w / 2, bannerY + bannerHeight * 0.32, maxTextWidth);

    ctx.font = `600 ${fontSizeDate}px ${fontFamily}`;
    ctx.fillStyle = '#334155';
    ctx.fillText(dateFormatted, w / 2, bannerY + bannerHeight * 0.72, maxTextWidth);
  } else {
    // Single line centered
    const singleText = nameText || dateFormatted;
    const fontSize = Math.max(13, Math.round(bannerHeight * 0.44));
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillText(singleText, w / 2, bannerY + bannerHeight / 2, maxTextWidth);
  }

  return resultCanvas;
}

export interface CombinePhotoSignOptions {
  layout: 'stacked' | 'side-by-side' | 'bottom-box';
  signHeightPercent?: number; // default 28% of total height for stacked
  padding?: number;
  gap?: number;
  backgroundColor?: string;
  borderColor?: string;
  candidateName?: string;
  dateOfPhoto?: string;
}

/**
 * Combines a Candidate Photograph and Signature into a single standardized admission card/image.
 * Used for exam registrations that mandate one single upload containing both items.
 */
export function combinePhotoAndSignature(
  photoCanvas: HTMLCanvasElement,
  signCanvas: HTMLCanvasElement,
  options: CombinePhotoSignOptions
): HTMLCanvasElement {
  const {
    layout = 'stacked',
    padding = 12,
    gap = 8,
    backgroundColor = '#ffffff',
    borderColor = '#94a3b8',
    candidateName,
    dateOfPhoto,
  } = options;

  let basePhoto = photoCanvas;
  if (candidateName || dateOfPhoto) {
    basePhoto = addNameAndDateBanner(photoCanvas, {
      candidateName: candidateName || '',
      dateOfPhoto: dateOfPhoto || '',
    });
  }

  const resultCanvas = document.createElement('canvas');
  const ctx = resultCanvas.getContext('2d');
  if (!ctx) return photoCanvas;

  if (layout === 'stacked') {
    // Photo on top, Signature on bottom
    const totalW = Math.max(basePhoto.width, 360) + padding * 2;
    const photoDrawW = totalW - padding * 2;
    const photoDrawH = Math.round((basePhoto.height / basePhoto.width) * photoDrawW);

    const signDrawW = photoDrawW;
    // Signature box height typically ~30% of photo or ~100px
    const signBoxH = Math.max(70, Math.round(photoDrawH * 0.32));

    const totalH = padding + photoDrawH + gap + signBoxH + padding;

    resultCanvas.width = totalW;
    resultCanvas.height = totalH;

    // Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalW, totalH);

    // Outer card border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, totalW - 2, totalH - 2);

    // Draw Photo
    ctx.drawImage(basePhoto, padding, padding, photoDrawW, photoDrawH);

    // Photo bottom border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, photoDrawW, photoDrawH);

    // Draw Signature Box
    const signBoxY = padding + photoDrawH + gap;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, signBoxY, signDrawW, signBoxH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(padding, signBoxY, signDrawW, signBoxH);

    // Fit signCanvas inside signature box preserving aspect ratio
    const signScale = Math.min(
      (signDrawW - 16) / signCanvas.width,
      (signBoxH - 12) / signCanvas.height
    );
    const fitW = signCanvas.width * signScale;
    const fitH = signCanvas.height * signScale;
    const signX = padding + (signDrawW - fitW) / 2;
    const signY = signBoxY + (signBoxH - fitH) / 2;

    ctx.drawImage(signCanvas, signX, signY, fitW, fitH);
  } else if (layout === 'side-by-side') {
    // Photo on Left, Signature on Right
    const photoW = 240;
    const photoH = Math.round((basePhoto.height / basePhoto.width) * photoW);
    const signW = 200;
    const signH = photoH;

    const totalW = padding + photoW + gap + signW + padding;
    const totalH = padding + photoH + padding;

    resultCanvas.width = totalW;
    resultCanvas.height = totalH;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, totalW, totalH);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, totalW - 2, totalH - 2);

    // Draw Photo
    ctx.drawImage(basePhoto, padding, padding, photoW, photoH);

    // Draw Sign on right
    const signBoxX = padding + photoW + gap;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(signBoxX, padding, signW, signH);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(signBoxX, padding, signW, signH);

    const signScale = Math.min(
      (signW - 16) / signCanvas.width,
      (signH - 16) / signCanvas.height
    );
    const fitW = signCanvas.width * signScale;
    const fitH = signCanvas.height * signScale;
    const signX = signBoxX + (signW - fitW) / 2;
    const signY = padding + (signH - fitH) / 2;

    ctx.drawImage(signCanvas, signX, signY, fitW, fitH);
  } else {
    // bottom-box: Signature overlaid right at bottom right of photo
    const totalW = basePhoto.width;
    const totalH = basePhoto.height;
    resultCanvas.width = totalW;
    resultCanvas.height = totalH;

    ctx.drawImage(basePhoto, 0, 0);

    const boxW = Math.round(totalW * 0.55);
    const boxH = Math.round(totalH * 0.22);
    const boxX = totalW - boxW - 8;
    const boxY = totalH - boxH - 8;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    const signScale = Math.min(
      (boxW - 8) / signCanvas.width,
      (boxH - 8) / signCanvas.height
    );
    const fitW = signCanvas.width * signScale;
    const fitH = signCanvas.height * signScale;
    const signX = boxX + (boxW - fitW) / 2;
    const signY = boxY + (boxH - fitH) / 2;

    ctx.drawImage(signCanvas, signX, signY, fitW, fitH);
  }

  return resultCanvas;
}
