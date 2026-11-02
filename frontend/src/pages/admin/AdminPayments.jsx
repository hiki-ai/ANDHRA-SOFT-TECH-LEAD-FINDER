/**
 * Admin Payment Management Page
 * Location: frontend/src/pages/admin/AdminPayments.jsx
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Loader } from '@/components/common/Loader';

export function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadPayments = async () => {
    try {
      const data = await billingService.getAdminPayments();
      setPayments(data);
    } catch (err) {
      console.error('[AdminPayments] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filtered = payments.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.order_id && p.order_id.toLowerCase().includes(q)) ||
      (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q)) ||
      (p.user_email && p.user_email.toLowerCase().includes(q)) ||
      (p.user_id && p.user_id.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading payment transactions..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Payment Management
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Real-time Razorpay order verification, payment IDs, and audit records. Manual unverified overrides are strictly prohibited.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 bg-white border border-surface-200 rounded-xl text-xs font-semibold text-surface-700"
        >
          <option value="">All Statuses</option>
          <option value="successful">Successful</option>
          <option value="created">Created / Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="max-w-md">
        <input
          type="text"
          placeholder="Filter by Order ID, Payment ID, or customer email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 px-3.5 bg-white border border-surface-200 rounded-xl text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-surface-200">
          <Receipt className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-surface-900">No Payments Recorded</h4>
          <p className="text-xs text-surface-500 mt-1">No transaction records match the criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3.5">Razorpay Order / Payment ID</th>
                  <th className="px-6 py-3.5">Customer Email</th>
                  <th className="px-6 py-3.5">Plan / Cycle</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((p) => {
                  const isSuccess = p.status === 'successful';
                  const isFailed = p.status === 'failed';

                  return (
                    <tr key={p.id} className="hover:bg-surface-50/50">
                      <td className="px-6 py-4 font-mono">
                        <div className="font-bold text-surface-900">{p.razorpay_payment_id || p.order_id}</div>
                        {p.razorpay_payment_id && (
                          <div className="text-[10px] text-surface-400">Order: {p.order_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-surface-700">
                        {p.user_email || p.user_id}
                      </td>
                      <td className="px-6 py-4 capitalize text-surface-800">
                        {p.plan_id} ({p.billing_cycle})
                      </td>
                      <td className="px-6 py-4 font-bold text-surface-900">
                        ₹{((p.amount_paise || 0) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isFailed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isFailed && <XCircle className="w-3 h-3 text-rose-600" />}
                          {!isSuccess && !isFailed && <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{p.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-surface-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;

