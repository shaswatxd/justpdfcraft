import React, { useState } from 'react';
import { X, Mail, ShieldCheck, Heart, Send, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export const ContactAboutModal: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const isOpen = activeModal === 'contact' || activeModal === 'about';
  const isAbout = activeModal === 'about';

  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      addToast({ type: 'warning', title: 'Missing Information', message: 'Please provide email and message.' });
      return;
    }
    setIsSent(true);
    addToast({
      type: 'success',
      title: 'Message Sent Successfully',
      message: 'Thank you for reaching out! Our team will review your message.',
    });
    setTimeout(() => {
      setIsSent(false);
      setEmail('');
      setSubject('');
      setMessage('');
      setActiveModal(null);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              {isAbout ? <Globe className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {isAbout ? 'About JustPDFCraft' : 'Contact Support & Feedback'}
            </h2>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isAbout ? (
            <div className="space-y-4 text-xs leading-relaxed text-slate-600">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <h3 className="text-sm font-bold text-slate-900">100% Private, Local-First Document Suite</h3>
                <p className="text-xs text-slate-600">
                  JustPDFCraft was created to solve privacy issues with traditional cloud-based document platforms.
                </p>
              </div>

              <p>
                Unlike conventional websites that require uploading your private files, medical records, tax documents,
                and assignments to remote third-party servers, JustPDFCraft performs file processing directly inside
                your browser tab using WebAssembly and modern client-side APIs.
              </p>

              <div className="space-y-2 pt-1 font-medium">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero Cloud Uploads: Documents never leave your device.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Ultra Fast: No upload or download network waiting.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800">
                  <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Free Forever: Built for students, developers, and professionals.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                Official Domain: <span className="font-semibold text-slate-700">https://justpdfcraft.xyz</span>
              </div>
            </div>
          ) : isSent ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Thank You!</h3>
              <p className="text-xs text-slate-500">Your message has been received.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  placeholder="Bug report, feature request, question..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
