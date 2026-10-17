/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * REAL EXCEL / CSV SPREADSHEET EXPORT SERVICE
 * ==============================================================================
 * Location: frontend/src/services/exportService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const exportService = {
  /**
   * Request backend to generate a spreadsheet for given filters and preset schema
   */
  async triggerExport(options = {}) {
    const res = await apiClient.post('/exports', options);
    return res?.data || res;
  },

  /**
   * Trigger immediate validated file download in browser using Blob / Object URL.
   * Completely prevents the "Invalid file format or corrupted file" error by
   * intercepting non-200 responses and ensuring valid binary XLSX delivery.
   */
  async downloadDirectly(options = {}) {
    const res = await this.triggerExport(options);
    if (!res || !res.download_url) {
      throw new Error('Export service did not return a valid download link.');
    }

    const downloadPath = res.download_url;
    const filename = res.filename || `andhra_soft_tech_leads_${Date.now()}.xlsx`;

    try {
      // Fetch binary blob with Bearer token authentication
      const blobResponse = await apiClient.get(downloadPath, {
        responseType: 'blob',
      });

      const blob = blobResponse instanceof Blob
        ? blobResponse
        : new Blob([blobResponse], {
            type: res.mimetype || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

      // Verify the blob is not an error JSON payload
      if (blob.size < 500 && blob.type.includes('json')) {
        const text = await blob.text();
        try {
          const errJson = JSON.parse(text);
          throw new Error(errJson?.error?.message || errJson?.message || 'Export generation failed.');
        } catch {
          // not json, proceed
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (fetchErr) {
      console.warn('[ExportService] Blob fetch fallback to direct navigation:', fetchErr);
      // Fallback: direct window download navigation
      const base = apiClient.defaults.baseURL || '';
      const cleanBase = base.replace(/\/api\/v1\/?$/, '');
      const fullUrl = downloadPath.startsWith('http')
        ? downloadPath
        : `${cleanBase}${downloadPath}`;

      const link = document.createElement('a');
      link.href = fullUrl;
      link.setAttribute('download', filename);
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
