import React, { useState } from 'react';
import { Settings, X, ShieldCheck, Monitor, Zap, Command } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { localDb, AppPreferences } from '@core/db/database';

export const SettingsDialog: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const [preferences, setPreferences] = useState<AppPreferences>(localDb.getSettings());
  const [activeSection, setActiveSection] = useState<'general' | 'privacy' | 'performance' | 'shortcuts'>('general');

  if (activeModal !== 'settings') return null;

  const handleUpdate = (patch: Partial<AppPreferences>) => {
    const updated = localDb.updateSettings(patch);
    setPreferences(updated);
    addToast({ type: 'info', title: 'Settings Updated', durationMs: 1500 });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-swift-500/10 text-swift-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Application Settings</h3>
              <p className="text-xs text-slate-400">Configure JustPDFCraft web workspace and local preferences</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Left Nav */}
        <div className="flex-1 flex overflow-hidden">
          {/* Side Nav */}
          <div className="w-48 bg-slate-950/60 border-r border-slate-800 p-3 space-y-1 text-xs">
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
                      ? 'bg-swift-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
            {activeSection === 'general' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white">Appearance & Display</h4>
                
                <div className="space-y-1.5">
                  <label className="text-slate-400 block">Application Theme</label>
                  <div className="flex gap-2">
                    {['dark', 'light', 'system'].map((t) => (
                      <button
                        key={t}
                        onClick={() => handleUpdate({ theme: t as any })}
                        className={`px-4 py-2 rounded-xl border capitalize font-medium ${
                          preferences.theme === t
                            ? 'bg-swift-500/10 border-swift-500 text-swift-400 font-semibold'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-slate-400 block">Default View Mode on Open</label>
                  <select
                    value={preferences.defaultViewMode}
                    onChange={(e) => handleUpdate({ defaultViewMode: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white w-full max-w-xs"
                  >
                    <option value="continuous">Continuous Scroll</option>
                    <option value="single">Single Page</option>
                    <option value="organize">Page Organizer Grid</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white">Privacy & Local-First Guarantees</h4>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero Cloud Storage • Zero Document Telemetry</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    JustPDFCraft operates 100% on this local device. Your PDF documents, text layers, annotations, and form data are never transmitted to external cloud servers.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.enableCrashRecovery}
                      onChange={(e) => handleUpdate({ enableCrashRecovery: e.target.checked })}
                      className="rounded bg-slate-800 border-slate-700 text-swift-500"
                    />
                    <span>Enable Local Transaction Crash Recovery Checkpoints</span>
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'performance' && (
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white">Performance & Hardware</h4>
                <p className="text-slate-400 text-xs">
                  JustPDFCraft utilizes asynchronous worker threads and memory-capped canvas caching for ultra-fast responsiveness.
                </p>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block">Auto-Save Recovery Interval</label>
                  <select
                    value={preferences.autoSaveIntervalSeconds}
                    onChange={(e) => handleUpdate({ autoSaveIntervalSeconds: Number(e.target.value) })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white w-full max-w-xs"
                  >
                    <option value="30">Every 30 seconds</option>
                    <option value="60">Every 60 seconds (Recommended)</option>
                    <option value="300">Every 5 minutes</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'shortcuts' && (
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-white">Keyboard Shortcuts</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {[
                    { key: 'Ctrl + K', desc: 'Command Palette' },
                    { key: 'Ctrl + O', desc: 'Open PDF File' },
                    { key: 'Ctrl + S', desc: 'Save Changes' },
                    { key: 'Ctrl + P', desc: 'Smart Print' },
                    { key: 'Ctrl + F', desc: 'Search Document' },
                    { key: 'Ctrl + Z', desc: 'Undo' },
                    { key: 'Ctrl + Y', desc: 'Redo' },
                    { key: 'Ctrl + +', desc: 'Zoom In' },
                    { key: 'Ctrl + -', desc: 'Zoom Out' },
                    { key: 'Ctrl + W', desc: 'Close Document' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="bg-slate-800/60 p-2 rounded-lg border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-slate-400">{s.desc}</span>
                      <kbd className="bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] text-swift-400">
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
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
