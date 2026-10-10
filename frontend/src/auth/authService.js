/**
 * Firebase Authentication Service
 * Location: frontend/src/auth/authService.js
 * 
 * Handles interaction with Firebase Auth with automatic local development fallback.
 */

import { auth, isFirebaseConfigured } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { formatUser, getAuthErrorMessage } from './authUtils';

const STORAGE_KEY = 'ast_lead_finder_user';

export const authService = {
  /**
   * Log in with Email and Password
   */
  async loginWithEmailPassword(email, password) {
    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured. Please verify your environment variables.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      const formatted = formatUser({
        ...userCredential.user,
        role: 'admin',
        token,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      return formatted;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  },

  /**
   * Log out currently authenticated user
   */
  async logoutUser() {
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('[AuthService] Firebase signout error:', e.message);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  /**
   * Listen to Firebase Auth state changes
   */
  subscribeToAuthChanges(callback) {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            const formatted = formatUser({
              ...firebaseUser,
              role: 'admin',
              token,
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
            callback(formatted);
          } catch (err) {
            console.error('[AuthService] Failed to retrieve fresh ID token:', err);
            callback(null);
          }
        } else {
          localStorage.removeItem(STORAGE_KEY);
          callback(null);
        }
      });
    }

    // If Firebase is not configured, load from localStorage if exists
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        callback(JSON.parse(stored));
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }

    return () => {};
  },

  /**
   * Retrieve current cached session
   */
  getCachedUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
