import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-brand-50 text-brand-600',
  trend,
  trendDirection = 'up',
  className,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-surface-200/90 rounded-2xl p-5 shadow-card transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-card-hover hover:border-brand-200',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-2.5 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-surface-900">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md',
              trendDirection === 'up'
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-rose-700 bg-rose-50'
            )}
          >
            {trendDirection === 'up' ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            )}
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-surface-500 font-normal truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
