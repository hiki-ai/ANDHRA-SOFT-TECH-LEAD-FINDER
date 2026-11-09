/**
 * Customer User Pricing Plans & Razorpay Checkout Page
 * Location: frontend/src/pages/user/UserPricingCheckout.jsx
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Star,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Zap,
  Building,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { billingService } from '@/services/billingService';
import { initiateRazorpayPayment } from '@/utils/razorpay';
import { Button } from '@/components/common/Button';
import { Loader } from '@/components/common/Loader';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export function UserPricingCheckout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [billingCycle, setBillingCycle] = useState(location.state?.billingCycle || 'monthly');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);

  // Success / Failure States
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await billingService.getPublicPlans();
      const activePlans = Array.isArray(data) ? data.filter((p) => p && p.is_active !== false) : [];
      setPlans(activePlans);
    } catch (err) {
      console.error('[UserPricing] Error fetching plans:', err);
      setFetchError(err.message || 'Unable to load plans at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCheckout = async (plan) => {
    setProcessingPlanId(plan.plan_id);
    setPaymentError(null);

    try {
      // 1. Create order on Flask backend
      const order = await billingService.checkoutSubscription(plan.plan_id, billingCycle);

      // 2. Open official Razorpay Checkout modal
      await initiateRazorpayPayment({
        order,
        user,
        onSuccess: async (rzpResponse) => {
          try {
            // 3. Cryptographically verify signature on backend server-side
            const verified = await billingService.verifyPayment({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
              payment_method: 'Razorpay Checkout',
            });

            setPaymentSuccess({
              plan_name: plan.name,
              order_id: rzpResponse.razorpay_order_id,
              payment_id: rzpResponse.razorpay_payment_id,
              amount: order.amount_inr,
            });

            toast.success(`Payment verified! ${plan.name} is now active.`);
          } catch (verifyErr) {
            setPaymentError(verifyErr.message || 'Payment signature verification failed on backend.');
            toast.error('Payment verification failed.');
          } finally {
            setProcessingPlanId(null);
          }
        },
        onFailure: (error) => {
          setPaymentError(error?.description || error?.message || 'Payment was cancelled or could not be completed.');
          setProcessingPlanId(null);
          toast.error('Payment failed.');
        },
        onDismiss: () => {
          setProcessingPlanId(null);
        },
      });
    } catch (err) {
      setPaymentError(err.message || 'Failed to initialize checkout order.');
      setProcessingPlanId(null);
      toast.error('Checkout error.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader size="lg" text="Loading plans..." />
      </div>
    );
  }

  // Payment Success Screen
  if (paymentSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
          Payment Successful
        </span>

        <h2 className="text-3xl font-black text-surface-900 mt-4 tracking-tight">
          Welcome to {paymentSuccess.plan_name}!
        </h2>

        <p className="mt-2 text-xs text-surface-600 max-w-md mx-auto leading-relaxed">
          Your payment of ₹{paymentSuccess.amount.toLocaleString('en-IN')} has been cryptographically verified and your premium extraction limits are now unlocked.
        </p>

        <div className="mt-6 p-4 rounded-2xl bg-surface-100 border border-surface-200 text-left text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-surface-500">Transaction ID:</span>
            <span className="font-mono font-bold text-surface-800">{paymentSuccess.payment_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Order ID:</span>
            <span className="font-mono text-surface-700">{paymentSuccess.order_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-500">Billing Cycle:</span>
            <span className="capitalize font-semibold text-surface-800">{billingCycle}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            variant="primary"
            iconRight={ArrowRight}
            onClick={() => navigate('/app')}
          >
            Go to My Dashboard
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/app/subscription')}
          >
            View Subscription Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black text-surface-900 tracking-tight">
          Choose Your Premium Plan
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Select the lead generation volume you need. Instant activation with Razorpay.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-6 inline-flex items-center p-1 rounded-xl bg-surface-200/80 border border-surface-300/70 shadow-xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            <span>Yearly</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-3 max-w-2xl mx-auto">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{paymentError}</span>
        </div>
      )}

      {fetchError ? (
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-center max-w-md mx-auto">
          <p className="text-xs font-semibold text-rose-700 mb-3">{fetchError}</p>
          <Button size="sm" variant="outline" onClick={fetchPlans}>
            Retry Loading Plans
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto p-8 rounded-3xl bg-white border border-surface-200 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3 text-surface-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-surface-800">No active plans currently available</p>
          <p className="text-xs text-surface-500 mt-1">
            Please check back shortly or contact support to configure your plan.
          </p>
        </div>
      ) : (
        /* Dynamic Responsive Pricing Cards */
        <div
          className={`grid grid-cols-1 ${
            plans.length === 1
              ? 'max-w-md mx-auto'
              : plans.length === 2
              ? 'md:grid-cols-2 max-w-4xl mx-auto'
              : plans.length === 4
              ? 'md:grid-cols-2 lg:grid-cols-4 max-w-7xl'
              : 'md:grid-cols-2 lg:grid-cols-3'
          } gap-6 items-stretch`}
        >
          {plans.map((plan) => {
            const isYearly = billingCycle === 'yearly';
            const priceInr = isYearly
              ? (plan.yearly_price_inr ?? Math.round((plan.yearly_price_paise || 0) / 100))
              : (plan.monthly_price_inr ?? Math.round((plan.monthly_price_paise || 0) / 100));
            const isPopular = plan.is_popular;
            const planKey = plan.plan_id || plan.id;
            const isProcessing = processingPlanId === planKey;

            return (
              <div
                key={planKey}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all bg-white border ${
                  isPopular
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-lg'
                    : 'border-surface-200 shadow-xs hover:shadow-card'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase shadow-sm flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-white" />
                    <span>Popular Choice</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-surface-900">
                      {plan.name || plan.display_name || plan.plan_id}
                    </h3>
                    {isYearly && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {plan.discount_label || 'Save 17%'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-surface-600 mb-5 min-h-[36px]">
                    {plan.description}
                  </p>

                  <div className="mb-5 pb-5 border-b border-surface-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-surface-900 tracking-tight">
                        ₹{Number(priceInr || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-surface-500">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    <span className="text-[10px] text-surface-400 mt-1 block">
                      {isYearly ? 'Billed annually' : 'Billed monthly, cancel anytime'}
                    </span>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {(plan.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-surface-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    fullWidth
                    size="md"
                    variant={isPopular ? 'primary' : 'outline'}
                    iconRight={ArrowRight}
                    isLoading={isProcessing}
                    onClick={() => handleCheckout(plan)}
                  >
                    {plan.cta_text || 'Pay with Razorpay'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Security & EMI Information Note */}
      <div className="p-6 rounded-2xl bg-white border border-surface-200 shadow-xs max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Payment Gateway & EMI Transparency Guarantee</span>
        </div>
        <p className="text-xs text-surface-600 leading-relaxed">
          Payments are secured by Razorpay with end-to-end 256-bit encryption. Supported methods include instant UPI (Google Pay, PhonePe, Paytm), Visa, MasterCard, RuPay cards, and 50+ Net Banking options. Card and Debit Card EMI tenures and interest rates are subject to issuer bank approval and displayed strictly based on live eligibility returned by Razorpay.
        </p>
      </div>
    </div>
  );
}

export default UserPricingCheckout;

