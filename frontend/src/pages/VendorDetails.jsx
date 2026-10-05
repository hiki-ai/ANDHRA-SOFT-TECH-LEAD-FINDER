import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  ShieldCheck,
  Edit3,
  Trash2,
  Download,
  Save,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { getQualityScoreColor } from '../utils/formatters';

export function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Vendor state (with realistic fields from Section 15 & Section 21)
  const [vendor, setVendor] = useState({
    id: id || 'ven_1001',
    business_name: 'Godavari Teak & Rosewood Emporium',
    normalized_name: 'GODAVARI TEAK ROSEWOOD EMPORIUM',
    category: 'Furniture',
    subcategory: 'Handcrafted Wooden Furniture',
    phone: '+91 883 245 8920',
    alternate_phone: '+91 883 245 8921',
    email: 'info@godavariteak.com',
    website: 'https://godavariteak.com',
    address: '4-12/A, Godavari Bund Road',
    area: 'Innespeta',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    pincode: '533101',
    latitude: 17.0005,
    longitude: 81.8040,
    rating: 4.8,
    review_count: 312,
    source: 'Official Public Directory (Source A)',
    source_url: 'https://directory.example.gov.in/leads/88324',
    status: 'valid',
    data_quality_score: 95,
    dedupe_key: 'godavari_teak_8832458920_rajahmundry',
    created_at: '2026-09-18T10:30:00Z',
    updated_at: '2026-10-02T14:15:00Z',
    custom_fields: {
      gst_number: '37AAAAA0000A1Z5',
      lead_stage: 'Verified Lead',
      verified_by: 'Staff Auditor #4',
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    toast.success('Vendor profile updated successfully in Firestore.');
  };

  const handleDelete = () => {
    setShowDeleteModal(false);
    toast.success('Vendor record deleted.');
    navigate('/vendors');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Vendors', to: '/vendors' },
          { label: vendor.business_name },
        ]}
      />

      {/* Top Banner / Actions */}
      <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg border border-brand-100 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-surface-900 tracking-tight">
                {vendor.business_name}
              </h1>
              <Badge variant={vendor.status} dot>
                {vendor.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Dedupe Key: <span className="font-mono text-surface-700">{vendor.dedupe_key}</span> • ID:{' '}
              <span className="font-mono text-surface-700">{vendor.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" iconLeft={Save} onClick={handleSave}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                iconLeft={Edit3}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconLeft={Download}
                onClick={() => toast.success('Vendor details exported to Excel.')}
              >
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconLeft={Trash2}
                onClick={() => setShowDeleteModal(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid: Details & Quality Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Attributes (2 columns span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business & Contact Information */}
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>Business & Contact Information</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Business Name"
                disabled={!isEditing}
                value={vendor.business_name}
                onChange={(e) => setVendor({ ...vendor, business_name: e.target.value })}
              />
              <Input
                label="Category"
                disabled={!isEditing}
                value={vendor.category}
                onChange={(e) => setVendor({ ...vendor, category: e.target.value })}
              />
              <Input
                label="Phone Number"
                disabled={!isEditing}
                iconLeft={Phone}
                value={vendor.phone}
                onChange={(e) => setVendor({ ...vendor, phone: e.target.value })}
              />
              <Input
                label="Alternate Phone"
                disabled={!isEditing}
                iconLeft={Phone}
                value={vendor.alternate_phone || ''}
                onChange={(e) => setVendor({ ...vendor, alternate_phone: e.target.value })}
              />
              <Input
                label="Email Address"
                disabled={!isEditing}
                iconLeft={Mail}
                value={vendor.email || ''}
                onChange={(e) => setVendor({ ...vendor, email: e.target.value })}
              />
              <Input
                label="Website URL"
                disabled={!isEditing}
                iconLeft={Globe}
                value={vendor.website || ''}
                onChange={(e) => setVendor({ ...vendor, website: e.target.value })}
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4 pb-2 border-b border-surface-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Geographic Location</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <Input
                  label="Street Address"
                  disabled={!isEditing}
                  value={vendor.address}
                  onChange={(e) => setVendor({ ...vendor, address: e.target.value })}
                />
              </div>
              <Input
                label="Area / Neighborhood"
                disabled={!isEditing}
                value={vendor.area}
                onChange={(e) => setVendor({ ...vendor, area: e.target.value })}
              />
              <Input
                label="City"
                disabled={!isEditing}
                value={vendor.city}
                onChange={(e) => setVendor({ ...vendor, city: e.target.value })}
              />
              <Input
                label="District"
                disabled={!isEditing}
                value={vendor.district}
                onChange={(e) => setVendor({ ...vendor, district: e.target.value })}
              />
              <Input
                label="State"
                disabled={!isEditing}
                value={vendor.state}
                onChange={(e) => setVendor({ ...vendor, state: e.target.value })}
              />
              <Input
                label="Pincode"
                disabled={!isEditing}
                value={vendor.pincode}
                onChange={(e) => setVendor({ ...vendor, pincode: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  label="Latitude"
                  disabled={!isEditing}
                  value={String(vendor.latitude)}
                  onChange={(e) => setVendor({ ...vendor, latitude: parseFloat(e.target.value) })}
                />
                <Input
                  label="Longitude"
                  disabled={!isEditing}
                  value={String(vendor.longitude)}
                  onChange={(e) => setVendor({ ...vendor, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Custom Fields (Section 16) */}
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4 pb-2 border-b border-surface-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Custom Administrator Fields (JSONB)</span>
              </span>
              <span className="text-[10px] text-surface-400 font-mono">Dynamic Schema</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="GST Number"
                disabled={!isEditing}
                value={vendor.custom_fields.gst_number}
                onChange={(e) =>
                  setVendor({
                    ...vendor,
                    custom_fields: { ...vendor.custom_fields, gst_number: e.target.value },
                  })
                }
              />
              <Input
                label="Lead Stage"
                disabled={!isEditing}
                value={vendor.custom_fields.lead_stage}
                onChange={(e) =>
                  setVendor({
                    ...vendor,
                    custom_fields: { ...vendor.custom_fields, lead_stage: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Right Column: Data Quality, Source & Audit Log */}
        <div className="space-y-6">
          {/* Data Quality Score Card (Section 24) */}
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Data Quality Score</span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-bold text-xs border ${getQualityScoreColor(
                  vendor.data_quality_score
                )}`}
              >
                {vendor.data_quality_score}%
              </span>
            </h3>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Business Name Verified</span>
                </span>
                <span className="text-emerald-700 font-semibold">+25%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Phone Number Formatted</span>
                </span>
                <span className="text-emerald-700 font-semibold">+25%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Address & Pincode Valid</span>
                </span>
                <span className="text-emerald-700 font-semibold">+20%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Website & Online Presence</span>
                </span>
                <span className="text-emerald-700 font-semibold">+15%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reviews & Ratings Added</span>
                </span>
                <span className="text-emerald-700 font-semibold">+10%</span>
              </div>
            </div>
          </div>

          {/* Source & Provenance */}
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card text-xs space-y-3">
            <h3 className="font-bold text-surface-900 uppercase tracking-wider text-[11px] pb-2 border-b border-surface-100 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Source & Provenance</span>
            </h3>

            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">
                Permitted Source
              </span>
              <span className="font-medium text-surface-800">{vendor.source}</span>
            </div>

            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">
                Source Reference URL
              </span>
              <a
                href={vendor.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:text-brand-800 underline truncate block"
              >
                {vendor.source_url}
              </a>
            </div>

            <div className="pt-2 border-t border-surface-100 text-[11px] text-surface-400 flex items-center justify-between">
              <span>Created: {new Date(vendor.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(vendor.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Vendor Record"
        message={`Are you sure you want to permanently delete "${vendor.business_name}" from the database? This action is recorded in the audit log.`}
        confirmText="Delete Vendor"
        isDanger={true}
      />
    </div>
  );
}
