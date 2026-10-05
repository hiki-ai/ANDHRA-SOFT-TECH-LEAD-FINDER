/**
 * Spreadsheet Import Service
 * Location: frontend/src/services/importService.js
 */

import { apiClient } from './apiClient';

export const importService = {
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/imports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async confirmImport(jobId, mapping) {
    return apiClient.post(`/imports/${jobId}/confirm`, { mapping });
  },

  async getImportStatus(jobId) {
    return apiClient.get(`/imports/${jobId}`);
  },
};

export default importService;
