/**
 * Vendor API Service
 * Location: frontend/src/services/vendorService.js
 */

import { apiClient } from './apiClient';

export const vendorService = {
  async getVendors(params = {}) {
    return apiClient.get('/vendors', { params });
  },

  async getVendorById(id) {
    return apiClient.get(`/vendors/${id}`);
  },

  async updateVendor(id, updates) {
    return apiClient.patch(`/vendors/${id}`, updates);
  },

  async deleteVendor(id) {
    return apiClient.delete(`/vendors/${id}`);
  },

  async searchVendors(query) {
    return apiClient.get('/vendors/search', { params: { q: query } });
  },
};

export default vendorService;
