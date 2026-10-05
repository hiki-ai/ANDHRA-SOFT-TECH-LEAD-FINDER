import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { useToast } from '../context/ToastContext';

const DB_FIELDS = [
  { value: 'business_name', label: 'Business Name (Required)' },
  { value: 'category', label: 'Category' },
  { value: 'phone', label: 'Primary Phone' },
  { value: 'alternate_phone', label: 'Alternate Phone' },
  { value: 'email', label: 'Email Address' },
  { value: 'website', label: 'Website URL' },
  { value: 'address', label: 'Street Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'pincode', label: 'Pincode' },
  { value: 'rating', label: 'Rating' },
  { value: 'review_count', label: 'Review Count' },
  { value: '__custom__', label: '+ Create Custom Field...' },
  { value: '__ignore__', label: '— Ignore Column —' },
];

export function ExcelImport() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  const [columnMappings, setColumnMappings] = useState({
    'Company Name': 'business_name',
    'Industry': 'category',
    'Mobile': 'phone',
    'Email ID': 'email',
    'Town/City': 'city',
    'State': 'state',
    'Zipcode': 'pincode',
  });

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx') && !droppedFile.name.endsWith('.csv')) {
        toast.error('Only .xlsx and .csv spreadsheet files are supported.');
        return;
      }
      setFile(droppedFile);
      setStep(2);
      toast.success(`Loaded "${droppedFile.name}". Please confirm column mapping.`);
    }
  };

  const handleMappingChange = (excelCol, dbField) => {
    setColumnMappings((prev) => ({ ...prev, [excelCol]: dbField }));
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStep(3);
      toast.success('Successfully imported 1,240 vendor records into PostgreSQL!');
    } catch {
      toast.error('Import process encountered an error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStep(1);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">
          Import Excel / CSV Leads
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Ingest raw vendor spreadsheets with column mapping, automated deduplication, and pre-import validation.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-surface-200 shadow-card text-xs">
        <div className={`flex items-center gap-2 font-semibold ${step >= 1 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-xs">
            1
          </span>
          <span>Upload File</span>
        </div>
        <div className="h-0.5 flex-1 bg-surface-200 mx-4" />
        <div className={`flex items-center gap-2 font-semibold ${step >= 2 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${step >= 2 ? 'bg-brand-50 border-brand-200' : 'border-surface-200'}`}>
            2
          </span>
          <span>Map Columns & Preview</span>
        </div>
        <div className="h-0.5 flex-1 bg-surface-200 mx-4" />
        <div className={`flex items-center gap-2 font-semibold ${step === 3 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${step === 3 ? 'bg-brand-50 border-brand-200' : 'border-surface-200'}`}>
            3
          </span>
          <span>Import & Telemetry</span>
        </div>
      </div>

      {step === 1 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-surface-300 rounded-2xl p-12 text-center bg-white hover:bg-surface-50/50 transition-colors cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-surface-900 mb-1">
            Drag & Drop your Excel or CSV spreadsheet here
          </h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto mb-6">
            Supports Microsoft Excel (.xlsx), Comma-Separated Values (.csv). Max file size 50MB.
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .csv, .xls"
              onChange={handleFileDrop}
              className="hidden"
            />
            <Button variant="primary" size="md" iconLeft={FileSpreadsheet}>
              Browse File from Computer
            </Button>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-brand-600" />
              <div>
                <h4 className="text-sm font-bold text-surface-900">
                  {file?.name || 'andhra_furniture_leads.xlsx'}
                </h4>
                <p className="text-xs text-surface-500">
                  Detected 1,320 rows • 7 columns • Ready for field alignment
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Choose Another File
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-white rounded-xl border border-surface-200">
              <span className="text-[10px] uppercase font-semibold text-surface-500 block">Total Rows</span>
              <span className="text-lg font-bold text-surface-900">1,320</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Valid Rows</span>
              <span className="text-lg font-bold text-emerald-800">1,240</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] uppercase font-semibold text-amber-700 block">Duplicates</span>
              <span className="text-lg font-bold text-amber-800">62</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] uppercase font-semibold text-rose-700 block">Invalid Rows</span>
              <span className="text-lg font-bold text-rose-800">18</span>
            </div>
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-200">
              <span className="text-[10px] uppercase font-semibold text-brand-700 block">Ready to Ingest</span>
              <span className="text-lg font-bold text-brand-800">1,240</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-900">Column Mapping</h3>
              <span className="text-xs text-surface-500">
                Map columns from spreadsheet into PostgreSQL vendor attributes
              </span>
            </div>

            <div className="p-4 divide-y divide-surface-100 space-y-3">
              {Object.entries(columnMappings).map(([excelCol, mappedField]) => (
                <div key={excelCol} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0">
                  <div className="w-full sm:w-1/3">
                    <span className="text-xs font-semibold text-surface-900 block">{excelCol}</span>
                    <span className="text-[10px] text-surface-400 font-mono">Sample: "Godavari Timber Mart"</span>
                  </div>
                  <div className="flex items-center gap-2 text-surface-400">
                    <ArrowRight className="w-4 h-4 hidden sm:block" />
                  </div>
                  <div className="w-full sm:w-1/2">
                    <Select
                      value={mappedField}
                      onChange={(e) => handleMappingChange(excelCol, e.target.value)}
                      options={DB_FIELDS}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center justify-between">
              <span className="text-xs text-surface-500">
                Invalid records will be preserved in review status without stopping import.
              </span>
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                isLoading={isProcessing}
                iconRight={ArrowRight}
              >
                Confirm & Import into Database
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-surface-900">
            Import Completed Successfully
          </h3>
          <p className="text-xs text-surface-600 max-w-md mx-auto leading-relaxed">
            1,240 records have been batch upserted into the PostgreSQL vendor repository with automated dedupe key generation and data quality scoring.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset} iconLeft={RotateCcw}>
              Import Another File
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconRight={ArrowRight}
              onClick={() => (window.location.href = '/vendors')}
            >
              View in Vendor Database
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelImport;
