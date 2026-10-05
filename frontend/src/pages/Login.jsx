import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide your admin email address.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Authentication successful. Welcome to Lead Finder.');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
      toast.error('Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@andhrasofttech.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 tracking-tight">
          Admin Portal Login
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Enter your authorized credentials to access the lead management system.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@andhrasofttech.com"
          iconLeft={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-surface-700 tracking-wide uppercase">
              Password
            </label>
            <button
              type="button"
              onClick={() => toast.info('Contact system administrator to reset password.')}
              className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
            >
              Forgot password?
            </button>
          </div>
          <Input
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            iconLeft={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          iconRight={LogIn}
          className="mt-2"
        >
          {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
        </Button>
      </form>

      {/* Developer Demo Account Notice */}
      <div className="mt-6 pt-4 border-t border-surface-100 bg-surface-50 -mx-6 -mb-8 sm:-mx-10 sm:-mb-8 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
            <Info className="w-3.5 h-3.5 text-brand-600" />
            <span>Dev Admin Preset:</span>
          </div>
          <button
            type="button"
            onClick={fillDemoAdmin}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 underline cursor-pointer"
          >
            Auto-fill Credentials
          </button>
        </div>
        <div className="mt-1 font-mono text-[10px] text-surface-400">
          admin@andhrasofttech.com / admin123
        </div>
      </div>
    </div>
  );
}
