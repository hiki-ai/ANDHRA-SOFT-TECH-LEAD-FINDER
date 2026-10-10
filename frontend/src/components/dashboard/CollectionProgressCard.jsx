import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Pause,
  Play,
  XCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  FileCheck,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export function CollectionProgressCard({
  job,
  onPause,
  onResume,
  onCancel,
  className,
}) {
  if (!job) return null;

  const {
    id = '',
    category = 'General',
    location = 'N/A',
    target_count = 0,
    found = 0,
    valid = 0,
    duplicate = 0,
    failed = 0,
    progress = 0,
    status = 'pending',
    current_source = 'Public Directory Connector',
    elapsed_time = '0s',
    estimated_remaining = '--',
  } = job;

  const statusVariantMap = {
    running: 'running',
    paused: 'duplicate',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'neutral',
    pending: 'pending',
  };

  return (
    <div
      className={cn(
        'bg-white border border-surface-200/90 rounded-2xl p-5 shadow-card transition-all duration-200',
        className
      )}
    >
      {/* Header: Title, Category, Location & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-surface-900">
                {category} Leads
              </h3>
              <Badge variant={statusVariantMap[status] || 'neutral'} dot pulse={status === 'running'}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Region: <span className="font-medium text-surface-700">{location}</span> • Job ID:{' '}
              <span className="font-mono text-surface-600">{id}</span>
            </p>
          </div>
        </div>

        {/* Source connector info */}
        <div className="flex items-center gap-2 text-xs bg-surface-50 px-3 py-1.5 rounded-xl border border-surface-200/70 text-surface-600 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate max-w-[200px]">{current_source}</span>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
        <div className="bg-surface-50/70 rounded-xl p-3 border border-surface-100">
          <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider block mb-1">
            Found
          </span>
          <span className="text-lg font-bold text-surface-900">
            {formatNumber(found)}
          </span>
          <span className="text-[10px] text-surface-400 block mt-0.5">
            of {formatNumber(target_count)} target
          </span>
        </div>

        <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Valid
          </span>
          <span className="text-lg font-bold text-emerald-800">
            {formatNumber(valid)}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-0.5">
            {found > 0 ? formatPercent((valid / found) * 100) : '0%'} yield
          </span>
        </div>

        <div className="bg-amber-50/40 rounded-xl p-3 border border-amber-100">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block mb-1">
            Duplicate
          </span>
          <span className="text-lg font-bold text-amber-800">
            {formatNumber(duplicate)}
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">
            deduplicated
          </span>
        </div>

        <div className="bg-rose-50/40 rounded-xl p-3 border border-rose-100">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Failed
          </span>
          <span className="text-lg font-bold text-rose-800">
            {formatNumber(failed)}
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5">
            validation errors
          </span>
        </div>
      </div>

      {/* Progress Bar & Timing */}
      <div className="space-y-2 pt-2 pb-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-surface-600">
            <FileCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Target Progress ({formatNumber(found)} / {formatNumber(target_count)})</span>
          </div>
          <span className="font-bold text-surface-900">{progress}%</span>
        </div>

        <ProgressBar
          value={progress}
          size="md"
          color={status === 'completed' ? 'emerald' : status === 'failed' ? 'rose' : 'brand'}
          animated={status === 'running'}
        />

        <div className="flex items-center justify-between text-[11px] text-surface-400 pt-0.5">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Elapsed: <span className="font-medium text-surface-600">{elapsed_time}</span></span>
          </div>
          {status === 'running' && (
            <span>Est. Remaining: <span className="font-medium text-surface-600">{estimated_remaining}</span></span>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-100">
        <div className="flex items-center gap-2">
          {status === 'running' && onPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={onPause}
              iconLeft={Pause}
            >
              Pause
            </Button>
          )}

          {status === 'paused' && onResume && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResume}
              iconLeft={Play}
            >
              Resume
            </Button>
          )}

          {(status === 'running' || status === 'paused') && onCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              iconLeft={XCircle}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Cancel
            </Button>
          )}
        </div>

        <Link to={`/collections/${id}`}>
          <Button
            size="sm"
            variant="secondary"
            iconRight={ExternalLink}
          >
            View Results
          </Button>
        </Link>
      </div>
    </div>
  );
}
