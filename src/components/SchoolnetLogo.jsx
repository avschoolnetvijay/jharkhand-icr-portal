import React from 'react';

export default function SchoolnetLogo({ className = 'h-9', showTagline = true, invert = false }) {
  return (
    <div className={`flex items-center space-x-2.5 select-none ${className}`}>
      {/* Official Schoolnet Pinwheel / Flower Emblem */}
      <div className="relative h-8 w-8 shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-xs">
          {/* Petals / Leaves in official corporate palette */}
          <ellipse cx="50" cy="22" rx="12" ry="20" fill="#0284c7" />
          <ellipse cx="78" cy="50" rx="20" ry="12" fill="#16a34a" />
          <ellipse cx="50" cy="78" rx="12" ry="20" fill="#eab308" />
          <ellipse cx="22" cy="50" rx="20" ry="12" fill="#ea580c" />
          
          {/* Diagonal Leaves */}
          <ellipse cx="70" cy="30" rx="10" ry="16" transform="rotate(45 70 30)" fill="#0ea5e9" />
          <ellipse cx="70" cy="70" rx="10" ry="16" transform="rotate(135 70 70)" fill="#84cc16" />
          <ellipse cx="30" cy="70" rx="10" ry="16" transform="rotate(45 30 70)" fill="#f59e0b" />
          <ellipse cx="30" cy="30" rx="10" ry="16" transform="rotate(135 30 30)" fill="#f97316" />
          
          {/* Inner ring & center core */}
          <circle cx="50" cy="50" r="16" fill="#ffffff" />
          <circle cx="50" cy="50" r="11" fill="#0284c7" />
          <circle cx="50" cy="50" r="6" fill="#ffffff" />
        </svg>
      </div>

      {/* Brand Name & Tagline */}
      <div className="leading-tight">
        <div className="flex items-center">
          <span className={`text-lg font-black tracking-tight ${invert ? 'text-white' : 'text-[#0f2d59]'}`}>
            School<span className="text-[#0284c7]">net</span>
          </span>
        </div>
        {showTagline && (
          <p className={`text-[9px] tracking-wider font-semibold uppercase ${invert ? 'text-slate-400' : 'text-slate-500'}`}>
            Learning for a better tomorrow
          </p>
        )}
      </div>
    </div>
  );
}
