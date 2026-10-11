import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Mail,
  Home,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { auth, db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function PendingApproval() {
  const { user, logout, role } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    try {
      if (auth && auth.currentUser) {
        // Force refresh ID token
        await auth.currentUser.getIdToken(true);

        if (db) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'admin') {
              toast.success('Congratulations! Your account has been approved as Administrator.');
              window.location.href = '/dashboard';
              return;
            }
          }
        }
      }
      toast.info('Your account is still awaiting administrator review.');
    } catch (err) {
      toast.error('Failed to refresh status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Signed out successfully.');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-surface-900 tracking-tight">
          Account Pending Approval
        </h2>
        <p className="mt-1 text-xs text-surface-500 max-w-sm mx-auto">
          Welcome to Andhra Soft Tech. Your account has been registered with restricted permissions.
        </p>
      </div>

      <div className="space-y-4">
        {/* Account Details Box */}
        <div className="p-4 bg-surface-50 border border-surface-200 rounded-2xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-200">
            <span className="text-surface-500 font-medium">Full Name</span>
            <span className="font-semibold text-surface-900">{user?.fullName || user?.displayName || 'User'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-surface-200">
            <span className="text-surface-500 font-medium">Email Address</span>
            <span className="font-semibold text-surface-900 font-mono text-[11px]">{user?.email || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-surface-200">
            <span className="text-surface-500 font-medium">Assigned Role</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-200 text-surface-700">
              Restricted User ({role || 'user'})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-surface-500 font-medium">Access Status</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
              Pending Admin Review
            </span>
          </div>
        </div>

        {/* Administrator Approval Policy Notice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800">
          <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-blue-900">Why is access restricted?</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              To protect proprietary vendor intelligence, automated scrapers, and data pipelines, public registrations require manual approval by the system administrator before dashboard access is granted.
            </p>
          </div>
        </div>

        {/* Action instructions */}
        <div className="text-center pt-1">
          <p className="text-xs text-surface-500">
            Contact administrator for elevation:{' '}
            <a
              href="mailto:admin@andhrasofttech.com"
              className="font-semibold text-brand-600 hover:text-brand-800 transition-colors inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3" />
              admin@andhrasofttech.com
            </a>
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            fullWidth
            iconLeft={RefreshCw}
            isLoading={isChecking}
            onClick={handleRefreshStatus}
          >
            {isChecking ? 'Checking Permissions...' : 'Refresh Approval Status'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/" className="w-full">
              <Button type="button" variant="ghost" size="md" fullWidth iconLeft={Home}>
                Home
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              iconLeft={LogOut}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;
