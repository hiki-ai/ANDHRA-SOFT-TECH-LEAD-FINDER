import React from 'react';
import { Database, SearchX, FileSpreadsheet } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export function EmptyState({
  icon: Icon = Database,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl border border-dashed border-surface-300/80 my-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center text-surface-500 mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-surface-900 mb-1">{title}</h4>
      <p className="text-xs text-surface-500 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
