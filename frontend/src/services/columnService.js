/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * CUSTOM SPREADSHEET COLUMNS API SERVICE
 * ==============================================================================
 * Location: frontend/src/services/columnService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const columnService = {
  async getColumns() {
    const res = await apiClient.get('/columns');
    return res?.data || [];
  },

  async createColumn(columnData) {
    return await apiClient.post('/columns', columnData);
  },

  async updateColumn(id, updates) {
    return await apiClient.patch(`/columns/${id}`, updates);
  },

  async deleteColumn(id) {
    return await apiClient.delete(`/columns/${id}`);
  },
};

export default columnService;
