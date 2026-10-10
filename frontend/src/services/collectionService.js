/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * COLLECTIONS API SERVICE
 * ==============================================================================
 * Location: frontend/src/services/collectionService.js
 * 
 * Strict REST API client for Collection and extraction jobs. Zero mock fallbacks.
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const collectionService = {
  async getCollections(params = {}) {
    const res = await apiClient.get('/collections', { params });
    return res;
  },

  async getCollectionById(id) {
    const res = await apiClient.get(`/collections/${id}`);
    return res;
  },

  async startCollection(data) {
    const res = await apiClient.post('/collections', data);
    return res;
  },

  async pauseCollection(id) {
    return await apiClient.post(`/collections/${id}/pause`);
  },

  async resumeCollection(id) {
    return await apiClient.post(`/collections/${id}/resume`);
  },

  async cancelCollection(id) {
    return await apiClient.post(`/collections/${id}/cancel`);
  },
};

export default collectionService;
