import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Database,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Search,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';

export function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-surface-50 min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 border-b border-surface-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/80 text-brand-700 text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5 text-brand-600" />
            <span>Scale to 500,000+ Enterprise Leads</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 tracking-tight leading-[1.15]">
            Find Business Leads <span className="text-brand-600">Faster</span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-base sm:text-lg text-surface-600 max-w-2xl mx-auto leading-relaxed">
            Collect, organize, validate and manage business vendor data from permitted data sources in one professional workspace.
          </p>

          {/* CTA Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
              <Button size="lg" variant="primary" iconRight={ArrowRight}>
                {isAuthenticated ? 'Enter Dashboard' : 'Login to Continue'}
              </Button>
            </Link>
            <Link to={isAuthenticated ? '/vendors' : '/login'}>
              <Button size="lg" variant="outline" iconLeft={Search}>
                Explore Vendor Database
              </Button>
            </Link>
          </div>

          {/* Trust points */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-surface-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Official & Permitted Sources Only</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Automated Deduplication Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Full Excel & CSV Roundtrip</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section (Section 8: 3 feature cards) */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
            Enterprise Architecture
          </h2>
          <p className="text-2xl font-bold text-surface-900">
            Engineered for High-Fidelity Lead Operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Lead Collection */}
          <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5 border border-brand-100">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Lead Collection
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                Configurable async collection jobs by industry category, geographic bounds, and target quantity. Includes source throttle, backoff, and live telemetry.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Modular Connectors</span>
              <span className="font-mono text-emerald-600 font-medium">Asynchronous</span>
            </div>
          </div>

          {/* Card 2: Data Management */}
          <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-100">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Data Management
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                PostgreSQL repository with automated deduplication keys, phone normalization, data quality score calculations, and administrator-defined custom fields.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">Dynamic Columns</span>
              <span className="font-mono text-brand-600 font-medium">JSONB / Indexed</span>
            </div>
          </div>

          {/* Card 3: Excel Export */}
          <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">
                Excel Export
              </h3>
              <p className="text-xs text-surface-600 leading-relaxed mb-4">
                Export live edited datasets with frozen headers and clean column widths. Zero truncation or scientific notation corruption on phone numbers and pincodes.
              </p>
            </div>
            <div className="pt-4 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500">
              <span className="font-semibold text-surface-700">OpenPyXL / Pandas</span>
              <span className="font-mono text-blue-600 font-medium">UTF-8 Clean</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
