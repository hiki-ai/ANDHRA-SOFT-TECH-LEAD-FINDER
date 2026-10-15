import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { Select } from '../common/Select';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import {
  Play,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Lock,
  TableProperties,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { collectionService } from '../../services/collectionService';
import { sourceService } from '../../services/sourceService';
import { presetService } from '../../services/presetService';
import { validateAndNormalizePreset, isFieldSupportedBySource } from '../../utils/tableSchema';

const CATEGORIES = [
  'Furniture',
  'Restaurants & Cafes',
  'Hotels & Hospitality',
  'Real Estate & Builders',
  'Hospitals & Healthcare',
  'Schools & Educational Institutes',
  'Automobiles & Garages',
  'Electronics & Appliances',
  'Textile & Garments',
  'Hardware & Construction',
];

const LOCATIONS = [
  'Rajahmundry, Andhra Pradesh',
  'Visakhapatnam, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Guntur, Andhra Pradesh',
  'Kakinada, Andhra Pradesh',
  'Tirupati, Andhra Pradesh',
  'Nellore, Andhra Pradesh',
  'Kurnool, Andhra Pradesh',
  'Hyderabad, Telangana',
  'Bengaluru, Karnataka',
];

const SOURCE_OPTIONS = [
  { value: 'google_places', label: 'Google Maps / Google Places API (Official Maps Platform)' },
  { value: 'justdial', label: 'Justdial (Enterprise Partner License Required)' },
  { value: 'magicpin', label: 'Magicpin (Merchant Partner License Required)' },
];

export function QuickCollectionModal({ isOpen, onClose, onJobCreated }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [targetCount, setTargetCount] = useState('500');
  const [source, setSource] = useState('google_places');
  const [sourcesStatus, setSourcesStatus] = useState({});

  // Presets & schema configuration
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('preset_furniture_leads');
  const [capabilities, setCapabilities] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const toast = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    // Load registered sources
    sourceService.getSources()
      .then((res) => {
        const list = res?.data || res;
        if (isMounted && Array.isArray(list)) {
          const map = {};
          list.forEach((s) => { map[s.id] = s; });
          setSourcesStatus(map);
        }
      })
      .catch((err) => {
        console.warn('[QuickCollectionModal] Could not fetch sources:', err);
      });

    // Load table presets
    presetService.getPresets()
      .then((res) => {
        const list = res?.data || res || [];
        const caps = res?.source_capabilities || {};
        if (isMounted) {
          const normalized = (Array.isArray(list) ? list : []).map((p) => validateAndNormalizePreset(p));
          setPresets(normalized);
          setCapabilities(caps);
          // Set initial preset to Furniture Leads if available
          const furn = normalized.find((p) => p.id === 'preset_furniture_leads' || p.name === 'Furniture Leads');
          if (furn) {
            setSelectedPresetId(furn.id);
          } else if (normalized.length > 0) {
            setSelectedPresetId(normalized[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('[QuickCollectionModal] Could not fetch presets:', err);
      });

    return () => { isMounted = false; };
  }, [isOpen]);

  // Selected preset resolution
  const activePreset = React.useMemo(() => {
    return presets.find((p) => p.id === selectedPresetId) || presets[0] || null;
  }, [presets, selectedPresetId]);

  const enabledColumns = React.useMemo(() => {
    if (!activePreset || !activePreset.columns) return [];
    return activePreset.columns.filter((c) => c.is_enabled);
  }, [activePreset]);

  // Capability checks
  const capabilityAudit = React.useMemo(() => {
    const blockingErrors = [];
    const warnings = [];

    enabledColumns.forEach((col) => {
      const isSupported = isFieldSupportedBySource(capabilities, source, col);

      if (!isSupported) {
        if (col.is_required) {
          blockingErrors.push(
            `Required column '${col.label}' is not supported by ${source === 'google_places' ? 'Google Places API' : source}.`
          );
        } else {
          warnings.push(
            `Column '${col.label}' is not provided by ${source === 'google_places' ? 'Google Places API' : source} and will remain blank.`
          );
        }
      }
    });

    return {
      isValid: blockingErrors.length === 0,
      blockingErrors,
      warnings,
    };
  }, [capabilities, source, enabledColumns]);

  const validate = () => {
    const errs = {};
    if (!category.trim()) errs.category = 'Please select or enter a business category.';
    if (!location.trim()) errs.location = 'Please select or enter a target location.';
    const num = parseInt(targetCount, 10);
    if (isNaN(num) || num < 1 || num > 50000) {
      errs.targetCount = 'Target must be between 1 and 50,000 vendors.';
    }

    if (!capabilityAudit.isValid) {
      errs.preset = capabilityAudit.blockingErrors[0];
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await collectionService.startCollection({
        category: category.trim(),
        location: location.trim(),
        target_count: parseInt(targetCount, 10),
        source,
        preset_id: selectedPresetId,
        preset_columns: enabledColumns,
      });

      const newJob = res?.data || res;
      if (newJob?.status === 'failed') {
        toast.warning(newJob?.error_message || 'Job created but could not start due to connector requirements.');
      } else {
        toast.success(`Collection job initiated for ${category} in ${location}.`);
      }
      if (onJobCreated) onJobCreated(newJob);
      onClose();
    } catch (err) {
      console.error('[QuickCollectionModal] Error starting collection:', err);
      toast.error(err?.message || 'Failed to initiate collection job on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start New Lead Collection"
      subtitle="Configure category, geographic location, and target lead volume."
      maxWidth="md"
    >
      <form onSubmit={handleStart} className="space-y-4">
        {/* Table Preset Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
              Table Preset
            </label>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/table-editor');
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Configure in Table Editor</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
          <Select
            placeholder="Select a table preset..."
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value)}
            options={presets.map((p) => ({
              value: p.id,
              label: `${p.name}${p.is_default ? ' (Default)' : p.is_system ? ' (System)' : ''}`,
            }))}
            helperText="Defines which columns will be collected and exported in the final spreadsheet."
          />

          {/* Enabled Columns Preview Badges */}
          {enabledColumns.length > 0 && (
            <div className="p-2.5 bg-surface-50 rounded-xl border border-surface-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-surface-500 font-medium">
                <span>Selected Columns ({enabledColumns.length}):</span>
                <span className="text-[10px] text-brand-600 font-semibold">{activePreset?.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {enabledColumns.map((col, idx) => (
                  <span
                    key={col.key}
                    className="inline-flex items-center gap-1 text-[11px] bg-white border border-surface-200 px-2 py-0.5 rounded-md text-surface-700 shadow-sm"
                  >
                    <span className="text-surface-400 font-mono text-[10px]">#{idx + 1}</span>
                    <span className="font-medium">{col.label}</span>
                    {col.is_required && (
                      <span className="text-rose-500 font-bold" title="Required column">*</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category input */}
        <SearchableSelect
          label="Business Category"
          placeholder="Select or enter category (e.g., Furniture, Hospitals)..."
          options={CATEGORIES}
          value={category}
          onChange={(val) => {
            setCategory(val);
            if (errors.category) setErrors((prev) => ({ ...prev, category: null }));
          }}
          error={errors.category}
          helperText="Select a standard industry or enter a custom category keyword."
        />

        {/* Location input */}
        <SearchableSelect
          label="Location / Region"
          placeholder="Select or enter city (e.g., Rajahmundry, Visakhapatnam)..."
          options={LOCATIONS}
          value={location}
          onChange={(val) => {
            setLocation(val);
            if (errors.location) setErrors((prev) => ({ ...prev, location: null }));
          }}
          error={errors.location}
          helperText="Geographic boundary for vendor search."
        />

        {/* Target Vendor Count */}
        <Input
          label="Target Number of Vendors"
          type="number"
          min="1"
          max="50000"
          value={targetCount}
          onChange={(e) => {
            setTargetCount(e.target.value);
            if (errors.targetCount) setErrors((prev) => ({ ...prev, targetCount: null }));
          }}
          placeholder="e.g. 5000"
          error={errors.targetCount}
          helperText="Max 50,000 per single collection batch."
        />

        {/* Data Source Selector */}
        <Select
          label="Collection Data Source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          options={SOURCE_OPTIONS}
          helperText="Select authorized provider API connector."
        />

        {/* Source Capability Warnings for Optional Columns */}
        {capabilityAudit.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Source Capability Notice:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {capabilityAudit.warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-700 italic">
                These fields are optional and will remain blank in the database and export.
              </p>
            </div>
          </div>
        )}

        {/* Blocking Errors for Unsupported Required Columns */}
        {!capabilityAudit.isValid && (
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Extraction Blocked — Unsupported Required Fields:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {capabilityAudit.blockingErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
              <p className="text-[10px] text-rose-700">
                To proceed, mark these columns as optional in the Table Editor or switch to a compatible data source.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Source Status Notice */}
        {(() => {
          const currentSourceInfo = sourcesStatus[source];
          const status = currentSourceInfo?.status || (source === 'google_places' ? 'not_configured' : 'authorization_required');

          if (status === 'active') {
            return (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Google Places API Active:</strong> Official Google Maps Platform connector is configured on Render. Capped at max 60 places per text search query.
                </p>
              </div>
            );
          } else if (status === 'authorization_required') {
            return (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-start gap-2.5 text-xs text-indigo-800">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Authorization Required:</strong> {currentSourceInfo?.message || 'This source requires an official enterprise partnership agreement or licensed commercial feed. Unconfigured sources will be prevented from running without valid server credentials.'}
                </p>
              </div>
            );
          } else if (status === 'quota_exceeded') {
            return (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Quota Exceeded:</strong> Google Places API quota exceeded or billing not active on Google Cloud Platform.
                </p>
              </div>
            );
          } else {
            return (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Not Configured:</strong> {currentSourceInfo?.message || 'GOOGLE_MAPS_API_KEY is not configured in the server environment. Please set GOOGLE_MAPS_API_KEY in your Render environment variables to activate this connector.'}
                </p>
              </div>
            );
          }
        })()}

        {/* Permitted source compliance notice */}
        <div className="p-3 bg-surface-50 rounded-xl border border-surface-200/80 flex items-start gap-2.5 text-xs text-surface-600">
          <ShieldAlert className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Data collection strictly routes through permitted connectors, respecting rate-limits, exponential backoff, and robots policies.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={!capabilityAudit.isValid}
            iconLeft={Play}
          >
            Start Data Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickCollectionModal;
