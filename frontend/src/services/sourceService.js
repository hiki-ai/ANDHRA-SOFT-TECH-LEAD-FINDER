/**
 * Data Sources Service
 * Location: frontend/src/services/sourceService.js
 */

import { apiClient } from './apiClient';

export const sourceService = {
  /**
   * Fetch registered lead collector source configurations and availability
   */
  async getSources() {
    const res = await apiClient.get('/sources');
    return res?.data || res;
  },
};

export default sourceService;
