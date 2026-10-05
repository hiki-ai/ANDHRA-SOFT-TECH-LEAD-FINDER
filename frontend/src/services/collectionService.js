/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * COLLECTIONS SERVICE (API & FIRESTORE HYBRID)
 * ==============================================================================
 * Location: frontend/src/services/collectionService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';
import { firestoreService } from './firestoreService';

export const collectionService = {
  async getCollections(params = {}) {
    try {
      return await apiClient.get('/collections', { params });
    } catch {
      const items = await firestoreService.getCollections();
      return { success: true, data: items };
    }
  },

  async getCollectionById(id) {
    try {
      return await apiClient.get(`/collections/${id}`);
    } catch {
      const items = await firestoreService.getCollections();
      const found = items.find((c) => c.id === id);
      return { success: true, data: found || null };
    }
  },

  async startCollection(data) {
    try {
      return await apiClient.post('/collections', data);
    } catch {
      const created = await firestoreService.createCollection(data);
      return { success: true, data: created, message: 'Collection job created successfully in Firestore' };
    }
  },

  async pauseCollection(id) {
    return apiClient.post(`/collections/${id}/pause`);
  },

  async resumeCollection(id) {
    return apiClient.post(`/collections/${id}/resume`);
  },

  async cancelCollection(id) {
    return apiClient.post(`/collections/${id}/cancel`);
  },
};

export default collectionService;
