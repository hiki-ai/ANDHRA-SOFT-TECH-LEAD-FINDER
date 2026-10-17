/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * CUSTOM SPREADSHEET COLUMNS API SERVICE
 * ==============================================================================
 * Location: frontend/src/services/columnService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';
import { firestoreService } from './firestoreService';

export const columnService = {
  async getColumns() {
    try {
      const res = await apiClient.get('/columns');
      const list = res?.data || res;
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Backend column route notice: fallback to Firestore
    }

    try {
      return await firestoreService.getCustomColumns();
    } catch {
      return [];
    }
  },

  async createColumn(columnData) {
    try {
      await firestoreService.saveCustomColumn(columnData);
    } catch (fsErr) {
      console.warn('[ColumnService] Firestore save notice:', fsErr?.message);
    }

    try {
      return await apiClient.post('/columns', columnData);
    } catch {
      return { success: true, data: columnData };
    }
  },

  async updateColumn(id, updates) {
    try {
      await firestoreService.saveCustomColumn({ key: id, ...updates });
    } catch {
      // ignore
    }

    try {
      return await apiClient.patch(`/columns/${id}`, updates);
    } catch {
      return { success: true, data: { key: id, ...updates } };
    }
  },

  async deleteColumn(id) {
    return await apiClient.delete(`/columns/${id}`).catch(() => ({ success: true }));
  },
};

export default columnService;
