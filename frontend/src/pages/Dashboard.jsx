import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Copy,
  AlertOctagon,
  Layers,
  Award,
  Plus,
  Play,
  ArrowRight,
  TrendingUp,
  MapPin,
  Tag,
  Download,
  Filter,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { CollectionProgressCard } from '../components/dashboard/CollectionProgressCard';
import { RecentCollectionsTable } from '../components/dashboard/RecentCollectionsTable';
import { formatNumber, formatPercent } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function Dashboard() {
  const { onOpenNewJob } = useOutletContext() || {};
  const toast = useToast();

  // Active collection job simulation state
  const [activeJob, setActiveJob] = useState({
    id: 'col_88329',
    category: 'Furniture & Interiors',
    location: 'Rajahmundry, Andhra Pradesh',
    target_count: 5000,
    found: 4820,
    valid: 4210,
    duplicate: 410,
    failed: 200,
    progress: 96,
    status: 'running',
    current_source: 'Public Directory Connector (Source A)',
    elapsed_time: '12m 45s',
    estimated_remaining: '1m 20s',
  });

  const handlePause = () => {
    setActiveJob((prev) => ({ ...prev, status: 'paused' }));
    toast.info('Collection job paused.');
  };

  const handleResume = () => {
    setActiveJob((prev) => ({ ...prev, status: 'running' }));
    toast.info('Collection job resumed.');
  };

  const handleCancel = () => {
    setActiveJob((prev) => ({ ...prev, status: 'cancelled' }));
    toast.warning('Collection job cancelled.');
  };

  // Mock recent collections list
  const recentCollections = [
    {
      id: 'col_88329',
      category: 'Furniture & Interiors',
      location: 'Rajahmundry, AP',
      target_count: 5000,
      found: 4820,
      valid: 4210,
      duplicate: 410,
      failed: 200,
      progress: 96,
      status: activeJob.status,
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: 'col_72014',
      category: 'Hospitals & Clinics',
      location: 'Visakhapatnam, AP',
      target_count: 2000,
      found: 2000,
      valid: 1890,
      duplicate: 85,
      failed: 25,
      progress: 100,
      status: 'completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'col_61902',
      category: 'Restaurants & Cafes',
      location: 'Vijayawada, AP',
      target_count: 3500,
      found: 3500,
      valid: 3120,
      duplicate: 290,
      failed: 90,
      progress: 100,
      status: 'completed',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Lead Finder
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Collect and manage vendor leads across permitted sources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/data-editor">
            <Button variant="outline" size="sm">
              Spreadsheet View
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Plus}
            onClick={onOpenNewJob}
          >
            Start Collection
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards (Section 27) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Vendors"
          value={formatNumber(142500)}
          subtitle="In PostgreSQL repository"
          trend="+12.4%"
          trendDirection="up"
          icon={Users}
          iconBg="bg-brand-50 text-brand-600"
        />

        <StatCard
          title="Valid Vendors"
          value={formatNumber(126300)}
          subtitle="Clean & verified"
          trend="88.6%"
          trendDirection="up"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Duplicates"
          value={formatNumber(11850)}
          subtitle="Deduplicated by key"
          icon={Copy}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Failed Records"
          value={formatNumber(4350)}
          subtitle="Pending review/invalid"
          icon={AlertOctagon}
          iconBg="bg-rose-50 text-rose-600"
        />

        <StatCard
          title="Collections"
          value={formatNumber(48)}
          subtitle="Total batch jobs"
          icon={Layers}
          iconBg="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Data Quality"
          value="91.4%"
          subtitle="Weighted completeness"
          trend="+2.1%"
          trendDirection="up"
          icon={Award}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Live Collection Status Section (Section 12) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
            <span>Active Collection Monitor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </h2>
          <Link
            to="/collections"
            className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
          >
            <span>View All Collections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <CollectionProgressCard
          job={activeJob}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
        />
      </div>

      {/* Analytics & Category Breakdown (Section 27) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200/90 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand-600" />
              <span>Vendors by Category</span>
            </h3>
            <span className="text-[11px] text-surface-400">Top 5</span>
          </div>

          <div className="space-y-3 mt-4">
            {[
              { label: 'Furniture & Woodcraft', count: 42300, pct: 30, color: 'bg-brand-600' },
              { label: 'Restaurants & Hospitality', count: 32150, pct: 23, color: 'bg-indigo-600' },
              { label: 'Hospitals & Healthcare', count: 28400, pct: 20, color: 'bg-blue-600' },
              { label: 'Real Estate & Builders', count: 21900, pct: 15, color: 'bg-purple-600' },
              { label: 'Schools & Institutes', count: 17750, pct: 12, color: 'bg-slate-600' },
            ].map((cat) => (
              <div key={cat.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-surface-700">{cat.label}</span>
                  <span className="font-semibold text-surface-900">{formatNumber(cat.count)}</span>
                </div>
                <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200/90 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Vendors by Location</span>
            </h3>
            <span className="text-[11px] text-surface-400">Top AP Hubs</span>
          </div>

          <div className="space-y-3 mt-4">
            {[
              { city: 'Visakhapatnam', state: 'AP', count: 48900, pct: 34 },
              { city: 'Vijayawada', state: 'AP', count: 36400, pct: 26 },
              { city: 'Rajahmundry', state: 'AP', count: 28100, pct: 20 },
              { city: 'Guntur', state: 'AP', count: 16800, pct: 12 },
              { city: 'Kakinada', state: 'AP', count: 12300, pct: 8 },
            ].map((loc) => (
              <div key={loc.city} className="flex items-center justify-between text-xs p-2 rounded-xl bg-surface-50/70 border border-surface-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-500" />
                  <span className="font-semibold text-surface-800">{loc.city}</span>
                  <span className="text-[10px] text-surface-400 font-mono">({loc.state})</span>
                </div>
                <span className="font-bold text-surface-900">{formatNumber(loc.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality & Integrity Health */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200/90 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Data Quality Distribution</span>
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold">91.4% Avg</span>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-600">High Quality (85%+)</span>
                <span className="font-semibold text-emerald-700">112,400 (78.9%)</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78.9%' }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-surface-600">Medium Quality (60-84%)</span>
                <span className="font-semibold text-amber-700">22,100 (15.5%)</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '15.5%' }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-surface-600">Needs Review (&lt;60%)</span>
                <span className="font-semibold text-rose-700">8,000 (5.6%)</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '5.6%' }} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-100 flex items-center justify-between">
            <span className="text-xs text-surface-500">Auto Deduplication</span>
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
              Active Key Pipeline
            </span>
          </div>
        </div>
      </div>

      {/* Recent Collections Table (Section 25) */}
      <div className="bg-white rounded-2xl border border-surface-200/90 shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-surface-900">
              Recent Collection Jobs
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Historical batches and background extraction operations.
            </p>
          </div>
          <Link to="/collections">
            <Button variant="outline" size="sm">
              All Jobs
            </Button>
          </Link>
        </div>

        <RecentCollectionsTable collections={recentCollections} />
      </div>
    </div>
  );
}
