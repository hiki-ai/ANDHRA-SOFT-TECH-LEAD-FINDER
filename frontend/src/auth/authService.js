/**
 * Firebase Authentication Service
 * Location: frontend/src/auth/authService.js
 * 
 * Handles interaction with Firebase Auth with automatic local development fallback.
 */

import { auth, db, isFirebaseConfigured } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import {
  formatUser,
  getAuthErrorMessage,
  validateRegistration,
  isSystemAdminEmail,
} from './authUtils';

const STORAGE_KEY = 'ast_lead_finder_user';

export const authService = {
  /**
   * Register a new user with Email, Password, and Full Name.
   * - Enforces input validation and password policies.
   * - Creates account via Firebase Email/Password Auth.
   * - Never assigns admin role to public registrations.
   * - Persists user profile to Firestore in `users/{uid}`.
   * - Rolls back Auth account if Firestore profile write fails.
   */
  async registerUser({ fullName, email, password, confirmPassword }) {
    const validation = validateRegistration({ fullName, email, password, confirmPassword });
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Please correct the registration fields.');
    }

    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured. Please check your environment variables.');
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();

    let userCredential = null;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (authErr) {
      throw new Error(getAuthErrorMessage(authErr));
    }

    const user = userCredential.user;

    // Update display name in Firebase Auth
    try {
      await updateProfile(user, { displayName: cleanName });
    } catch (profileErr) {
      console.warn('[AuthService] Could not set displayName in Firebase Auth:', profileErr.message);
    }

    // Determine role and status: public registrations are ALWAYS restricted to 'user' / 'pending'
    const isSystemAdmin = isSystemAdminEmail(cleanEmail);
    const assignedRole = isSystemAdmin ? 'admin' : 'user';
    const assignedStatus = isSystemAdmin ? 'active' : 'pending';

    const profileData = {
      uid: user.uid,
      fullName: cleanName,
      email: cleanEmail,
      role: assignedRole,
      status: assignedStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Save profile to Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'users', user.uid), profileData);
      }
    } catch (fsErr) {
      console.error('[AuthService] Firestore profile creation failed:', fsErr);
      // Rollback Auth creation to avoid orphaned partially registered account
      try {
        await user.delete();
      } catch (delErr) {
        console.warn('[AuthService] Failed to rollback user after Firestore failure:', delErr.message);
      }
      throw new Error('Registration failed while creating your user profile. Please try again.');
    }

    // Retrieve fresh ID token
    const token = await user.getIdToken();
    const formatted = formatUser(user, {
      fullName: cleanName,
      role: assignedRole,
      status: assignedStatus,
      token,
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
    return formatted;
  },

  /**
   * Log in with Email and Password
   */
  async loginWithEmailPassword(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password.');
    }

    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured. Please verify your environment variables.');
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      const token = await user.getIdToken();

      let role = isSystemAdminEmail(cleanEmail) ? 'admin' : 'user';
      let status = isSystemAdminEmail(cleanEmail) ? 'active' : 'pending';
      let fullName = user.displayName || '';

      if (db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            role = isSystemAdminEmail(cleanEmail) ? 'admin' : (data.role || 'user');
            status = data.status || status;
            fullName = data.fullName || fullName;
          }
        } catch (docErr) {
          console.warn('[AuthService] Notice: Could not read Firestore profile:', docErr.message);
        }
      }

      const formatted = formatUser(user, {
        fullName,
        role,
        status,
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
            const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();

            let role = isSystemAdminEmail(cleanEmail) ? 'admin' : 'user';
            let status = isSystemAdminEmail(cleanEmail) ? 'active' : 'pending';
            let fullName = firebaseUser.displayName || '';

            if (db) {
              try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                  const data = userDoc.data();
                  role = isSystemAdminEmail(cleanEmail) ? 'admin' : (data.role || 'user');
                  status = data.status || status;
                  fullName = data.fullName || fullName;
                }
              } catch (docErr) {
                console.warn('[AuthService] Notice: Could not read Firestore profile in subscriber:', docErr.message);
              }
            }

            const formatted = formatUser(firebaseUser, {
              fullName,
              role,
              status,
              token,
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
            callback(formatted);
          } catch (err) {
            console.error('[AuthService] Failed to retrieve fresh ID token:', err);
            localStorage.removeItem(STORAGE_KEY);
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
