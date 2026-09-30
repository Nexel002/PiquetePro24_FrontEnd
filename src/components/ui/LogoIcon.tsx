import React from 'react';

interface LogoIconProps extends React.SVGProps<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LogoIcon({ size = 'md', className = '', ...props }: LogoIconProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <svg
      className={`shrink-0 ${sizeMap[size]} ${className}`}
      viewBox="0 0 500 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Shield Gradient */}
        <linearGradient id="shieldBg" x1="120" y1="20" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#052456" />
          <stop offset="50%" stopColor="#021431" />
          <stop offset="100%" stopColor="#010B1C" />
        </linearGradient>

        {/* Metallic Shield Border Gradient */}
        <linearGradient id="shieldBorder" x1="120" y1="20" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="35%" stopColor="#64748B" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Lightning Bolt Gradient */}
        <linearGradient id="lightningGradient" x1="200" y1="60" x2="280" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="40%" stopColor="#FFC700" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Lightning Glow Filter */}
        <filter id="lightningGlow" x="140" y="40" width="200" height="340" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Wrench Silver Metallic Gradient */}
        <linearGradient id="wrenchMetallic" x1="140" y1="140" x2="280" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Water Drop Blue/Cyan Gradient */}
        <linearGradient id="waterDropGradient" x1="300" y1="200" x2="360" y2="320" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>

      {/* 1. Dynamic Yellow Speed Motion Trails (Left of shield) */}
      <g className="animate-pulse-slow">
        <path d="M10 180 L140 210 L10 230 Z" fill="#FFC700" opacity="0.9" />
        <path d="M35 240 L135 260 L35 285 Z" fill="#FFC700" opacity="0.9" />
        <path d="M60 295 L130 310 L60 330 Z" fill="#FFC700" opacity="0.9" />
      </g>

      {/* 2. Outer Shield Border (Metallic Frame) */}
      <path
        d="M250 20 L410 80 C410 260 340 360 250 400 C160 360 90 260 90 80 L250 20 Z"
        fill="url(#shieldBorder)"
      />

      {/* 3. Inner Shield Body */}
      <path
        d="M250 36 L392 90 C392 248 328 342 250 380 C172 342 108 248 108 90 L250 36 Z"
        fill="url(#shieldBg)"
        stroke="#1E293B"
        strokeWidth="3"
      />

      {/* 4. Service Icons Inside Shield */}
      {/* 4A. Crossed Wrench / Key Tool (Left/Center background inside shield) */}
      <g opacity="0.85">
        <path
          d="M175 140 C160 130 145 140 140 155 C135 170 142 185 155 190 L220 280 L245 265 L180 175 C185 162 185 148 175 140 Z"
          fill="url(#wrenchMetallic)"
        />
        <circle cx="160" cy="160" r="8" fill="#021431" />
      </g>

      {/* 4B. Water Drop (Right background inside shield) */}
      <g opacity="0.9">
        <path
          d="M320 200 C320 200 355 250 355 275 C355 295 339 310 320 310 C301 310 285 295 285 275 C285 250 320 200 320 200 Z"
          fill="url(#waterDropGradient)"
          stroke="#BAE6FD"
          strokeWidth="2"
        />
        {/* Reflection highlight */}
        <path
          d="M312 240 C308 250 305 265 308 275"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>

      {/* 5. Hero Lightning Bolt (Foreground Center - Dynamic 24/7 Urgency) */}
      <path
        d="M265 50 L185 200 L250 200 L200 365 L320 180 L250 180 L285 50 Z"
        fill="url(#lightningGradient)"
        stroke="#FFFFFF"
        strokeWidth="3"
        filter="url(#lightningGlow)"
      />
    </svg>
  );
}
