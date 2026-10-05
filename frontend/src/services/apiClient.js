/**
 * Axios HTTP Client with Auth Bearer Token Interceptor
 * Location: frontend/src/services/apiClient.js
 */

import axios from 'axios';
import { API_CONFIG } from '../config/api';

export const apiClient = axios.create(API_CONFIG);

// Request interceptor to attach Firebase JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('ast_lead_finder_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch {
      // Continue without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed',
    };
    return Promise.reject(errorResponse);
  }
);

export default apiClient;
