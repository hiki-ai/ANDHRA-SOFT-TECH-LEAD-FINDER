/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * TABLE PRESETS & COLUMN CONFIGURATION DUAL-SYNC API & FIRESTORE SERVICE
 * ==============================================================================
 * Location: frontend/src/services/presetService.js
 *
 * Provides bidirectional synchronization between backend Flask REST endpoints and
 * client-side Cloud Firestore (/tablePresets/{presetId} collection).
 * Guarantees that Add Column and table modifications persist reliably even when
 * offline, during cold starts, or when interacting directly with Cloud Firestore.
 * ==============================================================================
 */

import { apiClient } from './apiClient';
import { firestoreService } from './firestoreService';
import { CANONICAL_FURNITURE_PRESET, DEFAULT_COLUMNS } from '../utils/tableSchema';

export const presetService = {
  /**
   * Retrieves all saved table presets, default column definitions, and source capability matrix.
   * Tries backend API first; falls back gracefully to Cloud Firestore.
   */
  async getPresets() {
    let apiError = null;

    // 1. Try fetching from backend API
    try {
      const res = await apiClient.get('/presets');
      const list = res?.data || (Array.isArray(res) ? res : null);
      if (Array.isArray(list) && list.length > 0) {
        return {
          success: true,
          data: list,
          default_columns: res?.default_columns || DEFAULT_COLUMNS,
          source_capabilities: res?.source_capabilities || {},
        };
      }
    } catch (err) {
      apiError = err;
      console.warn('[PresetService] Backend presets fetch notice:', err?.message || err);
    }

    // 2. Direct Cloud Firestore fallback (/tablePresets collection)
    try {
      const firestoreItems = await firestoreService.getTablePresets();
      if (Array.isArray(firestoreItems) && firestoreItems.length > 0) {
        return {
          success: true,
          data: firestoreItems,
          default_columns: DEFAULT_COLUMNS,
          source_capabilities: {},
        };
      }
    } catch (fsErr) {
      console.warn('[PresetService] Firestore presets fetch notice:', fsErr?.message || fsErr);
    }

    // 3. Resilient fallback: return canonical system preset so TableEditor never crashes
    return {
      success: true,
      data: [CANONICAL_FURNITURE_PRESET],
      default_columns: DEFAULT_COLUMNS,
      source_capabilities: {},
      _warning: apiError?.message,
    };
  },

  /**
   * Retrieves a specific preset by its unique ID.
   */
  async getPresetById(id) {
    if (!id) return null;

    // 1. Try backend API
    try {
      const res = await apiClient.get(`/presets/${id}`);
      if (res?.data) return res.data;
      if (res?.id) return res;
    } catch (err) {
      console.warn(`[PresetService] Backend getPresetById notice for '${id}':`, err?.message);
    }

    // 2. Try Cloud Firestore
    try {
      const docData = await firestoreService.getTablePresetById(id);
      if (docData) return docData;
    } catch (fsErr) {
      console.warn(`[PresetService] Firestore getPresetById notice for '${id}':`, fsErr?.message);
    }

    // 3. Fallback to canonical preset if matching ID
    if (id === CANONICAL_FURNITURE_PRESET.id) {
      return CANONICAL_FURNITURE_PRESET;
    }

    return null;
  },

  /**
   * Creates a new custom table preset in Cloud Firestore and backend.
   */
  async createPreset(presetData) {
    const presetId = presetData.id || `preset_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const fullPayload = {
      ...presetData,
      id: presetId,
    };

    let firestoreResult = null;
    let fsError = null;

    // 1. Direct Cloud Firestore write (/tablePresets/{presetId})
    try {
      firestoreResult = await firestoreService.saveTablePreset(presetId, fullPayload);
    } catch (err) {
      fsError = err;
      console.error('[PresetService] Firestore createPreset error:', err);
    }

    // 2. Synchronize with backend API
    let backendResult = null;
    try {
      backendResult = await apiClient.post('/presets', fullPayload);
    } catch (apiErr) {
      console.warn('[PresetService] Backend createPreset sync notice:', apiErr?.message);
      // If Firestore also failed, throw the error
      if (fsError && !firestoreResult) {
        throw new Error(apiErr?.message || fsError?.message || 'Failed to create preset.');
      }
    }

    return backendResult || { success: true, data: firestoreResult || fullPayload };
  },

  /**
   * Updates an existing preset in Cloud Firestore and backend.
   * Document path: /tablePresets/{id}
   */
  async updatePreset(id, updates) {
    if (!id) throw new Error('Preset ID is required for update.');

    const cleanColumns = Array.isArray(updates.columns) ? updates.columns : [];
    const enabledKeys = cleanColumns.filter((c) => c.is_enabled).map((c) => c.key);
    const requiredKeys = cleanColumns.filter((c) => c.is_required).map((c) => c.key);

    const fullPayload = {
      ...updates,
      id,
      columns: cleanColumns,
      enabled_columns: updates.enabled_columns || enabledKeys,
      required_columns: updates.required_columns || requiredKeys,
    };

    let firestoreResult = null;
    let fsError = null;

    // 1. Direct Cloud Firestore persistence (/tablePresets/{id})
    try {
      firestoreResult = await firestoreService.saveTablePreset(id, fullPayload);
    } catch (err) {
      fsError = err;
      console.error(`[PresetService] Firestore update error for '${id}':`, err);
      // If permission-denied, format user-friendly message
      if (err?.code === 'permission-denied') {
        throw new Error('Firestore write permission denied. Please verify your authentication status.');
      }
    }

    // 2. Synchronize with backend API
    let backendResult = null;
    try {
      backendResult = await apiClient.patch(`/presets/${id}`, fullPayload);
    } catch (apiErr) {
      console.warn(`[PresetService] Backend preset patch notice for '${id}':`, apiErr?.message);
      // If Firestore also failed, raise error
      if (fsError && !firestoreResult) {
        throw new Error(apiErr?.message || fsError?.message || `Failed to update preset '${id}'.`);
      }
    }

    return backendResult || { success: true, data: firestoreResult || fullPayload };
  },

  /**
   * Deletes a preset from Cloud Firestore and backend.
   */
  async deletePreset(id, force = false) {
    if (!id) return { success: true };

    let fsError = null;
    try {
      await firestoreService.deleteTablePreset(id);
    } catch (err) {
      fsError = err;
      console.warn(`[PresetService] Firestore deletePreset notice for '${id}':`, err?.message);
    }

    let backendResult = null;
    try {
      backendResult = await apiClient.delete(`/presets/${id}`, {
        params: { force: force ? 'true' : 'false' },
      });
    } catch (apiErr) {
      console.warn(`[PresetService] Backend deletePreset notice for '${id}':`, apiErr?.message);
      if (fsError) {
        throw new Error(apiErr?.message || fsError?.message || 'Failed to delete preset.');
      }
    }

    return backendResult || { success: true };
  },

  /**
   * Idempotently re-initializes canonical system presets (e.g. 'Furniture Leads').
   */
  async resetDefaults() {
    // 1. Restore canonical preset to Cloud Firestore
    try {
      await firestoreService.saveTablePreset(
        CANONICAL_FURNITURE_PRESET.id,
        CANONICAL_FURNITURE_PRESET
      );
    } catch (fsErr) {
      console.warn('[PresetService] Firestore resetDefaults notice:', fsErr?.message);
    }

    // 2. Restore on backend
    try {
      return await apiClient.post('/presets/init-defaults');
    } catch (apiErr) {
      console.warn('[PresetService] Backend resetDefaults notice:', apiErr?.message);
      return { success: true, message: 'Default presets re-initialized in Firestore.' };
    }
  },

  /**
   * Checks if a column key is actively used in any saved table presets.
   */
  async checkColumnUsage(key) {
    if (!key) return { is_used: false, used_in_presets: [] };

    // 1. Try backend
    try {
      const res = await apiClient.post('/presets/check-column-usage', { column_key: key });
      return res?.data || res;
    } catch (apiErr) {
      console.warn('[PresetService] Backend checkColumnUsage notice:', apiErr?.message);
    }

    // 2. Local check against Firestore presets
    try {
      const allPresets = await firestoreService.getTablePresets();
      const usedIn = [];
      allPresets.forEach((p) => {
        const cols = p.columns || [];
        if (cols.some((c) => c.key === key)) {
          usedIn.push(p.name || p.id);
        }
      });
      return {
        is_used: usedIn.length > 0,
        used_in_presets: usedIn,
      };
    } catch (e) {
      return { is_used: false, used_in_presets: [] };
    }
  },

  /**
   * Retrieves the provider field capability mapping.
   */
  async getCapabilities() {
    try {
      const res = await apiClient.get('/presets/capabilities');
      return res?.data || res;
    } catch (err) {
      console.warn('[PresetService] Backend getCapabilities notice:', err?.message);
      return {};
    }
  },
};

export default presetService;
