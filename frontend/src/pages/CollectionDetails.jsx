import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Layers,
  Download,
  Pause,
  Play,
  XCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  FileSpreadsheet,
  Users,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { formatNumber, formatPercent, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { collectionService } from '../services/collectionService';
import { exportService } from '../services/exportService';

export function CollectionDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchJob = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await collectionService.getCollectionById(id);
      const data = res?.data || res;
      if (data && data.id) {
        setJob(data);
      } else {
        setError('Collection job not found.');
      }
    } catch (err) {
      console.error('[CollectionDetails] Error fetching job:', err);
      setError(err?.message || 'Collection job not found in Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  const handlePauseToggle = async () => {
    if (!job?.id) return;
    try {
      if (job.status === 'running') {
        await collectionService.pauseCollection(job.id);
        setJob((prev) => ({ ...prev, status: 'paused' }));
        toast.info('Collection job suspended.');
      } else {
        await collectionService.resumeCollection(job.id);
        setJob((prev) => ({ ...prev, status: 'running' }));
        toast.success('Collection job resumed.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to update job status.');
    }
  };

  const handleExport = async () => {
    if (!job) return;
    setExporting(true);
    try {
      toast.info(`Generating Excel export for ${job.category || 'leads'}...`);
      await exportService.downloadDirectly({
        collection_id: job.id,
        preset_id: job.preset_id || undefined,
        category: job.category || undefined,
        city: job.location || undefined,
        format: 'xlsx',
      });
      toast.success('Excel export generated.');
    } catch (err) {
      toast.error(err?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-3" />
        <p className="text-xs text-surface-500 font-medium">Loading collection telemetry from database...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: 'Collections', to: '/collections' }, { label: 'Not Found' }]} />
        <div className="bg-white p-8 rounded-2xl border border-surface-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-surface-900">Collection Not Found</h2>
          <p className="text-xs text-surface-500 max-w-sm mx-auto">
            {error || `The collection ID "${id}" does not exist in the database.`}
          </p>
          <div>
            <Link to="/collections">
              <Button variant="primary" size="sm" iconLeft={ArrowLeft}>
                Back to Collections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const foundCount = job.found_count ?? job.found ?? 0;
  const validCount = job.valid_count ?? job.valid ?? 0;
  const duplicateCount = job.duplicate_count ?? job.duplicate ?? 0;
  const failedCount = job.failed_count ?? job.failed ?? 0;
  const yieldPct = foundCount > 0 ? ((validCount / foundCount) * 100).toFixed(1) : '0';

  const resolvedSourceName =
    job.source_name ||
    job.current_source ||
    (job.source === 'google_places' ? 'Google Maps / Google Places API' : (job.source || 'Google Maps / Google Places API'));

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Collections', to: '/collections' },
          { label: `Job ${job.id}` },
        ]}
      />

      {/* Top Banner / Actions */}
      <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg border border-brand-100 shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-surface-900 tracking-tight">
                {job.category || 'Vendor Extraction'} — {job.location || 'All AP'}
              </h1>
              <Badge variant={job.status || 'pending'} dot pulse={job.status === 'running'}>
                {String(job.status || 'pending').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Started: <span className="font-medium text-surface-700">{formatDate(job.started_at)}</span> • ID:{' '}
              <span className="font-mono text-surface-700">{job.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {job.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={Pause}
              onClick={handlePauseToggle}
            >
              Pause Job
            </Button>
          )}

          {job.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={Play}
              onClick={handlePauseToggle}
            >
              Resume Job
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            iconLeft={Download}
            loading={exporting}
            onClick={handleExport}
          >
            Export to Excel
          </Button>

          <Link to="/vendors">
            <Button variant="secondary" size="sm" iconRight={ExternalLink}>
              View Vendors
            </Button>
          </Link>
        </div>
      </div>

      {/* Actionable Error Alert if Failed */}
      {(job.status === 'failed' || job.error_message) && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-xs text-rose-900 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <h3 className="font-bold text-sm text-rose-900">
              {job.status === 'failed' ? 'Collection Job Failed' : 'Collection Execution Notice'}
            </h3>
          </div>
          <p className="text-rose-800 leading-relaxed font-mono bg-white/70 p-3 rounded-xl border border-rose-200/80">
            {job.error_message || 'The data extraction encountered an unconfigured connector or execution error.'}
          </p>
          <div className="text-[11px] text-rose-700 space-y-1 pt-1">
            {(job.error_message || '').includes('NOT_CONFIGURED') && (
              <p className="flex items-start gap-1.5">
                <span className="font-bold">Next Action:</span>
                <span>Configure <code>GOOGLE_MAPS_API_KEY</code> in the Render dashboard environment variables for this service.</span>
              </p>
            )}
            {(job.error_message || '').includes('REQUEST_DENIED') && (
              <p className="flex items-start gap-1.5">
                <span className="font-bold">Next Action:</span>
                <span>Verify Places API is enabled on Google Cloud project <code>andhra-soft-tech-lead-finder</code>, and confirm the API key has no HTTP Referrer restrictions blocking server-side requests.</span>
              </p>
            )}
            {(job.error_message || '').includes('QUOTA_EXCEEDED') && (
              <p className="flex items-start gap-1.5">
                <span className="font-bold">Next Action:</span>
                <span>Verify that billing is enabled for Google Cloud project <code>andhra-soft-tech-lead-finder</code>.</span>
              </p>
            )}
            {(job.error_message || '').includes('AUTHORIZATION_REQUIRED') && (
              <p className="flex items-start gap-1.5">
                <span className="font-bold">Next Action:</span>
                <span>An official commercial enterprise partner agreement is required to activate this source.</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block mb-1">
            Found Records
          </span>
          <span className="text-2xl font-bold text-surface-900">{formatNumber(foundCount)}</span>
          <span className="text-xs text-surface-400 block mt-1">
            Target: {formatNumber(job.target_count || 0)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Valid Leads
          </span>
          <span className="text-2xl font-bold text-emerald-800">{formatNumber(validCount)}</span>
          <span className="text-xs text-emerald-600 block mt-1">
            {yieldPct}% conversion
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
            Duplicates
          </span>
          <span className="text-2xl font-bold text-amber-800">{formatNumber(duplicateCount)}</span>
          <span className="text-xs text-amber-600 block mt-1">
            Auto-deduplicated
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Validation Errors
          </span>
          <span className="text-2xl font-bold text-rose-800">{formatNumber(failedCount)}</span>
          <span className="text-xs text-rose-600 block mt-1">
            Saved for review
          </span>
        </div>
      </div>

      {/* Configuration & Pipeline Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-surface-200 shadow-card space-y-5">
          <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider pb-2 border-b border-surface-100 flex items-center justify-between">
            <span>Collection Pipeline Telemetry</span>
            <span className="text-xs font-semibold text-brand-600">{job.progress || 0}% Complete</span>
          </h2>

          <ProgressBar value={job.progress || 0} size="lg" animated={job.status === 'running'} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-surface-400 font-semibold block uppercase text-[10px]">
                Connected Source
              </span>
              <span className="font-medium text-surface-800 mt-1 block">
                {resolvedSourceName}
              </span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-surface-400 font-semibold block uppercase text-[10px]">
                Concurrency & Throttle
              </span>
              <span className="font-medium text-surface-800 mt-1 block">
                {job.rate_limit || '60 req/min'} • {job.concurrency || 2} concurrent threads
              </span>
            </div>
          </div>

          {/* Table Preset Schema Snapshot */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Configured Table Schema (Export Order)</span>
              <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                {job.preset_name || 'Furniture Leads'}
              </span>
            </h3>
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200/80">
              <div className="flex flex-wrap gap-1.5">
                {(job.preset_columns && job.preset_columns.length > 0
                  ? job.preset_columns
                  : [
                      { label: 'Business Name', key: 'business_name', is_required: true },
                      { label: 'Category', key: 'category' },
                      { label: 'Phone', key: 'phone' },
                      { label: 'Address', key: 'address' },
                      { label: 'Website', key: 'website' },
                    ]
                ).map((col, idx) => (
                  <span
                    key={col.key || idx}
                    className="inline-flex items-center gap-1.5 text-[11px] bg-white border border-surface-200 px-2.5 py-1 rounded-md text-surface-700 shadow-sm"
                  >
                    <span className="text-surface-400 font-mono text-[10px]">#{idx + 1}</span>
                    <span className="font-medium">{col.label}</span>
                    {col.is_required && (
                      <span className="text-rose-500 font-bold text-xs" title="Required field">*</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Validation & Error Breakdown */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Error / Diagnostic Breakdown
            </h3>
            {job.error_summary && job.error_summary.length > 0 ? (
              <div className="space-y-2">
                {job.error_summary.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        {err.code || 'VALIDATION_ERR'}
                      </span>
                      <span className="text-surface-700">{err.message}</span>
                    </div>
                    <span className="font-bold text-rose-800">{err.count} records</span>
                  </div>
                ))}
              </div>
            ) : job.error_message ? (
              <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200/80 text-xs text-rose-800 space-y-1">
                <span className="font-semibold block text-rose-900">Diagnostics:</span>
                <p className="font-mono">{job.error_message}</p>
              </div>
            ) : (
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-100 text-xs text-surface-500 text-center">
                No error reports recorded for this collection.
              </div>
            )}
          </div>
        </div>

        {/* Source Compliance & Safety Notice */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card space-y-4 text-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-surface-900 uppercase tracking-wider text-xs pb-2 border-b border-surface-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              <span>Compliance Guarantee</span>
            </h3>
            <p className="text-surface-600 leading-relaxed mt-3">
              This job runs in accordance with Andhra Soft Tech's zero-bypass policy:
            </p>
            <ul className="space-y-2 mt-3 text-surface-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Exponential backoff on 429 rate limit responses</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero anti-bot or CAPTCHA circumvention</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Batch upserting directly to Firebase Firestore</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-surface-100">
            <Link to="/data-editor">
              <Button variant="outline" size="sm" fullWidth iconLeft={FileSpreadsheet}>
                Open in Spreadsheet Editor
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionDetails;
