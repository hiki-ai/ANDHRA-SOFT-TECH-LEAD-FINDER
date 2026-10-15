import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TableProperties,
  Plus,
  Save,
  RotateCcw,
  Trash2,
  Copy,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  FileSpreadsheet,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { presetService } from '../services/presetService';
import { cn } from '../utils/cn';
import {
  DEFAULT_COLUMNS,
  CANONICAL_FURNITURE_PRESET,
  buildFurnitureLeadsColumns,
  validateAndNormalizeColumns,
  validateAndNormalizePreset,
  isFieldSupportedBySource,
  getFieldCapabilityInfo,
} from '../utils/tableSchema';

const DATA_TYPES = [
  { value: 'text', label: 'Text (String)' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'email', label: 'Email Address' },
  { value: 'url', label: 'Website URL' },
  { value: 'number', label: 'Number / Count' },
  { value: 'rating', label: 'Rating (0 - 5.0)' },
  { value: 'date', label: 'Date / Timestamp' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
];

// Realistic mock preview data generator matching configured columns
const SAMPLE_PREVIEW_RECORDS = [
  {
    business_name: 'Royal Oak Furniture Studio',
    category: 'Furniture',
    phone: '+91 88324 12345',
    address: 'Main Road, Innespeta, Rajahmundry',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    website: 'https://royaloakfurniture.in',
    email: 'contact@royaloakfurniture.in',
    rating: 4.8,
    review_count: 142,
    source: 'Google Maps / Google Places API',
    source_id: 'ChIJz2q8x_example_01',
    status: 'valid',
    data_quality_score: 95,
    created_at: '2026-10-15T10:30:00Z',
    updated_at: '2026-10-15T10:30:00Z',
  },
  {
    business_name: 'Godrej Interio Showroom',
    category: 'Furniture',
    phone: '+91 89125 67890',
    address: 'Daba Gardens, Visakhapatnam',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    website: 'https://godrejinterio.com',
    email: 'vizag@godrejinterio.com',
    rating: 4.6,
    review_count: 215,
    source: 'Google Maps / Google Places API',
    source_id: 'ChIJy3r9w_example_02',
    status: 'valid',
    data_quality_score: 90,
    created_at: '2026-10-15T11:15:00Z',
    updated_at: '2026-10-15T11:15:00Z',
  },
  {
    business_name: 'Damro Modern Living',
    category: 'Furniture',
    phone: '+91 86624 99887',
    address: 'MG Road, Labbipet, Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    website: 'https://damroindia.com',
    email: 'vijayawada@damro.com',
    rating: 4.5,
    review_count: 88,
    source: 'Google Maps / Google Places API',
    source_id: 'ChIJx4s0v_example_03',
    status: 'valid',
    data_quality_score: 85,
    created_at: '2026-10-15T12:00:00Z',
    updated_at: '2026-10-15T12:00:00Z',
  },
];

export function TableEditor() {
  const toast = useToast();

  // Presets & columns state
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState('');
  const [columns, setColumns] = useState([]);
  const [originalColumns, setOriginalColumns] = useState([]);
  const [capabilities, setCapabilities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, enabled, disabled, custom, default

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeletePresetConfirm, setShowDeletePresetConfirm] = useState(false);
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState(false);

  // Form states for modals
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [newColKey, setNewColKey] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [newColRequired, setNewColRequired] = useState(false);
  const [newColKeyTouched, setNewColKeyTouched] = useState(false);

  const [editingColumn, setEditingColumn] = useState(null);
  const [renameLabel, setRenameLabel] = useState('');

  const [columnToDelete, setColumnToDelete] = useState(null);
  const [columnDeleteWarning, setColumnDeleteWarning] = useState('');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Load all presets on mount
  const loadPresets = useCallback(async (preferredPresetId = null) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await presetService.getPresets();
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      let caps = res?.source_capabilities;

      // If capabilities not included or empty, fetch from dedicated capabilities endpoint
      if (!caps || typeof caps !== 'object' || Object.keys(caps).length === 0) {
        try {
          const capRes = await presetService.getCapabilities();
          caps = capRes?.data || capRes || {};
        } catch (capErr) {
          console.warn('[TableEditor] Could not fetch fallback source capabilities:', capErr);
          caps = {};
        }
      }

      setCapabilities(caps || {});

      // Validate and normalize all presets before rendering
      const normalizedPresets = (list || []).map((p) =>
        validateAndNormalizePreset(p, res?.default_columns || DEFAULT_COLUMNS)
      );

      // If no presets returned from server, provide canonical Furniture Leads preset as safe default
      const finalPresets =
        normalizedPresets.length > 0
          ? normalizedPresets
          : [validateAndNormalizePreset(CANONICAL_FURNITURE_PRESET)];
      setPresets(finalPresets);

      // Determine active preset (preferred, or Furniture Leads, or first)
      let targetId = preferredPresetId;
      if (!targetId || !finalPresets.some((p) => p.id === targetId)) {
        const furn = finalPresets.find(
          (p) => p.id === 'preset_furniture_leads' || p.name === 'Furniture Leads'
        );
        targetId = furn ? furn.id : (finalPresets[0]?.id || '');
      }

      setActivePresetId(targetId);
      const activeP = finalPresets.find((p) => p.id === targetId);
      const validCols = validateAndNormalizeColumns(
        activeP?.columns,
        res?.default_columns || DEFAULT_COLUMNS
      );
      setColumns(JSON.parse(JSON.stringify(validCols)));
      setOriginalColumns(JSON.parse(JSON.stringify(validCols)));
    } catch (err) {
      console.error('[TableEditor] Load error:', err);
      const errorMsg = err?.message || 'Failed to load table presets from Firestore.';
      setLoadError(errorMsg);
      toast.error(errorMsg);
      // Safe fallback: populate standard columns if empty so view never breaks
      setColumns((prev) => (prev.length > 0 ? prev : buildFurnitureLeadsColumns()));
      setOriginalColumns((prev) => (prev.length > 0 ? prev : buildFurnitureLeadsColumns()));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(columns) !== JSON.stringify(originalColumns);
  }, [columns, originalColumns]);

  // Before unload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Change active preset
  const handleSelectPreset = (presetId) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved column changes in the current preset. Switch anyway?')) {
        return;
      }
    }
    setActivePresetId(presetId);
    const p = presets.find((item) => item.id === presetId);
    if (p) {
      const validCols = validateAndNormalizeColumns(p.columns, DEFAULT_COLUMNS);
      setColumns(JSON.parse(JSON.stringify(validCols)));
      setOriginalColumns(JSON.parse(JSON.stringify(validCols)));
    }
  };

  const activePreset = useMemo(() => {
    return presets.find((p) => p.id === activePresetId) || null;
  }, [presets, activePresetId]);

  // Auto-slugify custom column key when label changes
  const handleLabelChange = (val) => {
    setNewColLabel(val);
    if (!newColKeyTouched) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setNewColKey(slug);
    }
  };

  // Toggle column enabled status
  const handleToggleEnabled = (index) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_enabled: !updated[index].is_enabled };
      return updated;
    });
  };

  // Toggle column required status
  const handleToggleRequired = (index) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_required: !updated[index].is_required };
      return updated;
    });
  };

  // Move column up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    setColumns((prev) => {
      const updated = [...prev];
      const temp = updated[index - 1];
      updated[index - 1] = updated[index];
      updated[index] = temp;
      return updated.map((col, idx) => ({ ...col, position: idx }));
    });
  };

  // Move column down
  const handleMoveDown = (index) => {
    if (index >= columns.length - 1) return;
    setColumns((prev) => {
      const updated = [...prev];
      const temp = updated[index + 1];
      updated[index + 1] = updated[index];
      updated[index] = temp;
      return updated.map((col, idx) => ({ ...col, position: idx }));
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setColumns((prev) => {
      const updated = [...prev];
      const draggedItem = updated[draggedIndex];
      updated.splice(draggedIndex, 1);
      updated.splice(index, 0, draggedItem);
      return updated.map((col, idx) => ({ ...col, position: idx }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Change column data type
  const handleDataTypeChange = (index, newType) => {
    setColumns((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], data_type: newType };
      return updated;
    });
  };

  // Open rename modal
  const handleOpenRename = (col) => {
    setEditingColumn(col);
    setRenameLabel(col.label || col.name);
    setShowRenameModal(true);
  };

  // Confirm rename
  const handleConfirmRename = () => {
    const trimmed = renameLabel.trim();
    if (!trimmed) {
      toast.warning('Column name cannot be blank.');
      return;
    }
    // Check duplicate label
    const exists = columns.some(
      (c) => c.key !== editingColumn.key && c.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.warning(`A column labeled '${trimmed}' already exists in this table.`);
      return;
    }
    setColumns((prev) =>
      prev.map((c) => (c.key === editingColumn.key ? { ...c, label: trimmed } : c))
    );
    setShowRenameModal(false);
    toast.info(`Column renamed to '${trimmed}'.`);
  };

  // Open delete column check
  const handleOpenDeleteColumn = async (col) => {
    setColumnToDelete(col);
    try {
      const usageRes = await presetService.checkColumnUsage(col.key);
      const presetsUsing = usageRes?.used_in_presets || [];
      if (presetsUsing.length > 0) {
        setColumnDeleteWarning(
          `Notice: Column '${col.label}' is currently referenced in preset(s): ${presetsUsing.join(', ')}. Removing it will remove it from all associated table views.`
        );
      } else {
        setColumnDeleteWarning('');
      }
    } catch (err) {
      console.warn('[TableEditor] Could not check column usage:', err);
      setColumnDeleteWarning('');
    }
    setShowDeleteColumnConfirm(true);
  };

  // Confirm delete custom column
  const handleConfirmDeleteColumn = () => {
    if (!columnToDelete) return;
    setColumns((prev) =>
      prev
        .filter((c) => c.key !== columnToDelete.key)
        .map((col, idx) => ({ ...col, position: idx }))
    );
    setShowDeleteColumnConfirm(false);
    toast.info(`Custom column '${columnToDelete.label}' removed.`);
    setColumnToDelete(null);
  };

  // Add custom column
  const handleAddColumn = (e) => {
    e.preventDefault();
    const cleanLabel = newColLabel.trim();
    const cleanKey = newColKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanLabel) {
      toast.warning('Please enter a column display name.');
      return;
    }
    if (!cleanKey) {
      toast.warning('Please enter a valid field identifier key (letters, numbers, underscores).');
      return;
    }

    // Check duplicate key
    if (columns.some((c) => c.key === cleanKey)) {
      toast.warning(`Field key '${cleanKey}' is already used. Keys must be unique.`);
      return;
    }
    // Check duplicate label
    if (columns.some((c) => c.label.toLowerCase() === cleanLabel.toLowerCase())) {
      toast.warning(`A column named '${cleanLabel}' already exists.`);
      return;
    }

    const newCol = {
      key: cleanKey,
      name: cleanKey,
      label: cleanLabel,
      data_type: newColType,
      position: columns.length,
      is_enabled: true,
      is_required: newColRequired,
      is_custom: true,
      description: `Custom attribute: ${cleanLabel}`,
    };

    setColumns((prev) => [...prev, newCol]);
    setShowAddModal(false);
    setNewColLabel('');
    setNewColKey('');
    setNewColType('text');
    setNewColRequired(false);
    setNewColKeyTouched(false);
    toast.success(`Custom column '${cleanLabel}' added to table.`);
  };

  // Save current preset
  const handleSave = async () => {
    if (!activePresetId) return;

    // Validate duplicate keys and labels
    const keys = new Set();
    const labels = new Set();
    for (const c of columns) {
      if (keys.has(c.key)) {
        toast.error(`Duplicate column key '${c.key}' found. Each column must have a unique key.`);
        return;
      }
      keys.add(c.key);
      if (labels.has(c.label.toLowerCase())) {
        toast.error(`Duplicate column label '${c.label}' found. Labels must be unique.`);
        return;
      }
      labels.add(c.label.toLowerCase());
    }

    setSaving(true);
    try {
      await presetService.updatePreset(activePresetId, {
        columns,
      });
      setOriginalColumns(JSON.parse(JSON.stringify(columns)));
      toast.success(`Preset '${activePreset?.name || 'Table'}' saved successfully.`);
      loadPresets(activePresetId);
    } catch (err) {
      console.error('[TableEditor] Save error:', err);
      toast.error(err?.message || 'Failed to save preset.');
    } finally {
      setSaving(false);
    }
  };

  // Save As new preset
  const handleSaveAs = async (e) => {
    e.preventDefault();
    const cleanName = newPresetName.trim();
    if (!cleanName) {
      toast.warning('Please enter a preset name.');
      return;
    }

    if (presets.some((p) => p.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.warning(`A preset named '${cleanName}' already exists. Please choose a different name.`);
      return;
    }

    setSaving(true);
    try {
      const res = await presetService.createPreset({
        name: cleanName,
        description: newPresetDesc.trim(),
        columns,
      });
      const created = res?.data || res;
      toast.success(`Preset '${cleanName}' created successfully.`);
      setShowSaveAsModal(false);
      setNewPresetName('');
      setNewPresetDesc('');
      loadPresets(created?.id);
    } catch (err) {
      console.error('[TableEditor] Save As error:', err);
      toast.error(err?.message || 'Failed to create new preset.');
    } finally {
      setSaving(false);
    }
  };

  // Reset preset
  const handleReset = () => {
    if (!window.confirm('Reset this preset to its last saved configuration? Unsaved changes will be discarded.')) {
      return;
    }
    setColumns(JSON.parse(JSON.stringify(originalColumns)));
    toast.info('Columns reset to last saved state.');
  };

  // Delete preset
  const handleDeletePreset = async (force = false) => {
    if (!activePresetId) return;
    try {
      await presetService.deletePreset(activePresetId, force);
      toast.success(`Preset '${activePreset?.name}' deleted.`);
      setShowDeletePresetConfirm(false);
      loadPresets('preset_furniture_leads');
    } catch (err) {
      if (err?.response?.status === 409 || err?.in_use) {
        if (
          window.confirm(
            'This preset is associated with collection jobs. Deleting it will keep the collections intact with their saved snapshots. Are you sure you want to force delete?'
          )
        ) {
          handleDeletePreset(true);
          return;
        }
      }
      toast.error(err?.message || 'Failed to delete preset.');
    }
  };

  // Re-seed defaults
  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'Reset default system presets (including Furniture Leads)? This restores standard initial column configurations.'
      )
    ) {
      return;
    }
    try {
      await presetService.resetDefaults();
      toast.success('System presets re-initialized to factory defaults.');
      loadPresets('preset_furniture_leads');
    } catch (err) {
      toast.error(err?.message || 'Failed to reset default presets.');
    }
  };

  // Filter columns list
  const filteredColumns = useMemo(() => {
    return columns.filter((col) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        col.label.toLowerCase().includes(q) ||
        col.key.toLowerCase().includes(q) ||
        (col.description && col.description.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'enabled') matchesStatus = col.is_enabled;
      else if (statusFilter === 'disabled') matchesStatus = !col.is_enabled;
      else if (statusFilter === 'custom') matchesStatus = col.is_custom;
      else if (statusFilter === 'default') matchesStatus = !col.is_custom;

      return matchesSearch && matchesStatus;
    });
  }, [columns, searchTerm, statusFilter]);

  // Enabled columns in exact order
  const enabledColumns = useMemo(() => {
    return columns.filter((c) => c.is_enabled);
  }, [columns]);

  // Asynchronous Loading Guard
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] bg-white rounded-2xl border border-surface-200/80 p-12 text-center shadow-card">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-surface-900 tracking-tight">Loading Table Editor</h3>
        <p className="text-xs text-surface-500 mt-1 max-w-sm">
          Retrieving table presets, source capabilities, and column definitions...
        </p>
      </div>
    );
  }

  // Critical Error State Guard
  if (loadError && presets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] bg-white rounded-2xl border border-surface-200/80 p-12 text-center shadow-card">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-surface-900">Failed to Load Presets</h3>
        <p className="text-xs text-surface-500 mt-1.5 max-w-md">
          {loadError}
        </p>
        <Button
          variant="primary"
          size="sm"
          iconLeft={RotateCcw}
          onClick={() => loadPresets()}
          className="mt-5"
        >
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Preset Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-surface-200/80 shadow-card">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shrink-0 shadow-sm mt-0.5">
            <TableProperties className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-surface-900">Table Editor</h1>
              <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-200">
                PRESET & SCHEMA DESIGNER
              </span>
              {hasUnsavedChanges && (
                <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Configure table schemas, column order, data types, and collection presets.
            </p>
          </div>
        </div>

        {/* Preset Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Preset Dropdown */}
          <div className="w-56">
            <Select
              label=""
              containerClassName="gap-0"
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              options={presets.map((p) => ({
                value: p.id,
                label: `${p.name}${p.is_default ? ' (Default)' : p.is_system ? ' (System)' : ''}`,
              }))}
            />
          </div>

          {/* Save Button */}
          <Button
            variant="primary"
            size="sm"
            iconLeft={Save}
            isLoading={saving}
            disabled={!hasUnsavedChanges}
            onClick={handleSave}
            title={hasUnsavedChanges ? 'Save changes to active preset' : 'No unsaved changes'}
          >
            Save
          </Button>

          {/* Save As Button */}
          <Button
            variant="outline"
            size="sm"
            iconLeft={Copy}
            onClick={() => {
              setNewPresetName(`${activePreset?.name || 'Custom'} (Copy)`);
              setNewPresetDesc(activePreset?.description || '');
              setShowSaveAsModal(true);
            }}
            title="Save current columns as a new preset"
          >
            Save As
          </Button>

          {/* Reset Changes */}
          <Button
            variant="outline"
            size="sm"
            iconLeft={RotateCcw}
            disabled={!hasUnsavedChanges}
            onClick={handleReset}
            title="Reset columns to last saved state"
          >
            Reset
          </Button>

          {/* Delete Preset */}
          {activePreset && !activePreset.is_system && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={Trash2}
              onClick={() => setShowDeletePresetConfirm(true)}
              className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
              title="Delete active preset"
            >
              Delete
            </Button>
          )}

          {/* Factory Reset link */}
          <button
            onClick={handleResetDefaults}
            className="text-[11px] font-medium text-surface-400 hover:text-brand-600 underline ml-1 cursor-pointer transition-colors"
            title="Reset system presets to original factory defaults"
          >
            Reset Factory Defaults
          </button>
        </div>
      </div>

      {/* Preset Details Banner */}
      {activePreset && (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-surface-900 text-sm">{activePreset.name}</span>
            {activePreset.description && (
              <span className="text-surface-500 italic max-w-md truncate">{activePreset.description}</span>
            )}
            <Badge variant={activePreset.is_system ? 'brand' : 'neutral'}>
              {activePreset.is_system ? 'System Preset' : 'Custom Preset'}
            </Badge>
            <Badge variant="valid">
              {enabledColumns.length} Enabled / {columns.length} Total Columns
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-surface-500">
            <span>Primary Provider:</span>
            <span className="font-medium text-surface-700">Google Places API (New)</span>
          </div>
        </div>
      )}

      {/* Main Grid: Left Column Editor, Right Live Table Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Column Definitions & Reordering */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-surface-200/80 shadow-card flex flex-col">
          {/* Top Panel Controls */}
          <div className="p-4 border-b border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Status Filter */}
              <div className="w-32">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs bg-surface-50 border border-surface-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500"
                >
                  <option value="all">All Columns</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                  <option value="default">Default Only</option>
                  <option value="custom">Custom Only</option>
                </select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              iconLeft={Plus}
              onClick={() => {
                setNewColLabel('');
                setNewColKey('');
                setNewColType('text');
                setNewColRequired(false);
                setNewColKeyTouched(false);
                setShowAddModal(true);
              }}
              className="shrink-0 font-medium"
            >
              Add Column
            </Button>
          </div>

          {/* Column Ordering List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-50/80 text-[11px] font-semibold text-surface-500 uppercase tracking-wider border-b border-surface-100 select-none">
                  <th className="py-2.5 px-3 w-10 text-center">Order</th>
                  <th className="py-2.5 px-3">Column Name / Key</th>
                  <th className="py-2.5 px-3">Data Type</th>
                  <th className="py-2.5 px-3 text-center">Enabled</th>
                  <th className="py-2.5 px-3 text-center">Required</th>
                  <th className="py-2.5 px-3">Google Places</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-xs">
                {filteredColumns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-surface-400">
                      No columns match your current filter.
                    </td>
                  </tr>
                ) : (
                  filteredColumns.map((col, filteredIdx) => {
                    // Find actual index in complete columns array
                    const actualIndex = columns.findIndex((c) => c.key === col.key);
                    const isGoogleSupported = isFieldSupportedBySource(capabilities, 'google_places', col);
                    const capInfo = getFieldCapabilityInfo(capabilities, 'google_places', col);

                    return (
                      <tr
                        key={col.key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, actualIndex)}
                        onDragOver={(e) => handleDragOver(e, actualIndex)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'hover:bg-surface-50/60 transition-colors group',
                          !col.is_enabled && 'bg-surface-50/40 text-surface-400',
                          draggedIndex === actualIndex && 'opacity-40 bg-brand-50'
                        )}
                      >
                        {/* Drag Handle & Move Controls */}
                        <td className="py-2.5 px-2 text-center select-none">
                          <div className="flex items-center justify-center gap-1">
                            <span className="cursor-grab active:cursor-grabbing text-surface-300 group-hover:text-surface-500">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleMoveUp(actualIndex)}
                                disabled={actualIndex === 0}
                                className="p-0.5 text-surface-400 hover:text-surface-900 disabled:opacity-20 cursor-pointer"
                                title="Move up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveDown(actualIndex)}
                                disabled={actualIndex >= columns.length - 1}
                                className="p-0.5 text-surface-400 hover:text-surface-900 disabled:opacity-20 cursor-pointer"
                                title="Move down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Column Name & Key */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'font-semibold text-surface-900',
                                  !col.is_enabled && 'text-surface-500'
                                )}
                              >
                                {col.label}
                              </span>
                              {col.is_custom && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                                  Custom
                                </span>
                              )}
                              {!col.is_custom && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 bg-surface-100 text-surface-500 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-surface-400">{col.key}</span>
                          </div>
                        </td>

                        {/* Data Type */}
                        <td className="py-2.5 px-3">
                          <select
                            value={col.data_type || 'text'}
                            onChange={(e) => handleDataTypeChange(actualIndex, e.target.value)}
                            disabled={!col.is_custom && col.key === 'business_name'}
                            className="text-xs bg-transparent border border-surface-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500 disabled:bg-transparent disabled:border-transparent disabled:text-surface-500"
                          >
                            {DATA_TYPES.map((dt) => (
                              <option key={dt.value} value={dt.value}>
                                {dt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Enabled Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_enabled}
                            onChange={() => handleToggleEnabled(actualIndex)}
                            disabled={col.is_required}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-300 cursor-pointer disabled:cursor-not-allowed"
                            title={col.is_required ? 'Required columns cannot be disabled' : 'Toggle column visibility'}
                          />
                        </td>

                        {/* Required Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.is_required}
                            onChange={() => handleToggleRequired(actualIndex)}
                            disabled={col.key === 'business_name'}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-surface-300 cursor-pointer disabled:cursor-not-allowed"
                            title={col.key === 'business_name' ? 'Business Name is always required' : 'Toggle required status'}
                          />
                        </td>

                        {/* Google Places Capability Badge */}
                        <td className="py-2.5 px-3">
                          {isGoogleSupported ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Supported
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-help"
                              title={
                                capInfo?.reason ||
                                (col.key === 'email'
                                  ? 'Google Places API does not provide electronic mail addresses.'
                                  : 'Not supplied by raw Google Places connector. Left blank unless enriched.')
                              }
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-500" /> Unavailable
                            </span>
                          )}
                        </td>

                        {/* Actions (Rename, Delete) */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenRename(col)}
                              className="p-1 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer"
                              title="Rename column label"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {col.is_custom ? (
                              <button
                                onClick={() => handleOpenDeleteColumn(col)}
                                className="p-1 rounded text-surface-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete custom column"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="p-1 text-surface-200" title="Default database columns cannot be deleted">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-surface-50/50 border-t border-surface-100 text-[11px] text-surface-400 flex items-center justify-between">
            <span>Tip: Drag rows with the handle or use arrows to reorder table headers.</span>
            <span>{columns.length} columns defined</span>
          </div>
        </div>

        {/* Right Column: Live Table Preview */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-surface-200/80 shadow-card flex flex-col">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-600" />
              <h2 className="text-sm font-bold text-surface-900 tracking-tight">
                Live Spreadsheet & Table Preview
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
              {enabledColumns.length} Active Columns
            </span>
          </div>

          <div className="p-3 bg-indigo-50/60 border-b border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This preview reflects the exact header ordering and attributes that will appear in Excel
              exports and vendor collection tables for <strong>{activePreset?.name || 'this preset'}</strong>.
            </p>
          </div>

          {/* Interactive Live Spreadsheet Grid */}
          <div className="overflow-x-auto max-h-[460px] p-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-100 border-b border-surface-200 select-none">
                  {enabledColumns.map((col, idx) => (
                    <th
                      key={col.key}
                      className="py-2 px-3 font-semibold text-surface-800 whitespace-nowrap border-r border-surface-200/60 last:border-r-0"
                    >
                      <div className="flex flex-col">
                        <span>{col.label}</span>
                        <span className="text-[10px] text-surface-400 font-normal">
                          #{idx + 1} • {col.data_type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {SAMPLE_PREVIEW_RECORDS.map((rec, rIdx) => (
                  <tr key={rIdx} className="hover:bg-surface-50/60">
                    {enabledColumns.map((col) => {
                      let val = rec[col.key];
                      if (val === undefined || val === null) {
                        val = col.is_custom ? '—' : '';
                      }
                      return (
                        <td
                          key={col.key}
                          className="py-2.5 px-3 text-surface-700 whitespace-nowrap border-r border-surface-100 last:border-r-0 max-w-[180px] truncate"
                        >
                          {col.key === 'website' && val ? (
                            <a
                              href={val}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate">{val}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ) : col.key === 'rating' ? (
                            <span className="font-semibold text-amber-600">★ {val}</span>
                          ) : col.key === 'data_quality_score' ? (
                            <span className="font-semibold text-emerald-600">{val}%</span>
                          ) : (
                            String(val || '—')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-surface-50 border-t border-surface-100 text-[11px] text-surface-500 flex items-center justify-between">
            <span>Realistic sample data rendered with active schema.</span>
            <span>Columns ordered #{1} to #{enabledColumns.length}</span>
          </div>
        </div>
      </div>

      {/* Modal: Add Custom Column */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Custom Column"
        subtitle="Define a new attribute column for vendor lead data and spreadsheet export."
        maxWidth="md"
      >
        <form onSubmit={handleAddColumn} className="space-y-4">
          <Input
            label="Column Display Name"
            placeholder="e.g. GST Number, Instagram Handle, Warehouse Area..."
            value={newColLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            helperText="The human-readable label shown in table headers and Excel exports."
            required
            autoFocus
          />

          <Input
            label="Field Key (Identifier)"
            placeholder="e.g. gst_number, instagram_handle..."
            value={newColKey}
            onChange={(e) => {
              setNewColKeyTouched(true);
              setNewColKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
            }}
            helperText="Internal database attribute key (lowercase alphanumeric and underscores only)."
            required
          />

          <Select
            label="Data Type"
            value={newColType}
            onChange={(e) => setNewColType(e.target.value)}
            options={DATA_TYPES}
            helperText="Select the expected format and validation pattern for values in this column."
          />

          <div className="flex items-center gap-2 p-3 bg-surface-50 rounded-xl border border-surface-200">
            <input
              type="checkbox"
              id="newColRequired"
              checked={newColRequired}
              onChange={(e) => setNewColRequired(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-surface-300 cursor-pointer"
            />
            <label htmlFor="newColRequired" className="text-xs font-medium text-surface-800 cursor-pointer">
              Mark this column as <strong>Required</strong> for collection
            </label>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Custom columns are stored under <code>custom_fields</code> on vendor documents and included in
              Excel spreadsheets. If marked required, collection from sources that cannot supply it will be safely blocked.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" iconLeft={Plus}>
              Add Column
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rename Column */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        title="Rename Column"
        subtitle={`Update display label for '${editingColumn?.label}'. The internal key '${editingColumn?.key}' remains unchanged.`}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="New Column Display Label"
            value={renameLabel}
            onChange={(e) => setRenameLabel(e.target.value)}
            required
            autoFocus
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
            <Button variant="outline" onClick={() => setShowRenameModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmRename}>
              Update Label
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Save As New Preset */}
      <Modal
        isOpen={showSaveAsModal}
        onClose={() => setShowSaveAsModal(false)}
        title="Save Column Schema as New Preset"
        subtitle="Save the current column definitions, order, and configurations as a reusable preset."
        maxWidth="md"
      >
        <form onSubmit={handleSaveAs} className="space-y-4">
          <Input
            label="Preset Name"
            placeholder="e.g. Real Estate Columns, Hospitality Leads, Custom..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Optimized 6-column lead preset for regional property dealers..."
            value={newPresetDesc}
            onChange={(e) => setNewPresetDesc(e.target.value)}
          />

          <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs text-surface-600">
            <p>
              This preset will include <strong>{enabledColumns.length}</strong> active enabled columns in their
              exact currently configured order.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
            <Button variant="outline" onClick={() => setShowSaveAsModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving} iconLeft={Save}>
              Save New Preset
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog: Delete Preset */}
      <ConfirmDialog
        isOpen={showDeletePresetConfirm}
        onClose={() => setShowDeletePresetConfirm(false)}
        onConfirm={() => handleDeletePreset(false)}
        title="Delete Preset"
        message={`Are you sure you want to delete the preset '${activePreset?.name}'? This action cannot be undone.`}
        confirmText="Delete Preset"
        isDanger
      />

      {/* Confirm Dialog: Delete Column */}
      <ConfirmDialog
        isOpen={showDeleteColumnConfirm}
        onClose={() => {
          setShowDeleteColumnConfirm(false);
          setColumnToDelete(null);
        }}
        onConfirm={handleConfirmDeleteColumn}
        title="Delete Custom Column"
        message={
          columnDeleteWarning ||
          `Are you sure you want to delete custom column '${columnToDelete?.label}'? It will be removed from this table preset.`
        }
        confirmText="Delete Column"
        isDanger
      />
    </div>
  );
}

export default TableEditor;
