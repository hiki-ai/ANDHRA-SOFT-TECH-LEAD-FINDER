import React from 'react';
import { Link } from 'react-router-dom';
import { DatabaseZap, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '@/hooks/useAuth';

export function PublicNavbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="w-full bg-white/95 backdrop-blur-sm border-b border-surface-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:bg-brand-700 transition-colors">
            <DatabaseZap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-surface-900 uppercase">
              Andhra Soft Tech
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase">
              Lead Finder
            </span>
          </div>
        </Link>

        {/* Links & CTA */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-xs font-semibold text-surface-600 hover:text-surface-900 transition-colors hidden sm:block"
          >
            Home
          </Link>

          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="sm" variant="primary" iconRight={ArrowRight}>
                Open Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="primary" iconRight={ArrowRight}>
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
