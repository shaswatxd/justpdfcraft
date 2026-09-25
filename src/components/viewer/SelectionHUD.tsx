import React, { useState } from 'react';
import { Underline, Strikethrough, Copy, Check, Edit3, Search, Volume2 } from 'lucide-react';
import { useToolStore } from '@/stores/toolStore';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { useTTSStore } from '@/stores/ttsStore';

export interface SelectionHUDProps {
  position: { x: number; y: number } | null;
  selectedText: string;
  onClearSelection: () => void;
  onApplyMarkup?: (type: 'highlight' | 'underline' | 'strikethrough', color: string) => void;
  onEditInPlace?: () => void;
}

export const SelectionHUD: React.FC<SelectionHUDProps> = ({
  position,
  selectedText,
  onClearSelection,
  onApplyMarkup,
  onEditInPlace,
}) => {
  const { setCurrentTool, setColor } = useToolStore();
  const { setSearchQuery, executeSearch } = useDocumentStore();
  const { setSidebarTab, addToast } = useUIStore();
  const { playText, setTTSOpen } = useTTSStore();
  const [copied, setCopied] = useState(false);

  if (!position || !selectedText.trim()) {
    return null;
  }

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(selectedText);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = selectedText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      addToast({ type: 'success', title: 'Text Copied', message: `Copied ${selectedText.length} characters` });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast({ type: 'error', title: 'Copy Failed' });
    }
  };

  const handleSearch = () => {
    setSearchQuery(selectedText.trim());
    executeSearch(selectedText.trim());
    setSidebarTab('search');
    onClearSelection();
  };

  const handleHighlight = (c: string) => {
    setColor(c);
    if (onApplyMarkup) {
      onApplyMarkup('highlight', c);
    } else {
      setCurrentTool('highlight');
    }
    onClearSelection();
  };

  const handleUnderline = () => {
    if (onApplyMarkup) {
      onApplyMarkup('underline', '#0284c7');
    } else {
      setCurrentTool('underline');
    }
    onClearSelection();
  };

  const handleStrike = () => {
    if (onApplyMarkup) {
      onApplyMarkup('strikethrough', '#ef4444');
    } else {
      setCurrentTool('strikethrough');
    }
    onClearSelection();
  };

  const handleEdit = () => {
    setCurrentTool('edit_text');
    if (onEditInPlace) {
      onEditInPlace();
    }
    onClearSelection();
  };

  const handleSpeak = () => {
    setTTSOpen(true);
    playText(selectedText);
    addToast({
      type: 'info',
      title: 'Reading Selection',
      message: `Reading ${selectedText.length} characters aloud...`,
    });
    onClearSelection();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
      className="z-50 flex items-center gap-1 bg-black/95 backdrop-blur-md border border-slate-700/80 px-2 py-1.5 rounded-xl shadow-2xl animate-scale-in text-slate-200 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quick Color Highlighting */}
      <div className="flex items-center gap-1 pr-1.5 border-r border-slate-700/80">
        <button
          onClick={() => handleHighlight('#eab308')}
          className="w-4 h-4 rounded-full bg-yellow-400 hover:scale-125 transition-transform border border-yellow-200/40"
          title="Highlight Yellow"
        />
        <button
          onClick={() => handleHighlight('#22c55e')}
          className="w-4 h-4 rounded-full bg-green-500 hover:scale-125 transition-transform border border-green-200/40"
          title="Highlight Green"
        />
        <button
          onClick={() => handleHighlight('#38bdf8')}
          className="w-4 h-4 rounded-full bg-sky-400 hover:scale-125 transition-transform border border-sky-200/40"
          title="Highlight Blue"
        />
        <button
          onClick={() => handleHighlight('#ec4899')}
          className="w-4 h-4 rounded-full bg-pink-500 hover:scale-125 transition-transform border border-pink-200/40"
          title="Highlight Pink"
        />
      </div>

      {/* Underline */}
      <button
        onClick={handleUnderline}
        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        title="Underline"
      >
        <Underline className="w-3.5 h-3.5" />
      </button>

      {/* Strikethrough */}
      <button
        onClick={handleStrike}
        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-3.5 bg-slate-700/80 mx-0.5" />

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-200 transition-colors"
        title="Copy Selected Text"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {/* Search in Doc */}
      <button
        onClick={handleSearch}
        className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
        title="Find in Document"
      >
        <Search className="w-3.5 h-3.5" />
      </button>

      {/* Read Aloud Selection */}
      <button
        onClick={handleSpeak}
        className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded-lg text-xs font-medium text-swift-400 hover:text-swift-300 transition-colors"
        title="Listen to selection read aloud"
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span className="text-[11px]">Listen</span>
      </button>

      {/* Direct In-Place Edit */}
      <button
        onClick={handleEdit}
        className="flex items-center gap-1 px-2 py-1 bg-swift-600/80 hover:bg-swift-600 rounded-lg text-[11px] font-medium text-white transition-colors"
        title="Edit Text in Place"
      >
        <Edit3 className="w-3 h-3" />
        <span>Edit</span>
      </button>
    </div>
  );
};
