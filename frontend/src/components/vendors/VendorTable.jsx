import React from 'react';
import { VendorRow } from './VendorRow';
import { EmptyState } from '../common/EmptyState';

export function VendorTable({ vendors = [], columns = null }) {
  if (vendors.length === 0) {
    return (
      <EmptyState
        title="No vendors found"
        description="Try adjusting your search criteria or category filter to view matching business leads."
      />
    );
  }

  const enabledColumns = Array.isArray(columns) && columns.length > 0
    ? columns.filter((c) => c && c.is_enabled !== false)
    : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold text-surface-500 uppercase tracking-wider table-sticky-header">
            {enabledColumns ? (
              enabledColumns.map((col, idx) => (
                <th key={col.key || idx} className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <span className="text-surface-400 font-mono text-[10px]">#{idx + 1}</span>
                    <span>{col.label}</span>
                    {col.is_required && <span className="text-rose-500">*</span>}
                  </div>
                </th>
              ))
            ) : (
              <>
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">City / State</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Quality</th>
              </>
            )}
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 text-xs">
          {vendors.map((vendor) => (
            <VendorRow key={vendor.id} vendor={vendor} columns={enabledColumns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VendorTable;
