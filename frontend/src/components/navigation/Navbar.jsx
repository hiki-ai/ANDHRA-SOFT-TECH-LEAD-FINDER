import React from 'react';
import { Menu, Search, Plus } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';

export function Navbar({ onMenuToggle, onOpenNewJob }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-surface-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Quick search vendors, categories, locations..."
            className="w-full bg-surface-50 border border-surface-200 text-surface-900 text-xs rounded-xl pl-9 pr-4 py-2 placeholder:text-surface-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, System Health & User Info */}
      <div className="flex items-center gap-3">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* Quick New Collection Button */}
        {onOpenNewJob && (
          <Button
            size="sm"
            variant="primary"
            onClick={onOpenNewJob}
            iconLeft={Plus}
            className="hidden sm:inline-flex"
          >
            New Collection
          </Button>
        )}

        {/* User Mini Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-surface-200/80">
          <div className="w-8 h-8 rounded-full bg-surface-100 border border-surface-200 flex items-center justify-center font-bold text-xs text-surface-700">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
          </div>
          <span className="hidden xl:inline text-xs font-semibold text-surface-800">
            {user?.displayName || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
