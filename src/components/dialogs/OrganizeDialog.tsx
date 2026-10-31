import React from 'react';
import { X, Grid } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { PageOrganizer } from '@/components/organizer/PageOrganizer';

export const OrganizeDialog: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();

  if (activeModal !== 'organize') return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Organize PDF Pages"
    >
      <div className="w-full max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Organize, Rotate & Delete Pages</h3>
              <p className="text-xs text-gray-500">Reorder, rotate, delete, or duplicate pages in your PDF document</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-slate-100/60">
          <PageOrganizer />
        </div>
      </div>
    </div>
  );
};
