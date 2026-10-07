import React from 'react';
import { LogoIcon } from './LogoIcon';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'full' | 'icon' | 'stacked';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export function Logo({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  showSubtitle = false,
  className = '',
  ...props
}: LogoProps) {
  const iconSizes = {
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
  } as const;

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
  };

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  const isLight = theme === 'light';

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} {...props}>
        <LogoIcon size={iconSizes[size]} />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${
        variant === 'stacked' ? 'flex-col text-center gap-2' : ''
      } ${className}`}
      {...props}
    >
      <LogoIcon size={iconSizes[size]} className="transition-transform duration-300 hover:scale-105" />

      <div className="flex flex-col leading-none">
        <div
          className={`font-heading font-extrabold tracking-tight flex items-baseline gap-1 ${textSizes[size]}`}
        >
          <span className={isLight ? 'text-piquete-blue' : 'text-white'}>PIQUETE</span>
          <span className={isLight ? 'text-piquete-blue-dark' : 'text-slate-200'}>PRO</span>
          <span className="text-piquete-yellow drop-shadow-[0_2px_10px_rgba(255,199,0,0.4)]">24</span>
        </div>

        {showSubtitle && (
          <span
            className={`font-sans font-semibold tracking-widest uppercase mt-0.5 ${
              subtitleSizes[size]
            } ${isLight ? 'text-slate-500' : 'text-slate-400'}`}
          >
            Serviços Locais 24/7
          </span>
        )}
      </div>
    </div>
  );
}
