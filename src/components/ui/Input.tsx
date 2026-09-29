import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', id, ...props }, ref) => {
    // A <label> é irmã do <input>, não o envolve — sem htmlFor/id ligados, o leitor de
    // ecrã não anuncia o nome do campo e tocar no rótulo não foca o input.
    const idGerado = useId();
    const inputId = id ?? idGerado;
    return (
      <div className="flex flex-col w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 text-sm font-semibold text-piquete-blue-dark">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-piquete-gray">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={`w-full bg-white border ${
              error ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200 focus:ring-piquete-blue/20 focus:border-piquete-blue'
            } rounded-xl px-4 py-3 text-base text-gray-900 transition-shadow duration-200 focus:outline-none focus:ring-2 shadow-sm ${
              leftIcon ? 'pl-10' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <span className="mt-1.5 text-sm text-red-500 font-medium">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
