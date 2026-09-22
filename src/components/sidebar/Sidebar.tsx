import React, { useState, useRef, useEffect } from 'react';
import {
  Image,
  Search,
  ChevronRight,
  ChevronLeft,
  Shield,
  FileText,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
  Bookmark,
  ChevronDown,
  BookOpen,
  Plus,
  Tag,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useUIStore, SidebarTab } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { FormFieldsTab } from './tabs/FormFieldsTab';
import { getPDFEngine } from '@core/pdf/engine.factory';
import { PageDimensions, DocumentOutlineItem } from '@core/pdf/engine.interface';

interface SidebarPageThumbnailProps {
  pageIndex: number;
  isCurrent: boolean;
  documentId: string | null;
  dimensions?: PageDimensions;
  displayMode?: 'cards' | 'compact';
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onRotateCW?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const SidebarPageThumbnail: React.FC<SidebarPageThumbnailProps> = ({
  pageIndex,
  isCurrent,
  documentId,
  dimensions,
  displayMode = 'cards',
  onClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  onRotateCW,
  onDuplicate,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(pageIndex < 6 || isCurrent);

  useEffect(() => {
    if (isCurrent) {
      setIsVisible(true);
    }
  }, [isCurrent]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '350px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dims = dimensions || { width: 595.28, height: 841.89, rotation: 0 };
  const isLandscape = (dims.rotation % 180 !== 0 ? dims.height : dims.width) > (dims.rotation % 180 !== 0 ? dims.width : dims.height);

  useEffect(() => {
    if (!isVisible || !documentId || !canvasRef.current) return;
    let isCancelled = false;
    const renderThumb = async () => {
      try {
        const engine = getPDFEngine();
        // Scale 0.30 renders crisp, legible text and visual elements
        const res = await engine.renderPage(documentId, pageIndex, 0.30);
        if (isCancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = res.width;
        canvas.height = res.height;
        const ctx = canvas.getContext('2d');
        if (ctx && res.canvas) {
          ctx.drawImage(res.canvas, 0, 0);
          setIsRendered(true);
        }
      } catch (err) {
        console.warn('Sidebar thumb render warning:', err);
      }
    };
    renderThumb();
    return () => {
      isCancelled = true;
    };
  }, [isVisible, documentId, pageIndex, dims.rotation]);

  useEffect(() => {
    if (isCurrent && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isCurrent]);

  if (displayMode === 'cards') {
    return (
      <div
        ref={containerRef}
        id={`sidebar-thumb-${pageIndex + 1}`}
        data-page-index={pageIndex}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onContextMenu={onContextMenu}
        onClick={onClick}
        className={`group relative flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all ${
          isDragOver ? 'border-t-2 border-swift-400 bg-swift-500/10' : ''
        } ${
          isCurrent
            ? 'bg-swift-600/20 border-2 border-swift-500 shadow-md ring-2 ring-swift-500/30'
            : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 shadow-sm'
        }`}
      >
        {/* Crisp Page Preview Canvas */}
        <div
          className={`bg-white rounded-md border border-slate-600/60 shadow flex items-center justify-center overflow-hidden relative transition-transform duration-150 group-hover:scale-[1.01] ${
            isLandscape ? 'w-48 h-32' : 'w-36 h-48'
          }`}
        >
          <canvas
            ref={canvasRef}
            className={`max-w-full max-h-full w-auto h-auto object-contain block select-none transition-opacity duration-200 ${
              isRendered ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!isRendered && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500">
              <div className="w-5 h-5 border-2 border-swift-500 border-t-transparent rounded-full animate-spin mb-1.5" />
              <span className="font-mono text-xs font-bold text-slate-700">Page {pageIndex + 1}</span>
            </div>
          )}
        </div>

        {/* Page Tag & Actions */}
        <div className="w-full flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded-md ${
                isCurrent ? 'bg-swift-600 text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white'
              }`}
            >
              #{pageIndex + 1}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {dimensions ? `${Math.round(dimensions.width)}×${Math.round(dimensions.height)}` : 'A4'}
            </span>
          </div>

          {/* Quick Actions on Hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRotateCW && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotateCW();
                }}
                className="p-1 hover:bg-slate-700 text-slate-400 hover:text-swift-400 rounded transition-colors"
                title="Rotate 90° CW"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="p-1 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 rounded transition-colors"
                title="Duplicate page"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded transition-colors"
                title="Delete page"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact List view
  return (
    <div
      ref={containerRef}
      id={`sidebar-thumb-${pageIndex + 1}`}
      data-page-index={pageIndex}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
      onClick={onClick}
      className={`group relative flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
        isDragOver ? 'border-t-2 border-swift-400 bg-swift-500/10' : ''
      } ${
        isCurrent
          ? 'bg-swift-600/20 border border-swift-500/60 shadow-sm text-swift-400 font-medium'
          : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
      }`}
    >
      <div className="w-14 h-20 bg-white rounded-md border border-slate-600/60 flex items-center justify-center overflow-hidden shadow shrink-0 relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain block ${isRendered ? 'opacity-100' : 'opacity-0'}`}
        />
        {!isRendered && (
          <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-slate-700 text-[11px] bg-slate-100">
            {pageIndex + 1}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-xs truncate ${isCurrent ? 'text-swift-400 font-bold' : 'text-slate-100'}`}>
          Page {pageIndex + 1}
        </p>
        <p className="text-[10px] text-slate-400 font-mono">
          {dimensions ? `${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} pt` : 'A4 Standard'}
        </p>
      </div>
    </div>
  );
};

interface OutlineNodeProps {
  item: DocumentOutlineItem;
  currentPage: number;
  onNavigate: (pageIndex: number) => void;
  level?: number;
}

const OutlineNode: React.FC<OutlineNodeProps> = ({ item, currentPage, onNavigate, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.items && item.items.length > 0;
  const isSelected = item.pageIndex !== undefined && currentPage === item.pageIndex + 1;

  return (
    <div className="select-none">
      <div
        onClick={() => {
          if (item.pageIndex !== undefined) {
            onNavigate(item.pageIndex);
          }
        }}
        style={{ paddingLeft: `${level * 12 + 6}px` }}
        className={`group flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-colors ${
          isSelected
            ? 'bg-swift-600/30 text-swift-300 font-semibold border border-swift-500/30'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-3 flex justify-center text-slate-600 text-[10px]">•</span>
        )}

        <span className="flex-1 truncate text-[11px] leading-tight" title={item.title}>
          {item.title}
        </span>

        {item.pageIndex !== undefined && (
          <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400 shrink-0">
            p.{item.pageIndex + 1}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-0.5 mt-0.5">
          {item.items?.map((subItem, idx) => (
            <OutlineNode
              key={`${subItem.title}_${idx}`}
              item={subItem}
              currentPage={currentPage}
              onNavigate={onNavigate}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { isSidebarOpen, activeSidebarTab, setSidebarTab, addToast } = useUIStore();
  const {
    documentId,
    pageCount,
    currentPage,
    setCurrentPage,
    pageDimensions,
    documentOutline,
    userBookmarks,
    addUserBookmark,
    deleteUserBookmark,
    searchQuery,
    setSearchQuery,
    executeSearch,
    searchResults,
    currentSearchMatch,
    nextSearchMatch,
    prevSearchMatch,
    isSearching,
    metadata,
    fileBytes,
    formFields,
    movePage,
    rotatePage,
    deletePage,
    duplicatePage,
    viewMode,
    setSelectedPages,
  } = useDocumentStore();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageIndex: number } | null>(null);
  const [newBmTitle, setNewBmTitle] = useState('');
  const [isAddingBm, setIsAddingBm] = useState(false);
  const [thumbnailDisplayMode, setThumbnailDisplayMode] = useState<'cards' | 'compact'>('cards');

  // Close context menu on outside click
  useEffect(() => {
    const handleOutside = () => setContextMenu(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  if (!isSidebarOpen) return null;

  const totalBookmarks = (documentOutline?.length || 0) + (userBookmarks?.length || 0);

  const tabs: Array<{ id: SidebarTab; label: string; icon: any; badge?: number }> = [
    { id: 'thumbnails', label: 'Pages', icon: Image },
    { id: 'bookmarks', label: 'Outline', icon: Bookmark, badge: totalBookmarks || undefined },
    { id: 'forms', label: 'Forms', icon: FileText, badge: formFields.length },
    { id: 'search', label: 'Search', icon: Search },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localQuery);
    executeSearch(localQuery);
  };

  const handleDropReorder = async (fromIdx: number, toIdx: number) => {
    setDragOverIndex(null);
    if (fromIdx === toIdx) return;
    try {
      await movePage(fromIdx, toIdx);
      addToast({
        type: 'info',
        title: 'Page Moved',
        message: `Moved page ${fromIdx + 1} to position ${toIdx + 1}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reorder Failed',
        message: err?.message || 'Could not move page.',
      });
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col select-none z-10">
      {/* Tab Switcher */}
      <div className="h-10 border-b border-slate-800 flex items-center px-2 gap-1 bg-slate-900/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 text-[11px] font-medium transition-colors relative ${
                isActive
                  ? 'bg-slate-800 text-swift-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="bg-swift-500/30 text-swift-300 text-[9px] px-1 py-0.2 rounded-full font-mono font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 text-slate-300 text-xs">
        {/* Forms View */}
        {activeSidebarTab === 'forms' && <FormFieldsTab />}

        {/* Thumbnails View */}
        {activeSidebarTab === 'thumbnails' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Pages ({pageCount})
              </p>
              <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setThumbnailDisplayMode('cards')}
                  className={`p-1 rounded transition-colors ${
                    thumbnailDisplayMode === 'cards'
                      ? 'bg-swift-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Large Page Cards (Acrobat-style view)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailDisplayMode('compact')}
                  className={`p-1 rounded transition-colors ${
                    thumbnailDisplayMode === 'compact'
                      ? 'bg-swift-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Compact List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className={thumbnailDisplayMode === 'cards' ? 'space-y-3' : 'space-y-1.5'}>
              {Array.from({ length: pageCount }, (_, i) => {
                const isCurrent = currentPage === i + 1;
                const dims = pageDimensions[i];
                return (
                  <SidebarPageThumbnail
                    key={`thumb_${i}`}
                    pageIndex={i}
                    isCurrent={isCurrent}
                    documentId={documentId}
                    dimensions={dims}
                    displayMode={thumbnailDisplayMode}
                    onClick={() => {
                      setCurrentPage(i + 1);
                      if (viewMode === 'organize') {
                        setSelectedPages([i]);
                        const el = document.getElementById(`organizer-page-${i}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                      }
                    }}
                    onRotateCW={() => rotatePage(i, 90)}
                    onDuplicate={() => duplicatePage(i)}
                    onDelete={pageCount > 1 ? () => deletePage(i) : undefined}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({ x: e.clientX, y: e.clientY, pageIndex: i });
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIndex(i);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(fromIdx)) {
                        handleDropReorder(fromIdx, i);
                      }
                    }}
                    isDragOver={dragOverIndex === i}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Search Panel */}
        {activeSidebarTab === 'search' && (
          <div className="space-y-3">
            <form onSubmit={handleSearchSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="Find in document..."
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-swift-500 pr-7"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 text-slate-400 hover:text-swift-400"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Match Counter & Next/Prev */}
              {searchResults.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>
                    Match {currentSearchMatch + 1} of {searchResults.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={prevSearchMatch}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      title="Previous match"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={nextSearchMatch}
                      className="p-1 hover:bg-slate-800 rounded text-slate-300"
                      title="Next match"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </form>

            {isSearching && (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-swift-500 border-t-transparent rounded-full animate-spin" />
                <span>Searching full text...</span>
              </div>
            )}

            {/* Results Snippets */}
            <div className="space-y-1.5 pt-2">
              {searchResults.map((res, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCurrentPage(res.pageIndex + 1);
                    if (viewMode === 'organize') {
                      setSelectedPages([res.pageIndex]);
                      const el = document.getElementById(`organizer-page-${res.pageIndex}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }
                  }}
                  className={`p-2 rounded cursor-pointer border transition-colors ${
                    currentSearchMatch === idx
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                      : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between font-mono text-[10px] text-slate-400 mb-1">
                    <span>Page {res.pageIndex + 1}</span>
                    <span>#{idx + 1}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed">{res.textSnippet}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Outline & Bookmarks Tree */}
        {activeSidebarTab === 'bookmarks' && (
          <div className="space-y-4">
            {/* User Custom Bookmarks Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>My Bookmarks</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {userBookmarks.length} {userBookmarks.length === 1 ? 'bookmark' : 'bookmarks'}
                </span>
              </div>

              {/* Add bookmark button / form */}
              {isAddingBm ? (
                <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2 mb-2">
                  <input
                    type="text"
                    placeholder={`Title (default: Page ${currentPage})`}
                    value={newBmTitle}
                    onChange={(e) => setNewBmTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addUserBookmark(newBmTitle || `Bookmark Page ${currentPage}`, currentPage - 1);
                        setNewBmTitle('');
                        setIsAddingBm(false);
                        addToast({
                          type: 'success',
                          title: 'Bookmark Added',
                          message: `Page ${currentPage} bookmarked.`,
                        });
                      } else if (e.key === 'Escape') {
                        setIsAddingBm(false);
                      }
                    }}
                    autoFocus
                    className="w-full px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-swift-500"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingBm(false)}
                      className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addUserBookmark(newBmTitle || `Bookmark Page ${currentPage}`, currentPage - 1);
                        setNewBmTitle('');
                        setIsAddingBm(false);
                        addToast({
                          type: 'success',
                          title: 'Bookmark Added',
                          message: `Page ${currentPage} bookmarked.`,
                        });
                      }}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-swift-600 hover:bg-swift-500 text-white rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingBm(true)}
                  className="w-full py-1.5 px-2 mb-2 rounded-lg border border-dashed border-slate-700 hover:border-amber-500/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bookmark Page {currentPage}</span>
                </button>
              )}

              {/* User bookmarks list */}
              {userBookmarks.length > 0 ? (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  {userBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onClick={() => {
                        setCurrentPage(bm.pageIndex + 1);
                        if (viewMode === 'organize') {
                          setSelectedPages([bm.pageIndex]);
                          const el = document.getElementById(`organizer-page-${bm.pageIndex}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }
                      }}
                      className={`group flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        currentPage === bm.pageIndex + 1
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate text-[11px]" title={bm.title}>
                          {bm.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                          p.{bm.pageIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUserBookmark(bm.id);
                            addToast({ type: 'info', title: 'Bookmark Removed' });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded transition-opacity"
                          title="Delete bookmark"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic px-1 mb-2">
                  No personal bookmarks saved yet. Click above to bookmark page {currentPage}.
                </p>
              )}
            </div>

            {/* Outline Tree Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-swift-400" />
                  <span>Table of Contents</span>
                </h3>
                {documentOutline && documentOutline.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500">
                    {documentOutline.length} {documentOutline.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {documentOutline && documentOutline.length > 0 ? (
                <div className="space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  {documentOutline.map((item, idx) => (
                    <OutlineNode
                      key={`${item.title}_${idx}`}
                      item={item}
                      currentPage={currentPage}
                      onNavigate={(pageIdx) => {
                        setCurrentPage(pageIdx + 1);
                        if (viewMode === 'organize') {
                          setSelectedPages([pageIdx]);
                          const el = document.getElementById(`organizer-page-${pageIdx}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-center space-y-1">
                  <BookOpen className="w-5 h-5 text-slate-500 mx-auto" />
                  <p className="text-[11px] font-medium text-slate-400">No embedded outline</p>
                  <p className="text-[10px] text-slate-500">
                    This document does not contain an internal bookmark hierarchy.
                  </p>
                </div>
              )}
            </div>

            {/* Document Properties */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Document Properties
              </h3>
              <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Pages:</span>
                  <span className="font-mono text-white">{pageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">File Size:</span>
                  <span className="font-mono text-white">
                    {fileBytes ? `${(fileBytes.byteLength / 1024).toFixed(1)} KB` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">PDF Version:</span>
                  <span className="font-mono text-white">{metadata?.pdfVersion || '1.7'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Encryption:</span>
                  <span className="font-mono text-white">
                    {metadata?.isEncrypted ? 'Password Protected' : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Producer:</span>
                  <span className="truncate max-w-[120px] text-white">
                    {metadata?.producer || 'JustPDFCraft Engine'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Security & Privacy
              </h3>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Local-First Sandbox</span>
                </div>
                <p className="text-slate-400 text-[10px]">
                  Document is processed 100% on this machine. No cloud uploads or external telemetry.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 w-44 animate-scale-in text-xs"
          style={{
            left: `${Math.min(window.innerWidth - 180, contextMenu.x)}px`,
            top: `${Math.min(window.innerHeight - 200, contextMenu.y)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
            Page {contextMenu.pageIndex + 1} Actions
          </div>
          <button
            onClick={() => {
              rotatePage(contextMenu.pageIndex, 90);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors text-left"
          >
            <RotateCw className="w-3.5 h-3.5 text-swift-400" />
            <span>Rotate 90° CW</span>
          </button>
          <button
            onClick={() => {
              rotatePage(contextMenu.pageIndex, -90);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors text-left"
          >
            <RotateCcw className="w-3.5 h-3.5 text-swift-400" />
            <span>Rotate 90° CCW</span>
          </button>
          <button
            onClick={() => {
              duplicatePage(contextMenu.pageIndex);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-slate-200 transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Duplicate Page</span>
          </button>
          <button
            disabled={pageCount <= 1}
            onClick={() => {
              deletePage(contextMenu.pageIndex);
              setContextMenu(null);
            }}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
              pageCount <= 1 ? 'opacity-40 cursor-not-allowed text-slate-500' : 'hover:bg-rose-950/40 text-rose-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Page</span>
          </button>
        </div>
      )}
    </aside>
  );
};
