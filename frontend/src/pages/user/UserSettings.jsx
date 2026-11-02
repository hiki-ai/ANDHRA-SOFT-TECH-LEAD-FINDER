/**
 * Customer User Settings Page
 * Location: frontend/src/pages/user/UserSettings.jsx
 */

import React, { useState } from 'react';
import { Settings, Bell, FileSpreadsheet, Shield } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';

export function UserSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoExportXlsx, setAutoExportXlsx] = useState(true);
  const toast = useToast();

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Workspace preferences saved.');
  };

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Customer Settings
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Configure notifications, export defaults, and extraction preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">
            Notifications & Alerts
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200/60">
            <div>
              <div className="text-xs font-bold text-surface-900">Email Job Completion Alerts</div>
              <div className="text-[11px] text-surface-500">Receive an email when a large lead extraction job finishes.</div>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-50 border border-surface-200/60">
            <div>
              <div className="text-xs font-bold text-surface-900">Native Excel (XLSX) Format</div>
              <div className="text-[11px] text-surface-500">Default export files to formatted Microsoft Excel (.xlsx).</div>
            </div>
            <input
              type="checkbox"
              checked={autoExportXlsx}
              onChange={(e) => setAutoExportXlsx(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
          </div>

          <div className="pt-2">
            <Button size="sm" variant="primary" type="submit">
              Save Preferences
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default UserSettings;

