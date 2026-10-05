import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { ProgressBar } from '../components/common/ProgressBar';
import { formatNumber, formatDate } from '../utils/formatters';

const DEMO_COLLECTIONS = [
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
    status: 'running',
    started_at: '2026-10-04T10:45:00Z',
    completed_at: null,
  },
  {
    id: 'col_72014',
    category: 'Hospitals & Healthcare',
    location: 'Visakhapatnam, AP',
    target_count: 2000,
    found: 2000,
    valid: 1890,
    duplicate: 85,
    failed: 25,
    progress: 100,
    status: 'completed',
    started_at: '2026-10-03T08:30:00Z',
    completed_at: '2026-10-03T09:12:00Z',
  },
  {
    id: 'col_61902',
    category: 'Restaurants & Hospitality',
    location: 'Vijayawada, AP',
    target_count: 3500,
    found: 3500,
    valid: 3120,
    duplicate: 290,
    failed: 90,
    progress: 100,
    status: 'completed',
    started_at: '2026-10-02T14:00:00Z',
    completed_at: '2026-10-02T15:20:00Z',
  },
  {
    id: 'col_54091',
    category: 'Real Estate & Builders',
    location: 'Guntur, AP',
    target_count: 1500,
    found: 1500,
    valid: 1380,
    duplicate: 95,
    failed: 25,
    progress: 100,
    status: 'completed',
    started_at: '2026-10-01T11:15:00Z',
    completed_at: '2026-10-01T12:05:00Z',
  },
  {
    id: 'col_49821',
    category: 'Schools & Educational Institutes',
    location: 'Kakinada, AP',
    target_count: 1000,
    found: 850,
    valid: 780,
    duplicate: 50,
    failed: 20,
    progress: 85,
    status: 'paused',
    started_at: '2026-09-30T16:00:00Z',
    completed_at: null,
  },
];

const statusVariantMap = {
  running: 'running',
  completed: 'completed',
  paused: 'duplicate',
  failed: 'failed',
  cancelled: 'neutral',
  pending: 'pending',
};

export function Collections() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { onOpenNewJob } = useOutletContext() || {};
  const navigate = useNavigate();

  const filtered = DEMO_COLLECTIONS.filter((col) => {
    const matchesSearch =
      !searchTerm ||
      col.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.id.toLowerCase().includes(searchTerm.toLowerCase());
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
            Asynchronous vendor batch collection jobs and crawler telemetry.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          iconLeft={Plus}
          onClick={onOpenNewJob}
        >
          New Collection Job
        </Button>
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
              { value: 'failed', label: 'Failed' },
            ]}
          />
        </div>
      </div>

      {/* Collections Table (Section 25) */}
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
              {filtered.map((col) => (
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
                        value={col.progress}
                        size="sm"
                        color={col.status === 'completed' ? 'emerald' : 'brand'}
                      />
                      <span className="font-semibold text-[11px] w-8">{col.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-surface-700">
                    <span className="font-bold text-surface-900">{formatNumber(col.found)}</span>
                    <span className="text-surface-400"> / {formatNumber(col.target_count)}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-700">
                    {formatNumber(col.valid)}
                  </td>
                  <td className="py-3.5 px-4 text-amber-700 font-medium">
                    {formatNumber(col.duplicate)}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={statusVariantMap[col.status] || 'neutral'}
                      dot
                      pulse={col.status === 'running'}
                    >
                      {col.status.toUpperCase()}
                    </Badge>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
