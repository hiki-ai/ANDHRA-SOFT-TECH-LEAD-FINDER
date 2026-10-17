import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Database,
  TableProperties,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ProgressBar } from '../components/common/ProgressBar';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { formatNumber, formatPercent, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { collectionService } from '../services/collectionService';
import { exportService } from '../services/exportService';
import { vendorService } from '../services/vendorService';
import { buildFurnitureLeadsColumns, validateAndNormalizeColumns } from '../utils/tableSchema';

export function CollectionDetails() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Collection Vendors Table State
  const [vendorList, setVendorList] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatus, setVendorStatus] = useState('');
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorTotal, setVendorTotal] = useState(0);

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

  // Load vendors belonging to this collection
  const loadCollectionVendors = useCallback(async () => {
    if (!id) return;
    setVendorsLoading(true);
    try {
      const res = await vendorService.getVendors({
        collection_id: id,
        page: vendorPage,
        limit: 15,
        search: vendorSearch.trim() || undefined,
        status: vendorStatus || undefined,
      });
      const data = res?.data || res;
      if (data) {
        setVendorList(data.items || []);
        setVendorTotal(data.pagination?.total ?? (data.items || []).length);
      }
    } catch (vErr) {
      console.warn('[CollectionDetails] Could not fetch collection vendors:', vErr);
    } finally {
      setVendorsLoading(false);
    }
  }, [id, vendorPage, vendorSearch, vendorStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCollectionVendors();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadCollectionVendors]);

  // Resolve preset columns for this job
  const activeColumns = useMemo(() => {
    if (job?.preset_columns && Array.isArray(job.preset_columns) && job.preset_columns.length > 0) {
      return job.preset_columns.filter((c) => c && c.is_enabled !== false);
    }
    // Fallback to standard 5 furniture leads columns
    return buildFurnitureLeadsColumns().filter((c) => c.is_enabled);
  }, [job]);

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
      toast.success('Excel export downloaded successfully.');
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

  // Safely get cell value from record
  const getCellValue = (vendor, col) => {
    if (!vendor || typeof vendor !== 'object') return '—';
    const key = col.key || col.name;
    let val = vendor[key];
    if (val === undefined || val === null || val === '') {
      if (vendor.custom_fields && typeof vendor.custom_fields === 'object') {
        val = vendor.custom_fields[key];
      }
    }
    if ((val === undefined || val === null || val === '') && key === 'source_id') {
      val = vendor.place_id;
    }
    if ((val === undefined || val === null || val === '') && key === 'place_id') {
      val = vendor.source_id;
    }
    return val !== undefined && val !== null && val !== '' ? val : '—';
  };

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
              <span className="font-mono text-surface-700">{job.id}</span> • Preset:{' '}
              <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                {job.preset_name || 'Furniture Leads'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
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

          <Link to={`/vendors?collection=${job.id}&preset=${job.preset_id || ''}`}>
            <Button variant="secondary" size="sm" iconRight={ExternalLink}>
              Open in Lead Database
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
                {activeColumns.map((col, idx) => (
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
                <span>Preset-specific field persistence</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-surface-100 flex flex-col gap-2">
            <Link to="/table-editor">
              <Button variant="outline" size="sm" fullWidth iconLeft={TableProperties}>
                Open Table Editor
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Preset-Specific Vendor Leads Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-surface-900">
                Extracted Leads — {job.preset_name || 'Preset'} Table View
              </h2>
              <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">
                {vendorTotal} Leads
              </span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Displaying exact configured preset columns in order #{1} to #{activeColumns.length}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48">
              <Input
                placeholder="Search leads..."
                value={vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setVendorPage(1);
                }}
                iconLeft={Search}
                size="sm"
              />
            </div>
            <div className="w-36">
              <Select
                value={vendorStatus}
                onChange={(e) => {
                  setVendorStatus(e.target.value);
                  setVendorPage(1);
                }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'valid', label: 'Valid Leads' },
                  { value: 'duplicate', label: 'Duplicates' },
                  { value: 'invalid', label: 'Review / Invalid' },
                ]}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Table */}
        <div className="overflow-x-auto rounded-xl border border-surface-200">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold text-surface-600 uppercase tracking-wider">
                {activeColumns.map((col, idx) => (
                  <th key={col.key || idx} className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-surface-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span>{col.label}</span>
                      {col.is_required && (
                        <span className="text-rose-500 font-bold" title="Required field">*</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {vendorsLoading ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="py-12 text-center text-surface-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Loading records for this collection...</span>
                    </div>
                  </td>
                </tr>
              ) : vendorList.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="py-12 text-center">
                    <p className="text-xs text-surface-500">
                      No leads found for this collection matching your filter.
                    </p>
                  </td>
                </tr>
              ) : (
                vendorList.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="table-row-hover transition-colors cursor-pointer group"
                  >
                    {activeColumns.map((col) => {
                      const val = getCellValue(vendor, col);
                      return (
                        <td key={col.key} className="py-3 px-4 text-surface-700 max-w-[220px] truncate">
                          {col.key === 'business_name' ? (
                            <span className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                              {val}
                            </span>
                          ) : col.key === 'website' && val !== '—' ? (
                            <a
                              href={String(val).startsWith('http') ? val : `https://${val}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand-600 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate">{val}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : col.key === 'rating' && val !== '—' ? (
                            <div className="flex items-center gap-1 text-surface-800">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{val}</span>
                            </div>
                          ) : col.key === 'status' ? (
                            <Badge variant={val === '—' ? 'default' : String(val).toLowerCase()} dot>
                              {String(val).toUpperCase()}
                            </Badge>
                          ) : col.key === 'data_quality_score' && val !== '—' ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                              {val}%
                            </span>
                          ) : (
                            <span>{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vendors/${vendor.id}`);
                        }}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {vendorTotal > 15 && (
          <div className="flex items-center justify-between pt-3 text-xs text-surface-500">
            <span>
              Page {vendorPage} of {Math.max(1, Math.ceil(vendorTotal / 15))} ({vendorTotal} total records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={vendorPage <= 1}
                onClick={() => setVendorPage((p) => Math.max(1, p - 1))}
                iconLeft={ChevronLeft}
              >
                Prev
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={vendorPage >= Math.ceil(vendorTotal / 15)}
                onClick={() => setVendorPage((p) => p + 1)}
                iconRight={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionDetails;
