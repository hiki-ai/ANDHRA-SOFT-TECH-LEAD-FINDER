/**
 * Premium Billing, Subscriptions, Free Trial & Razorpay API Service
 * Location: frontend/src/services/billingService.js
 */

import { apiClient } from './apiClient';

/**
 * Safely extracts backend payload from either unwrapped apiClient interceptor response
 * or direct Axios response object.
 */
function extractData(res, fallback) {
  if (res === null || res === undefined) return fallback;
  if (res.data !== undefined) {
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.data !== undefined) {
      return res.data.data ?? fallback;
    }
    return res.data ?? fallback;
  }
  return res ?? fallback;
}

export const billingService = {
  // Public Endpoints
  async getPublicPlans() {
    const res = await apiClient.get('/plans');
    return extractData(res, []);
  },

  async getPublicSettings() {
    const res = await apiClient.get('/public/settings');
    return extractData(res, {});
  },

  async getPaymentMethods() {
    const res = await apiClient.get('/payments/methods');
    return extractData(res, {});
  },

  // Customer User Endpoints
  async getUserProfile() {
    const res = await apiClient.get('/user/profile');
    return extractData(res, {});
  },

  async getUserDashboard() {
    const res = await apiClient.get('/user/dashboard');
    return extractData(res, {});
  },

  // Free Trial Endpoints
  async getTrialStatus() {
    const res = await apiClient.get('/trial/status');
    return extractData(res, {});
  },

  async startFreeTrial() {
    const res = await apiClient.post('/trial/start');
    return extractData(res, {});
  },

  // Subscription Endpoints
  async getCurrentSubscription() {
    const res = await apiClient.get('/subscriptions/current');
    return extractData(res, {});
  },

  async getSubscriptionHistory() {
    const res = await apiClient.get('/subscriptions/history');
    return extractData(res, []);
  },

  async checkoutSubscription(planId, billingCycle = 'monthly') {
    const res = await apiClient.post('/subscriptions/checkout', {
      plan_id: planId,
      billing_cycle: billingCycle,
    });
    return extractData(res, {});
  },

  async cancelSubscription(subscriptionId) {
    const res = await apiClient.post('/subscriptions/cancel', {
      subscription_id: subscriptionId,
    });
    return extractData(res, {});
  },

  // Payment Endpoints
  async createPaymentOrder(planId, billingCycle = 'monthly') {
    const res = await apiClient.post('/payments/create-order', {
      plan_id: planId,
      billing_cycle: billingCycle,
    });
    return extractData(res, {});
  },

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method }) {
    const res = await apiClient.post('/payments/verify', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method,
    });
    return extractData(res, {});
  },

  async getUserPaymentHistory() {
    const res = await apiClient.get('/payments/history');
    return extractData(res, []);
  },

  // Admin Billing Endpoints
  async getAdminPlans() {
    const res = await apiClient.get('/admin/plans');
    return extractData(res, []);
  },

  async createAdminPlan(planData) {
    const res = await apiClient.post('/admin/plans', planData);
    return extractData(res, {});
  },

  async updateAdminPlan(planId, planData) {
    const res = await apiClient.put(`/admin/plans/${planId}`, planData);
    return extractData(res, {});
  },

  async archiveAdminPlan(planId) {
    const res = await apiClient.delete(`/admin/plans/${planId}`);
    return extractData(res, {});
  },

  async getAdminTrialSettings() {
    const res = await apiClient.get('/admin/trial-settings');
    return extractData(res, {});
  },

  async updateAdminTrialSettings(settingsData) {
    const res = await apiClient.put('/admin/trial-settings', settingsData);
    return extractData(res, {});
  },

  async getAdminSubscriptions(statusFilter = '') {
    const params = statusFilter ? { status: statusFilter } : {};
    const res = await apiClient.get('/admin/subscriptions', { params });
    return extractData(res, []);
  },

  async getAdminPayments() {
    const res = await apiClient.get('/admin/payments');
    return extractData(res, []);
  },

  async getAdminUsers() {
    const res = await apiClient.get('/admin/users');
    return extractData(res, []);
  },

  async getAdminBillingAnalytics() {
    const res = await apiClient.get('/admin/analytics');
    return extractData(res, {});
  },
};

export default billingService;
