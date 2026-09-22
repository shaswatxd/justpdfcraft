import React, { useEffect, useState, useCallback } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  X,
  Gauge,
  User,
  Sparkles,
} from 'lucide-react';
import { useTTSStore } from '@/stores/ttsStore';
import { useDocumentStore } from '@/stores/documentStore';
import { getPDFEngine } from '@core/pdf/engine.factory';

export const TTSPlayerHUD: React.FC = () => {
  const {
    isTTSOpen,
    isPlaying,
    isPaused,
    speechRate,
    selectedVoiceURI,
    availableVoices,
    readProgress,
    activeSnippet,
    setTTSOpen,
    setSpeechRate,
    setSelectedVoiceURI,
    loadVoices,
    playPageText,
    pause,
    resume,
    stop,
  } = useTTSStore();

  const { documentId, currentPage, pageCount, setCurrentPage } = useDocumentStore();
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [isLoadingText, setIsLoadingText] = useState(false);

  // Initialize voices on mount
  useEffect(() => {
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
      };
    }
  }, [loadVoices]);

  // Extract page text when currentPage or documentId changes
  const fetchPageText = useCallback(async () => {
    if (!documentId) return '';
    setIsLoadingText(true);
    try {
      const engine = getPDFEngine();
      const res = await engine.extractPageText(documentId, currentPage - 1);
      const text = typeof res === 'string' ? res : res?.text || '';
      setCurrentPageText(text);
      return text;
    } catch (e) {
      console.warn('Could not extract text for TTS:', e);
      setCurrentPageText('');
      return '';
    } finally {
      setIsLoadingText(false);
    }
  }, [documentId, currentPage]);

  useEffect(() => {
    if (isTTSOpen) {
      fetchPageText();
    }
  }, [isTTSOpen, currentPage, fetchPageText]);

  // Handle Play Page
  const handlePlay = async () => {
    if (isPaused) {
      resume();
      return;
    }

    let text = currentPageText;
    if (!text) {
      text = await fetchPageText();
    }

    if (!text || !text.trim()) {
      alert(`No readable text found on page ${currentPage}.`);
      return;
    }

    playPageText(text, () => {
      // Auto-advance to next page when page finishes
      if (currentPage < pageCount) {
        setCurrentPage(currentPage + 1);
      }
    });
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      stop();
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pageCount) {
      stop();
      setCurrentPage(currentPage + 1);
    }
  };

  if (!isTTSOpen || !documentId) return null;

  return (
    <div className="fixed bottom-6 right-8 z-50 animate-slide-up select-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-4 w-96 flex flex-col gap-3 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-swift-500/20 text-swift-400 rounded-lg">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                Read Aloud
                <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  Page {currentPage} of {pageCount}
                </span>
              </h4>
            </div>
          </div>
          <button
            onClick={() => setTTSOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Read Aloud HUD (Ctrl+Shift+U)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-swift-500 h-full transition-all duration-200 rounded-full"
            style={{ width: `${readProgress}%` }}
          />
        </div>

        {/* Live Reading Sentence Snippet */}
        {isPlaying && activeSnippet && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-300 italic line-clamp-2 leading-relaxed">
            "{activeSnippet}"
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-300 transition-colors"
              title="Previous Page"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {isPlaying && !isPaused ? (
              <button
                onClick={pause}
                className="p-2.5 bg-swift-600 hover:bg-swift-500 text-white rounded-xl shadow-lg transition-transform active:scale-95"
                title="Pause (Space)"
              >
                <Pause className="w-4 h-4 fill-white" />
              </button>
            ) : (
              <button
                onClick={handlePlay}
                disabled={isLoadingText}
                className="p-2.5 bg-swift-600 hover:bg-swift-500 text-white rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                title="Play Current Page"
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </button>
            )}

            <button
              onClick={stop}
              disabled={!isPlaying && !isPaused}
              className="p-2 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-300 transition-colors"
              title="Stop Reading"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= pageCount}
              className="p-2 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-slate-300 transition-colors"
              title="Next Page"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Multiplier & Voices */}
          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
              <Gauge className="w-3 h-3 text-slate-400" />
              <select
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="bg-transparent text-slate-200 outline-none font-mono text-[11px] cursor-pointer"
              >
                <option value={0.75} className="bg-slate-900">0.75x</option>
                <option value={1.0} className="bg-slate-900">1.0x</option>
                <option value={1.25} className="bg-slate-900">1.25x</option>
                <option value={1.5} className="bg-slate-900">1.5x</option>
                <option value={2.0} className="bg-slate-900">2.0x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Voice Selector */}
        {availableVoices.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px]">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedVoiceURI || ''}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="bg-transparent text-slate-300 outline-none w-full truncate cursor-pointer"
            >
              {availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-900">
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status footer */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-swift-400" />
            <span>100% Offline Speech Synthesis</span>
          </div>
          <span>Ctrl+Shift+U</span>
        </div>
      </div>
    </div>
  );
};
