import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-piquete-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none select-none tracking-wide';

  const variants = {
    primary:
      'bg-gradient-to-r from-piquete-yellow via-yellow-400 to-amber-400 text-piquete-blue font-bold shadow-glow-yellow hover:brightness-105 hover:shadow-lg hover:shadow-amber-500/30 border border-yellow-300/30',
    secondary:
      'bg-piquete-blue text-white hover:bg-piquete-blue-light hover:shadow-glow-blue border border-white/10',
    outline:
      'border-2 border-piquete-blue text-piquete-blue hover:bg-piquete-blue hover:text-white',
    ghost:
      'bg-transparent text-gray-700 hover:text-piquete-blue hover:bg-gray-100 border border-transparent',
    glass:
      'bg-gray-100/90 text-piquete-blue border border-gray-200/80 hover:bg-gray-200 hover:border-piquete-yellow/40 hover:shadow-sm',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-md shadow-red-600/20',
  };


  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5 shadow-sm',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5 shadow-md',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      ) : leftIcon ? (
        <span className="shrink-0 items-center justify-center flex">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 items-center justify-center flex">{rightIcon}</span>
      )}
    </button>
  );
}

