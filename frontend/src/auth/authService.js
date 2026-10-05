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

    // 1. Built-in developer admin preset (works anytime for immediate testing)
    if (email === 'admin@andhrasofttech.com' && password === 'admin123') {
      const devAdmin = {
        uid: 'ast_admin_001',
        email: 'admin@andhrasofttech.com',
        displayName: 'Administrator',
        role: 'admin',
        token: 'dev_mock_jwt_ast_admin_2026',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devAdmin));
      return devAdmin;
    }

    // 2. Live Firebase Authentication (if configured in .env)
    if (isFirebaseConfigured && auth) {
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
    }

    // 3. Fallback development authentication for other emails
    if (password.length >= 6) {
      const devUser = {
        uid: 'usr_' + Math.random().toString(36).substring(2, 9),
        email,
        displayName: email.split('@')[0],
        role: 'admin',
        token: 'mock_jwt_token_' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
      return devUser;
    }

    throw new Error('Password must be at least 6 characters.');
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
      return onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          callback(formatUser({ ...firebaseUser, role: 'admin' }));
        } else {
          // Check local storage before treating as unauthenticated
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
        }
      });
    }

    // If Firebase is not configured, load from localStorage
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

    // Return no-op unsubscribe function
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
