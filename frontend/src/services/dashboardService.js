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
   */
  async getStats() {
    const res = await apiClient.get('/dashboard/stats');
    return res?.data || res;
  },
};

export default dashboardService;
