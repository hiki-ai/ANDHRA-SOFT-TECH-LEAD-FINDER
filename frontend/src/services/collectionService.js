/**
 * Collections API Service
 * Location: frontend/src/services/collectionService.js
 */

import { apiClient } from './apiClient';

export const collectionService = {
  async getCollections(params = {}) {
    return apiClient.get('/collections', { params });
  },

  async getCollectionById(id) {
    return apiClient.get(`/collections/${id}`);
  },

  async startCollection(data) {
    return apiClient.post('/collections', data);
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
