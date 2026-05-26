import * as React from 'react';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lgGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4D679" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8C6E18" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#lgGold)" strokeWidth="1.5" fill="none" />
      <g stroke="url(#lgGold)" strokeWidth="1.2" fill="none" strokeLinejoin="round">
        <polygon points="16,4 26.8,11.8 22.7,24.5 9.3,24.5 5.2,11.8" />
        <polygon points="16,9 24,15 21,23 11,23 8,15" />
      </g>
      <circle cx="16" cy="16" r="2.2" fill="url(#lgGold)" />
    </svg>
  );
}
