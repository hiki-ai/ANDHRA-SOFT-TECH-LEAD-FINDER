/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * VENDOR SERVICE (API & FIRESTORE HYBRID)
 * ==============================================================================
 * Location: frontend/src/services/vendorService.js
 * 
 * Provides unified vendor data access. First attempts Flask API (with Firestore backend),
 * and transparently falls back to direct client Firestore SDK when running client-only.
 * ==============================================================================
 */

import { apiClient } from './apiClient';
import { firestoreService, INITIAL_SEED_VENDORS } from './firestoreService';

export const vendorService = {
  async getVendors(params = {}) {
    try {
      const response = await apiClient.get('/vendors', { params });
      return response;
    } catch (err) {
      console.info('[VendorService] Backend API not reached; querying Firestore client directly.', err?.message || '');
      const firestoreData = await firestoreService.getVendors(params);
      return {
        success: true,
        data: firestoreData,
      };
    }
  },

  async getVendorById(id) {
    try {
      const response = await apiClient.get(`/vendors/${id}`);
      return response;
    } catch (err) {
      console.info('[VendorService] Backend API not reached; querying Firestore document directly.', err?.message || '');
      const vendor = await firestoreService.getVendorById(id);
      return {
        success: true,
        data: vendor,
      };
    }
  },

  async updateVendor(id, updates) {
    try {
      return await apiClient.patch(`/vendors/${id}`, updates);
    } catch (err) {
      console.info('[VendorService] Backend API not reached; updating Firestore directly.', err?.message || '');
      return await firestoreService.updateVendor(id, updates);
    }
  },

  async deleteVendor(id) {
    try {
      return await apiClient.delete(`/vendors/${id}`);
    } catch (err) {
      console.info('[VendorService] Backend API not reached; deleting Firestore doc directly.', err?.message || '');
      return await firestoreService.deleteVendor(id);
    }
  },

  async searchVendors(query) {
    try {
      return await apiClient.get('/vendors/search', { params: { q: query } });
    } catch (err) {
      const { items } = await firestoreService.getVendors();
      const filtered = items.filter((v) =>
        v.business_name?.toLowerCase().includes(query.toLowerCase()) ||
        v.phone?.includes(query) ||
        v.city?.toLowerCase().includes(query.toLowerCase())
      );
      return { success: true, data: filtered };
    }
  },

  async batchUpsert(vendors) {
    return await firestoreService.batchUpsertVendors(vendors);
  },

  getSeedVendors() {
    return INITIAL_SEED_VENDORS;
  },
};

export default vendorService;
