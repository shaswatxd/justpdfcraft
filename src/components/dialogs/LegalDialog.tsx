import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, FileText, Scale, AlertTriangle, Send } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

type LegalTab = 'about' | 'privacy' | 'terms' | 'disclaimer' | 'contact';

export const LegalDialog: React.FC = () => {
  const { activeModal, setActiveModal, activeLegalTab, setActiveLegalTab, addToast } = useUIStore();
  const isOpen = activeModal === 'legal';

  const [activeTab, setActiveTab] = useState<LegalTab>('about');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    if (activeLegalTab) {
      setActiveTab(activeLegalTab as LegalTab);
    }
  }, [activeLegalTab]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveModal(null);
    setActiveLegalTab(null);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;

    // Real delivery via the user's mail client (no backend on this static site).
    const subject = encodeURIComponent(
      `[JustPDFCraft] Feedback from ${contactName.trim() || 'Anonymous'}`
    );
    const body = encodeURIComponent(
      `${contactMessage.trim()}\n\n— ${contactName.trim() || 'Anonymous'}\n${contactEmail.trim()}`
    );
    window.location.href = `mailto:hello@justpdfcraft.xyz?subject=${subject}&body=${body}`;

    addToast({
      type: 'success',
      title: 'Opening Your Email App',
      message: 'Your message is pre-filled — just hit send. If no mail app opened, email hello@justpdfcraft.xyz directly.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none" role="dialog" aria-modal="true" aria-label="Legal Dialog">
      <div className="w-full max-w-3xl h-[85vh] max-h-[750px] bg-white border border-gray-300/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-900">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 bg-gray-100 border-b border-gray-300/80 flex items-center justify-between shrink-0">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
            JustPDFCraft Legal & Information Hub
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Ribbon */}
        <div className="bg-white/60 border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none text-xs">
          {[
            { id: 'about' as const, label: 'About Us', icon: FileText },
            { id: 'privacy' as const, label: 'Privacy Policy', icon: ShieldCheck },
            { id: 'terms' as const, label: 'Terms of Service', icon: Scale },
            { id: 'disclaimer' as const, label: 'Disclaimer', icon: AlertTriangle },
            { id: 'contact' as const, label: 'Contact Us', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-xs sm:text-sm text-gray-700 leading-relaxed space-y-4">
          {activeTab === 'about' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">About JustPDFCraft</h3>
              <p>
                JustPDFCraft was created with a single mission: to empower students, educators, and working professionals with a fast, comprehensive, and privacy-respecting document and image toolkit.
              </p>
              <p>
                Unlike traditional online PDF converters that force users to upload sensitive files, contracts, marksheets, and signatures to third-party cloud servers, JustPDFCraft is engineered from the ground up as a <strong>100% client-side, local-first web application</strong>.
              </p>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-300/60 space-y-2">
                <h4 className="font-bold text-gray-900">Our Core Commitments:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Zero file uploads: Everything is processed in your device's memory.</li>
                  <li>No subscription paywalls or hidden file limits on essential tools.</li>
                  <li>Dedicated student utilities designed specifically for competitive exam forms and university portals.</li>
                  <li>Zero fake data: All calculations and AI connections are real and verifiable.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Privacy Policy</h3>
              <p className="text-xs text-gray-500">Effective Date: September 2026</p>
              <p>
                At JustPDFCraft (accessible at <code>https://justpdfcraft.xyz</code>), the privacy and confidentiality of your documents and personal data is our foundational priority.
              </p>
              <h4 className="text-base font-bold text-gray-900">1. Client-Side Document Processing</h4>
              <p>
                All PDF manipulations (merging, splitting, compression, direct text editing, OCR, watermarking, page organization) and image transformations (target KB resizing) execute strictly within your local browser environment using JavaScript and WebAssembly.
                <strong> None of your documents, photos, or signatures are ever transmitted to or stored on our servers.</strong>
              </p>
              <h4 className="text-base font-bold text-gray-900">2. Local Storage Usage</h4>
              <p>
                We store lightweight non-sensitive preferences locally on your browser (such as your favorite tools, recently used tools list, dark mode preference, and reading comfort tones). You can clear this data at any time through your browser settings.
              </p>
              <h4 className="text-base font-bold text-gray-900">3. AI Services & API Keys</h4>
              <p>
                When utilizing AI features, API calls are dispatched directly from your browser to your chosen provider (Google Gemini or OpenAI) using the personal API key you provide. Your key is stored solely in your browser's localStorage and is never proxied or seen by JustPDFCraft.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Terms & Conditions of Service</h3>
              <p>
                By accessing or using JustPDFCraft, you agree to these Terms. If you disagree with any part of these terms, you may refrain from using the application.
              </p>
              <h4 className="text-base font-bold text-gray-900">1. License & Usage</h4>
              <p>
                JustPDFCraft grants you a personal, non-exclusive, royalty-free license to use all provided tools for personal, academic, and commercial document editing purposes.
              </p>
              <h4 className="text-base font-bold text-gray-900">2. Acceptable Use</h4>
              <p>
                You agree not to use JustPDFCraft for any unlawful purposes, including but not limited to forging official government documents, modifying protected certificates fraudulently, or attempting to compromise service integrity.
              </p>
              <h4 className="text-base font-bold text-gray-900">3. Disclaimer of Warranties</h4>
              <p>
                JustPDFCraft is provided on an "as-is" and "as-available" basis without warranties of any kind. While our tools undergo rigorous testing, users are responsible for verifying compliance with specific exam or submission guidelines.
              </p>
            </div>
          )}

          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Legal & Exam Portal Disclaimer</h3>
              <p>
                JustPDFCraft provides automated digital tools (such as target KB photo compressors) to help students and candidates format files according to published exam notifications.
              </p>
              <p>
                JustPDFCraft is an independent productivity platform and is <strong>not affiliated with, endorsed by, or sponsored by</strong> any government testing agency or examination board (such as SSC, UPSC, NTA, IBPS, CBSE, or State Public Service Commissions).
              </p>
              <p>
                Candidates are strongly advised to thoroughly review the official notification and information bulletin of their specific exam to ensure full compliance before submitting application forms.
              </p>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Contact & Feedback</h3>
                <p className="text-xs text-gray-500">
                  Have a suggestion, found a bug, or want a new tool added? We'd love to hear from you.
                </p>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Your Name</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-swift-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-swift-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Message / Bug Report</label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Describe your suggestion, tool request, or issue..."
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-swift-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Feedback
                </button>
              </form>

              {/* Direct email fallback (works even without a configured mail app) */}
              <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs">
                <span className="text-gray-600 truncate">
                  Prefer email?{' '}
                  <a
                    href="mailto:hello@justpdfcraft.xyz"
                    className="font-semibold text-red-600 hover:text-red-700 underline underline-offset-2"
                  >
                    hello@justpdfcraft.xyz
                  </a>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText('hello@justpdfcraft.xyz');
                    addToast({
                      type: 'success',
                      title: 'Copied',
                      message: 'Email address copied to clipboard.',
                    });
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalDialog;
