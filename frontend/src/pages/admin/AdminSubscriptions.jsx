/**
 * Admin Subscriptions Management Page
 * Location: frontend/src/pages/admin/AdminSubscriptions.jsx
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Filter, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Loader } from '@/components/common/Loader';
import { Button } from '@/components/common/Button';

export function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSubscriptions = async () => {
    try {
      const data = await billingService.getAdminSubscriptions(statusFilter);
      setSubscriptions(data);
    } catch (err) {
      console.error('[AdminSubscriptions] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter]);

  const filtered = subscriptions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.user_id && s.user_id.toLowerCase().includes(q)) ||
      (s.plan_id && s.plan_id.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      (s.plan_name && s.plan_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Customer Subscriptions
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Monitor and filter active, expired, and cancelled customer subscription records.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-white border border-surface-200 rounded-xl text-xs font-semibold text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer UID, subscription ID, or plan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader size="lg" text="Loading customer subscriptions..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-surface-200">
          <CreditCard className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-surface-900">No Subscriptions Found</h4>
          <p className="text-xs text-surface-500 mt-1">No matching subscription records found in Firestore.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3.5">Subscription ID</th>
                  <th className="px-6 py-3.5">Customer UID</th>
                  <th className="px-6 py-3.5">Plan / Cycle</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Activated At</th>
                  <th className="px-6 py-3.5">Expires / Renews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-surface-900">
                      {s.id}
                    </td>
                    <td className="px-6 py-4 font-mono text-surface-600 truncate max-w-[150px]">
                      {s.user_id}
                    </td>
                    <td className="px-6 py-4 font-semibold text-surface-800 capitalize">
                      {s.plan_name || s.plan_id} ({s.billing_cycle})
                    </td>
                    <td className="px-6 py-4 font-bold text-surface-900">
                      ₹{((s.amount_paise || 0) / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          s.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-surface-100 text-surface-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-surface-600">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-surface-600">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
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

export default AdminSubscriptions;

