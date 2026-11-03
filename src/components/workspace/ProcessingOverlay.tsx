import React from 'react';
import { Loader2 } from 'lucide-react';
import { ProcessingProgress } from '../../types/pdf';

interface ProcessingOverlayProps {
  progress: ProcessingProgress;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ progress }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl text-center space-y-6 border border-slate-100">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" 
          />
          <Loader2 size={32} className="text-indigo-600 animate-pulse" />
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900">Crafting your document...</h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
            {progress.message || 'Processing in-browser client-side...'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-600 to-violet-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-400">
            <span>Progress</span>
            <span>{Math.round(progress.percent)}%</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Running 100% locally in your browser RAM. No data ever leaves your device.
        </p>
      </div>
    </div>
  );
};
