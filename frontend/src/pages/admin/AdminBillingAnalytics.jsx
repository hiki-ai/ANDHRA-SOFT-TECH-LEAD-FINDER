/**
 * Admin Billing Analytics & Financial Reporting Page
 * Location: frontend/src/pages/admin/AdminBillingAnalytics.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CreditCard,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Loader } from '@/components/common/Loader';

export function AdminBillingAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const data = await billingService.getAdminBillingAnalytics();
        if (isMounted) setAnalytics(data);
      } catch (err) {
        console.error('[AdminBillingAnalytics] Fetch error:', err);
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
        <Loader size="lg" text="Aggregating billing & financial analytics..." />
      </div>
    );
  }

  const a = analytics || {};
  const subs = a.subscriptions || {};
  const trials = a.trials || {};
  const payments = a.payments || {};
  const rev = a.revenue || {};
  const auditLogs = a.recent_audit_logs || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Billing & SaaS Financial Analytics
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Financial metrics computed honestly from Cloud Firestore. Gross collections, taxes, refunds, and net revenue are strictly segregated.
        </p>
      </div>

      {/* 1. Revenue Breakdown (Gross vs Taxes vs Refunds vs Net) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-4">
          Financial Breakdown (INR)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">
              Gross Collections
            </span>
            <div className="text-2xl font-black text-surface-900 mt-2">
              ₹{(rev.gross_collections_inr || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-surface-500 mt-1 block">
              Total volume processed
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">
              Applicable GST (18%)
            </span>
            <div className="text-2xl font-black text-amber-600 mt-2">
              ₹{(rev.taxes_inr || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-surface-500 mt-1 block">
              Separated tax component
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-surface-200 shadow-xs">
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block">
              Refunds & Chargebacks
            </span>
            <div className="text-2xl font-black text-rose-600 mt-2">
              ₹{(rev.refunds_inr || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-surface-500 mt-1 block">
              Total refunded volume
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-500 ring-1 ring-emerald-500/20 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Actual Net Revenue
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-2">
              ₹{(rev.net_revenue_inr || 0).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600 mt-1 block">
              Net earnings after tax & refunds
            </span>
          </div>
        </div>
      </div>

      {/* 2. Subscriptions & Trials Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscriptions Card */}
        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Active Subscriptions ({subs.active_total || 0})
            </h3>
            <CreditCard className="w-4 h-4 text-brand-600" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/60">
              <span className="text-[10px] text-surface-400 uppercase font-bold block">Monthly Billing</span>
              <span className="text-xl font-black text-surface-900 mt-1 block">{subs.monthly_count || 0}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-50 border border-surface-200/60">
              <span className="text-[10px] text-surface-400 uppercase font-bold block">Yearly Billing</span>
              <span className="text-xl font-black text-surface-900 mt-1 block">{subs.yearly_count || 0}</span>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <div className="font-bold text-surface-700 text-[11px]">Tier Distribution:</div>
            {Object.entries(subs.plan_distribution || {}).map(([plan, count]) => (
              <div key={plan} className="flex justify-between p-2 rounded-lg bg-surface-50">
                <span className="capitalize text-surface-700">{plan}</span>
                <span className="font-bold text-surface-900">{count} active</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trials Card */}
        <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Free Trial Operations ({trials.total_trials || 0})
            </h3>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-bold text-indigo-700 uppercase block">Active</span>
              <span className="text-xl font-black text-indigo-900 mt-1 block">{trials.active_trials || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Completed</span>
              <span className="text-xl font-black text-emerald-900 mt-1 block">{trials.completed_trials || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-surface-100 border border-surface-200 text-center">
              <span className="text-[10px] font-bold text-surface-600 uppercase block">Expired</span>
              <span className="text-xl font-black text-surface-800 mt-1 block">{trials.expired_trials || 0}</span>
            </div>
          </div>

          <p className="text-xs text-surface-500 leading-relaxed">
            Completed trials represent qualified prospective customers who reached their 30-record allowance and are primed for subscription upgrade.
          </p>
        </div>
      </div>

      {/* 3. Razorpay Payments Health */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider mb-4">
          Payment Processing Health
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="text-lg font-black text-emerald-900">{payments.successful_count || 0}</div>
              <div className="text-[11px] text-emerald-700">Successful Transactions</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <div className="text-lg font-black text-rose-900">{payments.failed_count || 0}</div>
              <div className="text-[11px] text-rose-700">Failed / Rejected</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <div className="text-lg font-black text-amber-900">{payments.pending_count || 0}</div>
              <div className="text-[11px] text-amber-700">Pending / Created</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Audit Logs */}
      {auditLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
              Recent Administrative Audit Events
            </h3>
          </div>
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-surface-50 text-[10px] text-surface-500 uppercase font-bold">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Admin</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-50/50">
                    <td className="px-6 py-3 text-surface-500 font-sans">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-surface-700">{log.admin_email}</td>
                    <td className="px-6 py-3 font-bold text-indigo-600">{log.action}</td>
                    <td className="px-6 py-3 text-surface-600">{log.resource_type}: {log.resource_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBillingAnalytics;

