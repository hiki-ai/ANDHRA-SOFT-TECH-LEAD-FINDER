/**
 * Axios HTTP Client with Firebase Auth Bearer Token Interceptor & URL Normalizer
 * Location: frontend/src/services/apiClient.js
 */

import axios from 'axios';
import { API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';

export const apiClient = axios.create(API_CONFIG);

// Request interceptor: normalize paths and attach fresh Firebase JWT Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Sanitize request URL to prevent double prefixes like /api/v1/api/v1
    if (config.url) {
      const baseHasV1 = (config.baseURL || '').endsWith('/api/v1');
      if (baseHasV1 && config.url.startsWith('/api/v1/')) {
        config.url = config.url.replace(/^\/api\/v1/, '');
      } else if (baseHasV1 && config.url === '/api/v1') {
        config.url = '/';
      }
    }

    // 2. Wait for Firebase Auth state to be ready if available
    try {
      if (auth && typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
    } catch {
      // Continue if authStateReady is not supported or errors
    }

    // 3. Attach freshest Firebase Auth ID token
    try {
      let token = null;

      // Prefer live token from current authenticated user
      if (auth && auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
          // Keep localStorage cached session in sync with fresh token
          const stored = localStorage.getItem('ast_lead_finder_user');
          if (stored) {
            try {
              const userObj = JSON.parse(stored);
              userObj.token = token;
              localStorage.setItem('ast_lead_finder_user', JSON.stringify(userObj));
            } catch {
              // ignore parse errors
            }
          }
        } catch (tokenErr) {
          console.warn('[ApiClient] Failed to retrieve fresh token from currentUser:', tokenErr);
        }
      }

      // Fallback to cached token in localStorage if currentUser is not yet available
      if (!token) {
        const stored = localStorage.getItem('ast_lead_finder_user');
        if (stored) {
          const user = JSON.parse(stored);
          token = user?.token;
        }
      }

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Continue without token
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting and transparent 401 token refresh retry
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Auto-retry once on 401 if user is logged into Firebase
    if (status === 401 && originalRequest && !originalRequest._retry && auth && auth.currentUser) {
      originalRequest._retry = true;
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;

          const stored = localStorage.getItem('ast_lead_finder_user');
          if (stored) {
            try {
              const userObj = JSON.parse(stored);
              userObj.token = freshToken;
              localStorage.setItem('ast_lead_finder_user', JSON.stringify(userObj));
            } catch {
              // ignore
            }
          }

          return apiClient(originalRequest);
        }
      } catch (retryErr) {
        console.warn('[ApiClient] 401 token refresh retry failed:', retryErr);
      }
    }

    // Extract structured error from backend API JSON response if available
    const serverError = error.response?.data?.error;
    const serverMessage = typeof serverError === 'object' ? serverError.message : serverError;

    let friendlyMessage = serverMessage || error.response?.data?.message || error.message || 'Network request failed';

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      friendlyMessage = `Unable to connect to backend at ${API_CONFIG.baseURL}. Please verify the Render backend service is running and CORS is allowed.`;
    }

    const errorResponse = {
      status: status || 0,
      code: serverError?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      message: friendlyMessage,
    };

    return Promise.reject(errorResponse);
  }
);

export default apiClient;
