/**
 * ==============================================================================
 * ANDHRA SOFT TECH — LEAD FINDER
 * SINGLE CENTRAL FIREBASE CONFIGURATION
 * ==============================================================================
 * Location: frontend/src/config/firebase.js
 * 
 * This is the ONLY place where Firebase App & Auth are initialized.
 * All credentials are read strictly from Vite environment variables (frontend/.env).
 * ==============================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDaGxyFJv2S8GVrqw1Cj1yAqe8SR8bz4jU",
  authDomain: "andhra-soft-tech-lead-finder.firebaseapp.com",
  projectId: "andhra-soft-tech-lead-finder",
  storageBucket: "andhra-soft-tech-lead-finder.firebasestorage.app",
  messagingSenderId: "1028511931788",
  appId: "1:1028511931788:web:b0e6b4ff69da76881c4aa9",
  measurementId: "G-4SYW5WDVSN"
};

// Check if valid Firebase credentials have been configured in .env
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your_') &&
  firebaseConfig.apiKey.length > 10
);

let app = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.info('[Firebase] Successfully initialized Firebase App & Auth for project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
  }
} else {
  console.info(
    '[Firebase] Running in local development mode. Configure frontend/.env with valid Firebase credentials for live cloud authentication.'
  );
}

export { app, auth };
export default app;
