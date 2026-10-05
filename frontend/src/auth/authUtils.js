/**
 * Authentication Utility Helpers
 * Location: frontend/src/auth/authUtils.js
 */

export function formatUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Admin User'),
    photoURL: user.photoURL || null,
    role: user.role || 'admin',
    emailVerified: user.emailVerified ?? true,
    token: user.token || null,
  };
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function getAuthErrorMessage(error) {
  if (!error) return 'An unknown authentication error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to multiple failed login attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This administrative account has been deactivated.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}
