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
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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
   * Safely retrieve user profile document from Cloud Firestore.
   * Differentiates missing documents from network/offline errors, with bounded retries.
   */
  async fetchUserProfile(uid, { maxRetries = 2, delayMs = 1200 } = {}) {
    if (!db || !uid) return { profile: null, isMissing: false, isOffline: false };

    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          return { profile: userDoc.data(), isMissing: false, isOffline: false };
        } else {
          // Explicit missing document
          return { profile: null, isMissing: true, isOffline: false };
        }
      } catch (err) {
        attempts++;
        const isOffline =
          err.code === 'unavailable' ||
          (err.message && err.message.toLowerCase().includes('offline')) ||
          (err.message && err.message.toLowerCase().includes('network'));
        if (attempts > maxRetries) {
          return { profile: null, isMissing: false, isOffline, error: err };
        }
        await new Promise((r) => setTimeout(r, delayMs * attempts));
      }
    }
    return { profile: null, isMissing: false, isOffline: true };
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

      let hasAdminClaim = false;
      try {
        const tokenResult = await user.getIdTokenResult();
        hasAdminClaim = tokenResult?.claims?.admin === true || tokenResult?.claims?.role === 'admin';
      } catch {
        // ignore
      }

      // Check cached session first so we never downgrade a verified user on transient network failure
      const cached = this.getCachedUser();
      const isMatchCached = cached && cached.uid === user.uid;

      let role = (isSystemAdminEmail(cleanEmail) || hasAdminClaim) ? 'admin' : (isMatchCached ? cached.role : 'user');
      let status = (isSystemAdminEmail(cleanEmail) || hasAdminClaim) ? 'active' : (isMatchCached ? cached.status : 'pending');
      let fullName = user.displayName || (isMatchCached ? cached.fullName : '') || '';

      if (db) {
        try {
          const { profile, isMissing, isOffline, error } = await this.fetchUserProfile(user.uid, { maxRetries: 1 });
          if (profile) {
            const firestoreRole = (profile.role || '').toLowerCase().trim();
            const isAdminRole = firestoreRole === 'admin' || firestoreRole === 'administrator' || profile.isAdmin === true;
            role = (isSystemAdminEmail(cleanEmail) || hasAdminClaim || isAdminRole) ? 'admin' : 'user';
            status = profile.status || status;
            fullName = profile.fullName || fullName;
          } else if (isOffline) {
            console.warn('[AuthService] Notice: Could not read Firestore profile during login (offline/network). Retaining verified session.');
          } else if (isMissing) {
            console.info('[AuthService] Notice: No Firestore profile exists for UID:', user.uid);
          } else if (error) {
            console.warn('[AuthService] Profile fetch notice:', error.message);
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
   * Listen to Firebase Auth state changes with real-time Firestore profile synchronization
   */
  subscribeToAuthChanges(callback) {
    if (isFirebaseConfigured && auth) {
      let profileUnsubscribe = null;

      const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        // Clean up any existing profile listener on auth state transition
        if (typeof profileUnsubscribe === 'function') {
          try {
            profileUnsubscribe();
          } catch {
            // ignore
          }
          profileUnsubscribe = null;
        }

        if (firebaseUser) {
          try {
            const token = await firebaseUser.getIdToken();
            let hasAdminClaim = false;
            try {
              const tokenResult = await firebaseUser.getIdTokenResult();
              hasAdminClaim = tokenResult?.claims?.admin === true || tokenResult?.claims?.role === 'admin';
            } catch {
              // ignore
            }

            const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
            const cached = this.getCachedUser();
            const isMatchCached = cached && cached.uid === firebaseUser.uid;

            let role = (isSystemAdminEmail(cleanEmail) || hasAdminClaim) ? 'admin' : (isMatchCached ? cached.role : 'user');
            let status = (isSystemAdminEmail(cleanEmail) || hasAdminClaim) ? 'active' : (isMatchCached ? cached.status : 'pending');
            let fullName = firebaseUser.displayName || (isMatchCached ? cached.fullName : '') || '';

            // Emit initial user session immediately from cached/system state so UI is responsive
            const initialFormatted = formatUser(firebaseUser, {
              fullName,
              role,
              status,
              token,
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialFormatted));
            callback(initialFormatted);

            // If Firestore is available, attach real-time onSnapshot listener for live profile updates
            if (db) {
              try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                profileUnsubscribe = onSnapshot(
                  userDocRef,
                  { includeMetadataChanges: false },
                  (snapshot) => {
                    if (snapshot.exists()) {
                      const data = snapshot.data() || {};
                      const firestoreRole = (data.role || '').toLowerCase().trim();
                      const isAdminRole = firestoreRole === 'admin' || firestoreRole === 'administrator' || data.isAdmin === true;
                      role = (isSystemAdminEmail(cleanEmail) || hasAdminClaim || isAdminRole) ? 'admin' : 'user';
                      status = data.status || status;
                      fullName = data.fullName || fullName;

                      const updated = formatUser(firebaseUser, {
                        fullName,
                        role,
                        status,
                        token,
                      });
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                      callback(updated);
                    } else {
                      console.info('[AuthService] Profile document does not exist in Firestore for UID:', firebaseUser.uid);
                    }
                  },
                  (snapErr) => {
                    console.warn('[AuthService] Notice: Could not read Firestore profile in subscriber:', snapErr.message);
                    // NEVER treat a failed network request / offline error as an empty profile!
                    // Retain verified cached state:
                    if (isMatchCached && cached.role) {
                      const fallback = formatUser(firebaseUser, {
                        fullName: cached.fullName || fullName,
                        role: cached.role,
                        status: cached.status || status,
                        token,
                      });
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
                      callback(fallback);
                    }
                  }
                );
              } catch (listenErr) {
                console.warn('[AuthService] Notice: Failed to attach realtime profile listener:', listenErr.message);
              }
            }
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

      return () => {
        if (typeof profileUnsubscribe === 'function') {
          try {
            profileUnsubscribe();
          } catch {
            // ignore
          }
        }
        if (typeof authUnsubscribe === 'function') {
          try {
            authUnsubscribe();
          } catch {
            // ignore
          }
        }
      };
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
