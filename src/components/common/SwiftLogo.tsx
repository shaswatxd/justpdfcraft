import React from 'react';

interface SwiftLogoProps {
  className?: string;
}

export const SwiftLogo: React.FC<SwiftLogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="jpc-header-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c63ff" />
          <stop offset="100%" stopColor="#ff6584" />
        </linearGradient>
      </defs>
      {/* Background with rounded corners */}
      <rect width="48" height="48" rx="11" fill="url(#jpc-header-grad)" />

      {/* Document icon */}
      <path
        d="M15 8h12l8 8v22a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="rgba(255,255,255,0.96)"
      />

      {/* Folded corner */}
      <path
        d="M27 8v6a2 2 0 0 0 2 2h6z"
        fill="rgba(255,255,255,0.65)"
      />

      {/* Bold "PDF" inside mark */}
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontSize="10"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#6c63ff"
        fontWeight="900"
        letterSpacing="-0.5"
      >
        PDF
      </text>
    </svg>
  );
};
