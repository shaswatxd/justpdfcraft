import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Sparkles,
  Download,
  Copy,
  Check,
  X,
  FilePlus,
  Undo2,
  FileText,
  Upload,
  Sun,
  Contrast,
  Palette,
  Zap,
  GraduationCap,
  Thermometer,
  Coffee,
  Droplets,
  Aperture,
  Frame,
  Type,
  Maximize2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';

type AspectRatioMode = 'free' | 'passport' | '1:1' | '4:3' | '16:9' | '3:4';
type FilterType = 'normal' | 'scanner' | 'grayscale' | 'auto' | 'vivid' | 'warm' | 'cool' | 'invert' | 'dramatic' | 'faded' | 'sunset' | 'bw-high';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PhotoEditorDialog: React.FC = () => {
  const { activeModal, setActiveModal, activePhotoUrl, setActivePhotoUrl, addToast } = useUIStore();
  const {
    documentId,
    currentPage,
    pageCount,
    pageDimensions,
    fileName,
    filePath,
    loadDocument,
    pushHistory,
  } = useDocumentStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taintWarnedRef = useRef<boolean>(false);

  // Source image data
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Active adjustments
  const [brightness, setBrightness] = useState<number>(0); // -100 to 100
  const [contrastVal, setContrastVal] = useState<number>(0); // -100 to 100
  const [saturation, setSaturation] = useState<number>(0); // -100 to 100
  const [sharpness, setSharpness] = useState<number>(0); // 0 to 100
  const [temperature, setTemperature] = useState<number>(0); // -100 to 100
  const [sepia, setSepia] = useState<number>(0); // 0 to 100
  const [blur, setBlur] = useState<number>(0); // 0 to 20
  const [vignette, setVignette] = useState<number>(0); // 0 to 100
  const [border, setBorder] = useState<number>(0); // 0 to 60 (px frame)
  const [scalePct, setScalePct] = useState<number>(100); // 25 to 150 output resize
  const [photoText, setPhotoText] = useState<string>('');
  const [textSize, setTextSize] = useState<number>(10); // % of canvas min dimension
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [textPos, setTextPos] = useState<string>('bottom-right');
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');

  // Cropping state
  const [cropMode, setCropMode] = useState<AspectRatioMode>('free');
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);

  // PDF Insertion Settings
  const [insertTargetPage, setInsertTargetPage] = useState<number>(currentPage || 1);
  const [insertPlacement, setInsertPlacement] = useState<'top-right' | 'top-left' | 'center' | 'bottom-right' | 'bottom-left'>('top-right');
  const [insertSize, setInsertSize] = useState<'passport' | 'small' | 'medium' | 'large'>('passport');
  const [isInserting, setIsInserting] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);

  // Load image when activePhotoUrl changes
  useEffect(() => {
    if (activePhotoUrl) {
      const urlToClean = activePhotoUrl;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const urlToClean = activePhotoUrl;
        // Mobile stability: downscale very large photos so pixel edits stay fast
        const MAX_DIM = 2400;
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        const largest = Math.max(naturalW, naturalH);

        if (largest > MAX_DIM) {
          const ratio = MAX_DIM / largest;
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(naturalW * ratio));
          c.height = Math.max(1, Math.round(naturalH * ratio));
          const cc = c.getContext('2d');
          if (cc) {
            cc.drawImage(img, 0, 0, c.width, c.height);
            setSourceImage(c);
          } else {
            setSourceImage(img);
          }
        } else {
          setSourceImage(img);
        }

        resetAdjustments();
        if (urlToClean.startsWith('blob:')) {
          URL.revokeObjectURL(urlToClean);
        }
        setActivePhotoUrl(null);
      };
      img.onerror = () => {
        if (urlToClean.startsWith('blob:')) {
          URL.revokeObjectURL(urlToClean);
        }
        setActivePhotoUrl(null);
      };
      img.src = urlToClean;
    }
  }, [activePhotoUrl, setActivePhotoUrl]);

  useEffect(() => {
    if (currentPage) {
      setInsertTargetPage(currentPage);
    }
  }, [currentPage]);

  const resetAdjustments = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrastVal(0);
    setSaturation(0);
    setSharpness(0);
    setTemperature(0);
    setSepia(0);
    setBlur(0);
    setVignette(0);
    setBorder(0);
    setScalePct(100);
    setPhotoText('');
    setTextSize(10);
    setTextColor('#ffffff');
    setTextPos('bottom-right');
    setActiveFilter('normal');
    setIsCropping(false);
    setCropBox(null);
  };

  // Render processed image onto canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas size based on rotation + output resize (+ optional white border frame)
    const isRotated90or270 = Math.abs(rotation % 180) === 90;
    const scaleF = Math.max(0.25, Math.min(1.5, scalePct / 100));
    const baseW = Math.max(1, Math.round((isRotated90or270 ? sourceImage.height : sourceImage.width) * scaleF));
    const baseH = Math.max(1, Math.round((isRotated90or270 ? sourceImage.width : sourceImage.height) * scaleF));
    const cw = baseW + border * 2;
    const ch = baseH + border * 2;

    canvas.width = cw;
    canvas.height = ch;

    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // White frame border (ideal for passport-size photo prints)
    if (border > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
    }

    // Center transform (blur applied during draw)
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceImage, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.filter = 'none';
    ctx.restore();

    // Apply pixel-level filters & adjustments
    if (
      brightness !== 0 ||
      contrastVal !== 0 ||
      saturation !== 0 ||
      temperature !== 0 ||
      sepia > 0 ||
      activeFilter !== 'normal' ||
      sharpness > 0
    ) {
      let imgData: ImageData;
      try {
        imgData = ctx.getImageData(0, 0, cw, ch);
      } catch {
        // Tainted canvas security guard — fail gracefully instead of crashing
        if (!taintWarnedRef.current) {
          taintWarnedRef.current = true;
          addToast({
            type: 'error',
            title: 'Edit Failed',
            message: 'This image is blocked by browser security. Please upload the photo file directly.',
          });
        }
        return;
      }
      const data = imgData.data;

      const bFactor = (brightness / 100) * 255;
      const cFactor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
      const sFactor = (saturation + 100) / 100;
      const tFactor = (temperature / 100) * 40;
      const sepAmount = sepia / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Basic Brightness & Contrast
        if (brightness !== 0) {
          r = Math.min(255, Math.max(0, r + bFactor));
          g = Math.min(255, Math.max(0, g + bFactor));
          b = Math.min(255, Math.max(0, b + bFactor));
        }

        if (contrastVal !== 0) {
          r = Math.min(255, Math.max(0, cFactor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, cFactor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, cFactor * (b - 128) + 128));
        }

        // 1b. Temperature (warm/cool tint)
        if (temperature !== 0) {
          r += tFactor;
          b -= tFactor;
        }

        // 2. Saturation
        if (saturation !== 0) {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + (r - gray) * sFactor));
          g = Math.min(255, Math.max(0, gray + (g - gray) * sFactor));
          b = Math.min(255, Math.max(0, gray + (b - gray) * sFactor));
        }

        // 2b. Sepia tone blend
        if (sepia > 0) {
          const sr = 0.393 * r + 0.769 * g + 0.189 * b;
          const sg = 0.349 * r + 0.686 * g + 0.168 * b;
          const sb = 0.272 * r + 0.534 * g + 0.131 * b;
          r = r * (1 - sepAmount) + sr * sepAmount;
          g = g * (1 - sepAmount) + sg * sepAmount;
          b = b * (1 - sepAmount) + sb * sepAmount;
        }

        // 3. Preset Filters
        if (activeFilter === 'grayscale') {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        } else if (activeFilter === 'scanner') {
          // Document Scanner: High-contrast binarization with dynamic threshold
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = luminance > 140 ? 255 : Math.max(0, luminance * 0.4);
          r = g = b = val;
        } else if (activeFilter === 'auto') {
          // Auto enhance: contrast punch + slight warm vibrancy
          r = Math.min(255, r * 1.05 + 5);
          g = Math.min(255, g * 1.03);
          b = Math.min(255, b * 0.98);
        } else if (activeFilter === 'vivid') {
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + (r - gray) * 1.4));
          g = Math.min(255, Math.max(0, gray + (g - gray) * 1.4));
          b = Math.min(255, Math.max(0, gray + (b - gray) * 1.4));
        } else if (activeFilter === 'warm') {
          r = Math.min(255, r * 1.08);
          b = Math.max(0, b * 0.92);
        } else if (activeFilter === 'cool') {
          b = Math.min(255, b * 1.1);
          r = Math.max(0, r * 0.92);
        } else if (activeFilter === 'invert') {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        } else if (activeFilter === 'dramatic') {
          // S-curve high contrast punch
          const f = (v: number) => {
            const n = v / 255;
            const s = n < 0.5 ? 0.5 * Math.pow(n * 2, 1.7) : 1 - 0.5 * Math.pow((1 - n) * 2, 1.7);
            return s * 255;
          };
          r = f(r);
          g = f(g);
          b = f(b);
        } else if (activeFilter === 'faded') {
          // Lifted blacks, muted tone
          r = r * 0.82 + 34;
          g = g * 0.82 + 34;
          b = b * 0.82 + 36;
        } else if (activeFilter === 'sunset') {
          r = Math.min(255, r * 1.12 + 8);
          g = Math.min(255, g * 0.98);
          b = Math.max(0, b * 0.72);
        } else if (activeFilter === 'bw-high') {
          // Strong monochrome with contrast
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = Math.min(255, Math.max(0, (gray - 128) * 1.45 + 128));
          r = g = b = val;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imgData, 0, 0);

      // 4. Sharpness Filter via 3x3 Convolution Kernel
      if (sharpness > 0) {
        const factor = (sharpness / 100) * 1.5;
        const weights = [
          0, -factor, 0,
          -factor, 1 + 4 * factor, -factor,
          0, -factor, 0,
        ];
        applyConvolution(ctx, cw, ch, weights);
      }
    }

    // 5. Vignette (soft dark edges)
    if (vignette > 0) {
      const grd = ctx.createRadialGradient(
        cw / 2,
        ch / 2,
        Math.min(cw, ch) * 0.4,
        cw / 2,
        ch / 2,
        Math.max(cw, ch) * 0.72
      );
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, vignette / 100)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cw, ch);
    }

    // 6. Text overlay (name / date / caption)
    const textStr = photoText.trim();
    if (textStr) {
      const fontPx = Math.max(10, (textSize / 100) * Math.min(cw, ch));
      const pad = Math.max(6, fontPx * 0.5);

      const hAlign: 'top' | 'middle' | 'bottom' = textPos.startsWith('top')
        ? 'top'
        : textPos.startsWith('center')
          ? 'middle'
          : 'bottom';
      const vAlign: 'left' | 'center' | 'right' = textPos.endsWith('left')
        ? 'left'
        : textPos.endsWith('right')
          ? 'right'
          : 'center';

      ctx.font = `bold ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      ctx.textAlign = vAlign;
      ctx.textBaseline = hAlign;
      const tx = vAlign === 'left' ? pad : vAlign === 'right' ? cw - pad : cw / 2;
      const ty = hAlign === 'top' ? pad : hAlign === 'bottom' ? ch - pad : ch / 2;

      // Dark stroke behind for readability on any photo
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.72)';
      ctx.lineWidth = Math.max(2, fontPx * 0.14);
      ctx.strokeText(textStr, tx, ty);
      ctx.fillStyle = textColor;
      ctx.fillText(textStr, tx, ty);
      ctx.restore();
    }
  }, [sourceImage, rotation, flipH, flipV, brightness, contrastVal, saturation, activeFilter, sharpness, temperature, sepia, blur, vignette, border, scalePct, photoText, textSize, textColor, textPos, addToast]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Fast convolution kernel helper
  const applyConvolution = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    weights: number[]
  ) => {
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const s = src.data;
    const d = dst.data;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let r = 0, g = 0, b = 0;
        for (let cy = 0; cy < 3; cy++) {
          for (let cx = 0; cx < 3; cx++) {
            const scx = x + cx - 1;
            const scy = y + cy - 1;
            const sidx = (scy * w + scx) * 4;
            const wt = weights[cy * 3 + cx];
            r += s[sidx] * wt;
            g += s[sidx + 1] * wt;
            b += s[sidx + 2] * wt;
          }
        }
        const didx = (y * w + x) * 4;
        d[didx] = Math.min(255, Math.max(0, r));
        d[didx + 1] = Math.min(255, Math.max(0, g));
        d[didx + 2] = Math.min(255, Math.max(0, b));
        d[didx + 3] = s[didx + 3];
      }
    }
    ctx.putImageData(dst, 0, 0);
  };

  if (activeModal !== 'photo-editor') return null;

  // Initialize crop box according to aspect ratio
  const startCropping = (mode: AspectRatioMode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCropMode(mode);
    setIsCropping(true);

    const cw = canvas.width;
    const ch = canvas.height;

    let targetRatio = cw / ch;
    if (mode === 'passport') {
      targetRatio = 3.5 / 4.5; // ~0.7778 Indian & International standard passport
    } else if (mode === '1:1') {
      targetRatio = 1.0;
    } else if (mode === '4:3') {
      targetRatio = 4 / 3;
    } else if (mode === '16:9') {
      targetRatio = 16 / 9;
    } else if (mode === '3:4') {
      targetRatio = 3 / 4;
    }

    let boxW = cw * 0.8;
    let boxH = boxW / targetRatio;

    if (boxH > ch * 0.9) {
      boxH = ch * 0.8;
      boxW = boxH * targetRatio;
    }

    const boxX = (cw - boxW) / 2;
    const boxY = (ch - boxH) / 2;

    setCropBox({
      x: Math.round(boxX),
      y: Math.round(boxY),
      width: Math.round(boxW),
      height: Math.round(boxH),
    });
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !cropBox) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedData = ctx.getImageData(
      cropBox.x,
      cropBox.y,
      cropBox.width,
      cropBox.height
    );

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropBox.width;
    tempCanvas.height = cropBox.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(croppedData, 0, 0);

    const croppedUrl = tempCanvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.onload = () => {
      setSourceImage(newImg);
      setActivePhotoUrl(croppedUrl);
      setIsCropping(false);
      setCropBox(null);
      addToast({
        type: 'success',
        title: 'Crop Applied',
        message: `Cropped to ${cropBox.width} × ${cropBox.height} px.`,
      });
    };
    newImg.src = croppedUrl;
  };

  // Insert edited photo into current or target PDF page
  const handleInsertIntoPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !documentId) {
      addToast({
        type: 'warning',
        title: 'No Document Open',
        message: 'Open a PDF document first to insert this photo.',
      });
      return;
    }

    setIsInserting(true);
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const imageBuffer = new Uint8Array(arrayBuffer);

      const pageIdx = Math.max(0, Math.min(pageCount - 1, insertTargetPage - 1));
      const pageDim = pageDimensions[pageIdx] || { width: 595.28, height: 841.89 };

      // Calculate placement dimensions in PDF points
      let photoW = 100;
      let photoH = (canvas.height / canvas.width) * photoW;

      if (insertSize === 'passport') {
        photoW = 99.2; // 3.5 cm in PDF points (72pt/inch * 3.5 / 2.54)
        photoH = 127.5; // 4.5 cm in PDF points
      } else if (insertSize === 'small') {
        photoW = 120;
        photoH = (canvas.height / canvas.width) * 120;
      } else if (insertSize === 'medium') {
        photoW = 200;
        photoH = (canvas.height / canvas.width) * 200;
      } else if (insertSize === 'large') {
        photoW = Math.min(pageDim.width - 72, 320);
        photoH = (canvas.height / canvas.width) * photoW;
      }

      let posX = 36;
      let posY = 36;
      const margin = 36;

      if (insertPlacement === 'top-right') {
        posX = Math.max(margin, pageDim.width - photoW - margin);
        posY = Math.max(margin, pageDim.height - photoH - margin);
      } else if (insertPlacement === 'top-left') {
        posX = margin;
        posY = Math.max(margin, pageDim.height - photoH - margin);
      } else if (insertPlacement === 'center') {
        posX = Math.max(margin, (pageDim.width - photoW) / 2);
        posY = Math.max(margin, (pageDim.height - photoH) / 2);
      } else if (insertPlacement === 'bottom-right') {
        posX = Math.max(margin, pageDim.width - photoW - margin);
        posY = margin;
      } else if (insertPlacement === 'bottom-left') {
        posX = margin;
        posY = margin;
      }

      await pushHistory(`Insert Photo on Page ${pageIdx + 1}`);
      const engine = getPDFEngine();

      await engine.insertImage(documentId, {
        pageIndex: pageIdx,
        imageBuffer,
        mimeType: 'image/jpeg',
        x: Math.round(posX),
        y: Math.round(posY),
        width: Math.round(photoW),
        height: Math.round(photoH),
      });

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Photo Placed into PDF',
        message: `Photo successfully inserted on Page ${pageIdx + 1} (${insertPlacement}).`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Insertion Failed',
        message: err?.message || 'Could not insert photo into PDF.',
      });
    } finally {
      setIsInserting(false);
    }
  };

  const handleDownload = (format: 'png' | 'jpeg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95);
    a.download = `JustPDFCraft_Photo_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
    addToast({
      type: 'success',
      title: 'Image Saved',
      message: `Downloaded as ${a.download}`,
    });
  };

  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          addToast({
            type: 'success',
            title: 'Copied to Clipboard',
            message: 'Image ready to paste anywhere.',
          });
          setTimeout(() => setCopied(false), 2000);
        }
      });
    } catch {
      addToast({ type: 'error', title: 'Copy Failed' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setActivePhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Photo Editor Dialog">
      <div className="bg-black border-0 sm:border border-slate-800 w-full max-w-6xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Modal Header */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-black/95 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                  Photo & Document Image Studio
                </h3>
                <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium whitespace-nowrap">
                  Photo Editor & Passport ID Crop
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 truncate">
                Crop (Passport 3.5×4.5cm, 1:1, 16:9), rotate, 12 filters, tune (warm, sepia, blur, vignette, frame), add text, resize, and insert into PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setActiveModal('student-resizer')}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-semibold border border-indigo-700/60 transition-colors shrink-0"
              title="Student & Exam Resizer (Target KB, DOP)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden xs:inline sm:inline">Student Suite</span>
              <span className="xs:hidden text-[10px]">Suite</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors shrink-0"
              title="Upload new image"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">Upload Photo</span>
              <span className="sm:hidden text-[11px]">Upload</span>
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Close Dialog"
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area (2 Columns) */}
        <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Canvas Preview Area (8 Cols) */}
          <div
            ref={containerRef}
            className="lg:col-span-8 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-4 border-b lg:border-b-0 lg:border-r border-slate-800 relative select-none shrink-0"
          >
            {sourceImage ? (
              <div className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-black/40">
                <canvas
                  ref={canvasRef}
                  className="max-w-[85vw] max-h-[35vh] sm:max-h-[58vh] object-contain block"
                />

                {/* Crop Box Overlay */}
                {isCropping && cropBox && canvasRef.current && (
                  <div
                    className="absolute pointer-events-none border-2 border-purple-400 bg-purple-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-150"
                    style={{
                      left: `${(cropBox.x / canvasRef.current.width) * 100}%`,
                      top: `${(cropBox.y / canvasRef.current.height) * 100}%`,
                      width: `${(cropBox.width / canvasRef.current.width) * 100}%`,
                      height: `${(cropBox.height / canvasRef.current.height) * 100}%`,
                    }}
                  >
                    <div className="absolute top-2 left-2 bg-purple-900/90 text-purple-200 text-[11px] px-2 py-1 rounded font-mono shadow-md backdrop-blur-xs whitespace-nowrap">
                      {cropMode === 'passport' ? 'Passport (3.5 × 4.5 cm)' : `${cropBox.width} × ${cropBox.height} px`}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setActivePhotoUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }}
                className="w-full max-w-md border-2 border-dashed border-slate-700 hover:border-purple-500/60 bg-black/40 rounded-3xl p-8 flex flex-col items-center justify-center py-16 text-center space-y-3 cursor-pointer transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Crop className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Drop Image Here or Click to Browse</h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Upload an image from your computer, drag & drop, or pick one from the PDF image extractor.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Select Image File
                </button>
              </div>
            )}

            {/* Quick Canvas Floating Controls (Rotate & Reset) */}
            {sourceImage && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/95 border border-slate-700/80 rounded-full px-3 py-1.5 shadow-xl backdrop-blur-md text-xs">
                <button
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                <button
                  onClick={() => setFlipH((f) => !f)}
                  className={`p-1.5 rounded-full transition-colors ${
                    flipH ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFlipV((f) => !f)}
                  className={`p-1.5 rounded-full transition-colors ${
                    flipV ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />
                <button
                  onClick={resetAdjustments}
                  className="flex items-center gap-1 px-2 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors text-[11px]"
                  title="Reset all adjustments"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Tools & Properties Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-black flex flex-col justify-between overflow-y-auto p-5 space-y-6">
            <div className="space-y-5">
              {/* Tool Section: Aspect Ratio & Crop */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Crop className="w-3.5 h-3.5 text-purple-400" />
                    Crop & Aspect Ratio
                  </label>
                  {isCropping && (
                    <button
                      onClick={applyCrop}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Apply Crop
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => startCropping('passport')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === 'passport' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">
                      Passport
                    </span>
                    <span className="text-[10px] text-slate-400">3.5 × 4.5 cm (Govt ID)</span>
                  </button>

                  <button
                    onClick={() => startCropping('1:1')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === '1:1' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">1:1 Square</span>
                    <span className="text-[10px] text-slate-400">Avatar / Profile</span>
                  </button>

                  <button
                    onClick={() => startCropping('4:3')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === '4:3' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">4:3 Photo</span>
                    <span className="text-[10px] text-slate-400">Standard Camera</span>
                  </button>

                  <button
                    onClick={() => startCropping('16:9')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === '16:9' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">16:9 Wide</span>
                    <span className="text-[10px] text-slate-400">Widescreen banner</span>
                  </button>

                  <button
                    onClick={() => startCropping('3:4')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === '3:4' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">3:4 Portrait</span>
                    <span className="text-[10px] text-slate-400">Document Portrait</span>
                  </button>

                  <button
                    onClick={() => startCropping('free')}
                    className={`py-2 px-2 rounded-xl text-left border flex flex-col gap-0.5 transition-all ${
                      cropMode === 'free' && isCropping
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white">Freeform</span>
                    <span className="text-[10px] text-slate-400">Custom Dimensions</span>
                  </button>
                </div>
              </div>

              {/* Tool Section: Smart Filters */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  Document & Photo Filters
                </label>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'normal', label: 'Original', hint: 'No filter' },
                    { id: 'scanner', label: 'Doc Scanner', hint: 'Crisp B&W' },
                    { id: 'grayscale', label: 'Grayscale', hint: 'Mono' },
                    { id: 'auto', label: 'Auto Enhance', hint: 'Balanced' },
                    { id: 'vivid', label: 'Vivid', hint: 'Rich colors' },
                    { id: 'warm', label: 'Warm', hint: 'Warm tone' },
                    { id: 'cool', label: 'Cool', hint: 'Blue tone' },
                    { id: 'invert', label: 'Invert', hint: 'Negative' },
                    { id: 'dramatic', label: 'Dramatic', hint: 'Punchy' },
                    { id: 'faded', label: 'Faded', hint: 'Soft retro' },
                    { id: 'sunset', label: 'Sunset', hint: 'Golden sky' },
                    { id: 'bw-high', label: 'B&W Strong', hint: 'Deep mono' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setActiveFilter(f.id as FilterType)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        activeFilter === f.id
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <span className="text-[11px] block leading-tight">{f.label}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{f.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tool Section: Precision Sliders */}
              <div className="space-y-3 bg-black/60 p-3.5 rounded-xl border border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Fine Adjustments
                  </span>
                  <button
                    onClick={() => {
                      setBrightness(0);
                      setContrastVal(0);
                      setSaturation(0);
                      setSharpness(0);
                      setTemperature(0);
                      setSepia(0);
                      setBlur(0);
                      setVignette(0);
                      setBorder(0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Reset Sliders
                  </button>
                </label>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" />
                      Brightness
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Contrast className="w-3 h-3 text-cyan-400" />
                      Contrast
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{contrastVal > 0 ? `+${contrastVal}` : contrastVal}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={contrastVal}
                    onChange={(e) => setContrastVal(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Palette className="w-3 h-3 text-purple-400" />
                      Saturation
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{saturation > 0 ? `+${saturation}` : saturation}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Sharpness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      Sharpness / Clarity
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Temperature */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-orange-400" />
                      Temperature (Warm / Cool)
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{temperature > 0 ? `+${temperature}` : temperature}</span>
                  </div>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Sepia */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-600" />
                      Sepia (Vintage Tone)
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sepia}
                    onChange={(e) => setSepia(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      Blur (Soften)
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={blur}
                    onChange={(e) => setBlur(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Vignette */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Aperture className="w-3 h-3 text-violet-400" />
                      Vignette (Dark Edges)
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{vignette}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={vignette}
                    onChange={(e) => setVignette(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* White Border Frame */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Frame className="w-3 h-3 text-fuchsia-400" />
                      White Border (Passport Frame)
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{border}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={border}
                    onChange={(e) => setBorder(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Tool Section: Text on Photo */}
              <div className="space-y-2.5 p-3.5 rounded-xl border border-slate-800 bg-black/60">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-pink-400" />
                  Text on Photo
                </label>

                <input
                  type="text"
                  value={photoText}
                  onChange={(e) => setPhotoText(e.target.value)}
                  placeholder="Name, date, exam roll no..."
                  maxLength={60}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200 text-xs placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
                />

                {photoText.trim() !== '' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>Size</span>
                        <span className="font-mono text-[11px] text-slate-400">{textSize}%</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={60}
                        value={textSize}
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-300">Color</span>
                      <div className="flex items-center gap-1.5">
                        {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#facc15'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setTextColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${textColor === c ? 'border-pink-400 scale-110' : 'border-slate-600'}`}
                            style={{ backgroundColor: c }}
                            aria-label={`Text color ${c}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-300">Position</span>
                      <div className="grid grid-cols-3 gap-1 max-w-[220px]">
                        {['top-left', 'top-center', 'top-right', 'center-left', 'center-center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((p) => (
                          <button
                            key={p}
                            onClick={() => setTextPos(p)}
                            className={`py-1.5 rounded-md border text-[9px] font-medium transition-all ${
                              textPos === p
                                ? 'bg-pink-600 text-white border-pink-500'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                            }`}
                          >
                            {p.split('-').map((w) => w[0].toUpperCase()).join('')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tool Section: Output Size (Resize) */}
              <div className="space-y-2.5 p-3.5 rounded-xl border border-slate-800 bg-black/60">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  Output Size (Resize)
                </label>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Scale (aspect locked)</span>
                    <span className="font-mono text-[11px] text-slate-400">{scalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={150}
                    value={scalePct}
                    onChange={(e) => setScalePct(Number(e.target.value))}
                    className="w-full accent-swift-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
                {sourceImage && (
                  (() => {
                    const rot90 = Math.abs(rotation % 180) === 90;
                    const w0 = sourceImage.width;
                    const h0 = sourceImage.height;
                    const outW = Math.round((rot90 ? h0 : w0) * (scalePct / 100)) + border * 2;
                    const outH = Math.round((rot90 ? w0 : h0) * (scalePct / 100)) + border * 2;
                    return (
                      <p className="text-[11px] font-mono text-slate-400">
                        Final image: {outW} × {outH} px
                      </p>
                    );
                  })()
                )}
              </div>

              {/* Tool Section: Insert Back into PDF Document */}
              {documentId && (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40">
                  <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    Insert Photo into PDF
                  </label>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Target Page */}
                    <div>
                      <span className="text-slate-400 text-[11px] block mb-1">Target Page:</span>
                      <select
                        value={insertTargetPage}
                        onChange={(e) => setInsertTargetPage(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-purple-500"
                      >
                        {Array.from({ length: pageCount }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            Page {i + 1} {i + 1 === currentPage ? '(Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Position */}
                    <div>
                      <span className="text-slate-400 text-[11px] block mb-1">Position:</span>
                      <select
                        value={insertPlacement}
                        onChange={(e) => setInsertPlacement(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:border-purple-500"
                      >
                        <option value="top-right">Top-Right (Passport slot)</option>
                        <option value="top-left">Top-Left</option>
                        <option value="center">Center of Page</option>
                        <option value="bottom-right">Bottom-Right (Signature slot)</option>
                        <option value="bottom-left">Bottom-Left</option>
                      </select>
                    </div>
                  </div>

                  {/* Size Preset */}
                  <div className="pt-1">
                    <span className="text-slate-400 text-[11px] block mb-1">Print Scale:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'passport', label: 'Passport', hint: '3.5×4.5cm' },
                        { id: 'small', label: 'Small', hint: '120 pt' },
                        { id: 'medium', label: 'Medium', hint: '200 pt' },
                        { id: 'large', label: 'Large', hint: '320 pt' },
                      ].map((sz) => (
                        <button
                          key={sz.id}
                          onClick={() => setInsertSize(sz.id as any)}
                          className={`p-1.5 rounded-lg text-center border text-[11px] transition-all ${
                            insertSize === sz.id
                              ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                          }`}
                        >
                          <span className="block leading-tight">{sz.label}</span>
                          <span className="text-[9px] opacity-75 block">{sz.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleInsertIntoPDF}
                    disabled={isInserting}
                    className="w-full mt-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-lg shadow-purple-950/40 flex items-center justify-center gap-1.5"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>{isInserting ? 'Inserting...' : `Insert on Page ${insertTargetPage}`}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar: Download, Copy & Close */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDownload('jpeg')}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  title="Download as JPG image"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download JPG</span>
                </button>

                <button
                  onClick={handleCopyClipboard}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>

              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                Close Studio
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoEditorDialog;
