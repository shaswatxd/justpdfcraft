import React, { useState, useEffect } from 'react';
import { FileSearch, Sparkles, X } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';

export const ScannedDocBanner: React.FC = () => {
  const { documentId, pageCount } = useDocumentStore();
  const { setActiveModal } = useUIStore();
  const [isScanned, setIsScanned] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(false);
    setIsScanned(false);

    if (!documentId || pageCount === 0) return;

    let isCancelled = false;
    const checkScanned = async () => {
      try {
        const engine = getPDFEngine();
        // Check first 2 pages (or total if less)
        const pagesToCheck = Math.min(2, pageCount);
        let totalChars = 0;

        for (let i = 0; i < pagesToCheck; i++) {
          const content = await engine.extractPageText(documentId, i);
          const chars = (content.text || '').replace(/\s+/g, '').length;
          totalChars += chars;
        }

        if (!isCancelled && totalChars === 0) {
          setIsScanned(true);
        }
      } catch (err) {
        console.warn('Scanned check error:', err);
      }
    };

    checkScanned();
    return () => {
      isCancelled = true;
    };
  }, [documentId, pageCount]);

  if (!isScanned || isDismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-swift-950/90 via-slate-900/95 to-swift-950/90 border-b border-swift-500/30 px-4 py-2.5 flex items-center justify-between shadow-lg z-20 animate-fade-in shrink-0">
      <div className="flex items-center gap-2.5 text-xs text-slate-200">
        <div className="p-1 rounded-lg bg-swift-500/20 text-swift-400">
          <FileSearch className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold text-white">Scanned Document Detected</span>
          <span className="text-slate-400 hidden sm:inline ml-1.5">
            — This document contains scanned images without a searchable text layer.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setActiveModal('ocr')}
          className="flex items-center gap-1.5 px-3 py-1 bg-swift-600 hover:bg-swift-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Make Searchable (Auto-OCR)</span>
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
