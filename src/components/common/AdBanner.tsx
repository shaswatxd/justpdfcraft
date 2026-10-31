import React, { useState, useEffect } from 'react';

interface AdBannerProps {
  slotId?: string;
  className?: string;
  format?: 'horizontal' | 'rectangle';
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slotId = 'default-ad-slot',
  className = '',
  format = 'horizontal',
}) => {
  const [adsEnabled, setAdsEnabled] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('justpdfcraft_ads_enabled');
      setAdsEnabled(saved === 'true');
    } catch {}
  }, []);

  if (!adsEnabled) return null;

  return (
    <div
      className={`w-full max-w-5xl mx-auto my-6 p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col items-center justify-center text-center ${className}`}
      aria-label="Sponsor advertisement container"
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Advertisement</span>
      <div
        className={`w-full bg-slate-100/80 rounded-xl flex items-center justify-center text-xs text-slate-400 border border-slate-200/60 ${
          format === 'horizontal' ? 'h-24 sm:h-28' : 'h-60'
        }`}
      >
        <span className="font-mono text-[11px]">Google AdSense Responsive Container ({slotId})</span>
      </div>
    </div>
  );
};
