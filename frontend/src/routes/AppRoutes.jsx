import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Guard from auth module
import { ProtectedRoute } from '../auth/ProtectedRoute';

// Pages
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Vendors } from '../pages/Vendors';
import { VendorDetails } from '../pages/VendorDetails';
import { Collections } from '../pages/Collections';
import { CollectionDetails } from '../pages/CollectionDetails';
import { DataEditor } from '../pages/DataEditor';
import { ExcelImport } from '../pages/ExcelImport';
import { Settings } from '../pages/Settings';
import { NotFound } from '../pages/NotFound';

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* Authentication */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected Admin Platform Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:id" element={<VendorDetails />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id" element={<CollectionDetails />} />
        <Route path="/data-editor" element={<DataEditor />} />
        <Route path="/import" element={<ExcelImport />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 Route */}
      <Route element={<PublicLayout />}>
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
