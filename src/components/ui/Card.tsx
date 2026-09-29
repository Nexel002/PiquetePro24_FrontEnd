import React from 'react';

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
