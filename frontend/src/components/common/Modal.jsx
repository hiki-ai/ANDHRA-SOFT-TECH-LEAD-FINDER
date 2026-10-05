import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
  showClose = true,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-900/40 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box */}
      <div
        className={cn(
          'relative w-full bg-white rounded-2xl border border-surface-200 shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200',
          maxWidths[maxWidth]
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-surface-100">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-surface-900 leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-surface-500">{subtitle}</p>
            )}
          </div>
          {showClose && (
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-surface-600 p-1.5 rounded-lg hover:bg-surface-100 transition-colors -mr-1"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 bg-surface-50/70 border-t border-surface-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
