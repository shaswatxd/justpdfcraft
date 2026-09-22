import React from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';
import { useUIStore, ThemeMode } from '@/stores/uiStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, setTheme } = useUIStore();

  const themes: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
    { mode: 'dark', label: 'Dark Slate', icon: <Moon className="w-3.5 h-3.5" /> },
    { mode: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
    { mode: 'oled', label: 'OLED Black', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 ${className}`}>
      {themes.map((t) => {
        const isActive = theme === t.mode;
        return (
          <button
            key={t.mode}
            onClick={() => setTheme(t.mode)}
            className={`p-1.5 rounded-md flex items-center gap-1 text-xs transition-all ${
              isActive
                ? 'bg-swift-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
            title={`Switch to ${t.label} Theme`}
          >
            {t.icon}
          </button>
        );
      })}
    </div>
  );
};
