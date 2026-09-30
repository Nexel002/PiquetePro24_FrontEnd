import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'interactive';
}

export function Card({
  children,
  variant = 'glass',
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    glass: 'bg-slate-900/75 backdrop-blur-xl border border-white/10 shadow-glass text-slate-100',
    solid: 'bg-slate-900 border border-slate-800 shadow-xl text-slate-100',
    interactive:
      'bg-slate-900/75 backdrop-blur-xl border border-white/10 shadow-glass text-slate-100 hover:border-piquete-yellow/40 hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300',
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-300 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pb-4 border-b border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-6 pt-4 border-t border-white/5 bg-white/[0.02] ${className}`} {...props}>
      {children}
    </div>
  );
}

