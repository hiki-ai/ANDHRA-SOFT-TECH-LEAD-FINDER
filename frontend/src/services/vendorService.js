/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * VENDOR SERVICE (FLASK REST API & FIRESTORE BACKEND)
 * ==============================================================================
 * Location: frontend/src/services/vendorService.js
 * 
 * Strict REST API client for Vendor operations. Zero mock fallbacks.
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const vendorService = {
  /**
   * Fetch server-side paginated and filtered vendors from REST API
   */
  async getVendors(params = {}) {
    const res = await apiClient.get('/vendors', { params });
    return res;
  },

  /**
   * Fetch single vendor by ID
   */
  async getVendorById(id) {
    const res = await apiClient.get(`/vendors/${id}`);
    return res;
  },

  /**
   * Create new vendor lead in Firestore via backend
   */
  async createVendor(vendorData) {
    const res = await apiClient.post('/vendors', vendorData);
    return res;
  },

  /**
   * Update existing vendor lead
   */
  async updateVendor(id, updates) {
    const res = await apiClient.patch(`/vendors/${id}`, updates);
    return res;
  },

  /**
   * Delete vendor by ID
   */
  async deleteVendor(id) {
    const res = await apiClient.delete(`/vendors/${id}`);
    return res;
  },

  /**
   * Search vendors by keyword
   */
  async searchVendors(query) {
    const res = await apiClient.get('/vendors/search', { params: { q: query } });
    return res;
  },
};

export default vendorService;
