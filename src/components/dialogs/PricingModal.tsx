import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const PricingModal: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const isOpen = activeModal === 'pricing';
  const [isAnnual, setIsAnnual] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Simple, Transparent Pricing</h2>
            <p className="text-xs text-slate-500 font-medium">100% Client-Side Privacy • No Hidden Fees</p>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs font-bold ${!isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-12 h-6 bg-blue-600 rounded-full p-0.5 flex items-center transition-all cursor-pointer"
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all ${
                  isAnnual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs font-bold ${isAnnual ? 'text-slate-900' : 'text-slate-500'}`}>
              Annual <span className="text-emerald-600 font-bold ml-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">Save 20%</span>
            </span>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Free Tier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Essential document utilities</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">₹0</div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>All Standard PDF Tools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Target KB Photo Resizer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Student & Developer Utilities</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% In-Browser Privacy</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  addToast({ type: 'info', title: 'Free Plan Active', message: 'You have full access to all client-side tools.' });
                }}
                className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Current Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="p-6 rounded-2xl border-2 border-blue-600 bg-white flex flex-col justify-between shadow-lg shadow-blue-500/10 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-2xs">
                Most Popular
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pro Tier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Power users and students</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {isAnnual ? '₹799' : '₹99'}
                  <span className="text-xs text-slate-500 font-normal">/{isAnnual ? 'year' : 'month'}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Batch Multi-File Processing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ad-Free Experience</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Priority OCR & Large Documents</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Premium Resume & CV Templates</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => {
                  addToast({
                    type: 'info',
                    title: 'Payment Gateway Integration',
                    message: 'Official payment provider is in configuration mode. Contact admin to activate Pro early.',
                  });
                }}
                className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Business Plan */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs hover:shadow-md transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Business Tier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Teams and enterprises</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {isAnnual ? '₹1,499' : '₹199'}
                  <span className="text-xs text-slate-500 font-normal">/{isAnnual ? 'seat/yr' : 'seat/mo'}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Team Management Dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom Document Watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>REST API & Automation Access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Dedicated Technical Support</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => {
                  addToast({
                    type: 'info',
                    title: 'Contact Sales',
                    message: 'Reach out to support@justpdfcraft.xyz for team volume licensing.',
                  });
                }}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
