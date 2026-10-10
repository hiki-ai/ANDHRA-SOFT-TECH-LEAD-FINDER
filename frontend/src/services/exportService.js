/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * REAL EXCEL EXPORT SERVICE
 * ==============================================================================
 * Location: frontend/src/services/exportService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const exportService = {
  /**
   * Request backend to generate an Excel spreadsheet for given filters
   */
  async triggerExport(options = {}) {
    const res = await apiClient.post('/exports', options);
    return res?.data || res;
  },

  /**
   * Trigger immediate file download in browser
   */
  async downloadDirectly(options = {}) {
    const res = await this.triggerExport(options);
    if (res?.download_url) {
      const base = apiClient.defaults.baseURL || '';
      const cleanBase = base.replace(/\/api\/v1\/?$/, '');
      const fullUrl = res.download_url.startsWith('http')
        ? res.download_url
        : `${cleanBase}${res.download_url}`;

      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', res.filename || 'andhra_soft_tech_leads.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    return res;
  },

  getDownloadUrl(exportId) {
    const base = apiClient.defaults.baseURL || '/api/v1';
    return `${base}/exports/${exportId}/download`;
  },
};

export default exportService;
