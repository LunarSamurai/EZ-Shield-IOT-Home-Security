'use client';

interface ShieldIconProps {
  size?: number;
  className?: string;
  glowing?: boolean;
}

export default function ShieldIcon({ size = 120, className = '', glowing = false }: ShieldIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${glowing ? 'animate-shield-pulse' : ''} ${className}`}
    >
      {/* Shield body */}
      <path
        d="M60 8L12 32V68C12 100 33 126 60 134C87 126 108 100 108 68V32L60 8Z"
        fill="url(#shieldGrad)"
        stroke="#FFD700"
        strokeWidth="3"
      />
      {/* Inner shield */}
      <path
        d="M60 20L22 40V68C22 94 40 116 60 124C80 116 98 94 98 68V40L60 20Z"
        fill="url(#innerGrad)"
        stroke="#FFD700"
        strokeWidth="1.5"
        opacity="0.8"
      />
      {/* EZ text */}
      <text
        x="60"
        y="68"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFD700"
        fontSize="32"
        fontWeight="bold"
        fontFamily="var(--font-geist-sans), Arial"
      >
        EZ
      </text>
      {/* Lock icon below EZ */}
      <rect x="50" y="80" width="20" height="16" rx="3" fill="#FFD700" opacity="0.8" />
      <path
        d="M54 80V74C54 70.7 56.7 68 60 68C63.3 68 66 70.7 66 74V80"
        stroke="#FFD700"
        strokeWidth="2.5"
        fill="none"
        opacity="0.8"
      />
      <circle cx="60" cy="88" r="2" fill="#0a1628" />
      {/* Gradients */}
      <defs>
        <linearGradient id="shieldGrad" x1="60" y1="8" x2="60" y2="134" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0a1628" />
        </linearGradient>
        <linearGradient id="innerGrad" x1="60" y1="20" x2="60" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a1628" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
