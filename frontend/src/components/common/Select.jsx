import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Select({
  label,
  options = [],
  value,
  onChange,
  error,
  helperText,
  className,
  containerClassName,
  placeholder = 'Select an option',
  disabled = false,
  id,
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('w-full flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-surface-700 tracking-wide uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-full appearance-none bg-white border border-surface-200 text-surface-900 rounded-xl px-3.5 py-2 text-sm pr-10 transition-all duration-150',
            'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
            'disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const optVal = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
        <ChevronDown className="w-4 h-4 text-surface-400 absolute right-3 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-surface-500">{helperText}</p>}
    </div>
  );
}
