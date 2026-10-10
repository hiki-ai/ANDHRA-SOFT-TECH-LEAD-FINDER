import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { getQualityScoreColor } from '../utils/formatters';
import { vendorService } from '../services/vendorService';
import { exportService } from '../services/exportService';

export function VendorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadVendor() {
      setLoading(true);
      setError(null);
      try {
        const res = await vendorService.getVendorById(id);
        const data = res?.data || res;
        if (isMounted) {
          if (data && data.id) {
            setVendor({
              ...data,
              custom_fields: data.custom_fields || {},
            });
          } else {
            setError('Vendor record could not be found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[VendorDetails] Failed to load vendor:', err);
          setError(err?.message || 'Vendor not found in database.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadVendor();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!vendor?.id) return;
    setSaving(true);
    try {
      const res = await vendorService.updateVendor(vendor.id, vendor);
      const updated = res?.data || res;
      if (updated) {
        setVendor((prev) => ({ ...prev, ...updated }));
      }
      setIsEditing(false);
      toast.success('Vendor profile updated successfully in Firestore.');
    } catch (err) {
      console.error('[VendorDetails] Save error:', err);
      toast.error(err?.message || 'Failed to update vendor record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vendor?.id) return;
    try {
      await vendorService.deleteVendor(vendor.id);
      setShowDeleteModal(false);
      toast.success('Vendor record deleted permanently.');
      navigate('/vendors');
    } catch (err) {
      console.error('[VendorDetails] Delete error:', err);
      toast.error(err?.message || 'Failed to delete vendor record.');
    }
  };

  const handleExport = async () => {
    if (!vendor) return;
    try {
      toast.info('Downloading vendor details...');
      await exportService.downloadDirectly({ search: vendor.business_name, format: 'xlsx' });
      toast.success('Vendor exported successfully.');
    } catch (err) {
      toast.error(err?.message || 'Export failed.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-3" />
        <p className="text-xs text-surface-500 font-medium">Loading vendor record from database...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Breadcrumbs items={[{ label: 'Vendors', to: '/vendors' }, { label: 'Not Found' }]} />
        <div className="bg-white p-8 rounded-2xl border border-surface-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-surface-900">Record Not Found</h2>
          <p className="text-xs text-surface-500 max-w-sm mx-auto">
            {error || `The vendor ID "${id}" does not exist in the database or may have been deleted.`}
          </p>
          <div>
            <Link to="/vendors">
              <Button variant="primary" size="sm" iconLeft={ArrowLeft}>
                Back to Vendors List
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const customFields = vendor.custom_fields || {};

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Vendors', to: '/vendors' },
          { label: vendor.business_name || 'Vendor Details' },
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
              <Badge variant={vendor.status || 'valid'} dot>
                {String(vendor.status || 'valid').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Dedupe Key: <span className="font-mono text-surface-700">{vendor.dedupe_key || 'N/A'}</span> • ID:{' '}
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
              <Button
                variant="primary"
                size="sm"
                iconLeft={Save}
                loading={saving}
                onClick={handleSave}
              >
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
                onClick={handleExport}
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
                value={vendor.business_name || ''}
                onChange={(e) => setVendor({ ...vendor, business_name: e.target.value })}
              />
              <Input
                label="Category"
                disabled={!isEditing}
                value={vendor.category || ''}
                onChange={(e) => setVendor({ ...vendor, category: e.target.value })}
              />
              <Input
                label="Phone Number"
                disabled={!isEditing}
                iconLeft={Phone}
                value={vendor.phone || ''}
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
                  value={vendor.address || ''}
                  onChange={(e) => setVendor({ ...vendor, address: e.target.value })}
                />
              </div>
              <Input
                label="Area / Neighborhood"
                disabled={!isEditing}
                value={vendor.area || ''}
                onChange={(e) => setVendor({ ...vendor, area: e.target.value })}
              />
              <Input
                label="City"
                disabled={!isEditing}
                value={vendor.city || ''}
                onChange={(e) => setVendor({ ...vendor, city: e.target.value })}
              />
              <Input
                label="District"
                disabled={!isEditing}
                value={vendor.district || ''}
                onChange={(e) => setVendor({ ...vendor, district: e.target.value })}
              />
              <Input
                label="State"
                disabled={!isEditing}
                value={vendor.state || ''}
                onChange={(e) => setVendor({ ...vendor, state: e.target.value })}
              />
              <Input
                label="Pincode"
                disabled={!isEditing}
                value={vendor.pincode || ''}
                onChange={(e) => setVendor({ ...vendor, pincode: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  label="Latitude"
                  disabled={!isEditing}
                  value={vendor.latitude !== undefined && vendor.latitude !== null ? String(vendor.latitude) : ''}
                  onChange={(e) => setVendor({ ...vendor, latitude: parseFloat(e.target.value) || null })}
                />
                <Input
                  label="Longitude"
                  disabled={!isEditing}
                  value={vendor.longitude !== undefined && vendor.longitude !== null ? String(vendor.longitude) : ''}
                  onChange={(e) => setVendor({ ...vendor, longitude: parseFloat(e.target.value) || null })}
                />
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
            <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4 pb-2 border-b border-surface-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Custom Attributes (Firestore Schema)</span>
              </span>
              <span className="text-[10px] text-surface-400 font-mono">Dynamic Fields</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="GST Number"
                disabled={!isEditing}
                value={customFields.gst_number || ''}
                onChange={(e) =>
                  setVendor({
                    ...vendor,
                    custom_fields: { ...customFields, gst_number: e.target.value },
                  })
                }
              />
              <Input
                label="Lead Stage"
                disabled={!isEditing}
                value={customFields.lead_stage || ''}
                onChange={(e) =>
                  setVendor({
                    ...vendor,
                    custom_fields: { ...customFields, lead_stage: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Right Column: Data Quality & Source */}
        <div className="space-y-6">
          {/* Data Quality Score Card */}
          <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Data Quality Score</span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-bold text-xs border ${getQualityScoreColor(
                  vendor.data_quality_score || 0
                )}`}
              >
                {vendor.data_quality_score ?? 0}%
              </span>
            </h3>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      vendor.business_name ? 'text-emerald-600' : 'text-surface-300'
                    }`}
                  />
                  <span>Business Name Verified</span>
                </span>
                <span className="text-emerald-700 font-semibold">+25%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      vendor.phone ? 'text-emerald-600' : 'text-surface-300'
                    }`}
                  />
                  <span>Phone Number Formatted</span>
                </span>
                <span className="text-emerald-700 font-semibold">+25%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      vendor.city ? 'text-emerald-600' : 'text-surface-300'
                    }`}
                  />
                  <span>Address & City Valid</span>
                </span>
                <span className="text-emerald-700 font-semibold">+20%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      vendor.website || vendor.email ? 'text-emerald-600' : 'text-surface-300'
                    }`}
                  />
                  <span>Website & Online Presence</span>
                </span>
                <span className="text-emerald-700 font-semibold">+15%</span>
              </div>
              <div className="flex items-center justify-between text-surface-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      vendor.rating ? 'text-emerald-600' : 'text-surface-300'
                    }`}
                  />
                  <span>Reviews & Ratings Present</span>
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
              <span className="font-medium text-surface-800">{vendor.source || 'Direct Import'}</span>
            </div>

            {vendor.source_url && (
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
            )}

            <div className="pt-2 border-t border-surface-100 text-[11px] text-surface-400 flex items-center justify-between">
              <span>Created: {vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : 'N/A'}</span>
              <span>Updated: {vendor.updated_at ? new Date(vendor.updated_at).toLocaleDateString() : 'N/A'}</span>
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
        message={`Are you sure you want to permanently delete "${vendor.business_name}" from the database? This action is irreversible.`}
        confirmText="Delete Vendor"
        isDanger={true}
      />
    </div>
  );
}

export default VendorDetails;
