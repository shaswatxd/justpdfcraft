import React, { useState, useRef } from 'react';
import { Stamp, X, Image as ImageIcon, Type, Upload, Trash2 } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const WatermarkDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const {
    documentId,
    pageCount,
    currentPage,
    fileName,
    filePath,
    loadDocument,
    pushHistory,
  } = useDocumentStore();

  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(54);
  const [rotation, setRotation] = useState(45);
  const [color, setColor] = useState('#EF4444');
  const [scope, setScope] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');
  const [skipCoverPage, setSkipCoverPage] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Image watermark state
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState(240);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (activeModal !== 'watermark') return null;

  const presets = ['CONFIDENTIAL', 'DRAFT', 'COPY', 'PRIVATE', 'DO NOT SHARE', 'URGENT'];
  const colors = ['#EF4444', '#0C8DE9', '#64748B', '#000000', '#F59E0B', '#10B981'];

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const parseTargetPageIndices = (): number[] => {
    if (scope === 'current') {
      return [currentPage - 1];
    }
    if (scope === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    // Custom range parsing (e.g. "1, 3, 5-8" or "2-")
    const indices: Set<number> = new Set();
    const parts = customRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : pageCount;
        if (!isNaN(start)) {
          const s = Math.max(1, start);
          const e = Math.min(pageCount, isNaN(end) ? pageCount : end);
          for (let p = s; p <= e; p++) indices.add(p - 1);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount) {
          indices.add(p - 1);
        }
      }
    }
    return indices.size > 0 ? Array.from(indices).sort((a, b) => a - b) : Array.from({ length: pageCount }, (_, i) => i);
  };

  const handleApplyWatermark = async () => {
    if (!documentId) return;
    if (mode === 'text' && !text.trim()) {
      addToast({ type: 'warning', title: 'Watermark Text Required' });
      return;
    }
    if (mode === 'image' && !logoDataUrl) {
      addToast({ type: 'warning', title: 'Logo Image Required', message: 'Please select a logo or stamp graphic.' });
      return;
    }

    setIsApplying(true);

    try {
      const pageIndices = parseTargetPageIndices();
      const engine = getPDFEngine();

      if (mode === 'image' && logoDataUrl) {
        await pushHistory('Add logo watermark');
        const res = await fetch(logoDataUrl);
        const blob = await res.blob();
        const ab = await blob.arrayBuffer();
        const imageBuffer = new Uint8Array(ab);

        await engine.addWatermark(documentId, {
          imageBuffer,
          imageMimeType: 'image/png',
          imageWidth: logoWidth,
          opacity,
          rotationDegrees: rotation,
          pageIndices,
          skipCoverPage,
        });
      } else {
        await pushHistory(`Add watermark "${text}"`);
        await engine.addWatermark(documentId, {
          text: text.trim(),
          opacity,
          fontSize,
          rotationDegrees: rotation,
          color,
          pageIndices,
          skipCoverPage,
        });
      }

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Watermark Applied',
        message: `Successfully stamped ${mode === 'image' ? 'logo' : `"${text}"`} watermark.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Watermark Failed', message: err?.message });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Watermark Dialog">
      <div className="w-full max-w-md bg-[#000000] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Document Watermark</h3>
              <p className="text-xs text-slate-400">Stamp confidential text or logos across pages</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Watermark"
            description="Please select a PDF document first to apply custom confidentiality watermarks."
            icon={Stamp}
            actionText="Select PDF to Watermark"
          />
        ) : (
          <>
            {/* Mode Switcher */}
            <div className="flex border-b border-slate-800 bg-[#000000]/40 px-6 pt-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`pb-2 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
                  mode === 'text'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Watermark</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('image')}
                className={`pb-2 px-3 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${
                  mode === 'image'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Logo / Graphic</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {mode === 'text' ? (
                <>
                  {/* Presets */}
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1.5">Preset Text</label>
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setText(p)}
                          className={`px-2.5 py-1 rounded-lg border font-semibold text-[11px] transition-colors ${
                            text === p
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Text Input */}
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1">Watermark Text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-rose-500 outline-none"
                    />
                  </div>

                  {/* Color & Font Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-300 block mb-1.5">Color</label>
                      <div className="flex gap-2 items-center">
                        {colors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full border transition-transform ${
                              color === c ? 'scale-125 border-white shadow ring-1 ring-rose-400' : 'border-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-300">Font Size</span>
                        <span className="text-slate-400 font-mono">{fontSize}pt</span>
                      </div>
                      <input
                        type="range"
                        min={24}
                        max={96}
                        step={2}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Logo Image Upload */}
                  <div>
                    <label className="font-semibold text-slate-300 block mb-1.5">Logo or Stamp Graphic</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    {!logoDataUrl ? (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-700 hover:border-rose-500/50 bg-slate-800/40 p-6 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Upload className="w-5 h-5 text-rose-400" />
                        <span className="text-xs font-semibold text-slate-300">Choose PNG / JPG Logo...</span>
                        <span className="text-[11px] text-slate-500">Transparent PNG recommended</span>
                      </div>
                    ) : (
                      <div className="border border-slate-700 bg-[#000000] rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={logoDataUrl} alt="Logo" className="max-h-12 max-w-[120px] object-contain rounded" />
                          <span className="text-xs text-slate-300 font-medium">Logo selected</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLogoDataUrl(null);
                            if (logoInputRef.current) logoInputRef.current.value = '';
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Logo Width */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold text-slate-300">Logo Size</span>
                      <span className="text-slate-400 font-mono">{logoWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={450}
                      step={10}
                      value={logoWidth}
                      onChange={(e) => setLogoWidth(parseInt(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>
                </>
              )}

              {/* Sliders: Opacity & Rotation */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-slate-300">Opacity</span>
                    <span className="text-slate-400 font-mono">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Rotation</label>
                  <select
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  >
                    <option value={45}>45° (Diagonal)</option>
                    <option value={0}>0° (Horizontal)</option>
                    <option value={90}>90° (Vertical)</option>
                    <option value={-45}>-45° (Reverse Diagonal)</option>
                  </select>
                </div>
              </div>

              {/* Page Range & Cover Page Skip */}
              <div className="pt-2 border-t border-slate-800">
                <label className="font-semibold text-slate-300 block mb-1.5">Apply Scope</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-colors ${
                      scope === 'all'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    All ({pageCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('current')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-colors ${
                      scope === 'current'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Page {currentPage}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('custom')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-colors ${
                      scope === 'custom'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {scope === 'custom' && (
                  <input
                    type="text"
                    value={customRange}
                    onChange={(e) => setCustomRange(e.target.value)}
                    placeholder="e.g. 1-3, 5, 8-end"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white mb-2"
                  />
                )}

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={skipCoverPage}
                    onChange={(e) => setSkipCoverPage(e.target.checked)}
                    className="rounded text-rose-500 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                  <span>Skip first page (e.g. Cover Page)</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#000000]/60 flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyWatermark}
                disabled={isApplying || (mode === 'text' ? !text.trim() : !logoDataUrl)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 flex items-center gap-1.5"
              >
                <Stamp className="w-3.5 h-3.5" />
                {isApplying ? 'Applying...' : 'Apply Watermark'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WatermarkDialog;
