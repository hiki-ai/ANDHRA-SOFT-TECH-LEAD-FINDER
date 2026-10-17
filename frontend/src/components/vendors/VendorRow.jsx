import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ExternalLink } from 'lucide-react';
import { Badge } from '../common/Badge';
import { getQualityScoreColor } from '../../utils/formatters';

export function VendorRow({ vendor, columns = null }) {
  const navigate = useNavigate();

  if (!vendor || typeof vendor !== 'object') return null;

  const getCellValue = (col) => {
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

  if (Array.isArray(columns) && columns.length > 0) {
    return (
      <tr
        onClick={() => navigate(`/vendors/${vendor.id}`)}
        className="table-row-hover transition-colors cursor-pointer group"
      >
        {columns.map((col) => {
          const val = getCellValue(col);
          const key = col.key || col.name;
          return (
            <td key={key} className="py-3.5 px-4 text-surface-700 max-w-[220px] truncate">
              {key === 'business_name' ? (
                <span className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                  {val}
                </span>
              ) : key === 'website' && val !== '—' ? (
                <a
                  href={String(val).startsWith('http') ? val : `https://${val}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand-600 hover:underline inline-flex items-center gap-1"
                >
                  <span className="truncate">{val}</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              ) : key === 'rating' && val !== '—' ? (
                <div className="flex items-center gap-1 text-surface-800">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{val}</span>
                </div>
              ) : key === 'status' ? (
                <Badge variant={val === '—' ? 'default' : String(val).toLowerCase()} dot>
                  {String(val).toUpperCase()}
                </Badge>
              ) : key === 'data_quality_score' && val !== '—' ? (
                <span
                  className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getQualityScoreColor(
                    val
                  )}`}
                >
                  {val}%
                </span>
              ) : key === 'phone' && val !== '—' ? (
                <span className="font-mono text-surface-700">{val}</span>
              ) : (
                <span>{String(val)}</span>
              )}
            </td>
          );
        })}
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

  // Fallback default layout
  return (
    <tr
      onClick={() => navigate(`/vendors/${vendor.id}`)}
      className="table-row-hover transition-colors cursor-pointer group"
    >
      <td className="py-3.5 px-4 font-semibold text-surface-900">
        <span className="truncate max-w-[220px] block">{vendor.business_name || '—'}</span>
      </td>
      <td className="py-3.5 px-4 text-surface-600 font-medium">
        {vendor.category || 'General'}
      </td>
      <td className="py-3.5 px-4 text-surface-700 font-mono">
        {vendor.phone || <span className="text-surface-400 italic">None</span>}
      </td>
      <td className="py-3.5 px-4 text-surface-600">
        {vendor.city || 'N/A'}{vendor.state ? `, ${vendor.state}` : ''}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1 text-surface-700">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{vendor.rating ?? 0}</span>
          <span className="text-surface-400 text-[10px]">({vendor.review_count ?? 0})</span>
        </div>
      </td>
      <td className="py-3.5 px-4 text-surface-500 text-[11px] truncate max-w-[160px]">
        {vendor.source || 'Direct Import'}
      </td>
      <td className="py-3.5 px-4">
        <Badge variant={vendor.status || 'valid'} dot>
          {String(vendor.status || 'valid').toUpperCase()}
        </Badge>
      </td>
      <td className="py-3.5 px-4 text-center">
        <span
          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] border ${getQualityScoreColor(
            vendor.data_quality_score
          )}`}
        >
          {vendor.data_quality_score ?? 0}%
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
