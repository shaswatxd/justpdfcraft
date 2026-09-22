import React from 'react';
import { X, Check, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const PricingDialog: React.FC = () => {
  const { activeModal, setActiveModal } = useUIStore();
  const isOpen = activeModal === 'pricing';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-swift-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Plans & Monetization Architecture
            </h2>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Tier */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border-2 border-swift-500/50 flex flex-col justify-between space-y-4 relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-swift-600 text-white shadow-md">
              Active Plan
            </span>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">JustPDFCraft Free</h3>
              <p className="text-xs text-slate-400">
                100% Free Forever for students, teachers, and professionals.
              </p>
              <div className="pt-2">
                <span className="text-3xl font-black text-white">₹0</span>
                <span className="text-xs text-slate-400"> / forever</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-700/60">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All 20+ PDF editing & conversion tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Handwritten Notes & Assignment Generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Target KB Resizer & Exam Photo Presets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>All 14 Student Calculators & Tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% In-Browser Privacy Guarantee</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Bring Your Own AI Key (Gemini/OpenAI)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Current Active Tier
            </button>
          </div>

          {/* Pro Tier Preview */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 opacity-90">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">JustPDFCraft Pro</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optional cloud services for heavy university labs and bulk teams.
              </p>
              <div className="pt-2">
                <span className="text-3xl font-black text-purple-400">₹99</span>
                <span className="text-xs text-slate-400"> / month</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-400 pt-3 border-t border-slate-800">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Cloud Batch OCR for 1000+ scanned pages</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Hosted High-Speed AI (No personal key needed)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Encrypted Cross-Device Sync</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Priority 24/7 Academic Support</span>
                </li>
              </ul>
            </div>

            <button
              disabled
              className="w-full py-2.5 bg-slate-800/80 text-slate-500 font-semibold rounded-xl text-xs cursor-not-allowed border border-slate-800"
            >
              Coming Soon (Stripe / Razorpay)
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Standard client-side tools will remain 100% free forever.</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Safe Architecture
          </span>
        </div>
      </div>
    </div>
  );
};
