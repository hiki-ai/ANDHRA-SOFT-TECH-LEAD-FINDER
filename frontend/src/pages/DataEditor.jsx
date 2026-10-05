import React, { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { cn } from '../utils/cn';

// Sample spreadsheet dataset
const INITIAL_SPREADSHEET_DATA = [
  {
    id: 'ven_1001',
    business_name: 'Godavari Teak & Rosewood Emporium',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: 'info@godavariteak.com',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    gst_number: '37AAAAA0000A1Z5',
    rating: 4.8,
    status: 'valid',
    data_quality_score: 95,
  },
  {
    id: 'ven_1002',
    business_name: 'Visakha Multi-Speciality Dental Hospital',
    category: 'Hospitals',
    phone: '+91 891 254 7800',
    email: 'contact@visakhadental.org',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    gst_number: '37BBBBB1111B2Z6',
    rating: 4.6,
    status: 'valid',
    data_quality_score: 92,
  },
  {
    id: 'ven_1003',
    business_name: 'Krishna Delta Gourmet Restaurant',
    category: 'Restaurants',
    phone: '+91 866 248 1122',
    email: 'manager@krishnagourmet.in',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    gst_number: '37CCCCC2222C3Z7',
    rating: 4.4,
    status: 'valid',
    data_quality_score: 88,
  },
  {
    id: 'ven_1004',
    business_name: 'Amaravati Skyline Heights & Builders',
    category: 'Real Estate',
    phone: '+91 863 223 9901',
    email: 'sales@amaravatiskyline.com',
    city: 'Guntur',
    state: 'Andhra Pradesh',
    gst_number: '37DDDDD3333D4Z8',
    rating: 4.2,
    status: 'valid',
    data_quality_score: 84,
  },
  {
    id: 'ven_1005',
    business_name: 'Konaseema Grand Heritage Residency',
    category: 'Hotels',
    phone: '+91 884 237 4455',
    email: 'reservations@konaseemagrand.com',
    city: 'Kakinada',
    state: 'Andhra Pradesh',
    gst_number: '37EEEEE4444E5Z9',
    rating: 4.7,
    status: 'valid',
    data_quality_score: 90,
  },
  {
    id: 'ven_1006',
    business_name: 'Godavari Furnishing Works',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: '',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    gst_number: '',
    rating: 4.5,
    status: 'duplicate',
    data_quality_score: 62,
  },
  {
    id: 'ven_1007',
    business_name: 'Nellore Spice Kitchen',
    category: 'Restaurants',
    phone: '',
    email: '',
    city: 'Nellore',
    state: 'Andhra Pradesh',
    gst_number: '',
    rating: 3.8,
    status: 'invalid',
    data_quality_score: 45,
  },
];

export function DataEditor() {
  const [data, setData] = useState(INITIAL_SPREADSHEET_DATA);
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');
  const [customColumns, setCustomColumns] = useState([
    { key: 'gst_number', label: 'GST Number', type: 'text' },
  ]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();

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

  const handleSaveChanges = () => {
    setDirtyRows(new Set());
    toast.success(`Saved modifications for ${dirtyRows.size} record(s) to PostgreSQL.`);
  };

  const handleDiscardChanges = () => {
    setData(INITIAL_SPREADSHEET_DATA);
    setDirtyRows(new Set());
    toast.info('Discarded unsaved spreadsheet edits.');
  };

  const handleAddRow = () => {
    const newId = 'ven_' + Math.floor(1000 + Math.random() * 9000);
    const newRow = {
      id: newId,
      business_name: 'New Business Entry',
      category: 'General',
      phone: '',
      email: '',
      city: 'Rajahmundry',
      state: 'Andhra Pradesh',
      gst_number: '',
      rating: 0,
      status: 'pending_review',
      data_quality_score: 50,
    };
    setData([newRow, ...data]);
    setDirtyRows((prev) => new Set(prev).add(newId));
    toast.info('New row appended to spreadsheet.');
  };

  const handleDeleteSelected = () => {
    setData((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    toast.success('Selected row(s) removed.');
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    const colKey = newColumnName.toLowerCase().replace(/\s+/g, '_');
    setCustomColumns((prev) => [
      ...prev,
      { key: colKey, label: newColumnName.trim(), type: newColumnType },
    ]);
    setData((prev) => prev.map((r) => ({ ...r, [colKey]: '' })));
    setNewColumnName('');
    setShowAddColumnModal(false);
    toast.success(`Custom column "${newColumnName}" added to grid.`);
  };

  const filteredData = data.filter(
    (row) =>
      !searchTerm ||
      row.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.phone.includes(searchTerm)
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
            <Badge variant="brand">Excel Grid Mode</Badge>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Inline editable grid with server-side batching and custom column management.
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
            onClick={() => toast.success('Exporting edited spreadsheet dataset to Excel...')}
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

      {/* Spreadsheet Table with Inline Editable Cells (Section 17) */}
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
                    {selectedIds.size === data.length ? (
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
                    key={col.key}
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
              {filteredData.map((row) => {
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
                        value={row.business_name}
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
                        value={row.category}
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
                        value={row.phone}
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
                        value={row.email}
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
                        value={row.city}
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
                        value={row.state}
                        onChange={(e) =>
                          handleCellChange(row.id, 'state', e.target.value)
                        }
                        className="w-full px-2 py-1 bg-transparent rounded border border-transparent hover:border-surface-200 focus:bg-white focus:border-brand-500 focus:outline-none"
                      />
                    </td>

                    {/* Custom columns */}
                    {customColumns.map((col) => (
                      <td key={col.key} className="p-1 border-r border-surface-100">
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
                      <Badge variant={row.status} dot>
                        {row.status.toUpperCase()}
                      </Badge>
                    </td>

                    {/* Quality */}
                    <td className="py-2 px-3 text-center font-bold text-surface-700">
                      {row.data_quality_score}%
                    </td>
                  </tr>
                );
              })}
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
          <span>Changes are batched and synced directly to PostgreSQL upon Save.</span>
        </div>
      </div>

      {/* Add Custom Column Modal (Section 16) */}
      <Modal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        title="Add Custom Spreadsheet Column"
        subtitle="Create a new administrator-defined field stored in PostgreSQL JSONB."
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
        message={`Are you sure you want to delete ${selectedIds.size} row(s)? This will stage them for removal.`}
        confirmText="Delete Rows"
        isDanger={true}
      />
    </div>
  );
}
