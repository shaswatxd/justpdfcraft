import React, { useState } from 'react';
import { Settings, X, ShieldCheck, Monitor, Zap, Command } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const SettingsDialog: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();
  const [activeSection, setActiveSection] = useState<'general' | 'privacy' | 'performance' | 'shortcuts'>('general');

  if (activeModal !== 'settings') return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Settings Dialog">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-swift-500/10 text-swift-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Application Settings</h3>
              <p className="text-xs text-gray-500">Configure JustPDFCraft web workspace and local preferences</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Left Nav */}
        <div className="flex-1 flex overflow-hidden">
          {/* Side Nav */}
          <div className="w-48 bg-white/60 border-r border-gray-200 p-3 space-y-1 text-xs">
            {[
              { id: 'general', label: 'General & Theme', icon: Monitor },
              { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck },
              { id: 'performance', label: 'Performance', icon: Zap },
              { id: 'shortcuts', label: 'Shortcuts', icon: Command },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-swift-500 text-white font-semibold'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-gray-700">
            {activeSection === 'general' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900">Appearance & Display</h4>

                <div className="space-y-1.5">
                  <label className="text-gray-500 block">Application Theme</label>
                  <div className="flex gap-2">
                    <span className="px-4 py-2 rounded-xl border border-swift-500/30 bg-swift-500/10 text-swift-600 font-semibold text-xs">
                      Clean Light (Default)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900">Privacy & Local-First Guarantees</h4>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero Cloud Storage • Zero Document Telemetry</span>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    JustPDFCraft operates 100% on this local device. Your PDF documents, text layers, annotations, and form data are never transmitted to external cloud servers.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'performance' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-900">Performance & Hardware</h4>
                <p className="text-gray-500 text-xs">
                  JustPDFCraft utilizes asynchronous worker threads and memory-capped canvas caching for ultra-fast responsiveness.
                </p>
              </div>
            )}

            {activeSection === 'shortcuts' && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-gray-900">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    { key: 'Ctrl + K', desc: 'Command Palette' },
                    { key: 'Ctrl + O', desc: 'Open PDF File' },
                    { key: 'Ctrl + S', desc: 'Save Changes' },
                    { key: 'Ctrl + F', desc: 'Search Document' },
                    { key: 'Ctrl + Z', desc: 'Undo' },
                    { key: 'Ctrl + Y', desc: 'Redo' },
                    { key: 'Ctrl + +', desc: 'Zoom In' },
                    { key: 'Ctrl + -', desc: 'Zoom Out' },
                    { key: 'Ctrl + W', desc: 'Close Document' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between"
                    >
                      <span className="text-gray-500">{s.desc}</span>
                      <kbd className="bg-gray-50 border border-gray-300 px-1.5 py-0.5 rounded font-mono text-[10px] text-swift-600">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-200 bg-white/60 flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
