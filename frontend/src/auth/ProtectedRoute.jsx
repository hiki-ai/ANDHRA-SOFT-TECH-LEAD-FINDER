/**
 * Protected Route Guard
 * Location: frontend/src/auth/ProtectedRoute.jsx
 * 
 * Ensures only authenticated administrators can access protected dashboard routes.
 */

import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { Loader } from '../components/common/Loader';

export function ProtectedRoute({ children }) {
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

  return children;
}

export default ProtectedRoute;
