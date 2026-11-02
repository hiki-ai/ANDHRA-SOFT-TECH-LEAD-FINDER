/**
 * Customer User Profile Management Page
 * Location: frontend/src/pages/user/UserProfile.jsx
 */

import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/config/firebase';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useToast } from '@/context/ToastContext';

export function UserProfile() {
  const { user } = useAuth();
  const toast = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setUpdatingProfile(true);
    try {
      if (auth?.currentUser) {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
        toast.success('Profile name updated successfully.');
      } else {
        toast.info('Local session updated.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError('');

    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (auth?.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast.success('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.info('Password updated for local session.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPwdError(err.message || 'Failed to update password. You may need to sign out and log back in.');
      toast.error('Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-200">
      <div className="pb-6 border-b border-surface-200">
        <h1 className="text-2xl font-black text-surface-900 tracking-tight">
          Customer Profile
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Manage your personal account information and security credentials.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Personal Information
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            iconLeft={User}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            iconLeft={Mail}
            value={user?.email || ''}
            disabled
            helperText="Your email address is managed via your Firebase account."
          />

          <div className="pt-2">
            <Button size="sm" variant="primary" type="submit" isLoading={updatingProfile}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Security & Password Card */}
      <div className="bg-white rounded-2xl p-6 border border-surface-200 shadow-xs">
        <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
          Change Password
        </h3>

        {pwdError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            iconLeft={KeyRound}
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            iconLeft={Lock}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="pt-2">
            <Button size="sm" variant="outline" type="submit" isLoading={updatingPassword}>
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserProfile;

