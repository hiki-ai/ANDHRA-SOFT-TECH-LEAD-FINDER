/**
 * Admin Plan Pricing Settings Page
 * Location: frontend/src/pages/admin/AdminPricingSettings.jsx
 */

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, CheckCircle2, ShieldCheck, DollarSign, Percent } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function AdminPricingSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const toast = useToast();

  const loadPlans = async () => {
    try {
      const data = await billingService.getAdminPlans();
      setPlans(data);
    } catch (err) {
      console.error('[AdminPricingSettings] Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePriceUpdate = async (plan, newMonthlyInr, newYearlyInr, discountLabel) => {
    setSavingId(plan.plan_id);
    try {
      await billingService.updateAdminPlan(plan.plan_id, {
        ...plan,
        monthly_price_paise: Math.round(Number(newMonthlyInr) * 100),
        yearly_price_paise: Math.round(Number(newYearlyInr) * 100),
        discount_label: discountLabel,
      });
      toast.success(`Pricing updated for ${plan.name}`);
      await loadPlans();
    } catch (err) {
      toast.error(err.message || 'Failed to update pricing');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading pricing settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Plan Pricing Settings
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Directly manage monthly and yearly pricing in Indian Rupees (INR) across the three subscription tiers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <PricingCardEditor
            key={p.plan_id}
            plan={p}
            isSaving={savingId === p.plan_id}
            onSave={handlePriceUpdate}
          />
        ))}
      </div>

      {/* Global Tax & Currency Information */}
      <div className="p-6 rounded-2xl bg-white border border-surface-200 shadow-xs max-w-2xl">
        <h3 className="text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">
          Global Financial Policy
        </h3>
        <p className="text-xs text-surface-600 leading-relaxed mb-4">
          All monetary transactions are initiated and settled in <strong>INR (₹)</strong> via Razorpay. Calculations on the backend are stored in integer paise (1 INR = 100 paise) to prevent floating-point discrepancies. Standard Indian GST (18%) is separated during analytics calculations.
        </p>
        <div className="flex items-center gap-4 text-xs font-semibold text-surface-700">
          <span className="px-3 py-1 rounded-lg bg-surface-100">Standard GST: 18%</span>
          <span className="px-3 py-1 rounded-lg bg-surface-100">Currency: INR (₹)</span>
        </div>
      </div>
    </div>
  );
}

function PricingCardEditor({ plan, isSaving, onSave }) {
  const [monthlyInr, setMonthlyInr] = useState(Math.round((plan.monthly_price_paise || 0) / 100));
  const [yearlyInr, setYearlyInr] = useState(Math.round((plan.yearly_price_paise || 0) / 100));
  const [discountLabel, setDiscountLabel] = useState(plan.discount_label || 'Save 17%');

  return (
    <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] font-bold text-surface-400 uppercase">
            {plan.plan_id}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Active Tier
          </span>
        </div>

        <h3 className="text-lg font-bold text-surface-900">{plan.name}</h3>
        <p className="text-xs text-surface-500 mt-1 mb-5">{plan.description}</p>

        <div className="space-y-4">
          <Input
            label="Monthly Price (₹ INR)"
            type="number"
            min="0"
            value={monthlyInr}
            onChange={(e) => setMonthlyInr(e.target.value)}
          />

          <Input
            label="Yearly Price (₹ INR)"
            type="number"
            min="0"
            value={yearlyInr}
            onChange={(e) => setYearlyInr(e.target.value)}
          />

          <Input
            label="Yearly Discount Tag"
            type="text"
            value={discountLabel}
            onChange={(e) => setDiscountLabel(e.target.value)}
          />
        </div>
      </div>

      <div className="pt-6 border-t border-surface-100 mt-6">
        <Button
          fullWidth
          size="sm"
          variant="primary"
          isLoading={isSaving}
          onClick={() => onSave(plan, monthlyInr, yearlyInr, discountLabel)}
        >
          Update {plan.name} Pricing
        </Button>
      </div>
    </div>
  );
}

export default AdminPricingSettings;

