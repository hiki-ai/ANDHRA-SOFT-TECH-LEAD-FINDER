/**
 * Admin Free Trial Settings & User Monitoring Page
 * Location: frontend/src/pages/admin/AdminTrialSettings.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldAlert,
  Save,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function AdminTrialSettings() {
  const [trialData, setTrialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [settingsForm, setSettingsForm] = useState({
    free_trial_enabled: true,
    default_trial_record_limit: 30,
    trial_duration_days: 14,
    prevent_duplicate_accounts: true,
  });

  const loadTrialSettings = async () => {
    try {
      const data = await billingService.getAdminTrialSettings();
      setTrialData(data);
      if (data?.settings) {
        setSettingsForm({
          free_trial_enabled: data.settings.free_trial_enabled ?? true,
          default_trial_record_limit: data.settings.default_trial_record_limit || 30,
          trial_duration_days: data.settings.trial_duration_days || 14,
          prevent_duplicate_accounts: data.settings.prevent_duplicate_accounts ?? true,
        });
      }
    } catch (err) {
      console.error('[AdminTrialSettings] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrialSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await billingService.updateAdminTrialSettings({
        free_trial_enabled: Boolean(settingsForm.free_trial_enabled),
        default_trial_record_limit: Number(settingsForm.default_trial_record_limit),
        trial_duration_days: Number(settingsForm.trial_duration_days),
        prevent_duplicate_accounts: Boolean(settingsForm.prevent_duplicate_accounts),
      });
      toast.success('Free Trial settings updated successfully.');
      await loadTrialSettings();
    } catch (err) {
      toast.error(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading trial settings..." />
      </div>
    );
  }

  const recentTrials = trialData?.recent_trials || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Free Trial Settings
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Configure the 30-record allowance, trial duration, eligibility checks, and monitor trial usage across all users.
        </p>
      </div>

      {/* Global Config Form */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs max-w-2xl">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Global Trial Policy
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200/60">
            <div>
              <div className="text-xs font-bold text-surface-900">Enable Free Trial Program</div>
              <div className="text-[11px] text-surface-500">Allow eligible new registrants to activate free trials.</div>
            </div>
            <input
              type="checkbox"
              checked={settingsForm.free_trial_enabled}
              onChange={(e) => setSettingsForm({ ...settingsForm, free_trial_enabled: e.target.checked })}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Unique Records Limit"
              type="number"
              min="1"
              value={settingsForm.default_trial_record_limit}
              onChange={(e) => setSettingsForm({ ...settingsForm, default_trial_record_limit: e.target.value })}
              helperText="Default is 30 unique vendor records"
              required
            />

            <Input
              label="Trial Duration (Days)"
              type="number"
              min="1"
              value={settingsForm.trial_duration_days}
              onChange={(e) => setSettingsForm({ ...settingsForm, trial_duration_days: e.target.value })}
              helperText="Days before trial expires"
              required
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-50 border border-surface-200/60">
            <div>
              <div className="text-xs font-bold text-surface-900">Prevent Multi-Account Email Abuse</div>
              <div className="text-[11px] text-surface-500">Block repeated trial activations for the same registered email.</div>
            </div>
            <input
              type="checkbox"
              checked={settingsForm.prevent_duplicate_accounts}
              onChange={(e) => setSettingsForm({ ...settingsForm, prevent_duplicate_accounts: e.target.checked })}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <Button size="sm" variant="primary" type="submit" iconLeft={Save} isLoading={saving}>
              Save Trial Settings
            </Button>
          </div>
        </form>
      </div>

      {/* Trial Users Monitoring Table */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Trial Users & Progress ({recentTrials.length})
            </h3>
          </div>
        </div>

        {recentTrials.length === 0 ? (
          <div className="p-8 text-center text-xs text-surface-500">
            No users have activated a free trial yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3.5">User ID / Email</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Used Records</th>
                  <th className="px-6 py-3.5">Remaining</th>
                  <th className="px-6 py-3.5">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {recentTrials.map((t) => (
                  <tr key={t.user_id} className="hover:bg-surface-50/50">
                    <td className="px-6 py-4 font-mono text-surface-900">
                      <div>{t.user_email || t.user_id}</div>
                      <div className="text-[10px] text-surface-400 font-normal">{t.user_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          t.trial_status === 'active'
                            ? 'bg-indigo-50 text-indigo-700'
                            : t.trial_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-surface-100 text-surface-600'
                        }`}
                      >
                        {t.trial_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-surface-900">
                      {t.trial_used} / {t.trial_limit}
                    </td>
                    <td className="px-6 py-4 text-surface-600">
                      {t.trial_remaining} left
                    </td>
                    <td className="px-6 py-4 text-surface-600">
                      {t.trial_started_at ? new Date(t.trial_started_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTrialSettings;

