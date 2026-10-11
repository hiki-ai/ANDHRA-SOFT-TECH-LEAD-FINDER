import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Layers,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Download,
  RefreshCw,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ProgressBar } from '../components/common/ProgressBar';
import { formatNumber, formatDate } from '../utils/formatters';
import { collectionService } from '../services/collectionService';

const statusVariantMap = {
  running: 'running',
  completed: 'completed',
  paused: 'duplicate',
  failed: 'failed',
  cancelled: 'neutral',
  pending: 'pending',
};

export function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { onOpenNewJob } = useOutletContext() || {};
  const navigate = useNavigate();

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await collectionService.getCollections();
      const data = res?.data || res;
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Collections] Load error:', err);
      setError(err?.message || 'Failed to retrieve collections from the backend API.');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const filtered = collections.filter((col) => {
    const matchesSearch =
      !searchTerm ||
      (col.category && col.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (col.location && col.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (col.id && col.id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || col.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">
            Collection History
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Asynchronous vendor batch collection jobs and crawler telemetry stored in Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconLeft={RefreshCw}
            loading={loading}
            onClick={loadCollections}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Plus}
            onClick={onOpenNewJob}
          >
            New Collection Job
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-card flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by collection ID, category, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            iconLeft={Search}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'running', label: 'Running' },
              { value: 'completed', label: 'Completed' },
              { value: 'paused', label: 'Paused' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800 font-medium">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadCollections}>
            Retry
          </Button>
        </div>
      )}

      {/* Collections Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold text-surface-500 uppercase tracking-wider table-sticky-header">
                <th className="py-3 px-4">Collection ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Progress</th>
                <th className="py-3 px-4">Found / Target</th>
                <th className="py-3 px-4">Valid Leads</th>
                <th className="py-3 px-4">Duplicates</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Started</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-surface-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Loading collection jobs from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-surface-200 mx-auto flex items-center justify-center text-surface-400">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-surface-900">
                        No Collection Jobs Found
                      </h3>
                      <p className="text-xs text-surface-500">
                        {searchTerm || statusFilter
                          ? 'No collections match the specified filter criteria.'
                          : 'No extraction jobs have been executed yet.'}
                      </p>
                      <div className="pt-2">
                        <Button size="sm" variant="primary" iconLeft={Plus} onClick={onOpenNewJob}>
                          Start New Collection
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((col) => (
                  <tr
                    key={col.id}
                    onClick={() => navigate(`/collections/${col.id}`)}
                    className="table-row-hover transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-surface-800">
                      {col.id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-surface-900">
                      {col.category}
                    </td>
                    <td className="py-3.5 px-4 text-surface-600">
                      {col.location}
                    </td>
                    <td className="py-3.5 px-4 w-32 text-center">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={col.progress || 0}
                          size="sm"
                          color={col.status === 'completed' ? 'emerald' : 'brand'}
                        />
                        <span className="font-semibold text-[11px] w-8">{col.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-surface-700">
                      <span className="font-bold text-surface-900">{formatNumber(col.found_count ?? col.found ?? 0)}</span>
                      <span className="text-surface-400"> / {formatNumber(col.target_count || 0)}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {formatNumber(col.valid_count ?? col.valid ?? 0)}
                    </td>
                    <td className="py-3.5 px-4 text-amber-700 font-medium">
                      {formatNumber(col.duplicate_count ?? col.duplicate ?? 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={statusVariantMap[col.status] || 'neutral'}
                          dot
                          pulse={col.status === 'running'}
                        >
                          {String(col.status || 'pending').toUpperCase()}
                        </Badge>
                        {col.status === 'failed' && col.error_message && (
                          <span
                            title={col.error_message}
                            className="inline-flex cursor-help text-rose-500 hover:text-rose-700"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-surface-500">
                      {formatDate(col.started_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/collections/${col.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-semibold group-hover:underline"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Collections;
