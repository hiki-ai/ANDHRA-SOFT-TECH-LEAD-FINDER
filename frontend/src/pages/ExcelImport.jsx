import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Copy,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { useToast } from '../context/ToastContext';
import { importService } from '../services/importService';
import { formatNumber } from '../utils/formatters';

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
  { value: '__custom__', label: '+ Save as Custom Field' },
  { value: '__ignore__', label: '— Ignore Column —' },
];

export function ExcelImport() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (!droppedFile) return;

    const lower = droppedFile.name.toLowerCase();
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      toast.error('Only .xlsx, .xls, and .csv spreadsheet files are supported.');
      return;
    }

    setFile(droppedFile);
    setIsProcessing(true);
    setError(null);

    try {
      toast.info(`Analyzing spreadsheet "${droppedFile.name}"...`);
      const res = await importService.previewFile(droppedFile);
      const data = res?.data || res;
      setPreviewData(data);
      setColumnMappings(data.suggested_mapping || {});
      setStep(2);
      toast.success(`Detected ${data.detected_rows || 0} rows and ${data.detected_columns?.length || 0} columns.`);
    } catch (err) {
      console.error('[ExcelImport] Preview error:', err);
      setError(err?.message || 'Failed to parse spreadsheet file.');
      toast.error(err?.message || 'Spreadsheet parsing failed.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (excelCol, dbField) => {
    setColumnMappings((prev) => ({ ...prev, [excelCol]: dbField }));
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      toast.info('Starting batch commit to Cloud Firestore...');
      const res = await importService.executeImport(file, columnMappings);
      const data = res?.data || res;
      setImportResult(data);
      setStep(3);
      toast.success(
        `Import completed: ${data.inserted || 0} inserted, ${data.duplicate || 0} duplicates skipped.`
      );
    } catch (err) {
      console.error('[ExcelImport] Execute error:', err);
      setError(err?.message || 'Import execution failed.');
      toast.error(err?.message || 'Failed to complete import.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setColumnMappings({});
    setImportResult(null);
    setError(null);
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

      {/* Stepper Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-surface-200 shadow-card text-xs">
        <div className={`flex items-center gap-2 font-semibold ${step >= 1 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-xs">
            1
          </span>
          <span>Upload File</span>
        </div>
        <div className="h-0.5 flex-1 bg-surface-200 mx-4" />
        <div className={`flex items-center gap-2 font-semibold ${step >= 2 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span
            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
              step >= 2 ? 'bg-brand-50 border-brand-200' : 'border-surface-200'
            }`}
          >
            2
          </span>
          <span>Map Columns & Preview</span>
        </div>
        <div className="h-0.5 flex-1 bg-surface-200 mx-4" />
        <div className={`flex items-center gap-2 font-semibold ${step === 3 ? 'text-brand-600' : 'text-surface-400'}`}>
          <span
            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
              step === 3 ? 'bg-brand-50 border-brand-200' : 'border-surface-200'
            }`}
          >
            3
          </span>
          <span>Import Summary</span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800 font-medium">{error}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          className="border-2 border-dashed border-surface-300 rounded-2xl p-12 text-center bg-white hover:bg-surface-50/50 transition-colors cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-base font-bold text-surface-900 mb-1">
            {isProcessing ? 'Inspecting spreadsheet schema...' : 'Drag & Drop your Excel or CSV spreadsheet here'}
          </h3>
          <p className="text-xs text-surface-500 max-w-md mx-auto mb-6">
            Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Max file size 25MB.
          </p>
          {!isProcessing && (
            <label className="cursor-pointer inline-block">
              <input
                type="file"
                accept=".xlsx, .csv, .xls"
                onChange={handleFileDrop}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors">
                <FileSpreadsheet className="w-4 h-4" />
                Browse File from Computer
              </span>
            </label>
          )}
        </div>
      )}

      {/* Step 2: Mapping & Preview */}
      {step === 2 && previewData && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-2xl border border-surface-200 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-6 h-6 text-brand-600" />
              <div>
                <h4 className="text-sm font-bold text-surface-900">
                  {file?.name}
                </h4>
                <p className="text-xs text-surface-500">
                  Detected {formatNumber(previewData.detected_rows || 0)} rows • {previewData.detected_columns?.length || 0} columns
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Choose Another File
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-900">Column Mapping</h3>
              <span className="text-xs text-surface-500">
                Map columns from your file into database fields
              </span>
            </div>

            <div className="p-4 divide-y divide-surface-100 space-y-3">
              {previewData.detected_columns &&
                previewData.detected_columns.map((colName) => {
                  const sampleVal =
                    previewData.preview && previewData.preview.length > 0
                      ? previewData.preview[0][colName]
                      : '';

                  return (
                    <div
                      key={colName}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 first:pt-0"
                    >
                      <div className="w-full sm:w-1/3">
                        <span className="text-xs font-semibold text-surface-900 block">{colName}</span>
                        {sampleVal && (
                          <span className="text-[10px] text-surface-400 font-mono truncate block">
                            Sample: "{String(sampleVal).slice(0, 40)}"
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-surface-400">
                        <ArrowRight className="w-4 h-4 hidden sm:block" />
                      </div>
                      <div className="w-full sm:w-1/2">
                        <Select
                          value={columnMappings[colName] || '__ignore__'}
                          onChange={(e) => handleMappingChange(colName, e.target.value)}
                          options={DB_FIELDS}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-4 bg-surface-50 border-t border-surface-100 flex items-center justify-between">
              <span className="text-xs text-surface-500">
                Duplicates are identified automatically and skipped without dropping unique leads.
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

      {/* Step 3: Telemetry & Summary */}
      {step === 3 && importResult && (
        <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-surface-900">
              Import Completed Successfully
            </h3>
            <p className="text-xs text-surface-500 mt-1">
              Spreadsheet data was processed and committed to Cloud Firestore in chunked batches.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
              <span className="text-[10px] font-semibold text-surface-500 uppercase block">Total Rows</span>
              <span className="text-xl font-bold text-surface-900">
                {formatNumber(importResult.total_rows || 0)}
              </span>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Inserted Leads</span>
              <span className="text-xl font-bold text-emerald-800">
                {formatNumber(importResult.inserted || 0)}
              </span>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-semibold text-amber-700 uppercase block">Duplicates Skipped</span>
              <span className="text-xl font-bold text-amber-800">
                {formatNumber(importResult.duplicate || 0)}
              </span>
            </div>

            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-semibold text-rose-700 uppercase block">Invalid / Empty</span>
              <span className="text-xl font-bold text-rose-800">
                {formatNumber(importResult.failed || 0)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
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
