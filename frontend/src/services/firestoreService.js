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
};

export default firestoreService;
