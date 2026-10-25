import React from 'react';

export const SwiftLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Precision Document with Folded Corner & PDF Monogram */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4a2 2 0 0 1 2-2h8.586a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 21 8.414V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4zm11 0v4a1 1 0 0 0 1 1h4l-5-5zM7.5 14a.75.75 0 0 1 .75-.75h1.5a1.75 1.75 0 0 1 0 3.5h-.75V18a.75.75 0 0 1-1.5 0v-4zm1.5.75v1h.75a.25.25 0 0 0 0-.5h-.75zm4-.75a.75.75 0 0 1 .75-.75h1.25a2 2 0 0 1 0 4H14.5V18a.75.75 0 0 1-1.5 0v-4zm1.5.75v2h.5a.5.5 0 0 0 0-1h-.5zm3.5-.75a.75.75 0 0 1 .75-.75H20a.75.75 0 0 1 0 1.5h-1.75v1.25H19a.75.75 0 0 1 0 1.5h-.75V18a.75.75 0 0 1-1.5 0v-4z"
      />
    </svg>
  );
};
