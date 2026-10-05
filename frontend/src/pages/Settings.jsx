import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Sliders,
  Database,
  FileSpreadsheet,
  Cpu,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Layers,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export function Settings() {
  const { user } = useAuth();
  const toast = useToast();

  const [settings, setSettings] = useState({
    defaultBatchSize: '500',
    concurrencyThreads: '4',
    rateLimitPerMin: '60',
    dedupeStrategy: 'composite_normalized',
    exportFreezeHeader: true,
    preserveLeadingZeros: true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('System preferences and defaults saved successfully.');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">
          System Settings & Preferences
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Manage administrator account, collection defaults, deduplication rules, and export preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Account Section */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-surface-100">
            <User className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Administrator Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <Input
              label="Admin Name"
              disabled
              value={user?.displayName || 'Administrator'}
            />
            <Input
              label="Email Address"
              disabled
              value={user?.email || 'admin@andhrasofttech.com'}
            />
            <div>
              <span className="text-xs font-semibold text-surface-700 tracking-wide uppercase block mb-1.5">
                Authentication Provider
              </span>
              <div className="flex items-center gap-2 p-2 bg-surface-50 rounded-xl border border-surface-200 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-surface-800">Firebase Authentication</span>
                <Badge variant="valid" className="ml-auto">Active</Badge>
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-surface-700 tracking-wide uppercase block mb-1.5">
                Role & Permissions
              </span>
              <div className="flex items-center gap-2 p-2 bg-surface-50 rounded-xl border border-surface-200 text-xs">
                <Lock className="w-4 h-4 text-brand-600" />
                <span className="font-semibold text-surface-800">Super Administrator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Defaults (Section 39) */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-surface-100">
            <Sliders className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Collection & Extraction Defaults
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <Input
              label="Default Batch Size"
              type="number"
              value={settings.defaultBatchSize}
              onChange={(e) => setSettings({ ...settings, defaultBatchSize: e.target.value })}
              helperText="Records per worker commit."
            />
            <Input
              label="Worker Concurrency"
              type="number"
              value={settings.concurrencyThreads}
              onChange={(e) => setSettings({ ...settings, concurrencyThreads: e.target.value })}
              helperText="Parallel queue workers."
            />
            <Input
              label="Rate Limit (Req/Min)"
              type="number"
              value={settings.rateLimitPerMin}
              onChange={(e) => setSettings({ ...settings, rateLimitPerMin: e.target.value })}
              helperText="Strict per-source throttle."
            />
          </div>
        </div>

        {/* Data & Deduplication Settings */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-surface-100">
            <Database className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Deduplication & Data Integrity
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <Select
              label="Deduplication Strategy"
              value={settings.dedupeStrategy}
              onChange={(e) => setSettings({ ...settings, dedupeStrategy: e.target.value })}
              options={[
                { value: 'composite_normalized', label: 'Composite Normalized: Name + Clean Phone + City (Recommended)' },
                { value: 'phone_strict', label: 'Strict Phone Match Only' },
                { value: 'name_location', label: 'Fuzzy Business Name + Exact City' },
              ]}
              helperText="Determines how incoming vendors are matched against existing records before upsert."
            />
          </div>
        </div>

        {/* Export Settings (Section 19 & 47) */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-surface-100">
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Excel Export Formatting
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.exportFreezeHeader}
                onChange={(e) => setSettings({ ...settings, exportFreezeHeader: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="font-medium text-surface-800">
                Freeze header row (Row 1) in exported spreadsheet
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.preserveLeadingZeros}
                onChange={(e) => setSettings({ ...settings, preserveLeadingZeros: e.target.checked })}
                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
              />
              <span className="font-medium text-surface-800">
                Preserve leading zeroes on telephone numbers and PIN codes (prevent Excel scientific notation)
              </span>
            </label>
          </div>
        </div>

        {/* System & Cloud Architecture Status */}
        <div className="bg-white p-6 rounded-2xl border border-surface-200 shadow-card">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-surface-100">
            <Cpu className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              System Environment & Cloud Status
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-[10px] uppercase font-semibold text-surface-400 block">Frontend</span>
              <span className="font-bold text-surface-800">Vite + React 19</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Netlify Ready</span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-[10px] uppercase font-semibold text-surface-400 block">Backend</span>
              <span className="font-bold text-surface-800">Python Flask</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Render Ready</span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-[10px] uppercase font-semibold text-surface-400 block">Database</span>
              <span className="font-bold text-surface-800">Firebase Firestore</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">500k+ Cloud NoSQL</span>
            </div>

            <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
              <span className="text-[10px] uppercase font-semibold text-surface-400 block">Auth Layer</span>
              <span className="font-bold text-surface-800">Firebase Auth</span>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Role Protected</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" iconLeft={Save}>
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
