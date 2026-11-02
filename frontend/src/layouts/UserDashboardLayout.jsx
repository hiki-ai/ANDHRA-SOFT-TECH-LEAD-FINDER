/**
 * Customer User Dashboard Layout
 * Location: frontend/src/layouts/UserDashboardLayout.jsx
 * 
 * Dedicated customer workspace layout separate from Admin Dashboard.
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  Layers,
  CreditCard,
  Sparkles,
  Receipt,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  DatabaseZap,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/helpers';

const userNavigationItems = [
  { name: 'Overview', to: '/app', end: true, icon: LayoutDashboard },
  { name: 'Start Collection', to: '/app/start-collection', icon: PlayCircle },
  { name: 'My Collections', to: '/app/collections', icon: Layers },
  { name: 'My Subscription', to: '/app/subscription', icon: CreditCard },
  { name: 'Pricing Plans', to: '/app/pricing', icon: Sparkles },
  { name: 'Payment History', to: '/app/payments', icon: Receipt },
  { name: 'Usage Statistics', to: '/app/usage', icon: BarChart3 },
  { name: 'Profile', to: '/app/profile', icon: User },
  { name: 'Settings', to: '/app/settings', icon: Settings },
  { name: 'Support', to: '/app/support', icon: HelpCircle },
];

export function UserDashboardLayout() {
  const { user, logout, role } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been signed out.');
      navigate('/login');
    } catch {
      toast.error('Failed to log out.');
    }
  };

  return (
    <div className="flex h-screen bg-surface-50 text-surface-900 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Customer Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 shadow-xs',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-surface-100">
            <Link to="/app" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                <DatabaseZap className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs tracking-tight text-surface-900 uppercase">
                  AST Extractor
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase">
                  Customer Workspace
                </span>
              </div>
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-surface-400 uppercase tracking-wider">
              Customer Portal
            </div>
            {userNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-brand-50 text-brand-700 shadow-xs'
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                    )
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-surface-100 bg-surface-50/50">
          {/* Admin Switcher if logged in user is admin */}
          {role === 'admin' && (
            <Link
              to="/dashboard"
              className="mb-2 flex items-center justify-between p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Switch to Admin Platform</span>
              </div>
              <span className="text-[10px]">→</span>
            </Link>
          )}

          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-surface-200/70 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-surface-900 truncate">
                {user?.displayName || 'Valued Customer'}
              </span>
              <span className="text-[10px] text-surface-500 truncate">
                {user?.email || 'user@example.com'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-surface-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-surface-200/90 px-4 sm:px-6 flex items-center justify-between z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-surface-900 hidden sm:block">
              Customer Workspace
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/app/pricing">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xs hover:from-brand-700 hover:to-indigo-700 transition-all cursor-pointer">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Plan</span>
              </button>
            </Link>
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserDashboardLayout;

