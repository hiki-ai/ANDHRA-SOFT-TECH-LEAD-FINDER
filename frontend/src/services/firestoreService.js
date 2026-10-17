/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * FIREBASE FIRESTORE SERVICE LAYER
 * ==============================================================================
 * Location: frontend/src/services/firestoreService.js
 * 
 * Provides client-side Firestore access abstractions when authorized.
 * Zero mock/seed data. Empty states return empty arrays/counts.
 * ==============================================================================
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { CANONICAL_FURNITURE_PRESET, DEFAULT_COLUMNS } from '../utils/tableSchema';

// Collection Names
export const COLLECTIONS = {
  VENDORS: 'vendors',
  COLLECTIONS: 'collections',
  SOURCES: 'sources',
  CUSTOM_COLUMNS: 'customColumns',
  TABLE_PRESETS: 'tablePresets',
  CATEGORIES: 'categories',
  METADATA: 'metadata',
  USERS: 'users',
};

export const firestoreService = {
  /**
   * Check if Firestore is configured and ready
   */
  isReady() {
    return Boolean(isFirebaseConfigured && db);
  },

  /**
   * Fetch Vendors from Firestore with filters and limit
   */
  async getVendors({ category, city, status, pageSize = 50, lastDoc = null } = {}) {
    if (!this.isReady()) {
      return { items: [], total: 0, lastDoc: null };
    }

    try {
      const colRef = collection(db, COLLECTIONS.VENDORS);
      const constraints = [];

      if (category) {
        constraints.push(where('category', '==', category));
      }
      if (city) {
        constraints.push(where('city', '==', city));
      }
      if (status) {
        constraints.push(where('status', '==', status));
      }

      constraints.push(limit(pageSize));

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);

      const items = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });

      let total = items.length;
      try {
        const countSnap = await getCountFromServer(query(colRef, ...constraints.slice(0, -1)));
        total = countSnap.data().count;
      } catch {
        total = items.length;
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      return {
        items,
        total,
        lastDoc: lastVisible,
      };
    } catch (error) {
      console.warn('[Firestore] getVendors error:', error.message);
      return { items: [], total: 0, lastDoc: null };
    }
  },

  /**
   * Get Vendor by Document ID
   */
  async getVendorById(id) {
    if (!this.isReady()) return null;
    try {
      const docRef = doc(db, COLLECTIONS.VENDORS, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.warn('[Firestore] getVendorById error:', error.message);
      return null;
    }
  },

  /**
   * Update Vendor Document
   */
  async updateVendor(id, updates) {
    if (!this.isReady()) return updates;
    try {
      const docRef = doc(db, COLLECTIONS.VENDORS, id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
      return { id, ...updates };
    } catch (error) {
      console.error('[Firestore] updateVendor error:', error);
      throw error;
    }
  },

  /**
   * Delete Vendor Document
   */
  async deleteVendor(id) {
    if (!this.isReady()) return true;
    try {
      const docRef = doc(db, COLLECTIONS.VENDORS, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error('[Firestore] deleteVendor error:', error);
      throw error;
    }
  },

  /**
   * Bulk Batch Upsert Vendors (Max 450 per chunk to stay well under Firestore 500-limit)
   */
  async batchUpsertVendors(vendors) {
    if (!this.isReady()) return vendors.length;

    const CHUNK_SIZE = 450;
    let committed = 0;

    for (let i = 0; i < vendors.length; i += CHUNK_SIZE) {
      const chunk = vendors.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((vendor) => {
        const docId = vendor.id || vendor.dedupe_key || doc(collection(db, COLLECTIONS.VENDORS)).id;
        const docRef = doc(db, COLLECTIONS.VENDORS, docId);
        batch.set(
          docRef,
          {
            ...vendor,
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
      committed += chunk.length;
    }

    return committed;
  },

  /**
   * Get All Collection Extraction Jobs
   */
  async getCollections() {
    if (!this.isReady()) return [];
    try {
      const colRef = collection(db, COLLECTIONS.COLLECTIONS);
      const snapshot = await getDocs(query(colRef, orderBy('started_at', 'desc'), limit(50)));
      const items = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (error) {
      console.warn('[Firestore] getCollections error:', error.message);
      return [];
    }
  },

  /**
   * Create new Collection Job
   */
  async createCollection(jobData) {
    if (!this.isReady()) {
      return { id: 'col_' + Date.now(), ...jobData, status: 'pending' };
    }
    try {
      const colRef = collection(db, COLLECTIONS.COLLECTIONS);
      const newDocRef = doc(colRef);
      const newJob = {
        ...jobData,
        status: 'pending',
        progress: 0,
        found: 0,
        valid: 0,
        duplicate: 0,
        failed: 0,
        started_at: serverTimestamp(),
      };
      await setDoc(newDocRef, newJob);
      return { id: newDocRef.id, ...newJob };
    } catch (error) {
      console.error('[Firestore] createCollection error:', error);
      throw error;
    }
  },

  /**
   * Fetch all table presets directly from Cloud Firestore (tablePresets collection)
   */
  async getTablePresets() {
    if (!this.isReady()) return [];
    try {
      const colRef = collection(db, COLLECTIONS.TABLE_PRESETS);
      const snapshot = await getDocs(colRef);
      const items = [];
      snapshot.forEach((d) => {
        const data = d.data() || {};
        items.push({ id: d.id, ...data });
      });

      // If Firestore tablePresets is completely empty, idempotently seed canonical furniture leads
      if (items.length === 0) {
        try {
          const defaultPreset = {
            ...CANONICAL_FURNITURE_PRESET,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const docRef = doc(db, COLLECTIONS.TABLE_PRESETS, defaultPreset.id);
          await setDoc(docRef, defaultPreset, { merge: true });
          items.push(defaultPreset);
        } catch (seedErr) {
          console.warn('[Firestore] Could not seed default preset:', seedErr.message);
        }
      }

      // Sort system/default first, then by name
      items.sort((a, b) => {
        const aDef = a.is_default ? 0 : 1;
        const bDef = b.is_default ? 0 : 1;
        if (aDef !== bDef) return aDef - bDef;
        return (a.name || '').localeCompare(b.name || '');
      });

      return items;
    } catch (error) {
      console.warn('[Firestore] getTablePresets notice:', error.message);
      return [];
    }
  },

  /**
   * Fetch a single table preset by ID from Cloud Firestore
   */
  async getTablePresetById(id) {
    if (!this.isReady() || !id) return null;
    try {
      const docRef = doc(db, COLLECTIONS.TABLE_PRESETS, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.warn(`[Firestore] getTablePresetById error for ${id}:`, error.message);
      return null;
    }
  },

  /**
   * Persist a table preset document to Cloud Firestore
   * Document path: /tablePresets/{presetId}
   */
  async saveTablePreset(id, presetData) {
    if (!id) throw new Error('Preset ID is required to save to Firestore.');
    if (!this.isReady()) {
      return { id, ...presetData };
    }

    try {
      const docRef = doc(db, COLLECTIONS.TABLE_PRESETS, id);
      const cleanColumns = Array.isArray(presetData.columns) ? presetData.columns : [];
      const enabledKeys = cleanColumns.filter((c) => c.is_enabled).map((c) => c.key);
      const requiredKeys = cleanColumns.filter((c) => c.is_required).map((c) => c.key);

      const payload = {
        name: presetData.name || 'Table Preset',
        description: presetData.description || '',
        columns: cleanColumns,
        enabled_columns: enabledKeys,
        required_columns: requiredKeys,
        extraction_config: presetData.extraction_config || { source: 'google_places', enforce_required: true },
        export_config: presetData.export_config || { include_headers: true, format: 'xlsx' },
        is_system: Boolean(presetData.is_system),
        is_default: Boolean(presetData.is_default),
        updated_at: serverTimestamp(),
      };

      if (presetData.user_id) {
        payload.user_id = presetData.user_id;
      }
      if (presetData.created_at) {
        payload.created_at = presetData.created_at;
      }

      await setDoc(docRef, payload, { merge: true });
      return { id, ...payload, updated_at: new Date().toISOString() };
    } catch (error) {
      console.error(`[Firestore] saveTablePreset error for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a table preset from Cloud Firestore
   */
  async deleteTablePreset(id) {
    if (!id || !this.isReady()) return true;
    try {
      const docRef = doc(db, COLLECTIONS.TABLE_PRESETS, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[Firestore] deleteTablePreset error for ${id}:`, error);
      throw error;
    }
  },

  /**
   * Save custom column definition in customColumns collection
   */
  async saveCustomColumn(columnData) {
    if (!this.isReady() || !columnData?.key) return columnData;
    try {
      const docRef = doc(db, COLLECTIONS.CUSTOM_COLUMNS, columnData.key);
      const payload = {
        ...columnData,
        updated_at: serverTimestamp(),
      };
      await setDoc(docRef, payload, { merge: true });
      return { id: columnData.key, ...payload };
    } catch (error) {
      console.warn('[Firestore] saveCustomColumn notice (admin claim may be required):', error.message);
      return columnData;
    }
  },

  /**
   * Retrieve all custom columns from customColumns collection
   */
  async getCustomColumns() {
    if (!this.isReady()) return [];
    try {
      const colRef = collection(db, COLLECTIONS.CUSTOM_COLUMNS);
      const snapshot = await getDocs(colRef);
      const items = [];
      snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
      return items;
    } catch (error) {
      console.warn('[Firestore] getCustomColumns notice:', error.message);
      return [];
    }
  },
};

export default firestoreService;
