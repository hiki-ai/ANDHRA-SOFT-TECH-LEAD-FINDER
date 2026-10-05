import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export function ToastItem({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-600 shrink-0" />,
  };

  const borderColors = {
    success: 'border-emerald-200 bg-white shadow-lg text-surface-800',
    error: 'border-rose-200 bg-white shadow-lg text-surface-800',
    warning: 'border-amber-200 bg-white shadow-lg text-surface-800',
    info: 'border-brand-200 bg-white shadow-lg text-surface-800',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-card transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
        borderColors[toast.type] || borderColors.info
      )}
    >
      <div className="flex items-center gap-3">
        {icons[toast.type]}
        <span className="text-sm font-medium leading-snug">{toast.message}</span>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-surface-400 hover:text-surface-600 p-1 rounded-lg transition-colors ml-3"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

export default ToastContainer;
