import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from '../../auth/AuthProvider';
import { ToastProvider } from '../../context/ToastContext';

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default AppProviders;
