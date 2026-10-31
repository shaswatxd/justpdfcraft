import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { TOOLS_CATALOG } from '@/data/toolsCatalog';

export const AdminDashboardModal: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const isOpen = activeModal === 'admin';

  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'tools' | 'settings'>('overview');
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [disabledToolIds, setDisabledToolIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedAds = localStorage.getItem('justpdfcraft_ads_enabled');
      if (savedAds !== null) setAdsEnabled(savedAds === 'true');
      const savedMaint = localStorage.getItem('justpdfcraft_maintenance');
      if (savedMaint !== null) setMaintenanceMode(savedMaint === 'true');
      const savedDisabled = localStorage.getItem('justpdfcraft_disabled_tools');
      if (savedDisabled) setDisabledToolIds(JSON.parse(savedDisabled));
    } catch {}
  }, [isOpen]);

  const toggleAdSense = () => {
    const next = !adsEnabled;
    setAdsEnabled(next);
    localStorage.setItem('justpdfcraft_ads_enabled', String(next));
    addToast({ type: 'info', title: `Advertisements ${next ? 'Enabled' : 'Disabled'}` });
  };

  const toggleMaintenance = () => {
    const next = !maintenanceMode;
    setMaintenanceMode(next);
    localStorage.setItem('justpdfcraft_maintenance', String(next));
    addToast({ type: 'warning', title: `Maintenance Mode ${next ? 'ON' : 'OFF'}` });
  };

  const toggleToolStatus = (id: string) => {
    const next = disabledToolIds.includes(id)
      ? disabledToolIds.filter((t) => t !== id)
      : [...disabledToolIds, id];
    setDisabledToolIds(next);
    localStorage.setItem('justpdfcraft_disabled_tools', JSON.stringify(next));
    addToast({ type: 'info', title: `Tool ${disabledToolIds.includes(id) ? 'Activated' : 'Deactivated'}` });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl h-[92dvh] max-h-[94dvh] sm:h-[88vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Admin Control Center</h2>
              <p className="text-[11px] text-slate-500">System Monitoring & Tool Management</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 px-4 sm:px-6 gap-4 bg-white text-xs font-bold">
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeAdminTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            onClick={() => setActiveAdminTab('tools')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeAdminTab === 'tools' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Tool Activation ({TOOLS_CATALOG.length - disabledToolIds.length}/{TOOLS_CATALOG.length})
          </button>
          <button
            onClick={() => setActiveAdminTab('settings')}
            className={`py-3 border-b-2 transition-all cursor-pointer ${
              activeAdminTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}
          >
            Platform Settings
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50/40">
          {activeAdminTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Available Tools</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{TOOLS_CATALOG.length}</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Client-Side Privacy</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">100%</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Engine Health</span>
                  <div className="text-2xl font-bold text-blue-600 mt-1">Optimal</div>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Architecture</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">WASM / OPFS</div>
                </div>
              </div>

              {/* System Subsystems Health */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subsystems & Runtime Status</h4>
                <div className="space-y-2 text-xs">
                  {[
                    { name: 'WebAssembly PDF Engine (pdf-lib / pdfjs-dist)', status: 'Online' },
                    { name: 'Origin Private File System (OPFS)', status: 'Active' },
                    { name: 'Tesseract OCR Service Worker', status: 'Ready (Local tessdata)' },
                    { name: 'IndexedDB Crash Recovery Store', status: 'Online' },
                    { name: 'Service Worker PWA Offline Caching', status: 'Registered' },
                  ].map((sub, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-700">{sub.name}</span>
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{sub.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeAdminTab === 'tools' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Click any tool to toggle availability in the explorer. Changes take effect immediately.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TOOLS_CATALOG.map((tool) => {
                  const isDisabled = disabledToolIds.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleToolStatus(tool.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isDisabled
                          ? 'bg-rose-50/50 border-rose-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-2xs hover:border-blue-400'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{tool.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">{tool.category}</div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isDisabled ? 'Disabled' : 'Active'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeAdminTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Google AdSense Containers</h4>
                    <p className="text-xs text-slate-500">Show non-intrusive banner spaces on homepage and tool views</p>
                  </div>
                  <button
                    onClick={toggleAdSense}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    {adsEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Maintenance Mode</h4>
                    <p className="text-xs text-slate-500">Temporarily display maintenance banner to guests</p>
                  </div>
                  <button
                    onClick={toggleMaintenance}
                    className="p-1 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                  >
                    {maintenanceMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
