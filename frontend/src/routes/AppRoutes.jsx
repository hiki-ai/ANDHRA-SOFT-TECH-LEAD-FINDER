import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Layouts (eagerly loaded to avoid layout jumps)
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { UserDashboardLayout } from '../layouts/UserDashboardLayout';

// Route Guards
import { ProtectedRoute, UserProtectedRoute } from '../auth/ProtectedRoute';

// Robust helper for dynamic import resolution (supports both named and default exports)
const lazyPage = (importFn, name) =>
  lazy(() =>
    importFn().then((m) => ({
      default: (name && m[name]) || m.default || m,
    }))
  );

// 1. Public & Auth Pages (Code-split)
const Home = lazyPage(() => import('../pages/Home'), 'Home');
const Login = lazyPage(() => import('../pages/Login'), 'Login');
const Register = lazyPage(() => import('../pages/Register'), 'Register');
const PendingApproval = lazyPage(() => import('../pages/PendingApproval'), 'PendingApproval');
const NotFound = lazyPage(() => import('../pages/NotFound'), 'NotFound');

// 2. Existing Admin Platform Pages (Code-split)
const Dashboard = lazyPage(() => import('../pages/Dashboard'), 'Dashboard');
const Vendors = lazyPage(() => import('../pages/Vendors'), 'Vendors');
const VendorDetails = lazyPage(() => import('../pages/VendorDetails'), 'VendorDetails');
const Collections = lazyPage(() => import('../pages/Collections'), 'Collections');
const CollectionDetails = lazyPage(() => import('../pages/CollectionDetails'), 'CollectionDetails');
const DataEditor = lazyPage(() => import('../pages/DataEditor'), 'DataEditor');
const TableEditor = lazyPage(() => import('../pages/TableEditor'), 'TableEditor');
const ExcelImport = lazyPage(() => import('../pages/ExcelImport'), 'ExcelImport');
const Settings = lazyPage(() => import('../pages/Settings'), 'Settings');

// 3. New Admin Billing & Premium Management Pages (Code-split)
const AdminPlans = lazyPage(() => import('../pages/admin/AdminPlans'), 'AdminPlans');
const AdminPricingSettings = lazyPage(() => import('../pages/admin/AdminPricingSettings'), 'AdminPricingSettings');
const AdminTrialSettings = lazyPage(() => import('../pages/admin/AdminTrialSettings'), 'AdminTrialSettings');
const AdminSubscriptions = lazyPage(() => import('../pages/admin/AdminSubscriptions'), 'AdminSubscriptions');
const AdminPayments = lazyPage(() => import('../pages/admin/AdminPayments'), 'AdminPayments');
const AdminPaymentHistory = lazyPage(() => import('../pages/admin/AdminPaymentHistory'), 'AdminPaymentHistory');
const AdminBillingAnalytics = lazyPage(() => import('../pages/admin/AdminBillingAnalytics'), 'AdminBillingAnalytics');

// 4. New Dedicated Customer User Dashboard Pages (Code-split)
const UserOverview = lazyPage(() => import('../pages/user/UserOverview'), 'UserOverview');
const UserStartCollection = lazyPage(() => import('../pages/user/UserStartCollection'), 'UserStartCollection');
const UserCollections = lazyPage(() => import('../pages/user/UserCollections'), 'UserCollections');
const UserSubscription = lazyPage(() => import('../pages/user/UserSubscription'), 'UserSubscription');
const UserPricingCheckout = lazyPage(() => import('../pages/user/UserPricingCheckout'), 'UserPricingCheckout');
const UserPayments = lazyPage(() => import('../pages/user/UserPayments'), 'UserPayments');
const UserUsage = lazyPage(() => import('../pages/user/UserUsage'), 'UserUsage');
const UserProfile = lazyPage(() => import('../pages/user/UserProfile'), 'UserProfile');
const UserSettings = lazyPage(() => import('../pages/user/UserSettings'), 'UserSettings');
const UserSupport = lazyPage(() => import('../pages/user/UserSupport'), 'UserSupport');

// Clean, zero-overhead Suspense route loader
function RouteLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-8 animate-fadeIn">
      <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Loading view...</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
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
    </Suspense>
  );
}

export default AppRoutes;
