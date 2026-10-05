import React from 'react';
import { cn } from '../../utils/cn';

export function ProgressBar({
  value = 0,
  max = 100,
  size = 'md',
  color = 'brand',
  showLabel = false,
  label,
  className,
  animated = false,
}) {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizeHeights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colors = {
    brand: 'bg-brand-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-600',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-medium text-surface-600">
          <span>{label || 'Progress'}</span>
          <span className="font-semibold text-surface-900">{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-surface-100 rounded-full overflow-hidden border border-surface-200/60 p-0.5',
          sizeHeights[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            colors[color] || colors.brand,
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
