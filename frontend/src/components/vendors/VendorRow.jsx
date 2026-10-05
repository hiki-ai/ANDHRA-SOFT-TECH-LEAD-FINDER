import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge';
import { getQualityScoreColor } from '../../utils/formatters';

export function VendorRow({ vendor }) {
  const navigate = useNavigate();

  return (
    <tr
      onClick={() => navigate(`/vendors/${vendor.id}`)}
      className="table-row-hover transition-colors cursor-pointer group"
    >
      <td className="py-3.5 px-4 font-semibold text-surface-900">
        <span className="truncate max-w-[220px] block">{vendor.business_name}</span>
      </td>
      <td className="py-3.5 px-4 text-surface-600 font-medium">
        {vendor.category}
      </td>
      <td className="py-3.5 px-4 text-surface-700 font-mono">
        {vendor.phone || <span className="text-surface-400 italic">None</span>}
      </td>
      <td className="py-3.5 px-4 text-surface-600">
        {vendor.city}, {vendor.state}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1 text-surface-700">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{vendor.rating}</span>
          <span className="text-surface-400 text-[10px]">({vendor.review_count})</span>
        </div>
      </td>
      <td className="py-3.5 px-4 text-surface-500 text-[11px] truncate max-w-[160px]">
        {vendor.source}
      </td>
      <td className="py-3.5 px-4">
        <Badge variant={vendor.status} dot>
          {vendor.status.toUpperCase()}
        </Badge>
      </td>
      <td className="py-3.5 px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getQualityScoreColor(
            vendor.data_quality_score
          )}`}
        >
          {vendor.data_quality_score}%
        </span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <Link
          to={`/vendors/${vendor.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-brand-600 hover:text-brand-800 font-semibold inline-flex items-center gap-1 group-hover:underline"
        >
          <span>View</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </td>
    </tr>
  );
}

export default VendorRow;
