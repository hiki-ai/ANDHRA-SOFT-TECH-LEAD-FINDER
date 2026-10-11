/**
 * Authentication Utility Helpers
 * Location: frontend/src/auth/authUtils.js
 */

export const SYSTEM_ADMIN_EMAIL = 'admin@andhrasofttech.com';

export function isSystemAdminEmail(email) {
  return (email || '').trim().toLowerCase() === SYSTEM_ADMIN_EMAIL;
}

export function formatUser(user, extra = {}) {
  if (!user) return null;
  const email = (user.email || extra.email || '').trim().toLowerCase();
  const uid = user.uid || extra.uid || null;
  const token = extra.token || user.token || null;
  // Fallback role is 'user' for safety; only verified admin email or explicit admin claim gets 'admin'
  const isDefaultAdmin = isSystemAdminEmail(email);
  const role = extra.role || user.role || (isDefaultAdmin ? 'admin' : 'user');
  const status = extra.status || user.status || (isDefaultAdmin ? 'active' : 'pending');
  const fullName = extra.fullName || user.displayName || extra.displayName || (email ? email.split('@')[0] : 'User');

  return {
    uid,
    email,
    displayName: fullName,
    fullName,
    photoURL: user.photoURL || extra.photoURL || null,
    role,
    status,
    emailVerified: user.emailVerified ?? true,
    token,
  };
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required.',
      details: { minLength: false, hasLetter: false, hasNumber: false }
    };
  }
  const minLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isValid = minLength && hasLetter && hasNumber;
  let message = '';
  if (!minLength) {
    message = 'Password must be at least 8 characters long.';
  } else if (!hasLetter || !hasNumber) {
    message = 'Password must contain both letters and numbers.';
  }

  return {
    isValid,
    message,
    details: { minLength, hasLetter, hasNumber }
  };
}

export function validateRegistration({ fullName, email, password, confirmPassword }) {
  const errors = {};

  const cleanName = (fullName || '').trim();
  if (!cleanName) {
    errors.fullName = 'Please provide your full name.';
  } else if (cleanName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  const cleanEmail = (email || '').trim();
  if (!cleanEmail) {
    errors.email = 'Please provide your email address.';
  } else if (!validateEmail(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  const pwdValidation = validatePassword(password);
  if (!password) {
    errors.password = 'Please provide a password.';
  } else if (!pwdValidation.isValid) {
    errors.password = pwdValidation.message;
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function getAuthErrorMessage(error) {
  if (!error) return 'An unknown authentication error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in or use a different email.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 8 characters with letters and numbers.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in provider is disabled in the Firebase Console. Please enable Email/Password under Authentication > Sign-in method.';
    case 'auth/unauthorized-domain':
      return "The current domain (andhra-soft-tech-lead-finder.vercel.app) is not authorized in Firebase. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.";
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to multiple failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been deactivated by an administrator.';
    case 'auth/invalid-email':
      return 'The email address is improperly formatted. Please enter a valid email address.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase API key is invalid or restricted. Please verify your configuration.';
    default:
      return error.message || 'Authentication operation failed. Please try again.';
  }
}
