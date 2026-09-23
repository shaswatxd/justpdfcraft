import React from 'react';
import {
  Palette,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Eraser,
  ScanText,
  Ruler,
  Calendar,
  Clock,
  User,
  Globe,
} from 'lucide-react';
import { useToolStore } from '@/stores/toolStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { STAMP_PRESETS, generateStampContent } from '@/types/dynamicStamp';

export const ContextPropertiesBar: React.FC = () => {
  const {
    currentTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    dynamicStampConfig,
    setDynamicStampConfig,
    eraserRadius,
    setEraserRadius,
    measureUnit,
    setMeasureUnit,
    measureScale,
    setMeasureScale,
    stagedRedactions,
    clearStagedRedactions,
    ocrLanguage,
    setOcrLanguage,
  } = useToolStore();

  const { documentId, loadDocument, fileName, filePath, pushHistory } = useDocumentStore();
  const { addToast } = useUIStore();

  const handleApplyRedactions = async () => {
    if (!documentId || stagedRedactions.length === 0) return;

    try {
      await pushHistory(`Permanently redacted ${stagedRedactions.length} regions`);
      const engine = getPDFEngine();
      await engine.applyRedactions(documentId, stagedRedactions);
      const updatedBytes = await engine.saveDocument(documentId);

      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }
      clearStagedRedactions();

      addToast({
        type: 'success',
        title: 'Redaction Completed',
        message: 'Underlying text, streams, and pixels were permanently removed.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Redaction Failed',
        message: err?.message || 'Could not apply redactions.',
      });
    }
  };

  const presetColors = [
    '#0C8DE9', // Swift Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#000000', // Black
    '#FFFFFF', // White
  ];

  const highlightColors = [
    { label: 'Yellow', color: '#FACC15' },
    { label: 'Green', color: '#4ADE80' },
    { label: 'Cyan', color: '#38BDF8' },
    { label: 'Pink', color: '#F472B6' },
    { label: 'Orange', color: '#FB923C' },
  ];

  return (
    <div className="bg-slate-850 border-b border-slate-800 px-4 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3">
      {/* Tool Context Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Text Options */}
        {currentTool === 'text' && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Text Font:</span>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value="Helvetica">Helvetica (Sans)</option>
              <option value="TimesRoman">Times Roman (Serif)</option>
              <option value="Courier">Courier (Mono)</option>
            </select>

            <span className="text-slate-400 font-medium ml-2">Size:</span>
            <input
              type="number"
              min={8}
              max={72}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-16 text-slate-200"
            />
          </div>
        )}

        {/* Dedicated Highlighter Colors */}
        {currentTool === 'highlight' && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Highlighter:</span>
            <div className="flex items-center gap-1.5">
              {highlightColors.map((hc) => (
                <button
                  key={hc.color}
                  onClick={() => setColor(hc.color)}
                  style={{ backgroundColor: hc.color }}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    color === hc.color ? 'scale-125 border-white shadow' : 'border-slate-700 hover:scale-110'
                  }`}
                  title={hc.label}
                />
              ))}
            </div>

            <span className="text-slate-400 font-medium ml-2">Opacity:</span>
            <input
              type="range"
              min={0.15}
              max={0.6}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-16 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-slate-400">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        {/* Dedicated Dynamic Rubber Stamp Controls */}
        {currentTool === 'stamp' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Stamp:</span>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {STAMP_PRESETS.map((sp) => {
                const isSelected = dynamicStampConfig.preset === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => {
                      setDynamicStampConfig({
                        preset: sp.id,
                        color: sp.color,
                        style: sp.style,
                        includeDate: sp.defaultIncludeDate ?? dynamicStampConfig.includeDate,
                      });
                      setColor(sp.color);
                    }}
                    style={{
                      borderColor: sp.color,
                      color: isSelected ? '#FFFFFF' : sp.color,
                      backgroundColor: isSelected ? sp.color : 'transparent',
                    }}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide transition-all shadow-sm flex items-center gap-1 ${
                      sp.style === 'flag' ? 'border-dashed' : 'border'
                    }`}
                  >
                    <span>{sp.label}</span>
                    {sp.style === 'flag' && <span className="text-[9px]">▶</span>}
                  </button>
                );
              })}
            </div>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Date & Time Options */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() =>
                  setDynamicStampConfig({ includeDate: !dynamicStampConfig.includeDate })
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  dynamicStampConfig.includeDate
                    ? 'bg-swift-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Include dynamic real-time date on stamp"
              >
                <Calendar className="w-3 h-3" />
                <span>Date</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDynamicStampConfig({ includeTime: !dynamicStampConfig.includeTime })
                }
                disabled={!dynamicStampConfig.includeDate}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  dynamicStampConfig.includeTime && dynamicStampConfig.includeDate
                    ? 'bg-swift-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-30'
                }`}
                title="Include dynamic timestamp on stamp"
              >
                <Clock className="w-3 h-3" />
                <span>Time</span>
              </button>
            </div>

            {/* Signer / Department Name Input */}
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5">
              <User className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Signer / Dept"
                value={dynamicStampConfig.signerName}
                onChange={(e) => setDynamicStampConfig({ signerName: e.target.value })}
                className="bg-transparent text-slate-200 placeholder-slate-500 text-[11px] w-24 focus:outline-none"
              />
            </div>

            {/* Live Stamp Content Preview */}
            {(() => {
              const preview = generateStampContent(dynamicStampConfig, new Date());
              return (
                <div
                  className="px-2 py-0.5 rounded border text-[10px] font-mono font-semibold flex items-center gap-1.5 select-none"
                  style={{
                    borderColor: `${dynamicStampConfig.color || color}60`,
                    backgroundColor: `${dynamicStampConfig.color || color}15`,
                    color: dynamicStampConfig.color || color,
                  }}
                  title="Live preview of the dynamic stamp placed on click"
                >
                  <span className="font-bold">{preview.title}</span>
                  {preview.subtitle1 && <span className="opacity-80 font-normal">| {preview.subtitle1}</span>}
                  {preview.subtitle2 && <span className="opacity-80 font-normal">| {preview.subtitle2}</span>}
                </div>
              );
            })()}

            <span className="text-slate-500 text-[10px]">Click page to stamp</span>
          </div>
        )}

        {/* Shape / Line / Drawing Stroke Options */}
        {['draw', 'rectangle', 'circle', 'line', 'arrow', 'underline', 'strikethrough'].includes(currentTool) && (
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Stroke:</span>
            <input
              type="range"
              min={1}
              max={12}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 accent-swift-500 cursor-pointer"
            />
            <span className="w-4 text-center font-mono">{strokeWidth}px</span>

            <span className="text-slate-400 font-medium ml-2">Opacity:</span>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.1}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-16 accent-swift-500 cursor-pointer"
            />
            <span className="w-8 text-center font-mono">{Math.round(opacity * 100)}%</span>
          </div>
        )}

        {/* Color Palette for Shapes & Draw & Underline & Measure */}
        {['text', 'draw', 'rectangle', 'circle', 'line', 'arrow', 'underline', 'strikethrough', 'measure'].includes(currentTool) && (
          <div className="flex items-center gap-1.5 ml-2">
            <Palette className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-4 h-4 rounded-full border transition-transform ${
                  color === c ? 'scale-125 border-white shadow' : 'border-slate-600 hover:scale-110'
                }`}
              />
            ))}
          </div>
        )}

        {/* Dedicated Eraser Size Slider */}
        {currentTool === 'eraser' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-rose-400 font-semibold">
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser Size:</span>
            </div>
            <input
              type="range"
              min={6}
              max={48}
              value={eraserRadius}
              onChange={(e) => setEraserRadius(Number(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
            />
            <span className="w-8 text-center font-mono text-rose-300 font-bold">{eraserRadius * 2}px</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Hover over stroke to highlight red, click or drag to delete.
            </span>
          </div>
        )}

        {/* Architectural Dimension Measurement Controls */}
        {currentTool === 'measure' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-swift-400 font-semibold">
              <Ruler className="w-3.5 h-3.5" />
              <span>Dimension Ruler:</span>
            </div>

            <span className="text-slate-400 font-medium">Unit:</span>
            <select
              value={measureUnit}
              onChange={(e) => setMeasureUnit(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
            >
              <option value="mm">Millimeters (mm)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="in">Inches (in)</option>
              <option value="pt">Points (pt)</option>
            </select>

            <span className="text-slate-400 font-medium ml-1">Scale Ratio:</span>
            <select
              value={measureScale}
              onChange={(e) => setMeasureScale(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
            >
              <option value={1}>1:1 (Direct Document)</option>
              <option value={10}>1:10 (Architectural 10x)</option>
              <option value={50}>1:50 (Floorplan 50x)</option>
              <option value={100}>1:100 (Site Plan 100x)</option>
              <option value={200}>1:200 (Engineering 200x)</option>
              <option value={500}>1:500 (Topography 500x)</option>
            </select>

            <span className="text-slate-400 font-medium ml-1">Stroke:</span>
            <input
              type="range"
              min={1}
              max={6}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 accent-swift-500 cursor-pointer"
            />
            <span className="w-4 text-center font-mono">{strokeWidth}px</span>

            <span className="text-slate-400 text-[11px] hidden lg:inline ml-2 italic">
              Click & drag on canvas to measure distances with precision ticks.
            </span>
          </div>
        )}

        {/* Marquee Snip OCR Context Controls */}
        {currentTool === 'snip_ocr' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-swift-400 font-medium">
              <ScanText className="w-3.5 h-3.5" />
              <span>Drag selection box to extract text</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div className="flex items-center gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Language:</span>
              <select
                value={ocrLanguage}
                onChange={(e) => setOcrLanguage(e.target.value)}
                className="bg-black border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-swift-500 font-medium cursor-pointer transition-colors shadow-sm"
              >
                <option value="eng+hin">English + Hindi (हिंदी Bilingual)</option>
                <option value="hin">Hindi Only (हिंदी)</option>
                <option value="eng">English Only</option>
                <option value="spa">Spanish (Español)</option>
                <option value="fra">French (Français)</option>
                <option value="deu">German (Deutsch)</option>
                <option value="chi_sim">Chinese (简体中文)</option>
                <option value="jpn">Japanese (日本語)</option>
              </select>
            </div>
          </div>
        )}

        {/* Redact Context Banner */}
        {currentTool === 'redact' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                Click & drag to mark sensitive areas. Redaction will permanently strip underlying content.
              </span>
            </div>
            {stagedRedactions.length > 0 && (
              <span className="font-semibold text-rose-400">
                {stagedRedactions.length} marked for destruction
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Side: Redaction Execution Buttons */}
      {currentTool === 'redact' && stagedRedactions.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={clearStagedRedactions}
            className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Discard
          </button>
          <button
            onClick={handleApplyRedactions}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded shadow flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Permanently Redact ({stagedRedactions.length})
          </button>
        </div>
      )}
    </div>
  );
};
