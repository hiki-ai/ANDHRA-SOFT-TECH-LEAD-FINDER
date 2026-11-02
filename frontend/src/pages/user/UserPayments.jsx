/**
 * Customer User Payment History Page
 * Location: frontend/src/pages/user/UserPayments.jsx
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { Loader } from '@/components/common/Loader';
import { Button } from '@/components/common/Button';

export function UserPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPayments() {
      try {
        const data = await billingService.getUserPaymentHistory();
        if (isMounted) setPayments(data);
      } catch (err) {
        console.error('[UserPayments] Fetch error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPayments();
    return () => { isMounted = false; };
  }, []);

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
            Payment History
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Review your verified Razorpay transactions, billing receipts, and payment statuses.
          </p>
        </div>

        <Link to="/app/pricing">
          <Button size="sm" variant="primary" iconRight={Sparkles}>
            Upgrade Plan
          </Button>
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-surface-200 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-surface-900">
            No Transactions Yet
          </h3>
          <p className="text-xs text-surface-500 mt-1 mb-6">
            You have not made any payments yet. Subscribe to a plan or start with a free trial.
          </p>
          <Link to="/app/pricing">
            <Button size="md" variant="primary">
              View Premium Plans
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Transaction / Order ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Plan / Cycle</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {payments.map((p) => {
                  const isSuccess = p.status === 'successful';
                  const isFailed = p.status === 'failed';

                  return (
                    <tr key={p.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-surface-900">
                        {p.razorpay_payment_id || p.order_id || p.id}
                      </td>
                      <td className="px-6 py-4 text-surface-600">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 capitalize font-medium text-surface-800">
                        {p.plan_id} ({p.billing_cycle})
                      </td>
                      <td className="px-6 py-4 font-bold text-surface-900">
                        ₹{((p.amount_paise || 0) / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-surface-600">
                        {p.payment_method || 'UPI / Card'}
                      </td>
                      <td className="px-6 py-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Successful</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span className="capitalize">{p.status}</span>
                          </span>
                        )}
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

export default UserPayments;

