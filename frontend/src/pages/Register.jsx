import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  UserPlus,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { validateRegistration, validatePassword } from '@/auth/authUtils';

export function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { register, isAuthenticated, role, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // If already authenticated, redirect appropriately
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (role === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending-approval', { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Real-time re-validation for touched fields
      if (touched[name]) {
        const valRes = validateRegistration(next);
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          [name]: valRes.errors[name] || '',
        }));
      }
      return next;
    });
    if (submitError) setSubmitError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const valRes = validateRegistration(formData);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: valRes.errors[name] || '',
    }));
  };

  const pwdDetails = validatePassword(formData.password).details;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    // Mark all fields as touched
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    const valResult = validateRegistration(formData);
    if (!valResult.isValid) {
      setFieldErrors(valResult.errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const newUser = await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      toast.success('Registration successful! Welcome to Andhra Soft Tech.');

      if (newUser.role === 'admin') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending-approval', { replace: true });
      }
    } catch (err) {
      setSubmitError(err.message || 'Registration failed. Please check your information.');
      toast.error('Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-surface-900 tracking-tight">
          Create Lead Finder Account
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Register for access to business lead intelligence and vendor repository.
        </p>
      </div>

      {submitError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <Input
          label="Full Name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="e.g., Rajesh Kumar"
          iconLeft={User}
          value={formData.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.fullName ? fieldErrors.fullName : ''}
          disabled={isLoading}
        />

        {/* Email Address */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@company.com"
          iconLeft={Mail}
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email ? fieldErrors.email : ''}
          disabled={isLoading}
        />

        {/* Password */}
        <div>
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
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
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.password ? fieldErrors.password : ''}
            disabled={isLoading}
          />

          {/* Password Requirements Checklist */}
          {formData.password && (
            <div className="mt-2 p-2.5 bg-surface-50 border border-surface-200 rounded-xl space-y-1 text-[11px] text-surface-600">
              <p className="font-semibold text-surface-700 mb-1">Password Requirements:</p>
              <div className="flex items-center gap-1.5">
                {pwdDetails.minLength ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                )}
                <span className={pwdDetails.minLength ? 'text-emerald-700' : 'text-surface-500'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {pwdDetails.hasLetter && pwdDetails.hasNumber ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                )}
                <span className={pwdDetails.hasLetter && pwdDetails.hasNumber ? 'text-emerald-700' : 'text-surface-500'}>
                  Contains both letters and numbers
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          placeholder="Re-enter your password"
          iconLeft={Lock}
          actionRight={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="text-surface-400 hover:text-surface-600 p-1 focus:outline-none transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : ''}
          disabled={isLoading}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isLoading}
          iconRight={UserPlus}
          className="mt-2"
        >
          {isLoading ? 'Creating Account...' : 'Register Account'}
        </Button>
      </form>

      {/* Link to Login */}
      <div className="mt-5 text-center text-xs text-surface-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          Sign in here
        </Link>
      </div>

      {/* Security & Access Notice */}
      <div className="mt-6 pt-4 border-t border-surface-100 bg-surface-50 -mx-6 -mb-8 sm:-mx-10 sm:-mb-8 p-4 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-1.5 text-[11px] text-surface-600">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Default Role: Restricted User</span>
          </div>
          <span className="text-[10px] text-surface-400 font-mono">
            Admin Approval Required
          </span>
        </div>
      </div>
    </div>
  );
}

export default Register;
