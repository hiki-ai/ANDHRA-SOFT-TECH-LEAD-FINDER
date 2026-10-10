import React, { useState, useEffect } from 'react';
import {
  Table,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Download,
  Search,
  Filter,
  Columns,
  CheckSquare,
  Square,
  AlertCircle,
  Copy,
  ChevronDown,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';
import { vendorService } from '../services/vendorService';
import { columnService } from '../services/columnService';
import { exportService } from '../services/exportService';

export function DataEditor() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [customColumns, setCustomColumns] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();

  const loadGridData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch custom columns
      const colsRes = await columnService.getColumns();
      const loadedCols = colsRes?.data || colsRes || [];
      if (Array.isArray(loadedCols)) {
        setCustomColumns(loadedCols);
      }

      // 2. Fetch vendor records
      const venRes = await vendorService.getVendors({ limit: 100 });
      const venData = venRes?.data || venRes;
      const items = venData?.items || [];
      setData(items);
      setDirtyRows(new Set());
      setSelectedIds(new Set());
    } catch (err) {
      console.error('[DataEditor] Load error:', err);
      setError(err?.message || 'Failed to load spreadsheet records from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGridData();
  }, []);

  const handleCellChange = (id, field, value) => {
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setDirtyRows((prev) => new Set(prev).add(id));
  };

  const handleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (dirtyRows.size === 0) return;
    setSaving(true);
    try {
      const rowsToSave = data.filter((r) => dirtyRows.has(r.id));
      for (const row of rowsToSave) {
        if (row.isNew) {
          const { isNew, ...payload } = row;
          await vendorService.createVendor(payload);
        } else {
          await vendorService.updateVendor(row.id, row);
        }
      }
      setDirtyRows(new Set());
      toast.success(`Saved modifications for ${rowsToSave.length} record(s) to Cloud Firestore.`);
    } catch (err) {
      console.error('[DataEditor] Save changes error:', err);
      toast.error(err?.message || 'Failed to persist edits to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    loadGridData();
    toast.info('Discarded unsaved spreadsheet edits.');
  };

  const handleAddRow = () => {
    const tempId = 'new_' + Date.now();
    const newRow = {
      id: tempId,
      isNew: true,
      business_name: 'New Business Entry',
      category: 'General',
      phone: '',
      email: '',
      city: 'Rajahmundry',
      state: 'Andhra Pradesh',
      rating: 0,
      status: 'valid',
      data_quality_score: 50,
    };
    setData([newRow, ...data]);
    setDirtyRows((prev) => new Set(prev).add(tempId));
    toast.info('New row appended to spreadsheet.');
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    try {
      for (const id of idsToDelete) {
        if (!id.startsWith('new_')) {
          await vendorService.deleteVendor(id);
        }
      }
      setData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast.success(`Deleted ${idsToDelete.length} row(s) permanently.`);
    } catch (err) {
      console.error('[DataEditor] Delete error:', err);
      toast.error(err?.message || 'Failed to delete selected rows.');
    }
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    const colKey = newColumnName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    try {
      const res = await columnService.createColumn({
        key: colKey,
        label: newColumnName.trim(),
        type: newColumnType,
      });
      const createdCol = res?.data || {
        key: colKey,
        label: newColumnName.trim(),
        type: newColumnType,
      };

      setCustomColumns((prev) => [...prev, createdCol]);
      setData((prev) => prev.map((r) => ({ ...r, [colKey]: '' })));
      setNewColumnName('');
      setShowAddColumnModal(false);
      toast.success(`Custom column "${newColumnName}" registered in Firestore.`);
    } catch (err) {
      console.error('[DataEditor] Add column error:', err);
      toast.error(err?.message || 'Failed to create column.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      toast.info('Generating real Excel export from Cloud Firestore...');
      await exportService.downloadDirectly({ format: 'xlsx' });
      toast.success('Spreadsheet exported to Excel successfully.');
    } catch (err) {
      console.error('[DataEditor] Export error:', err);
      toast.error(err?.message || 'Failed to export Excel.');
    } finally {
      setExporting(false);
    }
  };

  const filteredData = data.filter(
    (row) =>
      !searchTerm ||
      (row.business_name && row.business_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.city && row.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.phone && row.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900">
              Spreadsheet Data Editor
            </h1>
            <Badge variant="brand">Cloud Grid Mode</Badge>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Inline editable grid with server-side batching and dynamic Firestore columns.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {dirtyRows.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                iconLeft={RotateCcw}
                onClick={handleDiscardChanges}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={Save}
                loading={saving}
                onClick={handleSaveChanges}
              >
                Save ({dirtyRows.size})
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            iconLeft={Plus}
            onClick={handleAddRow}
          >
            Add Row
          </Button>

          <Button
            variant="outline"
            size="sm"
            iconLeft={Columns}
            onClick={() => setShowAddColumnModal(true)}
          >
            Add Column
          </Button>

          <Button
            variant="outline"
            size="sm"
            iconLeft={Download}
            loading={exporting}
            onClick={handleExport}
          >
            Export Excel
          </Button>

          {selectedIds.size > 0 && (
            <Button
              variant="danger"
              size="sm"
              iconLeft={Trash2}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800 font-medium">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={loadGridData}>
            Retry
          </Button>
        </div>
      )}

      {/* Search and stats bar */}
      <div className="bg-white p-3 rounded-2xl border border-surface-200 shadow-card flex items-center justify-between gap-3 text-xs">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Search spreadsheet rows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-50 border border-surface-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-surface-900 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-4 text-surface-500 font-medium">
          <span>{filteredData.length} records</span>
          {selectedIds.size > 0 && (
            <span className="text-brand-600 font-semibold">
              {selectedIds.size} row(s) selected
            </span>
          )}
          {dirtyRows.size > 0 && (
            <span className="text-amber-600 font-semibold">
              {dirtyRows.size} unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet Table with Inline Editable Cells */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-100/80 border-b border-surface-200 uppercase text-[10px] tracking-wider text-surface-600 font-bold sticky top-0 z-20">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={handleSelectAll}
                    className="text-surface-400 hover:text-surface-600"
                  >
                    {selectedIds.size === data.length && data.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[200px]">
                  Business Name
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">
                  Category
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[150px]">
                  Phone
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[180px]">
                  Email
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">
                  City
                </th>
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[130px]">
                  State
                </th>
                {customColumns.map((col) => (
                  <th
                    key={col.key || col.id}
                    className="py-2.5 px-3 border-r border-surface-200/60 min-w-[140px] text-brand-700 bg-brand-50/50"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="py-2.5 px-3 border-r border-surface-200/60 min-w-[100px]">
                  Status
                </th>
                <th className="py-2.5 px-3 min-w-[80px] text-center">
                  Quality
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={9 + customColumns.length} className="py-12 text-center text-surface-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Loading spreadsheet records from Cloud Firestore...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9 + customColumns.length} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-surface-100 border border-surface-200 mx-auto flex items-center justify-center text-surface-400">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-surface-900">
                        No Spreadsheet Records
                      </h3>
                      <p className="text-xs text-surface-500">
                        No rows found in Firestore. Click "Add Row" or import a file to begin editing.
                      </p>
                      <div className="pt-2">
                        <Button size="sm" variant="primary" iconLeft={Plus} onClick={handleAddRow}>
                          Add Row
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
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
                      {/* Checkbox */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleToggleRow(row.id)}
                          className="text-surface-400 hover:text-surface-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Business Name (Editable Cell) */}
                      <td className="p-1 border-r border-surface-100">
                        <input
                          type="text"
                          value={row.business_name || ''}
                          onChange={(e) =>
                            handleCellChange(row.id, 'business_name', e.target.value)
                          }
                          className={cn(
                            'w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none font-medium',
                            isDirty && 'font-semibold text-brand-900'
                          )}
                        />
                      </td>

                      {/* Category */}
                      <td className="p-1 border-r border-surface-100">
                        <input
                          type="text"
                          value={row.category || ''}
                          onChange={(e) =>
                            handleCellChange(row.id, 'category', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                        />
                      </td>

                      {/* Phone */}
                      <td className="p-1 border-r border-surface-100 font-mono">
                        <input
                          type="text"
                          value={row.phone || ''}
                          onChange={(e) =>
                            handleCellChange(row.id, 'phone', e.target.value)
                          }
                          className={cn(
                            'w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none',
                            !row.phone && 'bg-rose-50/50 placeholder:italic'
                          )}
                          placeholder="Add phone..."
                        />
                      </td>

                      {/* Email */}
                      <td className="p-1 border-r border-surface-100">
                        <input
                          type="email"
                          value={row.email || ''}
                          onChange={(e) =>
                            handleCellChange(row.id, 'email', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                          placeholder="Add email..."
                        />
                      </td>

                      {/* City */}
                      <td className="p-1 border-r border-surface-100">
                        <input
                          type="text"
                          value={row.city || ''}
                          onChange={(e) =>
                            handleCellChange(row.id, 'city', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                        />
                      </td>

                      {/* State */}
                      <td className="p-1 border-r border-surface-100">
                        <input
                          type="text"
                          value={row.state || 'Andhra Pradesh'}
                          onChange={(e) =>
                            handleCellChange(row.id, 'state', e.target.value)
                          }
                          className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                        />
                      </td>

                      {/* Custom columns */}
                      {customColumns.map((col) => (
                        <td key={col.key || col.id} className="p-1 border-r border-surface-100">
                          <input
                            type="text"
                            value={row[col.key] || ''}
                            onChange={(e) =>
                              handleCellChange(row.id, col.key, e.target.value)
                            }
                            className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                            placeholder={`Enter ${col.label.toLowerCase()}...`}
                          />
                        </td>
                      ))}

                      {/* Status Pill */}
                      <td className="py-2 px-3 border-r border-surface-100">
                        <Badge variant={row.status || 'valid'} dot>
                          {String(row.status || 'valid').toUpperCase()}
                        </Badge>
                      </td>

                      {/* Quality */}
                      <td className="py-2 px-3 text-center font-bold text-surface-700">
                        {row.data_quality_score ?? 0}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-surface-50 border-t border-surface-200 flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" />
              <span>Duplicate Highlight</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-300" />
              <span>Invalid Field Highlight</span>
            </span>
          </div>
          <span>Edits are persisted directly to Cloud Firestore upon clicking Save.</span>
        </div>
      </div>

      {/* Add Custom Column Modal */}
      <Modal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        title="Add Custom Spreadsheet Column"
        subtitle="Create a new administrator-defined field stored in Firestore documents."
        maxWidth="sm"
      >
        <form onSubmit={handleAddColumn} className="space-y-4">
          <Input
            label="Column Label / Name"
            placeholder="e.g. Lead Owner, Turn Over, GSTIN"
            required
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />

          <Select
            label="Data Type"
            value={newColumnType}
            onChange={(e) => setNewColumnType(e.target.value)}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'phone', label: 'Phone' },
              { value: 'email', label: 'Email' },
              { value: 'date', label: 'Date' },
              { value: 'boolean', label: 'Boolean (Yes/No)' },
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
            <Button
              variant="outline"
              onClick={() => setShowAddColumnModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Column
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSelected}
        title="Delete Selected Spreadsheet Rows"
        message={`Are you sure you want to delete ${selectedIds.size} row(s)? This will delete them permanently from the database.`}
        confirmText="Delete Rows"
        isDanger={true}
      />
    </div>
  );
}

export default DataEditor;
