import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { UserDashboardLayout } from '../layouts/UserDashboardLayout';

// Route Guards
import { ProtectedRoute, UserProtectedRoute } from '../auth/ProtectedRoute';

// Public & Auth Pages
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { PendingApproval } from '../pages/PendingApproval';
import { NotFound } from '../pages/NotFound';

// Existing Admin Platform Pages
import { Dashboard } from '../pages/Dashboard';
import { Vendors } from '../pages/Vendors';
import { VendorDetails } from '../pages/VendorDetails';
import { Collections } from '../pages/Collections';
import { CollectionDetails } from '../pages/CollectionDetails';
import { DataEditor } from '../pages/DataEditor';
import { TableEditor } from '../pages/TableEditor';
import { ExcelImport } from '../pages/ExcelImport';
import { Settings } from '../pages/Settings';

// New Admin Billing & Premium Management Pages (PART 9)
import { AdminPlans } from '../pages/admin/AdminPlans';
import { AdminPricingSettings } from '../pages/admin/AdminPricingSettings';
import { AdminTrialSettings } from '../pages/admin/AdminTrialSettings';
import { AdminSubscriptions } from '../pages/admin/AdminSubscriptions';
import { AdminPayments } from '../pages/admin/AdminPayments';
import { AdminPaymentHistory } from '../pages/admin/AdminPaymentHistory';
import { AdminBillingAnalytics } from '../pages/admin/AdminBillingAnalytics';

// New Dedicated Customer User Dashboard Pages (PART 7)
import { UserOverview } from '../pages/user/UserOverview';
import { UserStartCollection } from '../pages/user/UserStartCollection';
import { UserCollections } from '../pages/user/UserCollections';
import { UserSubscription } from '../pages/user/UserSubscription';
import { UserPricingCheckout } from '../pages/user/UserPricingCheckout';
import { UserPayments } from '../pages/user/UserPayments';
import { UserUsage } from '../pages/user/UserUsage';
import { UserProfile } from '../pages/user/UserProfile';
import { UserSettings } from '../pages/user/UserSettings';
import { UserSupport } from '../pages/user/UserSupport';

export function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Landing & Pricing Page (PART 2) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* 2. Authentication */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
      </Route>

      {/* 3. Existing Admin Platform & New Premium & Billing Routes (PART 9) */}
      <Route
        element={
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Preserved Admin Platform Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/:id" element={<VendorDetails />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collections/:id" element={<CollectionDetails />} />
        <Route path="/table-editor" element={<TableEditor />} />
        <Route path="/data-editor" element={<DataEditor />} />
        <Route path="/import" element={<ExcelImport />} />
        <Route path="/settings" element={<Settings />} />

        {/* New Premium & Billing Section in Existing Admin Dashboard */}
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/pricing-settings" element={<AdminPricingSettings />} />
        <Route path="/admin/trial-settings" element={<AdminTrialSettings />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/payment-history" element={<AdminPaymentHistory />} />
        <Route path="/admin/billing-analytics" element={<AdminBillingAnalytics />} />
      </Route>

      {/* 4. Dedicated Customer User Dashboard (PART 7) */}
      <Route
        element={
          <UserProtectedRoute>
            <UserDashboardLayout />
          </UserProtectedRoute>
        }
      >
        <Route path="/app" element={<UserOverview />} />
        <Route path="/app/start-collection" element={<UserStartCollection />} />
        <Route path="/app/collections" element={<UserCollections />} />
        <Route path="/app/subscription" element={<UserSubscription />} />
        <Route path="/app/pricing" element={<UserPricingCheckout />} />
        <Route path="/app/payments" element={<UserPayments />} />
        <Route path="/app/usage" element={<UserUsage />} />
        <Route path="/app/profile" element={<UserProfile />} />
        <Route path="/app/settings" element={<UserSettings />} />
        <Route path="/app/support" element={<UserSupport />} />
      </Route>

      {/* 5. 404 Route */}
      <Route element={<PublicLayout />}>
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
