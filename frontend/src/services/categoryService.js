/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * DYNAMIC BUSINESS CATEGORY SERVICE
 * ==============================================================================
 * Location: frontend/src/services/categoryService.js
 *
 * Provides category resolution, persistent custom category registration in
 * Cloud Firestore, and case-insensitive deduplication.
 * ==============================================================================
 */

import { apiClient } from './apiClient';
import { db, isFirebaseConfigured } from '../config/firebase';
import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const MASTER_CATEGORIES = [
  'Furniture',
  'Furniture Stores',
  'Restaurants & Cafes',
  'Hotels & Lodges',
  'Hotels & Hospitality',
  'Real Estate & Builders',
  'Real Estate',
  'Hospitals & Healthcare',
  'Hospitals and Clinics',
  'Schools & Educational Institutes',
  'Schools and Colleges',
  'Automobiles & Garages',
  'Automobile Dealers',
  'Automobile Repair and Garages',
  'Supermarkets and Grocery Stores',
  'Electronics & Appliances',
  'Electronics Stores',
  'Mobile Shops',
  'Textile & Garments',
  'Clothing and Fashion',
  'Beauty Salons and Spas',
  'Pharmacies',
  'Diagnostic Laboratories',
  'Dental Clinics',
  'Hardware & Construction',
  'Construction and Building Materials',
  'Electrical Shops',
  'Plumbing Services',
  'Interior Designers',
  'Travel Agencies',
  'Gyms and Fitness Centres',
  'Computer and IT Services',
  'Printing and Advertising',
  'Professional Services',
  'Other / Custom Category',
];

export function normalizeCategory(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

// In-memory cache of resolved categories for instant page transitions
let cachedCategories = [...MASTER_CATEGORIES];

export const categoryService = {
  /**
   * Retrieves all categories from backend API and Cloud Firestore
   */
  async getCategories() {
    try {
      const res = await apiClient.get('/categories');
      const list = res?.categories || res?.data || res;
      if (Array.isArray(list) && list.length > 0) {
        const names = list.map((item) => (typeof item === 'string' ? item : item.name));
        cachedCategories = this.deduplicateCategories([...MASTER_CATEGORIES, ...names]);
        return cachedCategories;
      }
    } catch (err) {
      console.warn('[CategoryService] Backend categories fetch fallback:', err?.message);
    }

    // Direct Firestore fallback if backend is unreachable
    if (isFirebaseConfigured && db) {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const customNames = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data?.name) customNames.push(data.name);
        });
        if (customNames.length > 0) {
          cachedCategories = this.deduplicateCategories([...MASTER_CATEGORIES, ...customNames]);
          return cachedCategories;
        }
      } catch (fsErr) {
        console.warn('[CategoryService] Firestore fallback error:', fsErr?.message);
      }
    }

    return cachedCategories;
  },

  /**
   * Saves a new custom category persistently
   */
  async saveCategory(rawName) {
    const cleanName = normalizeCategory(rawName);
    if (!cleanName || cleanName.length < 2) return cleanName;

    // Check if already in cache case-insensitively
    const exists = cachedCategories.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase()
    );

    if (!exists) {
      cachedCategories.push(cleanName);
    }

    // 1. Try saving via backend API
    try {
      await apiClient.post('/categories', { name: cleanName });
      return cleanName;
    } catch (apiErr) {
      console.warn('[CategoryService] Backend category save notice:', apiErr?.message);
    }

    // 2. Direct Firestore write fallback
    if (isFirebaseConfigured && db) {
      try {
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        await setDoc(
          doc(db, 'categories', `cat_${slug}`),
          {
            name: cleanName,
            is_custom: true,
            created_at: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (fsErr) {
        console.warn('[CategoryService] Firestore save fallback notice:', fsErr?.message);
      }
    }

    return cleanName;
  },

  /**
   * Deduplicates array of category strings case-insensitively while preserving original order and casing
   */
  deduplicateCategories(categoryList) {
    if (!Array.isArray(categoryList)) return [...MASTER_CATEGORIES];
    const seen = new Set();
    const result = [];
    for (const item of categoryList) {
      const clean = normalizeCategory(item);
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(clean);
      }
    }
    return result;
  },
};

export default categoryService;
