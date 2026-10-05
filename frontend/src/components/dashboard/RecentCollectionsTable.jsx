import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { ChevronRight, Layers } from 'lucide-react';
import { formatNumber, formatDate } from '../../utils/formatters';

const statusVariantMap = {
  running: 'running',
  completed: 'completed',
  paused: 'duplicate',
  failed: 'failed',
  cancelled: 'neutral',
  pending: 'pending',
};

export function RecentCollectionsTable({ collections = [] }) {
  if (!collections || collections.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-surface-400">
        No recent collection jobs recorded.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-surface-200/80 bg-surface-50/50 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
            <th className="py-3 px-4">Collection ID</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Location</th>
            <th className="py-3 px-4">Target / Found</th>
            <th className="py-3 px-4">Valid</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Started</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 text-xs">
          {collections.map((col) => (
            <tr
              key={col.id}
              className="hover:bg-surface-50/70 transition-colors group cursor-pointer"
            >
              <td className="py-3.5 px-4 font-mono font-medium text-surface-700">
                {col.id}
              </td>
              <td className="py-3.5 px-4 font-semibold text-surface-900">
                {col.category}
              </td>
              <td className="py-3.5 px-4 text-surface-600">
                {col.location}
              </td>
              <td className="py-3.5 px-4 text-surface-700">
                <span className="font-semibold text-surface-900">{formatNumber(col.found)}</span>
                <span className="text-surface-400"> / {formatNumber(col.target_count)}</span>
              </td>
              <td className="py-3.5 px-4">
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  {formatNumber(col.valid)}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <Badge
                  variant={statusVariantMap[col.status] || 'neutral'}
                  dot
                  pulse={col.status === 'running'}
                >
                  {col.status.charAt(0).toUpperCase() + col.status.slice(1)}
                </Badge>
              </td>
              <td className="py-3.5 px-4 text-surface-500">
                {formatDate(col.created_at)}
              </td>
              <td className="py-3.5 px-4 text-right">
                <Link
                  to={`/collections/${col.id}`}
                  className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium group-hover:translate-x-0.5 transition-transform"
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
  );
}
