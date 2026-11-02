/**
 * Razorpay Standard Checkout SDK Loader & Modal Trigger
 * Location: frontend/src/utils/razorpay.js
 */

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load Checkout SDK script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export async function initiateRazorpayPayment({
  order,
  user,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Razorpay payment gateway script could not be loaded. Please check your network connection.');
  }

  const razorpayKey = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

  const options = {
    key: razorpayKey,
    amount: order.amount_paise,
    currency: order.currency || 'INR',
    name: 'Andhra Soft Tech',
    description: `${order.plan_name || 'Premium'} Subscription (${order.billing_cycle})`,
    order_id: order.order_id,
    prefill: {
      name: user?.displayName || user?.fullName || '',
      email: user?.email || '',
      contact: user?.phone || '',
    },
    theme: {
      color: '#4f46e5', // Indigo brand accent
    },
    modal: {
      ondismiss: () => {
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      },
    },
    handler: async function (response) {
      if (typeof onSuccess === 'function') {
        try {
          await onSuccess({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        } catch (handlerErr) {
          if (typeof onFailure === 'function') {
            onFailure(handlerErr);
          }
        }
      }
    },
  };

  const rzp = new window.Razorpay(options);

  rzp.on('payment.failed', function (response) {
    console.error('[Razorpay] Payment failed event:', response.error);
    if (typeof onFailure === 'function') {
      onFailure(response.error);
    }
  });

  rzp.open();
}

