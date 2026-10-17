import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  TableProperties,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { formatNumber, formatPercent, getQualityScoreColor } from '../utils/formatters';
import { useToast } from '../context/ToastContext';
import { vendorService } from '../services/vendorService';
import { exportService } from '../services/exportService';
import { presetService } from '../services/presetService';
import { categoryService, MASTER_CATEGORIES } from '../services/categoryService';
import { validateAndNormalizePreset, buildFurnitureLeadsColumns } from '../utils/tableSchema';

export function Vendors() {
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionParam = searchParams.get('collection') || '';
  const presetParam = searchParams.get('preset') || '';

  const [vendorsList, setVendorsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic Presets & Columns state
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState(presetParam || 'preset_furniture_leads');
  const [categoriesList, setCategoriesList] = useState(MASTER_CATEGORIES);

  // Preset Export Modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportAll, setExportAll] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [collectionFilter, setCollectionFilter] = useState(collectionParam);
  const [page, setPage] = useState(1);

  const toast = useToast();
  const navigate = useNavigate();

  // Load saved presets on mount
  useEffect(() => {
    presetService.getPresets()
      .then((res) => {
        const list = res?.data || res || [];
        const normalized = (Array.isArray(list) ? list : []).map((p) => validateAndNormalizePreset(p));
        setPresets(normalized);
        if (presetParam && normalized.some((p) => p.id === presetParam)) {
          setSelectedPresetId(presetParam);
        } else {
          const furn = normalized.find((p) => p.id === 'preset_furniture_leads' || p.name === 'Furniture Leads');
          if (furn) {
            setSelectedPresetId(furn.id);
          } else if (normalized.length > 0) {
            setSelectedPresetId(normalized[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('[Vendors] Could not load presets:', err);
      });

    categoryService.getCategories()
      .then((cats) => {
        if (Array.isArray(cats) && cats.length > 0) {
          setCategoriesList(cats);
        }
      })
      .catch((err) => {
        console.warn('[Vendors] Could not load categories:', err);
      });
  }, [presetParam]);

  // Keep collectionFilter synced with query param
  useEffect(() => {
    setCollectionFilter(collectionParam);
  }, [collectionParam]);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorService.getVendors({
        page,
        limit: 50,
        collection_id: collectionFilter || undefined,
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
  }, [page, collectionFilter, searchTerm, selectedCategory, selectedLocation, selectedStatus]);

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

  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  const handleExecuteExport = async () => {
    setExporting(true);
    try {
      toast.info('Generating spreadsheet export from Cloud Firestore...');
      const res = await exportService.downloadDirectly({
        preset_id: selectedPresetId,
        collection_id: collectionFilter || undefined,
        category: selectedCategory || undefined,
        city: selectedLocation || undefined,
        status: selectedStatus || undefined,
        search: searchTerm.trim() || undefined,
        format: exportFormat,
        export_all: exportAll,
      });
      toast.success(`Spreadsheet downloaded (${res?.row_count ?? vendorsList.length} records).`);
      setShowExportModal(false);
    } catch (err) {
      console.error('[Vendors] Export failed:', err);
      toast.error(err?.message || 'Failed to generate Excel export.');
    } finally {
      setExporting(false);
    }
  };

  // Resolve current active preset and its enabled columns
  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || presets[0] || null;
  }, [presets, selectedPresetId]);

  const activeColumns = useMemo(() => {
    if (activePreset?.columns && Array.isArray(activePreset.columns) && activePreset.columns.length > 0) {
      return activePreset.columns.filter((c) => c && c.is_enabled);
    }
    return buildFurnitureLeadsColumns().filter((c) => c.is_enabled);
  }, [activePreset]);

  // Safe cell value extractor completely avoiding "Cannot use 'in' operator" errors
  const getCellValue = (vendor, col) => {
    if (!vendor || typeof vendor !== 'object') return '—';
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
            onClick={handleOpenExportModal}
          >
            Export Leads
          </Button>

          <Link to="/table-editor">
            <Button variant="secondary" size="sm" iconLeft={TableProperties}>
              Table Editor
            </Button>
          </Link>
        </div>
      </div>

      {/* Active Collection Filter Notice if query param present */}
      {collectionFilter && (
        <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Showing leads isolated to collection job: <strong className="font-mono">{collectionFilter}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setCollectionFilter('');
              setSearchParams({});
              setPage(1);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Collection Filter</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar with Preset Selector */}
      <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
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

        {/* Table Preset View Selector */}
        <Select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          options={presets.map((p) => ({
            value: p.id,
            label: `View: ${p.name}${p.is_default ? ' (Default)' : ''}`,
          }))}
          helperText="Select column preset"
        />

        {/* Dynamic Category Selector */}
        <Select
          value={selectedCategory}
          onChange={handleFilterChange(setSelectedCategory)}
          options={[
            { value: '', label: 'All Categories' },
            ...categoriesList.map((cat) => ({ value: cat, label: cat })),
          ]}
        />

        {/* City Filter */}
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
            { value: 'Kurnool', label: 'Kurnool' },
            { value: 'Hyderabad', label: 'Hyderabad' },
            { value: 'Bengaluru', label: 'Bengaluru' },
          ]}
        />

        {/* Status Filter */}
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

      {/* Preset-Configured Vendors Data Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="p-3 bg-surface-50 border-b border-surface-200 flex items-center justify-between text-xs text-surface-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-surface-800">Active Preset View:</span>
            <span className="font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              {activePreset?.name || 'Standard Table'}
            </span>
            <span className="text-[11px] text-surface-500 font-mono">
              ({activeColumns.length} columns)
            </span>
          </div>
          <Link
            to="/table-editor"
            className="text-brand-600 hover:text-brand-700 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Edit Preset in Table Editor</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/50 text-[11px] font-semibold text-surface-600 uppercase tracking-wider table-sticky-header">
                {activeColumns.map((col, idx) => (
                  <th key={col.key || idx} className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-surface-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span>{col.label}</span>
                      {col.is_required && (
                        <span className="text-rose-500 font-bold" title="Required field">*</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="py-12 text-center text-surface-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Loading vendor records from database...</span>
                    </div>
                  </td>
                </tr>
              ) : vendorsList.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="py-16 text-center">
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
                    {activeColumns.map((col) => {
                      const val = getCellValue(vendor, col);
                      return (
                        <td key={col.key} className="py-3.5 px-4 text-surface-700 max-w-[220px] truncate">
                          {col.key === 'business_name' ? (
                            <span className="font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">
                              {val}
                            </span>
                          ) : col.key === 'website' && val !== '—' ? (
                            <a
                              href={String(val).startsWith('http') ? val : `https://${val}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-brand-600 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate">{val}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : col.key === 'rating' && val !== '—' ? (
                            <div className="flex items-center gap-1 text-surface-800">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-semibold">{val}</span>
                            </div>
                          ) : col.key === 'status' ? (
                            <Badge variant={val === '—' ? 'default' : String(val).toLowerCase()} dot>
                              {String(val).toUpperCase()}
                            </Badge>
                          ) : col.key === 'data_quality_score' && val !== '—' ? (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                              {val}%
                            </span>
                          ) : col.key === 'phone' && val !== '—' ? (
                            <span className="font-mono text-surface-700">{val}</span>
                          ) : (
                            <span>{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vendors/${vendor.id}`);
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="p-4 bg-surface-50 border-t border-surface-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-surface-600">
          <div>
            Showing <span className="font-semibold text-surface-900">{startRecord}</span> to{' '}
            <span className="font-semibold text-surface-900">{endRecord}</span> of{' '}
            <span className="font-semibold text-surface-900">{formatNumber(pagination.total)}</span> results
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              iconLeft={ChevronLeft}
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-semibold text-surface-700 bg-white border border-surface-200 rounded-lg">
              {page} / {Math.max(1, pagination.total_pages)}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              iconRight={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Export Modal with Preset Schema Selection */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Vendor Leads"
        subtitle="Generate and download a real spreadsheet from Cloud Firestore."
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Table Preset Selector for Export */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-700 uppercase tracking-wide">
              Export Table Preset
            </label>
            <Select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              options={presets.map((p) => ({
                value: p.id,
                label: `${p.name}${p.is_default ? ' (Default)' : ''}`,
              }))}
              helperText="Determines the exact column headers and sequence in the exported spreadsheet."
            />
          </div>

          {/* Column sequence preview */}
          {activeColumns.length > 0 && (
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs space-y-1.5">
              <span className="font-semibold text-surface-700 block">
                Exported Columns ({activeColumns.length}):
              </span>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {activeColumns.map((c, i) => (
                  <span
                    key={c.key || i}
                    className="inline-flex items-center gap-1 bg-white border border-surface-200 px-2 py-0.5 rounded text-[11px] text-surface-700"
                  >
                    <span className="text-surface-400 font-mono text-[10px]">#{i + 1}</span>
                    <span>{c.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-700 uppercase tracking-wide">
              Spreadsheet Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  exportFormat === 'xlsx'
                    ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="block font-bold text-xs text-surface-900">Microsoft Excel (.xlsx)</span>
                <span className="text-[11px] text-surface-500 mt-0.5 block">
                  Formatted spreadsheet with styled headers and auto-sized columns.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  exportFormat === 'csv'
                    ? 'border-brand-600 bg-brand-50/60 ring-2 ring-brand-500/20'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <span className="block font-bold text-xs text-surface-900">Standard CSV (.csv)</span>
                <span className="text-[11px] text-surface-500 mt-0.5 block">
                  Lightweight raw comma-separated values compatible with all systems.
                </span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-100 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setShowExportModal(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteExport}
              isLoading={exporting}
              iconLeft={Download}
            >
              Download Spreadsheet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Vendors;
