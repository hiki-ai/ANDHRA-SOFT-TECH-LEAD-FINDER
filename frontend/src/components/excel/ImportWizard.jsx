import React, { useState } from 'react';
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';
import { Select } from '../common/Select';

const DB_FIELDS = [
  { value: 'business_name', label: 'Business Name (Required)' },
  { value: 'category', label: 'Category' },
  { value: 'phone', label: 'Primary Phone' },
  { value: 'email', label: 'Email Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'pincode', label: 'Pincode' },
  { value: '__ignore__', label: '— Ignore Column —' },
];

export function ImportWizard({ onImportComplete }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [columnMappings, setColumnMappings] = useState({
    'Company Name': 'business_name',
    'Industry': 'category',
    'Mobile': 'phone',
    'Email': 'email',
    'City': 'city',
  });

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStep(2);
    }
  };

  const handleConfirm = () => {
    setStep(3);
    if (onImportComplete) onImportComplete();
  };

  return (
    <div className="space-y-4">
      {step === 1 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-surface-300 rounded-2xl p-10 text-center bg-white hover:bg-surface-50 cursor-pointer"
        >
          <Upload className="w-8 h-8 text-brand-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-surface-900 mb-1">Upload Spreadsheet</h4>
          <p className="text-xs text-surface-500 mb-4">Accepts .xlsx and .csv files.</p>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.csv" onChange={handleFileDrop} className="hidden" />
            <Button variant="primary" size="sm">Browse Computer</Button>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-5 rounded-2xl border border-surface-200 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h4 className="text-sm font-bold text-surface-900">Map Columns ({file?.name})</h4>
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
          </div>
          <div className="space-y-3">
            {Object.entries(columnMappings).map(([excelCol, dbField]) => (
              <div key={excelCol} className="flex items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-surface-800 w-1/3">{excelCol}</span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-400" />
                <div className="w-1/2">
                  <Select
                    value={dbField}
                    onChange={(e) => setColumnMappings({ ...columnMappings, [excelCol]: e.target.value })}
                    options={DB_FIELDS}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3 border-t border-surface-100">
            <Button variant="primary" onClick={handleConfirm}>Confirm & Import</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-surface-200 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h4 className="text-base font-bold text-surface-900">Import Successful</h4>
          <p className="text-xs text-surface-600">Records imported and validated.</p>
          <Button variant="outline" size="sm" onClick={() => setStep(1)} iconLeft={RotateCcw}>Import Another</Button>
        </div>
      )}
    </div>
  );
}

export default ImportWizard;
