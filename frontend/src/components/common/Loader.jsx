import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Loader({ size = 'md', text, className }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-2.5 p-6', className)}>
      <Loader2 className={cn('animate-spin text-brand-600', sizes[size])} />
      {text && <p className="text-xs text-surface-500 font-medium">{text}</p>}
    </div>
  );
}
