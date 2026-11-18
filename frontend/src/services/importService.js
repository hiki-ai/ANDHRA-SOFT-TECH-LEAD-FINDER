/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * REAL SPREADSHEET IMPORT SERVICE
 * ==============================================================================
 * Location: frontend/src/services/importService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const importService = {
  /**
   * Send file to backend to read headers, detect columns, and preview rows & validity telemetry
   */
  async previewFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data || res;
  },

  /**
   * Execute real import: upload spreadsheet along with user-selected column mapping,
   * collection name, and duplicate skip setting.
   */
  async executeImport({ file, mapping, collection_name, skip_duplicates = true }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping || {}));
    if (collection_name) {
      formData.append('collection_name', collection_name);
    }
    formData.append('skip_duplicates', skip_duplicates ? 'true' : 'false');

    const res = await apiClient.post('/imports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res?.data || res;
  },
};

export default importService;
