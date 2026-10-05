/**
 * Data Validation Helpers
 * Location: frontend/src/utils/validators.js
 */

export function isValidEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function isValidPhone(phone) {
  if (!phone) return false;
  // Allows digits, spaces, plus, hyphens, parentheses (min 7 digits)
  const digits = String(phone).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidPincode(pincode) {
  if (!pincode) return false;
  const re = /^[1-9][0-9]{5}$/;
  return re.test(String(pincode).trim());
}

export function isValidUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
