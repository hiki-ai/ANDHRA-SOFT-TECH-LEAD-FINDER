import React from 'react';
import { Link } from 'react-router-dom';
import { DatabaseZap, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5 border border-brand-100">
        <DatabaseZap className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-surface-900 tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-surface-800 mt-2">Page Not Found</h2>
      <p className="text-xs text-surface-500 max-w-sm mt-1 leading-relaxed mb-6">
        The requested path does not exist or has been relocated within the Andhra Soft Tech Lead Finder platform.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" size="md" iconLeft={Home}>
            Go to Dashboard
          </Button>
        </Link>
        <Button variant="outline" size="md" iconLeft={ArrowLeft} onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
}
