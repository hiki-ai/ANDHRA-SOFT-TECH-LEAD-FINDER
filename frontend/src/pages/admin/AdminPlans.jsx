/**
 * Admin Premium Plans Management Page
 * Location: frontend/src/pages/admin/AdminPlans.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Archive,
  CheckCircle2,
  XCircle,
  Star,
  Layers,
  ArrowUpDown,
  Trash2,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    plan_id: '',
    name: '',
    description: '',
    monthly_price_inr: 499,
    yearly_price_inr: 4990,
    discount_label: 'Save 17%',
    features_text: '',
    extraction_limit: 5000,
    collection_limit: 20,
    preset_limit: 3,
    team_members: 1,
    can_export: true,
    can_analytics: false,
    is_active: true,
    is_popular: false,
    display_order: 1,
    cta_text: 'Choose Plan',
  });

  const loadPlans = async () => {
    try {
      const data = await billingService.getAdminPlans();
      setPlans(data);
    } catch (err) {
      console.error('[AdminPlans] Error loading plans:', err);
      toast.error('Failed to load plans from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      plan_id: '',
      name: '',
      description: '',
      monthly_price_inr: 499,
      yearly_price_inr: 4990,
      discount_label: 'Save 17%',
      features_text: '5,000 lead extraction records per month\nGoogle Maps / Places API access\nCSV & Excel lead exports\nDeduplication & quality scoring',
      extraction_limit: 5000,
      collection_limit: 20,
      preset_limit: 3,
      team_members: 1,
      can_export: true,
      can_analytics: false,
      is_active: true,
      is_popular: false,
      display_order: (plans.length + 1),
      cta_text: 'Choose Plan',
    });
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingPlan(p);
    setFormData({
      plan_id: p.plan_id,
      name: p.name,
      description: p.description,
      monthly_price_inr: Math.round((p.monthly_price_paise || 0) / 100),
      yearly_price_inr: Math.round((p.yearly_price_paise || 0) / 100),
      discount_label: p.discount_label || 'Save 17%',
      features_text: (p.features || []).join('\n'),
      extraction_limit: p.limits?.extraction_limit || 5000,
      collection_limit: p.limits?.collection_limit || 20,
      preset_limit: p.limits?.preset_limit || 3,
      team_members: p.limits?.team_members || 1,
      can_export: p.limits?.can_export ?? true,
      can_analytics: p.limits?.can_analytics ?? false,
      is_active: p.is_active ?? true,
      is_popular: p.is_popular ?? false,
      display_order: p.display_order || 1,
      cta_text: p.cta_text || 'Choose Plan',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const planId = formData.plan_id.trim().toLowerCase();
      if (!planId) {
        toast.error('Plan identifier is required.');
        setSaving(false);
        return;
      }

      if (!editingPlan && plans.some((p) => (p.plan_id || '').toLowerCase() === planId)) {
        toast.error(`A plan with identifier '${planId}' already exists. Please choose a unique identifier.`);
        setSaving(false);
        return;
      }

      const payload = {
        plan_id: planId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        monthly_price_paise: Math.round(Number(formData.monthly_price_inr) * 100),
        monthly_price_inr: Number(formData.monthly_price_inr),
        yearly_price_paise: Math.round(Number(formData.yearly_price_inr) * 100),
        yearly_price_inr: Number(formData.yearly_price_inr),
        discount_label: formData.discount_label.trim(),
        features: formData.features_text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        limits: {
          extraction_limit: Number(formData.extraction_limit),
          collection_limit: Number(formData.collection_limit),
          preset_limit: Number(formData.preset_limit),
          team_members: Number(formData.team_members),
          can_export: Boolean(formData.can_export),
          can_analytics: Boolean(formData.can_analytics),
        },
        is_active: Boolean(formData.is_active),
        is_popular: Boolean(formData.is_popular),
        display_order: Number(formData.display_order),
        cta_text: formData.cta_text.trim(),
      };

      if (editingPlan) {
        await billingService.updateAdminPlan(editingPlan.plan_id, payload);
        toast.success(`Plan '${payload.name}' updated successfully.`);
      } else {
        await billingService.createAdminPlan(payload);
        toast.success(`Plan '${payload.name}' created successfully.`);
      }

      setModalOpen(false);
      await loadPlans();
    } catch (err) {
      toast.error(err.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await billingService.archiveAdminPlan(archiveTarget.plan_id);
      toast.info(`Plan '${archiveTarget.name}' archived.`);
      setArchiveTarget(null);
      await loadPlans();
    } catch (err) {
      toast.error(err.message || 'Failed to archive plan.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading plans..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Premium Plans Management
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Configure the 3 public subscription tiers, monthly and yearly pricing in paise, feature sets, and limits.
          </p>
        </div>

        <Button size="sm" variant="primary" iconLeft={Plus} onClick={openCreateModal}>
          Create New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const mInr = ((p.monthly_price_paise || 0) / 100).toLocaleString('en-IN');
          const yInr = ((p.yearly_price_paise || 0) / 100).toLocaleString('en-IN');

          return (
            <div
              key={p.plan_id}
              className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                p.is_popular ? 'border-brand-500 shadow-md ring-1 ring-brand-500/20' : 'border-surface-200 shadow-xs'
              } ${!p.is_active ? 'opacity-60 bg-surface-50' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-surface-400 font-bold uppercase">
                      #{p.display_order} {p.plan_id}
                    </span>
                    {p.is_popular && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700">
                        <Star className="w-2.5 h-2.5 fill-brand-600" />
                        Popular
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-200 text-surface-600'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-surface-900">{p.name}</h3>
                <p className="text-xs text-surface-500 mt-1 mb-4 min-h-[32px]">{p.description}</p>

                <div className="p-3 rounded-xl bg-surface-50 border border-surface-200/60 mb-4 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-surface-500">Monthly:</span>
                    <span className="font-bold text-surface-900">₹{mInr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Yearly:</span>
                    <span className="font-bold text-surface-900">₹{yInr}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-600 font-semibold pt-1 border-t border-surface-200/50">
                    <span>Discount Label:</span>
                    <span>{p.discount_label || 'Save 17%'}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 mb-6 text-surface-600">
                  <div className="font-bold text-[10px] uppercase text-surface-400 tracking-wider">
                    Limits & Permissions
                  </div>
                  <div>Extraction Quota: <strong>{p.limits?.extraction_limit?.toLocaleString('en-IN') || 'Unlimited'}</strong></div>
                  <div>Collection Limit: <strong>{p.limits?.collection_limit === -1 ? 'Unlimited' : p.limits?.collection_limit}</strong></div>
                  <div>Custom Presets: <strong>{p.limits?.preset_limit === -1 ? 'Unlimited' : p.limits?.preset_limit}</strong></div>
                  <div>Excel Export: <strong>{p.limits?.can_export ? 'Enabled' : 'Disabled'}</strong></div>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-100 flex items-center justify-between">
                <Button size="sm" variant="outline" iconLeft={Edit2} onClick={() => openEditModal(p)}>
                  Edit Plan
                </Button>

                {p.is_active && (
                  <button
                    onClick={() => setArchiveTarget(p)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan Edit / Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Premium Plan'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Plan Identifier (Key)"
              type="text"
              placeholder="e.g. enterprise"
              value={formData.plan_id}
              disabled={Boolean(editingPlan)}
              onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
              required
            />
            <Input
              label="Display Name"
              type="text"
              placeholder="e.g. Enterprise Plan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <Input
            label="Plan Description"
            type="text"
            placeholder="Brief plan summary displayed on public pricing card"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Monthly Price (₹ INR)"
              type="number"
              min="0"
              value={formData.monthly_price_inr}
              onChange={(e) => setFormData({ ...formData, monthly_price_inr: e.target.value })}
              required
            />
            <Input
              label="Yearly Price (₹ INR)"
              type="number"
              min="0"
              value={formData.yearly_price_inr}
              onChange={(e) => setFormData({ ...formData, yearly_price_inr: e.target.value })}
              required
            />
            <Input
              label="Discount Label"
              type="text"
              placeholder="e.g. Save 17%"
              value={formData.discount_label}
              onChange={(e) => setFormData({ ...formData, discount_label: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Monthly Extraction Quota"
              type="number"
              value={formData.extraction_limit}
              onChange={(e) => setFormData({ ...formData, extraction_limit: e.target.value })}
              required
            />
            <Input
              label="Max Collection Jobs (-1 for unltd)"
              type="number"
              value={formData.collection_limit}
              onChange={(e) => setFormData({ ...formData, collection_limit: e.target.value })}
              required
            />
            <Input
              label="Display Order (Sort)"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
              Features (One per line)
            </label>
            <textarea
              rows={4}
              className="w-full px-3.5 py-2.5 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              value={formData.features_text}
              onChange={(e) => setFormData({ ...formData, features_text: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_popular}
                onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600"
              />
              <span className="font-bold text-surface-800">Mark as Popular</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600"
              />
              <span className="font-bold text-surface-800">Active (Visible to public)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_export}
                onChange={(e) => setFormData({ ...formData, can_export: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600"
              />
              <span className="font-bold text-surface-800">Enable Excel Export</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-100">
            <Button size="sm" variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={saving}>
              Save Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(archiveTarget)}
        title="Archive Plan?"
        message={`Archiving '${archiveTarget?.name}' will hide it from the public pricing page. Existing subscribers will continue uninterrupted.`}
        confirmText="Archive Plan"
        confirmVariant="danger"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}

export default AdminPlans;

