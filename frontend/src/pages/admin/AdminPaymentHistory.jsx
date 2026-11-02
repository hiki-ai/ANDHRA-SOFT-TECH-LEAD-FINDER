/**
 * Admin Payment History & Chronological Ledger
 * Location: frontend/src/pages/admin/AdminPaymentHistory.jsx
 */

import React, { useState, useEffect } from 'react';
import { History, Receipt, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Loader } from '@/components/common/Loader';
import { Button } from '@/components/common/Button';

export function AdminPaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchLedger() {
      try {
        const data = await billingService.getAdminPayments();
        if (isMounted) setPayments(data);
      } catch (err) {
        console.error('[AdminPaymentHistory] Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLedger();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading payment ledger..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-200">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Payment History & Ledger
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Complete historical audit trail of all customer transactions, receipts, and currency settlements.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Receipt ID</th>
                <th className="px-6 py-3.5">Razorpay Order ID</th>
                <th className="px-6 py-3.5">Razorpay Payment ID</th>
                <th className="px-6 py-3.5">Customer Email</th>
                <th className="px-6 py-3.5">Amount (INR / Paise)</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-mono">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-surface-50/50">
                  <td className="px-6 py-4 font-sans text-surface-600">
                    {p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-bold text-surface-800">
                    {p.receipt || p.id}
                  </td>
                  <td className="px-6 py-4 text-surface-600">
                    {p.order_id || 'N/A'}
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-600">
                    {p.razorpay_payment_id || 'Pending'}
                  </td>
                  <td className="px-6 py-4 font-sans text-surface-700">
                    {p.user_email || p.user_id}
                  </td>
                  <td className="px-6 py-4 font-bold text-surface-900">
                    ₹{((p.amount_paise || 0) / 100).toLocaleString('en-IN')}
                    <span className="text-[10px] text-surface-400 font-normal ml-1">({p.amount_paise}p)</span>
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        p.status === 'successful'
                          ? 'bg-emerald-50 text-emerald-700'
                          : p.status === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPaymentHistory;

