import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  PenTool,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Palette,
  Sparkles,
  Layers,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { useUIStore } from '@/stores/uiStore';
import { analytics } from '@/utils/analytics';

interface FontOption {
  id: string;
  name: string;
  family: string;
  category: string;
}

const FONTS: FontOption[] = [
  { id: 'caveat', name: 'Caveat', family: 'Caveat', category: 'Casual & Natural' },
  { id: 'homemade-apple', name: 'Homemade Apple', family: "'Homemade Apple'", category: 'Authentic Cursive' },
  { id: 'shadows', name: 'Shadows Into Light', family: "'Shadows Into Light'", category: 'Expressive Pen' },
  { id: 'patrick', name: 'Patrick Hand', family: "'Patrick Hand'", category: 'Clean Student Print' },
  { id: 'architects', name: 'Architects Daughter', family: "'Architects Daughter'", category: 'Stylized Architectural' },
  { id: 'gochi', name: 'Gochi Hand', family: "'Gochi Hand'", category: 'Bold Chubby Pen' },
  { id: 'reenie', name: 'Reenie Beanie', family: "'Reenie Beanie'", category: 'Quick Scratch Notes' },
  { id: 'delius', name: 'Delius', family: 'Delius', category: 'Neat Handwriting' },
];

const INK_PRESETS = [
  { name: 'Royal Blue Gel', color: '#1d3557' },
  { name: 'Black Gel Pen', color: '#111111' },
  { name: 'Teal Fountain Ink', color: '#006d77' },
  { name: 'Red Ballpoint', color: '#b7094c' },
  { name: 'Navy Blue Ink', color: '#0f4c81' },
];

const SAMPLE_TEXT = `EXPERIMENT 4: STUDY OF LOGIC GATES & VERIFICATION

Objective:
To verify the truth tables of basic and universal logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR) using digital trainer kit and TTL integrated circuits.

Apparatus Required:
1. Digital IC Trainer Kit (breadboard, +5V DC power supply)
2. IC 7408 (Quad 2-input AND gate)
3. IC 7432 (Quad 2-input OR gate)
4. IC 7404 (Hex Inverter NOT gate)
5. Connecting wires and patch cords

Theory & Principle:
Logic gates are the fundamental building blocks of digital electronic circuits. They execute Boolean logical operations on one or more binary inputs to produce a single binary output.

1. AND Gate:
Output is HIGH (1) if and only if all input signals are concurrently HIGH.
Boolean Equation: Y = A · B

2. OR Gate:
Output is HIGH if at least one input condition is HIGH.
Boolean Equation: Y = A + B

3. NOT Gate:
Performs inversion (complementation). If input is HIGH, output is LOW.
Boolean Equation: Y = A'

Procedure:
1. Place the IC on the breadboard socket carefully without bending pins.
2. Connect VCC (Pin 14) to +5V and GND (Pin 7) to power ground.
3. Wire the input toggle switches to the respective gate inputs.
4. Connect the output pin to the LED indicator.
5. Record and verify the output logic states against theoretical truth tables.`;

export const HandwritingDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const isOpen = activeModal === 'handwriting';

  // Core settings
  const [text, setText] = useState<string>(SAMPLE_TEXT);
  const [selectedFont, setSelectedFont] = useState<string>('Caveat');
  const [paperType, setPaperType] = useState<'ruled' | 'plain' | 'grid'>('ruled');
  const [inkColor, setInkColor] = useState<string>('#1d3557');
  const [fontSize, setFontSize] = useState<number>(26);
  const [lineHeight, setLineHeight] = useState<number>(40);
  const [scannerEffect, setScannerEffect] = useState<number>(50);

  // Pagination & Preview
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('');

  // Generated download state
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedInfo, setGeneratedInfo] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTimerRef = useRef<any>(null);

  // Ensure font is ready in browser
  const ensureFontLoaded = async (fontFamily: string, size = 26) => {
    try {
      const cleanFamily = fontFamily.replace(/^'|'$/g, '');
      if (document.fonts && document.fonts.load) {
        await document.fonts.load(`${size}px '${cleanFamily}'`);
      }
    } catch (e) {
      console.warn('Font loading fallback:', e);
    }
  };

  // Calculate page line splits
  const calculatePages = useCallback(
    (inputText: string, font: string, size: number, lHeight: number) => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [[]];

      const pw = 1240;
      const ph = 1754;
      const topMargin = 160;
      const bottomMargin = 100;
      const leftMargin = 150;
      const rightMargin = 100;
      const printableWidth = pw - leftMargin - rightMargin;

      ctx.font = `${size}px ${font}`;

      const paragraphs = (inputText || '').split('\n');
      const pageLines: string[][] = [];
      let curPage: string[] = [];
      const maxLines = Math.max(5, Math.floor((ph - topMargin - bottomMargin) / lHeight));

      for (const para of paragraphs) {
        if (para.trim() === '') {
          curPage.push('');
          if (curPage.length >= maxLines) {
            pageLines.push(curPage);
            curPage = [];
          }
          continue;
        }

        const words = para.split(' ');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);

          if (metrics.width > printableWidth && currentLine) {
            curPage.push(currentLine);
            if (curPage.length >= maxLines) {
              pageLines.push(curPage);
              curPage = [];
            }
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          curPage.push(currentLine);
          if (curPage.length >= maxLines) {
            pageLines.push(curPage);
            curPage = [];
          }
        }
      }

      if (curPage.length > 0) {
        pageLines.push(curPage);
      }

      return pageLines.length > 0 ? pageLines : [[]];
    },
    []
  );

  // Draw a single page on canvas with realism
  const drawPage = useCallback(
    async (
      targetCanvas: HTMLCanvasElement,
      pageLines: string[],
      seed = 42
    ) => {
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const pw = targetCanvas.width;
      const ph = targetCanvas.height;

      // 1. Natural warm paper background
      ctx.fillStyle = '#faf9f5';
      ctx.fillRect(0, 0, pw, ph);

      const topMargin = 160;
      const bottomMargin = 100;
      const leftMargin = 150;

      // 2. Paper styling
      if (paperType === 'ruled') {
        // Red vertical margin line
        ctx.beginPath();
        ctx.moveTo(140, 0);
        ctx.lineTo(140, ph);
        ctx.strokeStyle = 'rgba(255, 90, 120, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Header horizontal separator
        ctx.beginPath();
        ctx.moveTo(0, topMargin - lineHeight);
        ctx.lineTo(pw, topMargin - lineHeight);
        ctx.strokeStyle = 'rgba(255, 90, 120, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Horizontal ruled lines
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(80, 140, 240, 0.28)';
        ctx.lineWidth = 1.0;
        for (let y = topMargin; y < ph - bottomMargin; y += lineHeight) {
          ctx.moveTo(0, y);
          ctx.lineTo(pw, y);
        }
        ctx.stroke();
      } else if (paperType === 'grid') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(80, 140, 240, 0.16)';
        ctx.lineWidth = 1.0;
        const gridGap = 30;
        for (let y = gridGap; y < ph; y += gridGap) {
          ctx.moveTo(0, y);
          ctx.lineTo(pw, y);
        }
        for (let x = gridGap; x < pw; x += gridGap) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, ph);
        }
        ctx.stroke();
      }

      // Pseudo-random generator for consistent page rendering
      let s = seed;
      const pseudoRandom = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };

      // 3. Render handwriting text with human irregularities
      ctx.fillStyle = inkColor;
      ctx.font = `${fontSize}px ${selectedFont}`;
      ctx.textBaseline = 'alphabetic';

      ctx.save();
      const pageSkewAngle = (pseudoRandom() - 0.5) * 0.002;
      ctx.rotate(pageSkewAngle);

      for (let i = 0; i < pageLines.length; i++) {
        const line = pageLines[i];
        if (!line) continue;

        const y = topMargin + (i + 1) * lineHeight - 6;
        const lineYJitter = (pseudoRandom() - 0.5) * 2.0;
        const targetY = y + lineYJitter;

        let currentX = leftMargin + (pseudoRandom() - 0.5) * 3;

        const words = line.split(' ');
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          ctx.save();

          const wordRotation = (pseudoRandom() - 0.5) * 0.016;
          const wordYOffset = (pseudoRandom() - 0.5) * 1.5;

          ctx.translate(currentX, targetY + wordYOffset);
          ctx.rotate(wordRotation);

          ctx.fillText(word, 0, 0);
          ctx.restore();

          const wordWidth = ctx.measureText(word).width;
          const spaceWidth = ctx.measureText(' ').width;
          const spaceJitter = (pseudoRandom() - 0.5) * 1.5;
          currentX += wordWidth + spaceWidth + spaceJitter;
        }
      }
      ctx.restore();

      // 4. Scanner camera lighting & noise filters
      if (scannerEffect > 0) {
        const shadowIntensity = scannerEffect / 100;

        // Diagonal lighting falloff
        ctx.save();
        const shadowGrad = ctx.createLinearGradient(0, 0, pw, ph);
        shadowGrad.addColorStop(0, `rgba(10, 8, 5, ${shadowIntensity * 0.20})`);
        shadowGrad.addColorStop(0.4, `rgba(10, 8, 5, ${shadowIntensity * 0.08})`);
        shadowGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(0, 0, pw, ph);
        ctx.restore();

        // Edge vignette radial shadow
        ctx.save();
        const radialGrad = ctx.createRadialGradient(pw / 2, 0, pw * 0.3, pw / 2, ph / 2, ph * 0.8);
        radialGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        radialGrad.addColorStop(1, `rgba(0, 5, 10, ${shadowIntensity * 0.14})`);
        ctx.fillStyle = radialGrad;
        ctx.fillRect(0, 0, pw, ph);
        ctx.restore();

        // Paper grain noise
        ctx.save();
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 250;
        noiseCanvas.height = 250;
        const nCtx = noiseCanvas.getContext('2d');
        if (nCtx) {
          const nData = nCtx.createImageData(250, 250);
          const noiseLimit = Math.floor(shadowIntensity * 22);
          for (let idx = 0; idx < nData.data.length; idx += 4) {
            const val = Math.floor(pseudoRandom() * noiseLimit);
            nData.data[idx] = val;
            nData.data[idx + 1] = val;
            nData.data[idx + 2] = val;
            nData.data[idx + 3] = 16;
          }
          nCtx.putImageData(nData, 0, 0);
          const pattern = ctx.createPattern(noiseCanvas, 'repeat');
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillRect(0, 0, pw, ph);
          }
        }
        ctx.restore();
      }
    },
    [paperType, lineHeight, inkColor, fontSize, selectedFont, scannerEffect]
  );

  // Trigger preview update
  const updatePreview = useCallback(async () => {
    if (!canvasRef.current) return;

    await ensureFontLoaded(selectedFont, fontSize);
    const pages = calculatePages(text, selectedFont, fontSize, lineHeight);
    const total = pages.length;
    setTotalPages(total);

    let cur = currentPage;
    if (cur > total) cur = total;
    if (cur < 1) cur = 1;

    const pageIdx = cur - 1;
    const pageLines = pages[pageIdx] || [];

    await drawPage(canvasRef.current, pageLines, cur * 101);
  }, [selectedFont, fontSize, calculatePages, text, lineHeight, currentPage, drawPage]);

  // Debounced re-render when controls change
  useEffect(() => {
    if (!isOpen) return;
    clearTimeout(renderTimerRef.current);
    renderTimerRef.current = setTimeout(() => {
      updatePreview();
    }, 80);

    return () => clearTimeout(renderTimerRef.current);
  }, [isOpen, updatePreview]);

  // Generate Multi-page PDF
  const handleGeneratePDF = async () => {
    if (!text.trim()) {
      addToast({
        type: 'warning',
        title: 'Empty Assignment Text',
        message: 'Please enter or paste your assignment text before generating PDF.',
      });
      return;
    }

    setIsGenerating(true);
    setProgressPercent(10);
    setProgressLabel('Preparing font and layout...');

    try {
      await ensureFontLoaded(selectedFont, fontSize);
      const pages = calculatePages(text, selectedFont, fontSize, lineHeight);
      const total = pages.length;

      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < total; i++) {
        setProgressLabel(`Rendering page ${i + 1} of ${total}...`);
        setProgressPercent(Math.round(((i + 1) / total) * 90));

        const offCanvas = document.createElement('canvas');
        offCanvas.width = 1240;
        offCanvas.height = 1754;

        await drawPage(offCanvas, pages[i], (i + 1) * 101);

        const imgDataUrl = offCanvas.toDataURL('image/jpeg', 0.92);
        const imgBytes = await fetch(imgDataUrl).then((r) => r.arrayBuffer());
        const embeddedImg = await pdfDoc.embedJpg(imgBytes);

        // Standard A4 portrait in points: 595.28 x 841.89
        const pdfPage = pdfDoc.addPage([595.28, 841.89]);
        pdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: 595.28,
          height: 841.89,
        });
      }

      setProgressLabel('Compiling final PDF...');
      setProgressPercent(98);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });

      setGeneratedBlob(blob);
      setGeneratedInfo(`${total} page${total > 1 ? 's' : ''} • ${(blob.size / 1024).toFixed(1)} KB`);

      analytics.trackEvent('processing_completed', {
        toolId: 'handwriting-generator',
        pages: total,
        font: selectedFont,
        paper: paperType,
      });

      addToast({
        type: 'success',
        title: 'Assignment PDF Ready!',
        message: `Successfully generated ${total} realistic handwritten page${total > 1 ? 's' : ''}.`,
      });
    } catch (err: any) {
      console.error('Handwriting generation error:', err);
      addToast({
        type: 'error',
        title: 'Generation Failed',
        message: err.message || 'Could not render handwritten assignment.',
      });
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressLabel('');
    }
  };

  const handleDownload = () => {
    if (!generatedBlob) return;
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Handwritten_Assignment_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setText('');
    setCurrentPage(1);
    setGeneratedBlob(null);
    setGeneratedInfo('');
  };

  const handleInsertSample = () => {
    setText(SAMPLE_TEXT);
    setCurrentPage(1);
    setGeneratedBlob(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Handwriting Dialog">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-black border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-black/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Handwriting & Assignment Generator</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Student Favorite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transform typed text into authentic handwritten notes on ruled, plain, or grid paper with camera scan shadows.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Left Column: Editor & Controls */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* Assignment Text Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Assignment Content / Notes
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleInsertSample}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    Load Sample
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={9}
                placeholder="Paste or type your assignment text, lab report, experiment, or essay here..."
                className="w-full px-3.5 py-2.5 bg-black/70 border border-slate-700/80 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-500 font-mono resize-none"
              />
            </div>

            {/* Customization Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Font Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                  Handwriting Font
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full px-3 py-2 bg-black/70 border border-slate-700/80 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name} ({f.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Paper Style */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  Paper Style
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/70 border border-slate-700/80 rounded-xl">
                  {(['ruled', 'plain', 'grid'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaperType(type)}
                      className={`py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                        paperType === type
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ink Color Picker */}
            <div className="flex flex-col gap-2 p-3 bg-black/40 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-sky-400" />
                  Ink Color
                </label>
                <span className="text-xs font-mono text-slate-400 uppercase">{inkColor}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {INK_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    title={preset.name}
                    onClick={() => setInkColor(preset.color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                      inkColor === preset.color ? 'border-amber-400 scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: preset.color }}
                  >
                    {inkColor === preset.color && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-slate-400">Custom:</span>
                  <input
                    type="color"
                    value={inkColor}
                    onChange={(e) => setInkColor(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Sliders: Size, Spacing, Scanner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Font Size */}
              <div className="flex flex-col gap-1.5 p-2.5 bg-black/40 border border-slate-800 rounded-xl">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Font Size</span>
                  <span className="font-mono text-amber-400">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="40"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Line Spacing */}
              <div className="flex flex-col gap-1.5 p-2.5 bg-black/40 border border-slate-800 rounded-xl">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Line Height</span>
                  <span className="font-mono text-amber-400">{lineHeight}px</span>
                </div>
                <input
                  type="range"
                  min="32"
                  max="60"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Scanner Shadow */}
              <div className="flex flex-col gap-1.5 p-2.5 bg-black/40 border border-slate-800 rounded-xl">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Scan Shadow</span>
                  <span className="font-mono text-amber-400">{scannerEffect}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={scannerEffect}
                  onChange={(e) => setScannerEffect(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Generate & Status Action */}
            <div className="flex flex-col gap-3 mt-1">
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={isGenerating || !text.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{progressLabel || 'Rendering Pages...'}</span>
                  </>
                ) : (
                  <>
                    <PenTool className="w-5 h-5" />
                    <span>Generate Handwritten Assignment PDF</span>
                  </>
                )}
              </button>

              {/* Generation Progress Bar */}
              {isGenerating && (
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Ready Result Banner */}
              {generatedBlob && (
                <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white">Assignment PDF Generated!</div>
                      <div className="text-xs text-emerald-400/90">{generatedInfo}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Responsive Canvas Preview */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Page Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Page Container */}
            <div className="relative w-full max-h-[520px] bg-black/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-center overflow-auto shadow-inner">
              <div className="max-w-[360px] sm:max-w-[420px] w-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/50 bg-[#faf9f5]">
                <canvas
                  ref={canvasRef}
                  width={1240}
                  height={1754}
                  className="w-full h-auto block select-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-center text-slate-500">
              High-resolution 1240 × 1754 A4 rendering • Word-level natural jitter and camera scanner shadows applied
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
