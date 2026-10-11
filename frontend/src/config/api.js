/**
 * API Client Configuration & Normalized Base URL
 * Location: frontend/src/config/api.js
 *
 * Normalizes VITE_API_URL to ensure canonical /api/v1 prefix,
 * preventing duplicate slashes or missing prefix issues across Vercel and local dev.
 */

export function normalizeApiUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return '/api/v1';
  }

  // Strip trailing slashes
  let clean = trimmed.replace(/\/+$/, '');

  // If URL already ends with /api/v1, preserve it
  if (clean.endsWith('/api/v1')) {
    return clean;
  }

  // If URL contains /api/v1 with trailing subpath, leave as is
  if (clean.includes('/api/v1/')) {
    return clean;
  }

  // Otherwise, append /api/v1
  return `${clean}/api/v1`;
}

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default API_CONFIG;
