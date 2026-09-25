import React, { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useDocumentStore } from '@/stores/documentStore';
import { extractTableFromPage, extractTableFromPages, ExtractedTableData } from '@core/pdf/table-extractor';
import { Table, Copy, Download, Check, X, RefreshCw, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { NoDocumentState } from '@/components/common/NoDocumentState';

export const TableExtractDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeView, addToast } = useUIStore();
  const { documentId, currentPage, pageCount, fileName, closeCurrentDocument } = useDocumentStore();

  const [scopeMode, setScopeMode] = useState<'current' | 'all'>('current');
  const [selectedPage, setSelectedPage] = useState<number>(currentPage || 1);
  const [tableData, setTableData] = useState<ExtractedTableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setTableData(null);
    setActiveModal(null);
    if (activeView === 'home') {
      closeCurrentDocument();
    }
  };

  useEffect(() => {
    if (activeModal === 'extract-table' && documentId) {
      if (scopeMode === 'current') {
        loadTable(selectedPage);
      } else {
        loadAllTables();
      }
    }
  }, [activeModal, selectedPage, scopeMode, documentId]);

  const loadTable = async (pageNum: number) => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const data = await extractTableFromPage(documentId, pageNum - 1);
      setTableData(data);
    } catch (err: any) {
      console.error('Table extraction error:', err);
      addToast({ type: 'error', title: 'Extraction Error', message: err?.message || 'Could not extract tables.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllTables = async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const allIndices = Array.from({ length: pageCount }, (_, i) => i);
      const data = await extractTableFromPages(documentId, allIndices);
      setTableData(data);
    } catch (err: any) {
      console.error('Multi-page table extraction error:', err);
      addToast({ type: 'error', title: 'Extraction Error', message: err?.message || 'Could not extract tables across document.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (activeModal !== 'extract-table') return null;

  const handleCopyExcel = async () => {
    if (!tableData || !tableData.tsv) return;
    try {
      await navigator.clipboard.writeText(tableData.tsv);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Table Copied',
        message: 'Paste directly into Excel or Google Sheets (Ctrl+V).',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ type: 'error', title: 'Copy Failed' });
    }
  };

  const handleDownloadCsv = () => {
    if (!tableData || !tableData.csv) return;
    const blob = new Blob(['\uFEFF' + tableData.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scopeMode === 'current' ? `Page_${selectedPage}_Table.csv` : `${fileName || 'Document'}_All_Tables.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'CSV Downloaded', message: `Exported ${tableData.rowCount} rows.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Table Extract Dialog">
      <div className="bg-[#000000] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#000000]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-swift-500/10 rounded-xl text-swift-400 border border-swift-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-base">PDF Table Extractor to Excel & CSV</h2>
              <p className="text-xs text-slate-400">
                Reconstruct tabular data from document text coordinates and export cleanly.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!documentId ? (
          <NoDocumentState
            toolName="Table Extractor"
            description="Please select a PDF document first to extract structured tables to Excel or CSV."
            icon={Table}
            actionText="Select PDF to Extract"
          />
        ) : (
          <>
            {/* Page Selector & Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-[#000000]/40 border-b border-slate-800 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Scope Mode Segmented Button */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
              <button
                onClick={() => setScopeMode('current')}
                className={`px-3 py-1 rounded-md transition-all font-medium ${
                  scopeMode === 'current'
                    ? 'bg-swift-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Page {selectedPage}
              </button>
              <button
                onClick={() => setScopeMode('all')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-medium ${
                  scopeMode === 'all'
                    ? 'bg-swift-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Pages ({pageCount})</span>
              </button>
            </div>

            {scopeMode === 'current' && (
              <div className="flex items-center gap-1">
                <button
                  disabled={selectedPage <= 1}
                  onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                  className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-medium px-1 text-slate-200">
                  {selectedPage} / {pageCount}
                </span>
                <button
                  disabled={selectedPage >= pageCount}
                  onClick={() => setSelectedPage((p) => Math.min(pageCount, p + 1))}
                  className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded text-slate-300"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={() => (scopeMode === 'current' ? loadTable(selectedPage) : loadAllTables())}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white ml-1 border border-transparent hover:border-slate-700"
              title="Refresh extraction"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-swift-400' : ''}`} />
            </button>
          </div>

          {tableData && tableData.rowCount > 0 && (
            <div className="text-xs text-slate-400 font-mono">
              Detected: <span className="text-swift-400 font-semibold">{tableData.rowCount}</span> rows ×{' '}
              <span className="text-swift-400 font-semibold">{tableData.colCount}</span> columns
            </div>
          )}
        </div>

        {/* Table Content Preview */}
        <div className="flex-1 overflow-auto p-6 bg-[#000000]/70">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-swift-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Analyzing page text coordinates & clustering grid...</p>
            </div>
          ) : !tableData || tableData.rowCount === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Table className="w-10 h-10 stroke-1" />
              <p className="text-sm font-medium">No distinct tabular data detected on Page {selectedPage}</p>
              <p className="text-xs max-w-sm text-center text-slate-600">
                Try switching to a page containing tables, receipts, or invoices.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-hidden shadow-inner max-w-full">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300">
                    <th className="p-2 w-10 text-center text-slate-500 border-r border-slate-700/60 font-semibold">
                      #
                    </th>
                    {tableData.rows[0].map((_, colIdx) => (
                      <th
                        key={colIdx}
                        className="p-2.5 font-semibold text-slate-200 border-r border-slate-700/60 last:border-r-0"
                      >
                        Col {colIdx + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-[#000000]/40">
                  {tableData.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx === 0 ? 'bg-slate-800/30 font-semibold text-slate-200' : 'hover:bg-slate-800/20 text-slate-300'}
                    >
                      <td className="p-2 text-center text-slate-500 border-r border-slate-800 bg-[#000000]/60">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 border-r border-slate-800/60 last:border-r-0 truncate max-w-xs">
                          {cell || <span className="text-slate-600 italic">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#000000]/80">
          <button
            onClick={() => {
              setTableData(null);
              setActiveModal(null);
            }}
            className="px-4 py-2 hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              disabled={!tableData || tableData.rowCount === 0}
              onClick={handleCopyExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              title="Copy TSV directly into Excel / Google Sheets"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy for Excel'}</span>
            </button>

            <button
              disabled={!tableData || tableData.rowCount === 0}
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-4 py-2 bg-swift-600 hover:bg-swift-500 disabled:opacity-40 rounded-xl text-xs font-medium text-white shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .CSV</span>
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TableExtractDialog;
