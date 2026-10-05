import React, { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export function ExportDialog({ isOpen, onClose, onExport, totalRecords = 0 }) {
  const [exportType, setExportType] = useState('filtered');
  const [freezeHeader, setFreezeHeader] = useState(true);

  const handleConfirm = () => {
    onExport({ exportType, freezeHeader });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Leads to Excel"
      subtitle="Generate professional .xlsx workbook with preserved formatting."
      maxWidth="sm"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 bg-brand-50 text-brand-900 rounded-xl border border-brand-200/60 flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-brand-600 shrink-0" />
          <span>Ready to export {totalRecords} records to Excel format.</span>
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-surface-700 uppercase tracking-wide block text-[11px]">
            Export Scope
          </label>
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-50">
            <input
              type="radio"
              name="scope"
              checked={exportType === 'filtered'}
              onChange={() => setExportType('filtered')}
            />
            <span className="font-medium text-surface-800">Current Filtered View</span>
          </label>
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-surface-200 cursor-pointer hover:bg-surface-50">
            <input
              type="radio"
              name="scope"
              checked={exportType === 'all'}
              onChange={() => setExportType('all')}
            />
            <span className="font-medium text-surface-800">Entire Vendor Database (500k+)</span>
          </label>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={freezeHeader}
              onChange={(e) => setFreezeHeader(e.target.checked)}
              className="rounded text-brand-600"
            />
            <span className="text-surface-700">Freeze top header row</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" iconLeft={Download} onClick={handleConfirm}>
            Download XLSX
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ExportDialog;
