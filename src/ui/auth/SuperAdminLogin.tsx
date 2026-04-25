import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import TailrdLogo from '../../components/TailrdLogo';
import { Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { toast } from '../../components/shared/Toast';

const SuperAdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated as super-admin
  useEffect(() => {
    if (state.isAuthenticated && state.user?.role === 'SUPER_ADMIN') {
      navigate('/admin', { replace: true });
    }
  }, [state.isAuthenticated, state.user, navigate]);

  // Show account locked message
  useEffect(() => {
    if (state.isLocked) {
      toast.error(
        'Account Locked',
        'Too many failed login attempts. Contact platform security.',
        { duration: 10000 }
      );
    }
  }, [state.isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      toast.warning('Missing Information', 'Please enter both email and password');
      return;
    }

    try {
      const success = await login(email, password);

      if (success) {
        // In demo mode, role is always super-admin; in prod, verify role from state after login
        // The login dispatches LOGIN_SUCCESS which updates state asynchronously.
        // We navigate to /admin and let the ProtectedRoute guard handle role checks.
        toast.success('Login Successful', 'Welcome to TAILRD Administration');
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      const message = err?.message || 'Login failed. Verify your super-admin credentials.';
      setError(message);
      toast.error('Login Failed', message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Carmona Red Gradient Branding */}
      <div
        className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12"
        style={{
          background: 'linear-gradient(135deg, #3A0A14 0%, #7A1A2E 50%, #5C1022 100%)',
        }}
      >
        {/* Subtle decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-[0.05]" />
          <div className="absolute bottom-12 right-12 w-72 h-72 rounded-full bg-white opacity-[0.05]" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/[0.03]" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="mb-8">
            <TailrdLogo size="large" variant="dark" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-4 tracking-tight">
            TAILRD Administration
          </h1>
          <p className="font-body text-lg text-red-200/80 leading-relaxed">
            Restricted Access — Authorized Personnel Only
          </p>
          <div className="mt-8 w-16 h-0.5 bg-white/40 mx-auto rounded-full" />
          <p className="mt-6 font-body text-sm text-red-200/50">
            Super Administrator Console
          </p>
        </div>
      </div>

      {/* Right Panel - White Form Area */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <TailrdLogo size="large" variant="light" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-chrome-card border border-titanium-200 p-8">
            {/* Shield Icon + Heading */}
            <div className="flex items-center gap-3 mb-1">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ background: 'rgba(122, 26, 46, 0.1)' }}
              >
                <Shield className="w-5 h-5" style={{ color: '#7A1A2E' }} />
              </div>
              <h2 className="font-display text-2xl font-bold text-titanium-900">
                Admin Sign In
              </h2>
            </div>
            <p className="font-body text-sm text-titanium-500 mb-8 ml-[52px]">
              Super administrator access only
            </p>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                <Shield className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800 font-body">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
                  Admin Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="superadmin@tailrd.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
                  style={{ '--tw-ring-color': '#7A1A2E' } as React.CSSProperties}
                  required
                  disabled={state.isLoading}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
                    style={{ '--tw-ring-color': '#7A1A2E' } as React.CSSProperties}
                    required
                    disabled={state.isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-titanium-400 hover:text-titanium-600 transition-colors"
                    disabled={state.isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {state.isLocked && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
                  <Lock className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium font-body">Account Locked</p>
                    <p className="text-sm text-red-700 mt-1 font-body">
                      Too many failed attempts. Contact platform security.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={state.isLoading || state.isLocked}
                className="w-full py-3 px-4 disabled:bg-titanium-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-chrome-card flex items-center justify-center font-body"
                style={{
                  backgroundColor: state.isLoading || state.isLocked ? undefined : '#7A1A2E',
                }}
                onMouseEnter={(e) => {
                  if (!state.isLoading && !state.isLocked) {
                    e.currentTarget.style.backgroundColor = '#5C1022';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!state.isLoading && !state.isLocked) {
                    e.currentTarget.style.backgroundColor = '#7A1A2E';
                  }
                }}
              >
                {state.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign In to Admin Console
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm font-body transition-colors bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: '#7A1A2E' }}
              >
                Back to main login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
