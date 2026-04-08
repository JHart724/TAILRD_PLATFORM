import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from '../components/shared/Toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // TODO: Wire to token persistence strategy

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [state.isAuthenticated, navigate]);

  // Show account locked message
  useEffect(() => {
    if (state.isLocked) {
      toast.error(
        'Account Locked',
        'Too many failed login attempts. Contact IT Support at ext. 4357.',
        { duration: 10000 }
      );
    }
  }, [state.isLocked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.warning('Missing Information', 'Please enter both email and password');
      return;
    }

    try {
      const success = await login(email, password);

      if (success) {
        toast.success('Login Successful', `Welcome back!`);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      toast.error('Login Failed', message);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #F0F4F8 0%, #F8FAFB 35%, #F0F3F6 65%, #EEF1F5 100%)',
      }}
    >
      {/* Subtle background radial accents — matching website */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 10% 20%, rgba(44, 74, 96, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 80%, rgba(44, 74, 96, 0.04) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg px-6">
        {/* Brand header — matching website typography */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight mb-3" style={{ letterSpacing: '-1.5px' }}>
            <span style={{ color: '#1A2F4A' }}>TAILRD</span>
            <span className="mx-3 text-3xl font-light" style={{ color: '#CBD5E1' }}>|</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #5C1A1A 0%, #7A1A2E 50%, #B85858 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HEART
            </span>
          </h1>
          <p className="text-sm text-gray-400 tracking-widest uppercase" style={{ letterSpacing: '2px' }}>
            Cardiovascular Intelligence Platform
          </p>
        </div>

        {/* Glassmorphic login card */}
        <div
          className="rounded-2xl p-8 sm:p-10"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 8px 32px rgba(26, 47, 74, 0.08), 0 2px 8px rgba(26, 47, 74, 0.04)',
          }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
          <p className="text-sm text-gray-500 mb-7">Access your cardiovascular analytics dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-white/80 text-gray-900 placeholder-gray-400 transition-all"
                style={{ outlineColor: '#1A2F4A' }}
                required
                disabled={state.isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-white/80 text-gray-900 placeholder-gray-400 transition-all"
                  required
                  disabled={state.isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={state.isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                  style={{ accentColor: '#1A2F4A' }}
                  disabled={state.isLoading}
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => toast.info('Password Reset', 'Contact your administrator to reset your password.')}
                className="text-sm font-medium hover:opacity-80 transition-opacity bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: '#1A2F4A' }}
              >
                Forgot password?
              </button>
            </div>

            {state.isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start">
                <Lock className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Account Locked</p>
                  <p className="text-sm text-red-700 mt-1">
                    Too many failed attempts. Contact your administrator.
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={state.isLoading || state.isLocked}
              className="w-full py-3.5 px-4 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #1A2F4A 0%, #2C4A60 100%)',
                boxShadow: '0 4px 14px rgba(26, 47, 74, 0.3)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(26, 47, 74, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.transform = 'translateY(0)';
                (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(26, 47, 74, 0.3)';
              }}
            >
              {state.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* SSO Login */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => { window.location.href = '/api/sso/login'; }}
              type="button"
              className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Sign in with your health system SSO
            </button>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Secure access for authorized cardiovascular care teams
        </p>
      </div>
    </div>
  );
};

export default Login;
