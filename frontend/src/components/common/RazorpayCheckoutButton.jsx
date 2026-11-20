/**
 * Razorpay Standard Web Checkout Button Component
 * Location: frontend/src/components/common/RazorpayCheckoutButton.jsx
 */

import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { initiateRazorpayPayment } from '@/utils/razorpay';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export function RazorpayCheckoutButton({
  amount, // In paise (e.g. 50000) or INR (if inr=true)
  inr = false, // If true, amount is in INR and converted to paise (* 100)
  currency = 'INR',
  receipt,
  notes,
  description = 'Payment for AST Services',
  buttonText = 'Pay with Razorpay',
  loadingText = 'Processing...',
  className = '',
  disabled = false,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    if (loading || disabled) return;
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Calculate amount in paise
      let amountPaise = inr ? Math.round(Number(amount) * 100) : Math.round(Number(amount));
      if (isNaN(amountPaise) || amountPaise < 100) {
        throw new Error('Payment amount must be at least 100 paise (₹1.00).');
      }

      // 2. Call backend to create order: POST /api/create-order
      const order = await billingService.createStandardOrder({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      });

      if (!order || !order.order_id) {
        throw new Error('Failed to create Razorpay payment order.');
      }

      // 3. Open Razorpay Standard Checkout modal
      await initiateRazorpayPayment({
        order,
        user,
        description,
        onSuccess: async (rzpResponse) => {
          try {
            // 4. Verify payment signature on backend: POST /api/verify-payment
            const verifyResult = await billingService.verifyStandardPayment({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            if (toast && typeof toast.success === 'function') {
              toast.success('Payment verified successfully!');
            }

            if (typeof onSuccess === 'function') {
              onSuccess({
                ...verifyResult,
                razorpay_order_id: rzpResponse.razorpay_order_id,
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_signature: rzpResponse.razorpay_signature,
              });
            }
          } catch (verifyErr) {
            const err = verifyErr.message || 'Payment signature verification failed.';
            setErrorMsg(err);
            if (toast && typeof toast.error === 'function') {
              toast.error(err);
            }
            if (typeof onFailure === 'function') {
              onFailure(verifyErr);
            }
          } finally {
            setLoading(false);
          }
        },
        onFailure: (failureError) => {
          setLoading(false);
          const msg = failureError?.description || failureError?.message || 'Payment failed. Please try again.';
          setErrorMsg(msg);
          if (toast && typeof toast.error === 'function') {
            toast.error(msg);
          }
          if (typeof onFailure === 'function') {
            onFailure(failureError);
          }
        },
        onDismiss: () => {
          setLoading(false);
          if (typeof onDismiss === 'function') {
            onDismiss();
          }
        },
      });
    } catch (err) {
      setLoading(false);
      const msg = err.message || 'Unable to initiate payment checkout.';
      setErrorMsg(msg);
      if (toast && typeof toast.error === 'function') {
        toast.error(msg);
      }
      if (typeof onFailure === 'function') {
        onFailure(err);
      }
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={
          className ||
          'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
        }
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText}</span>
          </>
        )}
      </button>
      {errorMsg && (
        <span className="text-xs text-rose-500 mt-1 font-medium">{errorMsg}</span>
      )}
    </div>
  );
}

export default RazorpayCheckoutButton;
