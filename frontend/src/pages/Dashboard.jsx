import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Loader } from '../components/common/Loader';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { CollectionProgressCard } from '../components/dashboard/CollectionProgressCard';
import { RecentCollectionsTable } from '../components/dashboard/RecentCollectionsTable';
import { formatNumber, formatPercent } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { dashboardService } from '../services/dashboardService';
import { collectionService } from '../services/collectionService';

export function Dashboard() {
  const { onOpenNewJob } = useOutletContext() || {};
  const toast = useToast();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_vendors: 0,
    valid_vendors: 0,
    duplicate_vendors: 0,
    invalid_vendors: 0,
    avg_quality_score: 0,
    total_collections: 0,
    active_jobs: 0,
    active_job: null,
    recent_collections: [],
    categories: [],
    cities: [],
    quality_distribution: { high: 0, medium: 0, low: 0 },
    is_live_firestore: false,
  });

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await dashboardService.getStats();
      if (data) {
        setStats({
          total_vendors: data.total_vendors || 0,
          valid_vendors: data.valid_vendors || 0,
          duplicate_vendors: data.duplicate_vendors || 0,
          invalid_vendors: data.invalid_vendors || 0,
          avg_quality_score: data.avg_quality_score || 0,
          total_collections: data.total_collections || 0,
          active_jobs: data.active_jobs || 0,
          active_job: data.active_job || null,
          recent_collections: data.recent_collections || [],
          categories: data.categories || data.categories_distribution || [],
          cities: data.cities || data.cities_distribution || [],
          quality_distribution: data.quality_distribution || { high: 0, medium: 0, low: 0 },
          is_live_firestore: Boolean(data.is_live_firestore),
        });
        setError(null);
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching telemetry:', err);
      const friendlyMsg = err?.status === 401
        ? 'Session expired or unauthorized. Please re-authenticate as an administrator.'
        : (err?.message || 'Failed to load live database telemetry. Please ensure the backend API is running.');
      setError(friendlyMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Wait until Firebase Auth restores session before making protected requests
    if (authLoading) return;
    if (!isAuthenticated) return;

    fetchStats();
    // Auto-refresh stats periodically only when backend is healthy to avoid hammering an unavailable backend
    const timer = setInterval(() => {
      if (!error) {
        fetchStats(true);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchStats, authLoading, isAuthenticated, error]);

  const handlePause = async () => {
    if (!stats.active_job?.id) return;
    try {
      await collectionService.pauseCollection(stats.active_job.id);
      toast.info('Collection job paused.');
      fetchStats(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to pause collection');
    }
  };

  const handleResume = async () => {
    if (!stats.active_job?.id) return;
    try {
      await collectionService.resumeCollection(stats.active_job.id);
      toast.info('Collection job resumed.');
      fetchStats(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to resume collection');
    }
  };

  const handleCancel = async () => {
    if (!stats.active_job?.id) return;
    try {
      await collectionService.cancelCollection(stats.active_job.id);
      toast.warning('Collection job cancelled.');
      fetchStats(true);
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel collection');
    }
  };

  const total = stats.total_vendors || 0;
  const highQualityPct = total > 0 ? ((stats.quality_distribution.high / total) * 100).toFixed(1) : 0;
  const medQualityPct = total > 0 ? ((stats.quality_distribution.medium / total) * 100).toFixed(1) : 0;
  const lowQualityPct = total > 0 ? ((stats.quality_distribution.low / total) * 100).toFixed(1) : 0;
  const validPct = total > 0 ? `${((stats.valid_vendors / total) * 100).toFixed(1)}%` : '0%';

  if (authLoading || (loading && !refreshing && !error)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader
          size="lg"
          text={authLoading ? "Verifying administrative session authorization..." : "Connecting to backend and aggregating real-time Firestore telemetry..."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">
              Lead Finder
            </h1>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                stats.is_live_firestore
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-surface-100 text-surface-600 border-surface-200'
              }`}
            >
              {stats.is_live_firestore ? 'FIRESTORE CLOUD LIVE' : 'FIRESTORE READY'}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Real-time telemetry and management across verified vendor repositories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            iconLeft={RefreshCw}
            loading={refreshing}
            onClick={() => fetchStats(false)}
          >
            Refresh
          </Button>
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

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900">Backend Connection Notice</h4>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchStats(false)}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Vendors"
          value={formatNumber(stats.total_vendors)}
          subtitle="In Firestore database"
          icon={Users}
          iconBg="bg-brand-50 text-brand-600"
        />

        <StatCard
          title="Valid Vendors"
          value={formatNumber(stats.valid_vendors)}
          subtitle="Clean & verified"
          trend={validPct}
          trendDirection="up"
          icon={CheckCircle2}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Duplicates"
          value={formatNumber(stats.duplicate_vendors)}
          subtitle="Deduplicated by key"
          icon={Copy}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Failed Records"
          value={formatNumber(stats.invalid_vendors)}
          subtitle="Validation errors"
          icon={AlertOctagon}
          iconBg="bg-rose-50 text-rose-600"
        />

        <StatCard
          title="Collections"
          value={formatNumber(stats.total_collections)}
          subtitle="Total batch jobs"
          icon={Layers}
          iconBg="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Data Quality"
          value={`${stats.avg_quality_score}%`}
          subtitle="Average score"
          icon={Award}
          iconBg="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Live Collection Status Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-surface-900 flex items-center gap-2">
            <span>Active Collection Monitor</span>
            {stats.active_job ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-surface-300" />
            )}
          </h2>
          <Link
            to="/collections"
            className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
          >
            <span>View All Collections</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats.active_job ? (
          <CollectionProgressCard
            job={stats.active_job}
            onPause={handlePause}
            onResume={handleResume}
            onCancel={handleCancel}
          />
        ) : (
          <div className="bg-white border border-surface-200/90 rounded-2xl p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-500 shrink-0">
                <Radio className="w-5 h-5 text-surface-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-800">
                  No Active Collection In Progress
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Start an extraction job or upload a spreadsheet to populate the vendor database.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/import">
                <Button size="sm" variant="outline">
                  Import Spreadsheet
                </Button>
              </Link>
              <Button size="sm" variant="primary" iconLeft={Plus} onClick={onOpenNewJob}>
                Start Collection
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Analytics & Category Breakdown */}
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
            {stats.categories && stats.categories.length > 0 ? (
              stats.categories.map((cat, idx) => {
                const colors = ['bg-brand-600', 'bg-indigo-600', 'bg-blue-600', 'bg-purple-600', 'bg-slate-600'];
                const color = colors[idx % colors.length];
                return (
                  <div key={cat.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-surface-700">{cat.label}</span>
                      <span className="font-semibold text-surface-900">{formatNumber(cat.count)}</span>
                    </div>
                    <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${cat.pct || 0}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-surface-400">
                No categories recorded yet. Import vendors or start a collection.
              </div>
            )}
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200/90 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              <span>Vendors by Location</span>
            </h3>
            <span className="text-[11px] text-surface-400">Top Hubs</span>
          </div>

          <div className="space-y-3 mt-4">
            {stats.cities && stats.cities.length > 0 ? (
              stats.cities.map((loc) => (
                <div key={loc.city} className="flex items-center justify-between text-xs p-2 rounded-xl bg-surface-50/70 border border-surface-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-500" />
                    <span className="font-semibold text-surface-800">{loc.city}</span>
                  </div>
                  <span className="font-bold text-surface-900">{formatNumber(loc.count)}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-surface-400">
                No location data recorded yet.
              </div>
            )}
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
              <span className="text-[11px] text-emerald-600 font-semibold">{stats.avg_quality_score}% Avg</span>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-600">High Quality (85%+)</span>
                <span className="font-semibold text-emerald-700">
                  {formatNumber(stats.quality_distribution.high)} ({highQualityPct}%)
                </span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${highQualityPct}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-surface-600">Medium Quality (60-84%)</span>
                <span className="font-semibold text-amber-700">
                  {formatNumber(stats.quality_distribution.medium)} ({medQualityPct}%)
                </span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${medQualityPct}%` }} />
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-surface-600">Needs Review (&lt;60%)</span>
                <span className="font-semibold text-rose-700">
                  {formatNumber(stats.quality_distribution.low)} ({lowQualityPct}%)
                </span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${lowQualityPct}%` }} />
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

      {/* Recent Collections Table */}
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

        <RecentCollectionsTable collections={stats.recent_collections} />
      </div>
    </div>
  );
}

export default Dashboard;
