/**
 * Premium Billing, Subscriptions, Free Trial & Razorpay API Service
 * Location: frontend/src/services/billingService.js
 */

import { apiClient } from './apiClient';

export const billingService = {
  // Public Endpoints
  async getPublicPlans() {
    const res = await apiClient.get('/plans');
    return res.data?.data || [];
  },

  async getPublicSettings() {
    const res = await apiClient.get('/public/settings');
    return res.data?.data || {};
  },

  async getPaymentMethods() {
    const res = await apiClient.get('/payments/methods');
    return res.data?.data || {};
  },

  // Customer User Endpoints
  async getUserProfile() {
    const res = await apiClient.get('/user/profile');
    return res.data?.data || {};
  },

  async getUserDashboard() {
    const res = await apiClient.get('/user/dashboard');
    return res.data?.data || {};
  },

  // Free Trial Endpoints
  async getTrialStatus() {
    const res = await apiClient.get('/trial/status');
    return res.data?.data || {};
  },

  async startFreeTrial() {
    const res = await apiClient.post('/trial/start');
    return res.data?.data || {};
  },

  // Subscription Endpoints
  async getCurrentSubscription() {
    const res = await apiClient.get('/subscriptions/current');
    return res.data?.data || {};
  },

  async getSubscriptionHistory() {
    const res = await apiClient.get('/subscriptions/history');
    return res.data?.data || [];
  },

  async checkoutSubscription(planId, billingCycle = 'monthly') {
    const res = await apiClient.post('/subscriptions/checkout', {
      plan_id: planId,
      billing_cycle: billingCycle,
    });
    return res.data?.data || {};
  },

  async cancelSubscription(subscriptionId) {
    const res = await apiClient.post('/subscriptions/cancel', {
      subscription_id: subscriptionId,
    });
    return res.data;
  },

  // Payment Endpoints
  async createPaymentOrder(planId, billingCycle = 'monthly') {
    const res = await apiClient.post('/payments/create-order', {
      plan_id: planId,
      billing_cycle: billingCycle,
    });
    return res.data?.data || {};
  },

  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method }) {
    const res = await apiClient.post('/payments/verify', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method,
    });
    return res.data?.data || {};
  },

  async getUserPaymentHistory() {
    const res = await apiClient.get('/payments/history');
    return res.data?.data || [];
  },

  // Admin Billing Endpoints
  async getAdminPlans() {
    const res = await apiClient.get('/admin/plans');
    return res.data?.data || [];
  },

  async createAdminPlan(planData) {
    const res = await apiClient.post('/admin/plans', planData);
    return res.data?.data || {};
  },

  async updateAdminPlan(planId, planData) {
    const res = await apiClient.put(`/admin/plans/${planId}`, planData);
    return res.data?.data || {};
  },

  async archiveAdminPlan(planId) {
    const res = await apiClient.delete(`/admin/plans/${planId}`);
    return res.data;
  },

  async getAdminTrialSettings() {
    const res = await apiClient.get('/admin/trial-settings');
    return res.data?.data || {};
  },

  async updateAdminTrialSettings(settingsData) {
    const res = await apiClient.put('/admin/trial-settings', settingsData);
    return res.data?.data || {};
  },

  async getAdminSubscriptions(statusFilter = '') {
    const params = statusFilter ? { status: statusFilter } : {};
    const res = await apiClient.get('/admin/subscriptions', { params });
    return res.data?.data || [];
  },

  async getAdminPayments() {
    const res = await apiClient.get('/admin/payments');
    return res.data?.data || [];
  },

  async getAdminUsers() {
    const res = await apiClient.get('/admin/users');
    return res.data?.data || [];
  },

  async getAdminBillingAnalytics() {
    const res = await apiClient.get('/admin/analytics');
    return res.data?.data || {};
  },
};

export default billingService;

