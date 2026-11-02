/**
 * Customer User Subscription Management Page
 * Location: frontend/src/pages/user/UserSubscription.jsx
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Sparkles,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Check,
  XCircle,
  Clock,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function UserSubscription() {
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const loadSubscription = async () => {
    try {
      const data = await billingService.getCurrentSubscription();
      setSubData(data);
    } catch (err) {
      console.error('[UserSubscription] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await billingService.cancelSubscription(subData?.id);
      toast.info('Subscription has been cancelled.');
      setCancelModalOpen(false);
      await loadSubscription();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading subscription details..." />
      </div>
    );
  }

  const hasActiveSub = subData && subData.has_active_subscription && subData.status === 'active';
  const planDetails = subData?.plan_details || {};
  const isYearly = subData?.billing_cycle === 'yearly';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            My Subscription
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Review your active plan, billing period, renewal dates, and subscription controls.
          </p>
        </div>

        <Link to="/app/pricing">
          <Button size="sm" variant="primary" iconRight={Sparkles}>
            {hasActiveSub ? 'Upgrade / Change Plan' : 'Explore Paid Plans'}
          </Button>
        </Link>
      </div>

      {/* Main Subscription Card */}
      {hasActiveSub ? (
        <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-card">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-surface-100">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Subscription
                </span>
                <span className="text-xs text-surface-400 capitalize">
                  {subData.billing_cycle} Billing
                </span>
              </div>

              <h2 className="text-3xl font-black text-surface-900 mt-3">
                {subData.plan_name || 'Premium Plan'}
              </h2>
              <p className="text-xs text-surface-600 mt-1">
                {planDetails.description || 'Full lead extraction access with custom presets and automated deduplication.'}
              </p>
            </div>

            <div className="text-left md:text-right">
              <div className="text-3xl font-black text-surface-900">
                ₹{((subData.amount_paise || 0) / 100).toLocaleString('en-IN')}
              </div>
              <span className="text-xs text-surface-500">
                Per {isYearly ? 'Year' : 'Month'} (Billed via Razorpay)
              </span>
            </div>
          </div>

          {/* Dates & Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-6 border-b border-surface-100 text-xs">
            <div>
              <span className="text-surface-400 font-semibold block uppercase tracking-wider text-[10px]">
                Subscription Started
              </span>
              <span className="text-surface-900 font-bold mt-1 block">
                {subData.started_at
                  ? new Date(subData.started_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-surface-400 font-semibold block uppercase tracking-wider text-[10px]">
                Current Billing Expiry / Renewal
              </span>
              <span className="text-surface-900 font-bold mt-1 block">
                {subData.expires_at
                  ? new Date(subData.expires_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Automatic Monthly'}
              </span>
            </div>

            <div>
              <span className="text-surface-400 font-semibold block uppercase tracking-wider text-[10px]">
                Payment Reference ID
              </span>
              <span className="text-surface-700 font-mono text-[11px] mt-1 block truncate">
                {subData.razorpay_payment_id || subData.razorpay_order_id || 'Direct'}
              </span>
            </div>
          </div>

          {/* Included Features */}
          <div className="py-6 border-b border-surface-100">
            <h4 className="text-xs font-bold text-surface-800 uppercase tracking-wider mb-4">
              Plan Features Included:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(planDetails.features || [
                'Google Maps / Places API access',
                'CSV & Excel export without limits',
                'Deduplication & scoring',
                'Table Editor & column presets',
              ]).map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-surface-700">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link to="/app/pricing">
                <Button size="sm" variant="primary" iconRight={ArrowRight}>
                  Upgrade Plan
                </Button>
              </Link>
              <Link to="/app/pricing">
                <Button size="sm" variant="outline">
                  Downgrade Plan
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setCancelModalOpen(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      ) : (
        /* Free Plan Fallback Card */
        <div className="bg-white rounded-3xl p-8 border border-surface-200 shadow-xs">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-surface-100 text-surface-700 border border-surface-200 mb-4">
              <span>Standard Free Account</span>
            </div>
            <h3 className="text-2xl font-black text-surface-900">
              No Active Paid Subscription
            </h3>
            <p className="mt-2 text-xs text-surface-600 leading-relaxed">
              You are currently on the Free plan. To unlock high extraction volumes, team members, custom preset columns, and multi-source connectors, upgrade to one of our three premium subscription plans.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/app/pricing">
                <Button size="lg" variant="primary" iconRight={ArrowRight}>
                  Upgrade to Premium
                </Button>
              </Link>
              <Link to="/app/start-collection">
                <Button size="lg" variant="outline">
                  Test Lead Extraction
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Cancel Subscription?"
        message="Are you sure you want to cancel your subscription? You will retain access until the end of your billing cycle. Your collected leads and presets will remain safely preserved."
        confirmText="Yes, Cancel Subscription"
        cancelText="Keep Subscription"
        confirmVariant="danger"
        isLoading={cancelling}
        onConfirm={handleCancelSubscription}
        onCancel={() => setCancelModalOpen(false)}
      />
    </div>
  );
}

export default UserSubscription;

