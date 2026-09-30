import React from 'react';

export type BadgeVariant = 'pending' | 'approved' | 'rejected' | 'info' | 'active' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'info',
  icon,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    warning: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md border shadow-sm transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
