/**
 * Razorpay Standard Checkout SDK Loader & Modal Trigger
 * Location: frontend/src/utils/razorpay.js
 */

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script is already present in document head or body
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => {
        console.error('[Razorpay] Existing Checkout SDK script failed to load.');
        resolve(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load Checkout SDK script from CDN.');
      resolve(false);
    };
    document.head.appendChild(script);
  });
}

export async function initiateRazorpayPayment({
  order,
  user,
  name = 'ANDHRA SOFT TECH',
  description,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Razorpay payment gateway script could not be loaded. Please check your network connection.');
  }

  const razorpayKey = order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const paymentAmount = order.amount || order.amount_paise;

  const desc =
    description ||
    order.description ||
    (order.plan_name ? `${order.plan_name} Subscription (${order.billing_cycle || 'monthly'})` : 'AST Extractor Payment');

  const options = {
    key: razorpayKey,
    amount: paymentAmount,
    currency: order.currency || 'INR',
    name: name || 'ANDHRA SOFT TECH',
    description: desc,
    order_id: order.order_id,
    prefill: {
      name: user?.displayName || user?.fullName || user?.name || '',
      email: user?.email || '',
      contact: user?.phone || user?.phoneNumber || '',
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
