import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function SearchableSelect({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select or type...',
  allowCustom = true,
  error,
  helperText,
  className,
  containerClassName,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const text = typeof opt === 'string' ? opt : opt.label;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isExactMatch = options.some((opt) => {
    const text = typeof opt === 'string' ? opt : opt.label;
    return text.toLowerCase() === searchQuery.trim().toLowerCase();
  });

  const handleSelect = (item) => {
    const val = typeof item === 'string' ? item : item.value;
    onChange(val);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleAddCustom = () => {
    if (searchQuery.trim()) {
      onChange(searchQuery.trim());
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={wrapperRef} className={cn('relative w-full flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
          {label}
        </label>
      )}

      {/* Trigger Bar */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            !disabled && setIsOpen(!isOpen);
          }
        }}
        className={cn(
          'w-full bg-white border border-surface-200 text-surface-900 rounded-xl px-3.5 py-2 text-sm flex items-center justify-between cursor-pointer transition-all duration-150',
          'focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          disabled && 'bg-surface-50 text-surface-400 cursor-not-allowed',
          isOpen && 'border-brand-500 ring-2 ring-brand-500/20',
          error && 'border-rose-400 text-rose-900',
          className
        )}
      >
        <span className={cn('truncate', !value && 'text-surface-400 font-normal')}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-surface-400 hover:text-surface-600 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-surface-400 transition-transform duration-150',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-40 bg-white border border-surface-200 rounded-xl shadow-dropdown overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-surface-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-surface-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or enter new..."
              className="w-full text-xs bg-transparent border-none outline-none text-surface-900 placeholder:text-surface-400"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.map((opt) => {
              const optVal = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = value === optVal;

              return (
                <div
                  key={optVal}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'hover:bg-surface-50 text-surface-800'
                  )}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 ml-2" />}
                </div>
              );
            })}

            {filteredOptions.length === 0 && !allowCustom && (
              <div className="p-3 text-center text-xs text-surface-400">
                No matching options
              </div>
            )}

            {/* Custom option prompt */}
            {allowCustom && searchQuery.trim() && !isExactMatch && (
              <div
                onClick={handleAddCustom}
                className="flex items-center gap-2 px-3 py-2 text-xs text-brand-600 hover:bg-brand-50 rounded-lg cursor-pointer font-medium border-t border-surface-100 mt-1"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add "{searchQuery.trim()}"</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {!error && helperText && <p className="text-xs text-surface-500">{helperText}</p>}
    </div>
  );
}
