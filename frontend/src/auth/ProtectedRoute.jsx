/**
 * Protected Route Guards
 * Location: frontend/src/auth/ProtectedRoute.jsx
 * 
 * Enforces server-aligned client side route guards:
 * - ProtectedRoute: strictly restricted to verified administrators.
 * - UserProtectedRoute: accessible to all authenticated customers.
 */

import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { Loader } from '../components/common/Loader';

export function ProtectedRoute({ children, requiredRole = 'admin' }) {
  const context = useContext(AuthContext);
  const location = useLocation();

  if (!context || context.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader size="lg" text="Verifying administrative session authorization..." />
      </div>
    );
  }

  if (!context.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Prevent restricted/ordinary users from accessing administrator dashboard
  if (requiredRole === 'admin' && context.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return children;
}

export function UserProtectedRoute({ children }) {
  const context = useContext(AuthContext);
  const location = useLocation();

  if (!context || context.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Loader size="lg" text="Loading customer workspace..." />
      </div>
    );
  }

  if (!context.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
