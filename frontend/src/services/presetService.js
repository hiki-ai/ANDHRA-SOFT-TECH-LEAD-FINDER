/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * TABLE PRESETS & COLUMN CONFIGURATION API SERVICE
 * ==============================================================================
 * Location: frontend/src/services/presetService.js
 * ==============================================================================
 */

import { apiClient } from './apiClient';

export const presetService = {
  /**
   * Retrieves all saved table presets, default column definitions, and source capability matrix.
   * Preserves full response payload containing data, source_capabilities, and default_columns.
   */
  async getPresets() {
    const res = await apiClient.get('/presets');
    return res || {};
  },

  /**
   * Retrieves a specific preset by its unique ID.
   */
  async getPresetById(id) {
    const res = await apiClient.get(`/presets/${id}`);
    return res?.data || res;
  },

  /**
   * Creates a new custom table preset.
   */
  async createPreset(presetData) {
    return await apiClient.post('/presets', presetData);
  },

  /**
   * Updates an existing preset.
   */
  async updatePreset(id, updates) {
    return await apiClient.patch(`/presets/${id}`, updates);
  },

  /**
   * Deletes a preset. Optional force flag bypasses collection usage checks.
   */
  async deletePreset(id, force = false) {
    return await apiClient.delete(`/presets/${id}`, {
      params: { force: force ? 'true' : 'false' },
    });
  },

  /**
   * Idempotently re-initializes canonical system presets (e.g. 'Furniture Leads').
   */
  async resetDefaults() {
    return await apiClient.post('/presets/init-defaults');
  },

  /**
   * Checks if a column key is actively used in any saved table presets.
   */
  async checkColumnUsage(key) {
    const res = await apiClient.post('/presets/check-column-usage', { column_key: key });
    return res?.data || res;
  },

  /**
   * Retrieves the provider field capability mapping.
   */
  async getCapabilities() {
    const res = await apiClient.get('/presets/capabilities');
    return res?.data || res;
  },
};

export default presetService;
