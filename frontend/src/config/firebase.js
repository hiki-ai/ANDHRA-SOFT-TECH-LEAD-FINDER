/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * SINGLE CENTRAL FIREBASE CONFIGURATION
 * ==============================================================================
 * Location: frontend/src/config/firebase.js
 * 
 * This is the ONLY place where Firebase App, Auth, Firestore & Storage are initialized.
 * Credentials are read from Vite environment variables (frontend/.env) with fallback
 * to project defaults.
 * ==============================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDaGxyFJv2S8GVrqw1Cj1yAqe8SR8bz4jU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "andhra-soft-tech-lead-finder.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "andhra-soft-tech-lead-finder",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "andhra-soft-tech-lead-finder.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1028511931788",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1028511931788:web:b0e6b4ff69da76881c4aa9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4SYW5WDVSN"
};

// Check if valid Firebase credentials have been configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_') &&
  firebaseConfig.apiKey.length > 10
);

let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.info('[Firebase] Successfully initialized Firebase App, Auth & Firestore for project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
  }
} else {
  console.info(
    '[Firebase] Running in local development mode. Configure frontend/.env with valid Firebase credentials for live cloud authentication.'
  );
}

export { app, auth, db, storage };
export default app;
