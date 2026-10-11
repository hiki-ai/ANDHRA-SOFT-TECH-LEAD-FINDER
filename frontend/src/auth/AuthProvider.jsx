/**
 * Authentication Context Provider
 * Location: frontend/src/auth/AuthProvider.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { authService } from './authService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state updates on mount
  useEffect(() => {
    // Initial check from storage
    const cached = authService.getCachedUser();
    if (cached) {
      setUser(cached);
    }

    const unsubscribe = authService.subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const loggedInUser = await authService.loginWithEmailPassword(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (registrationData) => {
    const registeredUser = await authService.registerUser(registrationData);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logoutUser();
    setUser(null);
  }, []);

  const contextValue = {
    user,
    isAuthenticated: Boolean(user),
    role: user?.role || 'guest',
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
