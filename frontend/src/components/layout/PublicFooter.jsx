import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="w-full bg-white border-t border-surface-200/80 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Strictly compliant with official APIs and permitted public data terms.</span>
        </div>
        <p>© {new Date().getFullYear()} ANDHRA SOFT TECH. All rights reserved.</p>
      </div>
    </footer>
  );
}
