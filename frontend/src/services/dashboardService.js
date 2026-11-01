/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * DASHBOARD ANALYTICS API SERVICE
 * ==============================================================================
 * Location: frontend/src/services/dashboardService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const dashboardService = {
  /**
   * Fetch live aggregated database telemetry & metrics from REST API
   * Calls GET /api/v1/dashboard/stats (absolute path, will be combined with baseURL)
   */
  async getStats() {
    const res = await apiClient.get('/api/v1/dashboard/stats');
    if (res && typeof res === 'object') {
      if (res.data && typeof res.data === 'object' && ('total_vendors' in res.data || 'total_collections' in res.data)) {
        return res.data;
      }
      return res;
    }
    return res;
  },
};

export default dashboardService;
