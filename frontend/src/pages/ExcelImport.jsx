import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  FolderPlus,
  Download,
  Layers,
  Copy,
  AlertOctagon,
  FileCheck,
  Check,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Input } from '../components/common/Input';
import { useToast } from '../context/ToastContext';
import { importService } from '../services/importService';
import { exportService } from '../services/exportService';
import { formatNumber } from '../utils/formatters';

const DB_FIELDS = [
  { value: 'business_name', label: 'Business / Company Name (Required)' },
  { value: 'category', label: 'Industry / Category' },
  { value: 'subcategory', label: 'Subcategory' },
  { value: 'phone', label: 'Primary Phone' },
  { value: 'alternate_phone', label: 'Alternate Phone' },
  { value: 'email', label: 'Email Address' },
  { value: 'website', label: 'Website URL' },
  { value: 'linkedin', label: 'LinkedIn Profile URL' },
  { value: 'address', label: 'Street Address' },
  { value: 'city', label: 'City / Town' },
  { value: 'state', label: 'State' },
  { value: 'pincode', label: 'Pincode / ZIP' },
  { value: 'rating', label: 'Rating' },
  { value: 'review_count', label: 'Review Count' },
  { value: '__custom__', label: '+ Save as Custom Field' },
  { value: '__ignore__', label: '— Ignore Column —' },
];

export function ExcelImport() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [collectionName, setCollectionName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

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
      setCollectionName(data.suggested_collection_name || `Imported - ${droppedFile.name.replace(/\.[^/.]+$/, '')}`);
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
      toast.info('Starting batch commit and creating collection...');
      const res = await importService.executeImport({
        file,
        mapping: columnMappings,
        collection_name: collectionName.trim(),
        skip_duplicates: skipDuplicates,
      });
      const data = res?.data || res;
      setImportResult(data);
      setStep(3);
      toast.success(
        `Collection created: ${data.inserted || 0} leads imported (${data.duplicate || 0} duplicates skipped).`
      );
    } catch (err) {
      console.error('[ExcelImport] Execute error:', err);
      setError(err?.message || 'Import execution failed.');
      toast.error(err?.message || 'Failed to complete import.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!importResult?.collection_id) return;
    setIsExporting(true);
    try {
      toast.info('Generating real Excel (.xlsx) file...');
      await exportService.downloadDirectly({
        collection_id: importResult.collection_id,
        format: 'xlsx',
      });
      toast.success('Excel download initiated.');
    } catch (err) {
      console.error('[ExcelImport] Download error:', err);
      toast.error(err?.message || 'Failed to generate Excel download.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setCollectionName('');
    setSkipDuplicates(true);
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
          Ingest raw vendor spreadsheets into Cloud Firestore collections with automated deduplication, column mapping, and instant Excel re-export.
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
          <span>Map Columns & Configure Collection</span>
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
          <span>Collection Created</span>
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

      {/* Step 2: Mapping, Collection Settings & Preview */}
      {step === 2 && previewData && (
        <div className="space-y-6">
          {/* File summary and collection name configuration */}
          <div className="p-5 bg-white rounded-2xl border border-surface-200 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-100">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-brand-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-surface-900">
                    {file?.name}
                  </h4>
                  <p className="text-xs text-surface-500">
                    Detected {formatNumber(previewData.detected_rows || 0)} total rows • {previewData.detected_columns?.length || 0} columns
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Choose Another File
              </Button>
            </div>

            {/* Quality & Pre-scan telemetry cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-200">
                <span className="text-[10px] font-bold text-surface-500 uppercase block">Total Rows</span>
                <span className="text-lg font-black text-surface-900">{formatNumber(previewData.detected_rows || 0)}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Valid Leads</span>
                <span className="text-lg font-black text-emerald-800">{formatNumber(previewData.valid_rows || 0)}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Duplicates Detected</span>
                <span className="text-lg font-black text-amber-800">{formatNumber(previewData.duplicate_rows || 0)}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Empty / Invalid</span>
                <span className="text-lg font-black text-rose-800">{formatNumber(previewData.invalid_rows || 0)}</span>
              </div>
            </div>

            {/* Collection Configuration Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-surface-800 mb-1">
                  Collection Name (Required)
                </label>
                <Input
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g. Imported - Andhra Tech Vendors"
                  iconLeft={FolderPlus}
                />
                <p className="text-[10px] text-surface-400 mt-1">
                  This collection will appear in your Collections history with all imported leads.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-800 mb-1">
                  Duplicate Handling
                </label>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-surface-800 block">
                      Skip Duplicate Records
                    </span>
                    <span className="text-[10px] text-surface-500">
                      Ignores rows with existing phone numbers or business identities
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-surface-300 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Column Mapping Table */}
          <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
            <div className="p-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-surface-900">Column Header Mapping</h3>
                <p className="text-xs text-surface-500 mt-0.5">
                  Confirm or adjust how spreadsheet columns map into AST lead fields. Custom columns are fully preserved.
                </p>
              </div>
              <span className="text-xs font-mono text-surface-400">
                {previewData.detected_columns?.length || 0} fields
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
                            Sample: "{String(sampleVal).slice(0, 45)}"
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-surface-400">
                        <ArrowRight className="w-4 h-4 hidden sm:block" />
                      </div>
                      <div className="w-full sm:w-1/2">
                        <Select
                          value={columnMappings[colName] || '__custom__'}
                          onChange={(e) => handleMappingChange(colName, e.target.value)}
                          options={DB_FIELDS}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-4 bg-surface-50 border-t border-surface-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-surface-500">
                {skipDuplicates
                  ? 'Duplicate records will be filtered automatically.'
                  : 'All rows including duplicates will be committed to the collection.'}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmImport}
                  isLoading={isProcessing}
                  iconRight={ArrowRight}
                >
                  Confirm & Create Collection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success Confirmation & Actions */}
      {step === 3 && importResult && (
        <div className="bg-white p-8 rounded-2xl border border-surface-200 shadow-card text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-surface-900">
              Collection Created & Leads Imported
            </h3>
            <p className="text-xs text-surface-600 mt-1">
              Collection <strong className="text-surface-900 font-mono">"{importResult.collection_name}"</strong> has been saved in Firestore.
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
              <span className="text-[10px] font-semibold text-amber-700 uppercase block">Duplicates Handled</span>
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

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="md"
              iconLeft={Download}
              isLoading={isExporting}
              onClick={handleDownloadExcel}
            >
              Download Excel (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="md"
              iconRight={ArrowRight}
              onClick={() => navigate(`/collections/${importResult.collection_id}`)}
            >
              Open Collection View
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} iconLeft={RotateCcw}>
              Import Another Spreadsheet
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelImport;
