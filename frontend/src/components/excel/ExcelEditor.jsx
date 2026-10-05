import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Badge } from '../common/Badge';
import { cn } from '../../utils/helpers';

export function ExcelEditor({
  data = [],
  customColumns = [],
  selectedIds = new Set(),
  dirtyRows = new Set(),
  onCellChange,
  onToggleRow,
  onSelectAll,
}) {
  return (
    <div className="overflow-x-auto max-h-[68vh]">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-surface-100/80 border-b border-surface-200 uppercase text-[10px] tracking-wider text-surface-600 font-bold sticky top-0 z-20">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center">
              <button onClick={onSelectAll} className="text-surface-400 hover:text-surface-600">
                {selectedIds.size === data.length && data.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-brand-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[200px]">Business Name</th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">Category</th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[150px]">Phone</th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[180px]">Email</th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">City</th>
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">State</th>
            {customColumns.map((col) => (
              <th key={col.key} className="py-2.5 px-3 border-r border-surface-200/60 min-w-[140px] text-brand-700 bg-brand-50/50">
                {col.label}
              </th>
            ))}
            <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[100px]">Status</th>
            <th className="py-2.5 px-3 min-w-[80px] text-center">Quality</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {data.map((row) => {
            const isDirty = dirtyRows.has(row.id);
            const isSelected = selectedIds.has(row.id);
            const isDuplicate = row.status === 'duplicate';
            const isInvalid = row.status === 'invalid';

            return (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors',
                  isSelected ? 'bg-brand-50/40' : 'hover:bg-surface-50/60',
                  isDuplicate && 'bg-amber-50/20',
                  isInvalid && 'bg-rose-50/20'
                )}
              >
                <td className="py-2 px-3 text-center">
                  <button onClick={() => onToggleRow(row.id)} className="text-surface-400 hover:text-surface-600">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-brand-600" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="p-1 border-r border-surface-100">
                  <input
                    type="text"
                    value={row.business_name}
                    onChange={(e) => onCellChange(row.id, 'business_name', e.target.value)}
                    className={cn(
                      'w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none font-medium',
                      isDirty && 'font-semibold text-brand-900'
                    )}
                  />
                </td>
                <td className="p-1 border-r border-surface-100">
                  <input
                    type="text"
                    value={row.category}
                    onChange={(e) => onCellChange(row.id, 'category', e.target.value)}
                    className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </td>
                <td className="p-1 border-r border-surface-100 font-mono">
                  <input
                    type="text"
                    value={row.phone}
                    onChange={(e) => onCellChange(row.id, 'phone', e.target.value)}
                    className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                    placeholder="Add phone..."
                  />
                </td>
                <td className="p-1 border-r border-surface-100">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => onCellChange(row.id, 'email', e.target.value)}
                    className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                    placeholder="Add email..."
                  />
                </td>
                <td className="p-1 border-r border-surface-100">
                  <input
                    type="text"
                    value={row.city}
                    onChange={(e) => onCellChange(row.id, 'city', e.target.value)}
                    className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </td>
                <td className="p-1 border-r border-surface-100">
                  <input
                    type="text"
                    value={row.state}
                    onChange={(e) => onCellChange(row.id, 'state', e.target.value)}
                    className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                  />
                </td>
                {customColumns.map((col) => (
                  <td key={col.key} className="p-1 border-r border-surface-100">
                    <input
                      type="text"
                      value={row[col.key] || ''}
                      onChange={(e) => onCellChange(row.id, col.key, e.target.value)}
                      className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                      placeholder={`Enter ${col.label.toLowerCase()}...`}
                    />
                  </td>
                ))}
                <td className="py-2 px-3 border-r border-surface-100">
                  <Badge variant={row.status} dot>{row.status.toUpperCase()}</Badge>
                </td>
                <td className="py-2 px-3 text-center font-bold text-surface-700">
                  {row.data_quality_score}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ExcelEditor;
