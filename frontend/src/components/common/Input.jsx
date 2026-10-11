import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    iconLeft: IconLeft,
    iconRight: IconRight,
    actionRight,
    className,
    containerClassName,
    id,
    type = 'text',
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-surface-700 tracking-wide uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {IconLeft && (
          <div className="absolute left-3 text-surface-400 pointer-events-none flex items-center">
            <IconLeft className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full bg-white border border-surface-200 text-surface-900 rounded-xl px-3.5 py-2 text-sm transition-all duration-150',
            'placeholder:text-surface-400',
            'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            IconLeft && 'pl-9',
            (IconRight || actionRight) && 'pr-10',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900',
            className
          )}
          {...props}
        />
        {actionRight ? (
          <div className="absolute right-3 flex items-center z-10">{actionRight}</div>
        ) : IconRight ? (
          <div className="absolute right-3 text-surface-400 pointer-events-none flex items-center">
            <IconRight className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-surface-500">{helperText}</p>}
    </div>
  );
});
