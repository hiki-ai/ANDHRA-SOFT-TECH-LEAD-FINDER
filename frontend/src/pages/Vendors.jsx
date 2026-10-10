import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Star,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { formatNumber, formatPercent, getQualityScoreColor } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { vendorService } from '../services/vendorService';
import { exportService } from '../services/exportService';

export function Vendors() {
  const [vendorsList, setVendorsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);

  const toast = useToast();
  const navigate = useNavigate();

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorService.getVendors({
        page,
        limit: 50,
        search: searchTerm.trim() || undefined,
        category: selectedCategory || undefined,
        city: selectedLocation || undefined,
        status: selectedStatus || undefined,
      });

      const data = res?.data || res;
      if (data) {
        setVendorsList(data.items || []);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            page,
            limit: 50,
            total: (data.items || []).length,
            total_pages: 1,
          });
        }
      }
    } catch (err) {
      console.error('[Vendors] Query error:', err);
      setError(err?.message || 'Failed to fetch vendors from the backend API.');
      setVendorsList([]);
      setPagination({ page: 1, limit: 50, total: 0, total_pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedCategory, selectedLocation, selectedStatus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadVendors();
    }, 250);
    return () => clearTimeout(handler);
  }, [loadVendors]);

  // Reset page when filters change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      toast.info('Generating real Excel export from Cloud Firestore...');
      const res = await exportService.downloadDirectly({
        category: selectedCategory || undefined,
        city: selectedLocation || undefined,
        status: selectedStatus || undefined,
        search: searchTerm.trim() || undefined,
        format: 'xlsx',
      });
      toast.success(`Excel file downloaded (${res?.row_count ?? vendorsList.length} records).`);
    } catch (err) {
      console.error('[Vendors] Export failed:', err);
      toast.error(err?.message || 'Failed to generate Excel export.');
    } finally {
      setExporting(false);
    }
  };

  const startRecord = pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endRecord = pagination.total > 0 ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">
              Vendor Lead Database
            </h1>
            <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
              FIRESTORE REPOSITORY
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Displaying server-side paginated vendor leads • Scalable to 500,000+ indexed documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            iconLeft={Download}
            loading={exporting}
            onClick={handleExport}
          >
            Export Excel
          </Button>
          <Link to="/data-editor">
            <Button variant="primary" size="sm">
              Open Spreadsheet Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search business name, phone, city, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            iconLeft={Search}
          />
        </div>

        <Select
          value={selectedCategory}
          onChange={handleFilterChange(setSelectedCategory)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'Furniture', label: 'Furniture' },
            { value: 'Hospitals', label: 'Hospitals & Health' },
            { value: 'Restaurants', label: 'Restaurants' },
            { value: 'Real Estate', label: 'Real Estate' },
            { value: 'Hotels', label: 'Hotels' },
          ]}
        />

        <Select
          value={selectedLocation}
          onChange={handleFilterChange(setSelectedLocation)}
          options={[
            { value: '', label: 'All Cities' },
            { value: 'Rajahmundry', label: 'Rajahmundry' },
            { value: 'Visakhapatnam', label: 'Visakhapatnam' },
            { value: 'Vijayawada', label: 'Vijayawada' },
            { value: 'Guntur', label: 'Guntur' },
            { value: 'Kakinada', label: 'Kakinada' },
            { value: 'Tirupati', label: 'Tirupati' },
            { value: 'Nellore', label: 'Nellore' },
          ]}
        />

        <Select
          value={selectedStatus}
          onChange={handleFilterChange(setSelectedStatus)}
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'valid', label: 'Valid Leads' },
            { value: 'duplicate', label: 'Duplicates' },
            { value: 'invalid', label: 'Invalid / Review' },
          ]}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800 font-medium">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadVendors}>
            Retry
          </Button>
        </div>
      )}

      {/* Vendors Data Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-[11px] font-semibold text-surface-500 uppercase tracking-wider table-sticky-header">
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">City / State</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Quality</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-surface-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Loading vendor records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : vendorsList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-surface-200 mx-auto flex items-center justify-center text-surface-400">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-surface-900">
                        No Vendors Found
                      </h3>
                      <p className="text-xs text-surface-500">
                        No vendor records match your current query or the database is currently empty.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <Link to="/import">
                          <Button size="sm" variant="primary">
                            Import Spreadsheet
                          </Button>
                        </Link>
                        <Link to="/collections">
                          <Button size="sm" variant="outline">
                            Start Collection
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                vendorsList.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                    className="table-row-hover transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-surface-900">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[220px]">{vendor.business_name}</span>
                      </div>
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
                          vendor.data_quality_score || 0
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-surface-100 bg-surface-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-surface-600">
          <span>
            {pagination.total > 0 ? (
              <>
                Showing <span className="font-semibold text-surface-900">{startRecord}</span> to{' '}
                <span className="font-semibold text-surface-900">{endRecord}</span> of{' '}
                <span className="font-semibold text-surface-900">{formatNumber(pagination.total)}</span> records
              </>
            ) : (
              <span>Showing 0 records</span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              iconLeft={ChevronLeft}
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-semibold text-surface-900 bg-white border border-surface-200 rounded-lg">
              Page {pagination.page} of {pagination.total_pages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.total_pages || loading || pagination.total === 0}
              onClick={() => setPage((p) => p + 1)}
              iconRight={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Vendors;
