import React from 'react';
import {
  FileText,
  Lock,
  RotateCcw,
  Download,
  Eye,
  EyeOff,
  CheckSquare,
  Type,
  ListFilter,
  Layers,
} from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import { useUIStore } from '@/stores/uiStore';
import { getPDFEngine } from '@core/pdf/engine.factory';

export const FormFieldsTab: React.FC = () => {
  const {
    documentId,
    formFields,
    highlightFormFields,
    toggleHighlightFormFields,
    updateFormField,
    flattenDocumentForms,
    clearAllForms,
    setCurrentPage,
    fileName,
  } = useDocumentStore();

  const { addToast } = useUIStore();

  if (!documentId) return null;

  const handleFlatten = async () => {
    if (!window.confirm('Flattening will permanently burn filled form data into the document content. This prevents further editing. Continue?')) {
      return;
    }
    try {
      await flattenDocumentForms();
      addToast({
        type: 'success',
        title: 'Forms Flattened',
        message: 'All form fields have been converted to permanent page text.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Flattening Failed', message: err?.message });
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Reset all form fields to blank?')) return;
    try {
      await clearAllForms();
      addToast({
        type: 'info',
        title: 'Form Fields Cleared',
        message: 'All field values have been reset.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Clear Failed', message: err?.message });
    }
  };

  const handleExportJSON = async () => {
    try {
      const engine = getPDFEngine();
      const data = await engine.exportFormData(documentId);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName ? fileName.replace(/\.[^/.]+$/, '') : 'document'}_form_data.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        title: 'Form Data Exported',
        message: 'Saved form values as JSON.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Export Failed', message: err?.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 text-slate-200 text-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-swift-400" />
          <span className="font-semibold text-slate-200">Interactive Forms</span>
          <span className="bg-slate-800 text-swift-400 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
            {formFields.length}
          </span>
        </div>

        <button
          onClick={toggleHighlightFormFields}
          className={`p-1 rounded transition-colors flex items-center gap-1 ${
            highlightFormFields
              ? 'bg-swift-500/20 text-swift-400 hover:bg-swift-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={highlightFormFields ? 'Hide Field Highlights on Canvas' : 'Show Field Highlights on Canvas'}
        >
          {highlightFormFields ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
      </div>

      {formFields.length === 0 ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <Layers className="w-10 h-10 text-slate-600 mb-3" />
          <p className="font-medium text-slate-300 mb-1">No Form Fields Found</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            This PDF does not contain interactive AcroForm inputs. You can still use the toolbar text tool to insert content anywhere.
          </p>
        </div>
      ) : (
        <>
          {/* Action Ribbon */}
          <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-1.5">
            <button
              onClick={handleFlatten}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1 transition-colors"
              title="Permanently burn values into page content (Flatten)"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Flatten</span>
            </button>
            <button
              onClick={handleClear}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1 transition-colors"
              title="Clear all fields"
            >
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1 transition-colors"
              title="Download filled data as JSON"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export</span>
            </button>
          </div>

          {/* Form Fields List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {formFields.map((field, idx) => {
              return (
                <div
                  key={`${field.name}_${idx}`}
                  className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200 truncate flex items-center gap-1.5" title={field.name}>
                      {field.type === 'checkbox' ? (
                        <CheckSquare className="w-3 h-3 text-swift-400 shrink-0" />
                      ) : field.type === 'dropdown' ? (
                        <ListFilter className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Type className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">{field.name}</span>
                    </span>

                    <button
                      onClick={() => setCurrentPage(field.pageIndex + 1)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 hover:bg-swift-600 text-slate-300 hover:text-white transition-colors shrink-0"
                      title={`Jump to Page ${field.pageIndex + 1}`}
                    >
                      P.{field.pageIndex + 1}
                    </button>
                  </div>

                  {/* Field Input Widget */}
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(e) => updateFormField(field.name, e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-swift-500 focus:ring-swift-500 w-3.5 h-3.5"
                      />
                      <span className="text-slate-400 text-[11px]">
                        {field.value ? 'Checked' : 'Unchecked'}
                      </span>
                    </label>
                  ) : field.type === 'dropdown' ? (
                    <select
                      value={String(field.value)}
                      onChange={(e) => updateFormField(field.name, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-swift-500 text-[11px]"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={String(field.value || '')}
                      onChange={(e) => updateFormField(field.name, e.target.value)}
                      placeholder="Type value..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-swift-500 text-[11px]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
