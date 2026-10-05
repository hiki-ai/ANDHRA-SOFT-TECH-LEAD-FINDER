import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  valid: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  invalid: 'bg-rose-50 text-rose-700 border-rose-200/80',
  duplicate: 'bg-amber-50 text-amber-700 border-amber-200/80',
  pending: 'bg-surface-100 text-surface-600 border-surface-200',
  running: 'bg-brand-50 text-brand-700 border-brand-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-surface-100 text-surface-700 border-surface-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
};

export function Badge({
  children,
  variant = 'neutral',
  className,
  dot = false,
  pulse = false,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none',
        variants[variant] || variants.neutral,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'valid' || variant === 'completed' ? 'bg-emerald-500' :
            variant === 'invalid' || variant === 'failed' ? 'bg-rose-500' :
            variant === 'duplicate' ? 'bg-amber-500' :
            variant === 'running' ? 'bg-brand-500' : 'bg-surface-400',
            pulse && 'animate-pulse'
          )}
        />
      )}
      {children}
    </span>
  );
}
