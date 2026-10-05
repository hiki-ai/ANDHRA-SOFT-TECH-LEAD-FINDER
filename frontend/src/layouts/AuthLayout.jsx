import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { DatabaseZap, ShieldCheck } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-md group-hover:bg-brand-700 transition-colors">
            <DatabaseZap className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-sm tracking-tight text-surface-900 uppercase">
              Andhra Soft Tech
            </h1>
            <p className="text-[11px] font-semibold tracking-wider text-brand-600 uppercase">
              Lead Finder
            </p>
          </div>
        </Link>
      </div>

      {/* Main card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-card rounded-2xl border border-surface-200">
          <Outlet />
        </div>

        {/* Security badge at bottom */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-surface-400">
          <ShieldCheck className="w-4 h-4 text-surface-400" />
          <span>Enterprise End-to-End Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}
