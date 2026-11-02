/**
 * Customer User Dashboard Overview Page
 * Location: frontend/src/pages/user/UserOverview.jsx
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  ArrowRight,
  PlayCircle,
  AlertTriangle,
  Receipt,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { collectionService } from '@/services/collectionService';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { useToast } from '@/context/ToastContext';

export function UserOverview() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const data = await billingService.getUserDashboard();
        if (isMounted) setDashboardData(data);
      } catch (err) {
        console.error('[UserOverview] Load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading your dashboard statistics..." />
      </div>
    );
  }

  const d = dashboardData || {};
  const isTrialActive = d.trial_status === 'active';
  const isTrialCompleted = d.trial_status === 'completed';
  const isSubActive = d.has_active_subscription;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Customer Dashboard
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Welcome to your AST Extractor workspace. Monitor your subscription, free trial quota, and lead collections.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/app/start-collection">
            <Button size="sm" variant="primary" iconLeft={PlayCircle}>
              Start Collection
            </Button>
          </Link>
          <Link to="/app/pricing">
            <Button size="sm" variant="outline" iconLeft={Sparkles}>
              View Plans
            </Button>
          </Link>
        </div>
      </div>

      {/* Trial Alert Notification if Trial is Active or Completed */}
      {isTrialActive && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">
                Free Trial Active: {d.trial_remaining} / {d.trial_limit} Unique Records Remaining
              </h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                You have extracted {d.trial_used} unique business leads. When you reach 30 records, extraction pauses safely.
              </p>
            </div>
          </div>
          <Link to="/app/pricing">
            <Button size="sm" variant="primary" iconRight={ArrowRight}>
              Upgrade for Unlimited Leads
            </Button>
          </Link>
        </div>
      )}

      {isTrialCompleted && !isSubActive && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Free Trial Completed (30/30 Records Reached)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You have reached your 30 unique records free trial allowance. All your collected leads remain saved. Upgrade to a premium plan to continue extraction.
              </p>
            </div>
          </div>
          <Link to="/app/pricing">
            <Button size="sm" variant="primary" iconRight={Sparkles}>
              Upgrade Plan Now
            </Button>
          </Link>
        </div>
      )}

      {/* 7 Required Overview Cards (PART 7 Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Current Plan */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Current Plan</span>
            <Sparkles className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl font-black text-surface-900">
            {d.current_plan || 'Free Plan'}
          </div>
          <div className="mt-3 text-[11px] font-semibold text-brand-600">
            <Link to="/app/subscription" className="hover:underline flex items-center gap-1">
              <span>Manage plan</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* 2. Subscription Status */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Subscription Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-surface-900 capitalize">
            {d.subscription_status === 'active' ? (
              <span className="text-emerald-600">Active</span>
            ) : d.subscription_status === 'trial_active' ? (
              <span className="text-indigo-600">Trial Active</span>
            ) : d.subscription_status === 'trial_completed' ? (
              <span className="text-amber-600">Trial Completed</span>
            ) : (
              <span className="text-surface-600">None</span>
            )}
          </div>
          <div className="mt-3 text-[11px] text-surface-500">
            {isSubActive ? 'Renews automatically' : 'No credit card on file'}
          </div>
        </div>

        {/* 3. Trial Usage */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Trial Usage</span>
            <Zap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            {d.trial_used} <span className="text-xs text-surface-400 font-normal">/ {d.trial_limit} records</span>
          </div>
          <div className="mt-3 w-full bg-surface-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, ((d.trial_used || 0) / (d.trial_limit || 30)) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4. Remaining Trial Records */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Remaining Trial</span>
            <Clock className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            {d.trial_remaining} <span className="text-xs text-surface-400 font-normal">leads left</span>
          </div>
          <div className="mt-3 text-[11px] text-surface-500">
            Unique records allowance
          </div>
        </div>

        {/* 5. Total Collections */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Collections</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            {d.total_collections || 0}
          </div>
          <div className="mt-3 text-[11px] font-semibold text-brand-600">
            <Link to="/app/collections" className="hover:underline flex items-center gap-1">
              <span>View collections</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* 6. Successful Collections */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Successful Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-surface-900">
            {d.successful_collections || 0}
          </div>
          <div className="mt-3 text-[11px] text-surface-500">
            Completed without errors
          </div>
        </div>

        {/* 7. Plan Expiry Date */}
        <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs flex flex-col justify-between sm:col-span-2">
          <div className="flex items-center justify-between text-surface-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Plan Expiry Date</span>
            <Calendar className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-xl font-bold text-surface-900">
            {d.plan_expiry_date
              ? new Date(d.plan_expiry_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : isSubActive
              ? 'Ongoing Monthly Active'
              : 'No Active Paid Subscription'}
          </div>
          <div className="mt-3 text-[11px] text-surface-500">
            {isSubActive ? 'Your account renews on this date' : 'Activate a plan to unlock high-volume limits'}
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Quick Workflows
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/app/start-collection"
            className="p-4 rounded-xl border border-surface-200 hover:border-brand-500 hover:bg-brand-50/30 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-surface-900 group-hover:text-brand-700">
                Launch Lead Collection
              </div>
              <div className="text-[11px] text-surface-500 mt-0.5">
                Extract vendors by category and city
              </div>
            </div>
          </Link>

          <Link
            to="/app/collections"
            className="p-4 rounded-xl border border-surface-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-surface-900 group-hover:text-indigo-700">
                Download Datasets
              </div>
              <div className="text-[11px] text-surface-500 mt-0.5">
                Export native Excel (XLSX) spreadsheets
              </div>
            </div>
          </Link>

          <Link
            to="/app/pricing"
            className="p-4 rounded-xl border border-surface-200 hover:border-purple-500 hover:bg-purple-50/30 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-surface-900 group-hover:text-purple-700">
                Upgrade & Billing
              </div>
              <div className="text-[11px] text-surface-500 mt-0.5">
                Select Basic, Pro, or Business tier
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UserOverview;

