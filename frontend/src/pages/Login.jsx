import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, Info, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, role, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  // Automatically redirect authenticated users according to their assigned role
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (role === 'admin') {
        navigate(from, { replace: true });
      } else {
        navigate('/pending-approval', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, role, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }

    setIsLoading(true);
    try {
      const loggedIn = await login(email.trim(), password);
      if (loggedIn.role === 'admin') {
        toast.success('Authentication successful. Welcome to Lead Finder.');
        navigate(from, { replace: true });
      } else {
        toast.info('Signed in. Account is pending administrator review.');
        navigate('/pending-approval', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
      toast.error('Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 tracking-tight">
          Admin & User Portal Login
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Enter your authorized credentials to access the lead management system.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
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
          placeholder="name@company.com"
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
              onClick={() => toast.info('Contact system administrator at admin@andhrasofttech.com to reset password.')}
              className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
            >
              Forgot password?
            </button>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            iconLeft={Lock}
            actionRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-surface-400 hover:text-surface-600 p-1 focus:outline-none transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
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
          {isLoading ? 'Authenticating...' : 'Sign In to Portal'}
        </Button>
      </form>

      {/* Link to Registration */}
      <div className="mt-5 text-center text-xs text-surface-500">
        Don't have an account yet?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          Create account here
        </Link>
      </div>

      {/* Security & Access Notice */}
      <div className="mt-6 pt-4 border-t border-surface-100 bg-surface-50 -mx-6 -mb-8 sm:-mx-10 sm:-mb-8 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-600">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Authorized Enterprise Access</span>
          </div>
          <span className="text-[10px] text-surface-400 font-mono">
            Firebase Auth Protected
          </span>
        </div>
      </div>
    </div>
  );
}
