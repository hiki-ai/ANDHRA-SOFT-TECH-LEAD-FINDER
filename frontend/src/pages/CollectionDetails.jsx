import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { formatNumber, formatPercent, formatDate } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function CollectionDetails() {
  const { id } = useParams();
  const toast = useToast();

  const [job, setJob] = useState({
    id: id || 'col_88329',
    category: 'Furniture & Interiors',
    location: 'Rajahmundry, Andhra Pradesh',
    target_count: 5000,
    found: 4820,
    valid: 4210,
    duplicate: 410,
    failed: 200,
    progress: 96,
    status: 'running',
    source_name: 'Official Public Commercial Registry (Connector A)',
    rate_limit: '60 req/min',
    concurrency: 4,
    started_at: '2026-10-04T10:45:00Z',
    estimated_end: '2026-10-04T11:00:00Z',
    error_summary: [
      { code: 'PHONE_MISSING', count: 125, message: 'Vendor entry missing verifiable telephone number' },
      { code: 'ADDRESS_MALFORMED', count: 75, message: 'Incomplete geographic address bounds' },
    ],
  });

  const handlePauseToggle = () => {
    if (job.status === 'running') {
      setJob((prev) => ({ ...prev, status: 'paused' }));
      toast.info('Collection job suspended.');
    } else {
      setJob((prev) => ({ ...prev, status: 'running' }));
      toast.success('Collection job resumed.');
    }
  };

  const handleExport = () => {
    toast.success(`Exporting ${formatNumber(job.valid)} valid leads from job ${job.id} to Excel.`);
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
                {job.category} — {job.location}
              </h1>
              <Badge variant={job.status === 'running' ? 'running' : 'completed'} dot pulse={job.status === 'running'}>
                {job.status.toUpperCase()}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block mb-1">
            Found Records
          </span>
          <span className="text-2xl font-bold text-surface-900">{formatNumber(job.found)}</span>
          <span className="text-xs text-surface-400 block mt-1">
            Target: {formatNumber(job.target_count)}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Valid Leads
          </span>
          <span className="text-2xl font-bold text-emerald-800">{formatNumber(job.valid)}</span>
          <span className="text-xs text-emerald-600 block mt-1">
            {formatPercent((job.valid / job.found) * 100)} conversion
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
            Duplicates
          </span>
          <span className="text-2xl font-bold text-amber-800">{formatNumber(job.duplicate)}</span>
          <span className="text-xs text-amber-600 block mt-1">
            Auto-deduplicated
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Validation Errors
          </span>
          <span className="text-2xl font-bold text-rose-800">{formatNumber(job.failed)}</span>
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
            <span className="text-xs font-semibold text-brand-600">{job.progress}% Complete</span>
          </h2>

          <ProgressBar value={job.progress} size="lg" animated={job.status === 'running'} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-surface-400 font-semibold block uppercase text-[10px]">
                Connected Source
              </span>
              <span className="font-medium text-surface-800 mt-1 block">
                {job.source_name}
              </span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-surface-400 font-semibold block uppercase text-[10px]">
                Throttle & Concurrency
              </span>
              <span className="font-medium text-surface-800 mt-1 block">
                {job.rate_limit} • {job.concurrency} concurrent threads
              </span>
            </div>
          </div>

          {/* Validation & Error Breakdown */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-surface-700 uppercase tracking-wider mb-2">
              Error / Rejection Breakdown
            </h3>
            <div className="space-y-2">
              {job.error_summary.map((err) => (
                <div
                  key={err.code}
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      {err.code}
                    </span>
                    <span className="text-surface-700">{err.message}</span>
                  </div>
                  <span className="font-bold text-rose-800">{err.count} records</span>
                </div>
              ))}
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
