/**
 * API Client Configuration
 * Location: frontend/src/config/api.js
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};
