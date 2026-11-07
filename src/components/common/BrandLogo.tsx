import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string | false;
  theme?: 'dark' | 'light';
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = false,
  theme = 'dark',
  className = '',
  onClick
}) => {
  const iconDimensions = {
    sm: { box: 'w-7 h-7 rounded-lg', svg: 'w-4 h-4', stroke: 2 },
    md: { box: 'w-9 h-9 rounded-xl', svg: 'w-5 h-5', stroke: 2 },
    lg: { box: 'w-11 h-11 rounded-2xl', svg: 'w-6 h-6', stroke: 2 },
  }[size];

  const textStyles = {
    sm: { title: 'text-sm font-bold', sub: 'text-[9px]' },
    md: { title: 'text-lg font-bold', sub: 'text-[10px]' },
    lg: { title: 'text-xl font-extrabold', sub: 'text-xs' },
  }[size];

  const titleColor = theme === 'light' ? 'text-white' : 'text-slate-900';
  const subtitleColor = theme === 'light' ? 'text-slate-400' : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Brand Icon Mark */}
      <div
        className={`${iconDimensions.box} bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 transition-colors ${
          onClick ? 'group-hover:bg-indigo-700' : ''
        }`}
      >
        <svg
          className={iconDimensions.svg}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={iconDimensions.stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Folded Document Outline */}
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          {/* PDF "P" Emblem */}
          <path d="M9 9v9" />
          <path d="M9 9h3a2 2 0 0 1 0 4H9" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <span className={`tracking-tight leading-none ${titleColor} ${textStyles.title} ${onClick ? 'group-hover:text-indigo-400 transition-colors' : ''}`}>
            JustPDF<span className="text-indigo-500">Craft</span>
          </span>
          {subtitle && (
            <span className={`font-medium ${subtitleColor} mt-1 leading-none ${textStyles.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
