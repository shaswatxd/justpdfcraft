import React, { useState } from 'react';
import { Hash, X, Check, FileText } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { HeaderFooterPosition } from '@core/pdf/engine.interface';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const BatesNumberingDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeView, setActiveView, addToast } = useUIStore();
  const {
    documentId,
    pageCount,
    currentPage,
    fileName,
    filePath,
    loadDocument,
    closeCurrentDocument,
    pushHistory,
  } = useDocumentStore();

  const handleClose = () => {
    setActiveModal(null);
    if (activeView === 'home') {
      closeCurrentDocument();
    }
  };

  const [mode, setMode] = useState<'bates' | 'headerfooter'>(
    activeModal === 'page-number' ? 'headerfooter' : 'bates'
  );

  React.useEffect(() => {
    if (activeModal === 'page-number') {
      setMode('headerfooter');
    } else if (activeModal === 'bates') {
      setMode('bates');
    }
  }, [activeModal]);

  // Bates options
  const [prefix, setPrefix] = useState('CASE-');
  const [suffix, setSuffix] = useState('');
  const [startNumber, setStartNumber] = useState(1);
  const [digitsCount, setDigitsCount] = useState(6);

  // Header/Footer options
  const [hfTemplate, setHfTemplate] = useState('Page {page} of {totalPages}');

  // Common styling & positioning
  const [position, setPosition] = useState<HeaderFooterPosition>('bottom-right');
  const [fontSize, setFontSize] = useState(10);
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'TimesRoman' | 'Courier'>('Helvetica');
  const [color, setColor] = useState('#000000');
  const [margin, setMargin] = useState(24);

  // Target pages
  const [pageScope, setPageScope] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  if (activeModal !== 'bates' && activeModal !== 'page-number') return null;

  const positions: Array<{ id: HeaderFooterPosition; label: string }> = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  const colors = [
    { label: 'Black', hex: '#000000' },
    { label: 'Slate', hex: '#475569' },
    { label: 'Blue', hex: '#0C8DE9' },
    { label: 'Red', hex: '#EF4444' },
    { label: 'Green', hex: '#10B981' },
  ];

  const presets = [
    'Page {page} of {totalPages}',
    'Confidential — {date}',
    '{date} | Page {page}',
    'DO NOT DISTRIBUTE',
  ];

  // Compute sample preview string
  const getSampleText = () => {
    if (mode === 'bates') {
      const num = String(startNumber).padStart(digitsCount, '0');
      return `${prefix}${num}${suffix}`;
    }
    const now = new Date().toLocaleDateString();
    return hfTemplate
      .replace(/\{page\}/gi, String(currentPage || 1))
      .replace(/\{totalPages\}/gi, String(pageCount || 1))
      .replace(/\{date\}/gi, now);
  };

  const parsePageIndices = (): number[] | undefined => {
    if (pageScope === 'all') return undefined;
    if (pageScope === 'current') return [Math.max(0, (currentPage || 1) - 1)];

    // Parse custom range e.g. "1-3, 5"
    const indices: number[] = [];
    const parts = customRange.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const low = Math.min(start, end); const high = Math.max(start, end); for (let p = low; p <= high; p++) {
            if (p >= 1 && p <= pageCount) indices.push(p - 1);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= pageCount) {
          indices.push(p - 1);
        }
      }
    }
    return indices.length > 0 ? Array.from(new Set(indices)) : undefined;
  };

  const handleApply = async () => {
    if (!documentId) return;
    setIsApplying(true);

    try {
      const engine = getPDFEngine();
      const pageIndices = parsePageIndices();

      if (mode === 'bates') {
        await pushHistory(`Bates numbering (${prefix}...${suffix})`);
        await engine.addBatesNumbering(documentId, {
          prefix,
          suffix,
          startNumber,
          digitsCount,
          position,
          fontSize,
          fontFamily,
          color,
          margin,
          pageIndices,
        });
      } else {
        await pushHistory(`Header/Footer ("${hfTemplate}")`);
        await engine.addHeaderFooter(documentId, {
          text: hfTemplate,
          position,
          fontSize,
          fontFamily,
          color,
          margin,
          pageIndices,
        });
      }

      const updatedBytes = await engine.saveDocument(documentId);
      if (fileName) {
        await loadDocument(updatedBytes, fileName, filePath || undefined);
      }

      if (activeView === 'home') {
        setActiveView('editor');
      }
      setActiveModal(null);
      addToast({
        type: 'success',
        title: mode === 'bates' ? 'Bates Numbering Applied' : 'Header / Footer Added',
        message: `Successfully stamped across ${pageIndices ? pageIndices.length : pageCount} pages.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Operation Failed',
        message: err?.message || 'Could not apply stamps.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Bates Numbering Dialog">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-swift-500/10 text-swift-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {activeModal === 'page-number' ? 'Add Page Numbers & Headers' : 'Bates Numbering & Header/Footer'}
              </h3>
              <p className="text-xs text-gray-500">
                Compliance sequential numbering, dynamic headers, and page counters
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Bates Numbering & Header/Footer"
            description="Please select a PDF document first to apply sequential Bates numbers or headers and footers."
            icon={Hash}
            actionText="Select PDF to Stamp"
          />
        ) : (
          <>
            {/* Tab Selection */}
            <div className="flex border-b border-gray-200 bg-white/40 px-6">
          <button
            type="button"
            onClick={() => {
              setMode('bates');
              setPosition('bottom-right');
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              mode === 'bates'
                ? 'border-swift-500 text-swift-400'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Bates Numbering (Legal Indexing)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('headerfooter');
              setPosition('bottom-center');
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              mode === 'headerfooter'
                ? 'border-swift-500 text-swift-400'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Header & Footer (Page Numbers)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto">
          {/* Mode-specific Fields */}
          {mode === 'bates' ? (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Prefix</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. CASE-, EXHIBIT-"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs focus:ring-1 focus:ring-swift-500 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Suffix</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="e.g. -CONF, -PROD"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs focus:ring-1 focus:ring-swift-500 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Start Number</label>
                <input
                  type="number"
                  min={1}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs focus:ring-1 focus:ring-swift-500 outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Zero Padding (Digits)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={digitsCount}
                  onChange={(e) => setDigitsCount(Math.max(1, parseInt(e.target.value, 10) || 6))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs focus:ring-1 focus:ring-swift-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Header / Footer Text</label>
                <input
                  type="text"
                  value={hfTemplate}
                  onChange={(e) => setHfTemplate(e.target.value)}
                  placeholder="e.g. Page {page} of {totalPages}"
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs focus:ring-1 focus:ring-swift-500 outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-gray-500 block mb-1 text-[11px]">
                  Dynamic Macros (Click to insert):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHfTemplate((t) => `${t} {page}`)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-swift-400 border border-gray-300 rounded text-[11px] font-mono"
                  >
                    + {'{page}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHfTemplate((t) => `${t} {totalPages}`)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-swift-400 border border-gray-300 rounded text-[11px] font-mono"
                  >
                    + {'{totalPages}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHfTemplate((t) => `${t} {date}`)}
                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-swift-400 border border-gray-300 rounded text-[11px] font-mono"
                  >
                    + {'{date}'}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-500 block mb-1 text-[11px]">Presets:</label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setHfTemplate(p)}
                      className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors ${
                        hfTemplate === p
                          ? 'bg-red-600/30 border-swift-500 text-swift-300'
                          : 'bg-white/60 border-gray-300 text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Placement Position Grid */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1.5">
              Placement Position (6 Quadrants)
            </label>
            <div className="grid grid-cols-3 gap-2 bg-white/60 p-3 rounded-xl border border-gray-200">
              {positions.map((pos) => {
                const isSelected = position === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id)}
                    className={`py-2 px-2.5 rounded-lg border text-center font-medium text-[11px] transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-red-600 text-white border-swift-500 shadow-md ring-1 ring-swift-400'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {pos.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font & Color Styling */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Font Family</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as any)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-800 text-xs outline-none"
              >
                <option value="Helvetica">Helvetica (Sans)</option>
                <option value="TimesRoman">Times Roman (Serif)</option>
                <option value="Courier">Courier (Monospace)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-800 text-xs outline-none"
              >
                <option value="8">8 pt</option>
                <option value="9">9 pt</option>
                <option value="10">10 pt (Default)</option>
                <option value="11">11 pt</option>
                <option value="12">12 pt</option>
                <option value="14">14 pt</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Margin</label>
              <select
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value, 10))}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-800 text-xs outline-none"
              >
                <option value="16">16 pt (Compact)</option>
                <option value="20">20 pt (Standard)</option>
                <option value="24">24 pt (Generous)</option>
                <option value="32">32 pt (Spacious)</option>
              </select>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1.5">Color</label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
                    color === c.hex ? 'scale-125 border-white shadow' : 'border-gray-300 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {color === c.hex && (
                    <Check className={`w-3.5 h-3.5 ${c.hex === '#FFFFFF' ? 'text-black' : 'text-white'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Page Scope */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1.5">Page Range</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPageScope('all')}
                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  pageScope === 'all'
                    ? 'bg-red-600/30 border-swift-500 text-swift-300'
                    : 'bg-gray-50 border-gray-300 text-gray-500 hover:text-gray-800'
                }`}
              >
                All Pages ({pageCount})
              </button>
              <button
                type="button"
                onClick={() => setPageScope('current')}
                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  pageScope === 'current'
                    ? 'bg-red-600/30 border-swift-500 text-swift-300'
                    : 'bg-gray-50 border-gray-300 text-gray-500 hover:text-gray-800'
                }`}
              >
                Current Page ({currentPage})
              </button>
              <button
                type="button"
                onClick={() => setPageScope('custom')}
                className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                  pageScope === 'custom'
                    ? 'bg-red-600/30 border-swift-500 text-swift-300'
                    : 'bg-gray-50 border-gray-300 text-gray-500 hover:text-gray-800'
                }`}
              >
                Custom Range
              </button>
            </div>
            {pageScope === 'custom' && (
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8"
                className="w-full mt-2 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-gray-800 text-xs outline-none"
              />
            )}
          </div>

          {/* Live Preview Card */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                Sample Stamp Output
              </span>
              <div
                className="font-mono text-xs font-semibold mt-0.5"
                style={{ color, fontFamily: fontFamily === 'Courier' ? 'monospace' : fontFamily }}
              >
                {getSampleText()}
              </div>
            </div>
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-300 font-medium">
              Position: {positions.find((p) => p.id === position)?.label}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white/60 border-t border-gray-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:text-white hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-swift-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Applying Stamps...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply {mode === 'bates' ? 'Bates Numbers' : 'Header / Footer'}</span>
              </>
            )}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatesNumberingDialog;
