import React, { useRef } from 'react';
import { useDocumentStore } from '@/stores/documentStore';
import { FileText, X, Plus } from 'lucide-react';

interface DocumentTabBarProps {
  onOpenNewFile?: () => void;
}

export const DocumentTabBar: React.FC<DocumentTabBarProps> = ({ onOpenNewFile }) => {
  const { tabs, activeTabId, switchTab, closeTab } = useDocumentStore();
  const barRef = useRef<HTMLDivElement>(null);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  const handleAuxClick = (e: React.MouseEvent, tabId: string) => {
    // Middle click to close tab (mouse button 1)
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (barRef.current) {
      barRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      ref={barRef}
      onWheel={handleWheel}
      className="h-9 bg-slate-950/80 border-b border-slate-800 flex items-center px-2 gap-1 overflow-x-auto select-none no-scrollbar z-20"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            onAuxClick={(e) => handleAuxClick(e, tab.id)}
            className={`group relative flex items-center gap-2 px-3 py-1 text-xs rounded-t-md border-t-2 transition-all cursor-pointer max-w-[200px] min-w-[120px] ${
              isActive
                ? 'bg-slate-900 border-swift-500 text-slate-100 font-medium shadow-sm'
                : 'bg-slate-950/50 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
            title={`${tab.fileName} (Middle-click to close)`}
          >
            <FileText
              className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                isActive ? 'text-swift-400' : 'text-slate-500 group-hover:text-slate-400'
              }`}
            />
            <span className="truncate flex-1">
              {tab.fileName}
            </span>
            {tab.isDirty && (
              <span className="text-amber-400 font-bold text-xs" title="Unsaved changes">
                *
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
              title="Close Tab (Ctrl+W)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}

      {onOpenNewFile && (
        <button
          onClick={onOpenNewFile}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors ml-1"
          title="Open Another PDF into New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
