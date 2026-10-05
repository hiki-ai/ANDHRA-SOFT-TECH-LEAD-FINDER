/**
 * Excel Export Service
 * Location: frontend/src/services/exportService.js
 */

import { apiClient } from './apiClient';

export const exportService = {
  async triggerExport(options = {}) {
    return apiClient.post('/exports', options);
  },

  async getExportStatus(exportId) {
    return apiClient.get(`/exports/${exportId}`);
  },

  getDownloadUrl(exportId) {
    return `${apiClient.defaults.baseURL}/exports/${exportId}/download`;
  },
};

export default exportService;
