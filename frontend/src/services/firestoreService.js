/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * FIREBASE FIRESTORE SERVICE LAYER
 * ==============================================================================
 * Location: frontend/src/services/firestoreService.js
 * 
 * Provides direct Firestore access for Vendors, Collection Jobs, Custom Columns,
 * and Sources, respecting Firestore constraints (e.g. batch size <= 450).
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
  METADATA: 'metadata',
  USERS: 'users',
};

// Initial Seed Dataset for Firestore if empty
export const INITIAL_SEED_VENDORS = [
  {
    id: 'ven_1001',
    business_name: 'Godavari Teak & Rosewood Emporium',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: 'info@godavariteak.com',
    location: 'Main Road, Rajahmundry',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    website: 'https://godavariteak.com',
    rating: 4.8,
    review_count: 312,
    source: 'Official Public Directory (Source A)',
    status: 'valid',
    data_quality_score: 95,
    custom_fields: { gst_registered: true, verified_on: '2026-03-15' },
    dedupe_key: 'godavari_teak_+918832458920_rajahmundry',
  },
  {
    id: 'ven_1002',
    business_name: 'Visakha Multi-Speciality Dental Hospital',
    category: 'Hospitals',
    phone: '+91 891 254 7800',
    email: 'contact@visakhadental.org',
    location: 'MVP Colony, Visakhapatnam',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    website: 'https://visakhadental.org',
    rating: 4.6,
    review_count: 520,
    source: 'Health Registry API (Source B)',
    status: 'valid',
    data_quality_score: 92,
    custom_fields: { emergency_24x7: true, bed_count: 85 },
    dedupe_key: 'visakha_multi_+918912547800_visakhapatnam',
  },
  {
    id: 'ven_1003',
    business_name: 'Krishna Delta Gourmet Restaurant',
    category: 'Restaurants',
    phone: '+91 866 248 1122',
    email: 'manager@krishnagourmet.in',
    location: 'MG Road, Vijayawada',
    city: 'Vijayawada',
    district: 'Krishna',
    state: 'Andhra Pradesh',
    website: 'https://krishnagourmet.in',
    rating: 4.4,
    review_count: 890,
    source: 'Commercial Registry (Source A)',
    status: 'valid',
    data_quality_score: 88,
    custom_fields: { seating_capacity: 120, ac: true },
    dedupe_key: 'krishna_delta_+918662481122_vijayawada',
  },
  {
    id: 'ven_1004',
    business_name: 'Amaravati Skyline Heights & Builders',
    category: 'Real Estate',
    phone: '+91 863 223 9901',
    email: 'sales@amaravatiskyline.com',
    location: 'Brodipet, Guntur',
    city: 'Guntur',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    website: 'https://amaravatiskyline.com',
    rating: 4.2,
    review_count: 145,
    source: 'Licensed Property Registry',
    status: 'valid',
    data_quality_score: 84,
    custom_fields: { rera_approved: true },
    dedupe_key: 'amaravati_skyline_+918632239901_guntur',
  },
  {
    id: 'ven_1005',
    business_name: 'Konaseema Grand Heritage Residency',
    category: 'Hotels',
    phone: '+91 884 237 4455',
    email: 'reservations@konaseemagrand.com',
    location: 'Cinema Road, Kakinada',
    city: 'Kakinada',
    district: 'Kakinada',
    state: 'Andhra Pradesh',
    website: 'https://konaseemagrand.com',
    rating: 4.7,
    review_count: 410,
    source: 'Hospitality Registry',
    status: 'valid',
    data_quality_score: 90,
    custom_fields: { rooms: 45, banquet_hall: true },
    dedupe_key: 'konaseema_grand_+918842374455_kakinada',
  },
  {
    id: 'ven_1006',
    business_name: 'Godavari Furnishing Works [Duplicate Record]',
    category: 'Furniture',
    phone: '+91 883 245 8920',
    email: null,
    location: 'Main Rd, Rajahmundry',
    city: 'Rajahmundry',
    district: 'East Godavari',
    state: 'Andhra Pradesh',
    website: null,
    rating: 4.5,
    review_count: 88,
    source: 'Public Web Connector',
    status: 'duplicate',
    data_quality_score: 62,
    custom_fields: {},
    dedupe_key: 'godavari_furnishing_+918832458920_rajahmundry',
  },
  {
    id: 'ven_1007',
    business_name: 'Nellore Spice Kitchen & Sweets',
    category: 'Restaurants',
    phone: null,
    email: null,
    location: 'Trunk Road, Nellore',
    city: 'Nellore',
    district: 'Nellore',
    state: 'Andhra Pradesh',
    website: null,
    rating: 3.8,
    review_count: 42,
    source: 'Public Web Connector',
    status: 'invalid',
    data_quality_score: 45,
    custom_fields: {},
    dedupe_key: 'nellore_spice__nellore',
  },
];

export const firestoreService = {
  /**
   * Check if Firestore is configured and ready
   */
  isReady() {
    return Boolean(isFirebaseConfigured && db);
  },

  /**
   * Seed initial vendors to Firestore if collection is empty
   */
  async seedVendorsIfEmpty() {
    if (!this.isReady()) return false;
    try {
      const colRef = collection(db, COLLECTIONS.VENDORS);
      const snapshot = await getDocs(query(colRef, limit(1)));
      if (snapshot.empty) {
        console.info('[Firestore] Seeding initial vendors to Firestore...');
        const batch = writeBatch(db);
        INITIAL_SEED_VENDORS.forEach((vendor) => {
          const docRef = doc(db, COLLECTIONS.VENDORS, vendor.id);
          batch.set(docRef, {
            ...vendor,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        });
        await batch.commit();
        console.info('[Firestore] Successfully seeded initial vendors.');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Firestore] Seed check/write notice:', err.message);
      return false;
    }
  },

  /**
   * Fetch Vendors from Firestore with filters and limit
   */
  async getVendors({ category, city, status, pageSize = 50, lastDoc = null } = {}) {
    if (!this.isReady()) {
      return { items: INITIAL_SEED_VENDORS, total: INITIAL_SEED_VENDORS.length, lastDoc: null };
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

      // Get count if supported
      let total = items.length;
      try {
        const countSnap = await getCountFromServer(query(colRef, ...constraints.slice(0, -1)));
        total = countSnap.data().count;
      } catch {
        total = items.length;
      }

      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      return {
        items: items.length > 0 ? items : INITIAL_SEED_VENDORS,
        total: total > 0 ? total : INITIAL_SEED_VENDORS.length,
        lastDoc: lastVisible,
      };
    } catch (error) {
      console.warn('[Firestore] getVendors query error, returning seed dataset:', error.message);
      return { items: INITIAL_SEED_VENDORS, total: INITIAL_SEED_VENDORS.length, lastDoc: null };
    }
  },

  /**
   * Get Vendor by Document ID
   */
  async getVendorById(id) {
    if (!this.isReady()) {
      return INITIAL_SEED_VENDORS.find((v) => v.id === id) || null;
    }
    try {
      const docRef = doc(db, COLLECTIONS.VENDORS, id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return INITIAL_SEED_VENDORS.find((v) => v.id === id) || null;
    } catch (error) {
      console.warn('[Firestore] getVendorById error:', error.message);
      return INITIAL_SEED_VENDORS.find((v) => v.id === id) || null;
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
