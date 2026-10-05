import React from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Star, ShieldCheck } from 'lucide-react';
import { Badge } from '../common/Badge';
import { getQualityScoreColor } from '../../utils/formatters';

export function VendorDetailsCard({ vendor }) {
  if (!vendor) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-surface-900">{vendor.business_name}</h3>
            <span className="text-xs text-surface-500">{vendor.category} • {vendor.city}</span>
          </div>
        </div>
        <Badge variant={vendor.status} dot>{vendor.status.toUpperCase()}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-surface-100">
        <div className="flex items-center gap-2 text-surface-600">
          <Phone className="w-3.5 h-3.5 text-surface-400" />
          <span>{vendor.phone || 'No phone'}</span>
        </div>
        <div className="flex items-center gap-2 text-surface-600">
          <Mail className="w-3.5 h-3.5 text-surface-400" />
          <span className="truncate">{vendor.email || 'No email'}</span>
        </div>
        <div className="flex items-center gap-2 text-surface-600">
          <MapPin className="w-3.5 h-3.5 text-surface-400" />
          <span>{vendor.city}, {vendor.state}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getQualityScoreColor(vendor.data_quality_score)}`}>
            Quality: {vendor.data_quality_score}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default VendorDetailsCard;
