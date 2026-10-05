/**
 * General UI and Data Helpers
 * Location: frontend/src/utils/helpers.js
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}
