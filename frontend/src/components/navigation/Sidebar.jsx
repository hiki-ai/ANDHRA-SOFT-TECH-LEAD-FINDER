import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  TableProperties,
  Table,
  Upload,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  DatabaseZap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../utils/helpers';

const navigationItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Vendors', to: '/vendors', icon: Users, badge: '500k+' },
  { name: 'Collections', to: '/collections', icon: Layers },
  { name: 'Table Editor', to: '/table-editor', icon: TableProperties },
  { name: 'Data Editor', to: '/data-editor', icon: Table },
  { name: 'Import Excel', to: '/import', icon: Upload },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been logged out.');
      navigate('/login');
    } catch {
      toast.error('Failed to log out.');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Top: Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-5 border-b border-surface-100">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm group-hover:bg-brand-700 transition-colors">
                <DatabaseZap className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-surface-900 uppercase">
                  Andhra Soft Tech
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-brand-600 uppercase">
                  Lead Finder
                </span>
              </div>
            </NavLink>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
              Platform
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-colors" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-surface-100 text-surface-600 group-hover:bg-brand-100 group-hover:text-brand-700">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Admin Profile & Logout */}
        <div className="p-3 border-t border-surface-100 bg-surface-50/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-surface-200/70 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-surface-900 truncate">
                {user?.displayName || 'Administrator'}
              </span>
              <span className="text-[10px] text-surface-500 truncate">
                {user?.email || 'admin@andhrasofttech.com'}
              </span>
            </div>
            <div className="shrink-0" title="Protected Admin Role">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-surface-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
