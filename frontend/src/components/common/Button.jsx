import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm focus:ring-brand-500/25 active:bg-brand-800',
  secondary: 'bg-surface-100 hover:bg-surface-200 text-surface-800 border border-surface-200 focus:ring-surface-400/20 active:bg-surface-300',
  outline: 'bg-transparent border border-surface-300 text-surface-700 hover:bg-surface-50 focus:ring-surface-400/20 active:bg-surface-100',
  ghost: 'bg-transparent text-surface-600 hover:text-surface-900 hover:bg-surface-100 focus:ring-surface-400/20',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500/25 active:bg-rose-800',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs font-medium rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  type = 'button',
  fullWidth = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-sans transition-all duration-150 select-none outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        IconLeft && <IconLeft className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && IconRight && <IconRight className="w-4 h-4 shrink-0" />}
    </button>
  );
}
