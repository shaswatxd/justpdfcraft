import React, { useState, useEffect } from 'react';
import { X, User, LogOut, History } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

export interface UserProfile {
  name: string;
  email: string;
  tier?: string;
  createdDate: string;
}

export const AuthModal: React.FC = () => {
  const { activeModal, setActiveModal, addToast } = useUIStore();
  const isOpen = activeModal === 'auth';

  const [isLoginView, setIsLoginView] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // History state
  const [historyItems, setHistoryItems] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('justpdfcraft_user');
      if (saved) setCurrentUser(JSON.parse(saved));
      const hist = localStorage.getItem('justpdfcraft_history');
      if (hist) setHistoryItems(JSON.parse(hist));
    } catch {}
  }, [isOpen]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast({ type: 'warning', title: 'Missing Fields', message: 'Please provide email and password.' });
      return;
    }
    const user: UserProfile = {
      name: name.trim() || email.split('@')[0],
      email: email.trim(),
      tier: 'Free',
      createdDate: new Date().toLocaleDateString(),
    };
    localStorage.setItem('justpdfcraft_user', JSON.stringify(user));
    setCurrentUser(user);
    addToast({ type: 'success', title: isLoginView ? 'Welcome Back!' : 'Account Created Successfully' });
  };

  const handleLogout = () => {
    localStorage.removeItem('justpdfcraft_user');
    setCurrentUser(null);
    addToast({ type: 'info', title: 'Logged Out', message: 'You are now browsing as guest.' });
  };

  const clearHistory = () => {
    localStorage.removeItem('justpdfcraft_history');
    setHistoryItems([]);
    addToast({ type: 'info', title: 'History Cleared' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {currentUser ? 'User Account' : isLoginView ? 'Sign In to JustPDFCraft' : 'Create Account'}
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
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{currentUser.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    Active Account
                  </span>
                </div>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
                <p className="text-[11px] text-slate-400 pt-1">Member since {currentUser.createdDate}</p>
              </div>

              {/* Local Processing History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Processing History (Local)</span>
                  </span>
                  {historyItems.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                  {historyItems.length > 0 ? (
                    historyItems.map((item, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-100">
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No processing history recorded yet.</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {!isLoginView && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                {isLoginView ? 'Sign In' : 'Create Free Account'}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoginView(!isLoginView)}
                  className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
