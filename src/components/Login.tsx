import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import TailrdLogo from './TailrdLogo';
import { Eye, EyeOff, Shield, Lock, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from '../components/shared/Toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  // Redirect if already authenticated
  useEffect(() => {
    if (state.isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [state.isAuthenticated, navigate, location]);

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

    const success = await login(email, password);
    
    if (success) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      toast.success('Login Successful', `Welcome back!`);
      navigate(from, { replace: true });
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-steel-100 to-steel-200 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-retina-4 p-8 w-full max-w-md border border-white/20">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <TailrdLogo size="large" variant="light" />
        </div>

        {/* Demo Credentials Banner */}
        {showDemoCredentials && (
          <div className="mb-6 bg-gradient-to-r from-medical-blue-50 to-medical-blue-100 border border-medical-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex">
                <Shield className="w-5 h-5 text-medical-blue-600 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-semibold text-medical-blue-900 mb-2">Demo Accounts</h3>
                  <div className="space-y-1 text-xs text-medical-blue-700">
                    <button 
                      onClick={() => handleDemoLogin('executive@hospital.com')}
                      className="block w-full text-left hover:text-medical-blue-900 hover:underline"
                    >
                      • Executive: executive@hospital.com
                    </button>
                    <button 
                      onClick={() => handleDemoLogin('serviceline@hospital.com')}
                      className="block w-full text-left hover:text-medical-blue-900 hover:underline"
                    >
                      • Service Line: serviceline@hospital.com
                    </button>
                    <button 
                      onClick={() => handleDemoLogin('careteam@hospital.com')}
                      className="block w-full text-left hover:text-medical-blue-900 hover:underline"
                    >
                      • Care Team: careteam@hospital.com
                    </button>
                  </div>
                  <p className="text-xs text-medical-blue-600 mt-2">Password: demo123</p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoCredentials(false)}
                className="text-medical-blue-400 hover:text-medical-blue-600 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-steel-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500 focus:border-transparent bg-white/70 backdrop-blur text-steel-900 placeholder-steel-500 transition-colors"
              required
              disabled={state.isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-steel-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500 focus:border-transparent bg-white/70 backdrop-blur text-steel-900 placeholder-steel-500 transition-colors"
                required
                disabled={state.isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-steel-400 hover:text-steel-600 transition-colors"
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

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-medical-blue-600 focus:ring-medical-blue-500 border-steel-300 rounded"
                disabled={state.isLoading}
              />
              <span className="ml-2 text-sm text-steel-600">Remember me</span>
            </label>
            <a href="#" className="text-sm text-medical-blue-600 hover:text-medical-blue-700 transition-colors">
              Forgot password?
            </a>
          </div>

          {state.isLocked && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <Lock className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 font-medium">Account Locked</p>
                <p className="text-sm text-red-700 mt-1">
                  Too many failed attempts. Contact IT Support at ext. 4357.
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={state.isLoading || state.isLocked}
            className="w-full py-3 px-4 bg-steel-800 hover:bg-steel-900 disabled:bg-steel-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-medical-card flex items-center justify-center"
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

        <div className="mt-6 text-center">
          <p className="text-steel-600">
            Don't have an account?{' '}
            <a href="#" className="text-medical-blue-600 hover:text-medical-blue-700 font-semibold transition-colors">
              Register here today.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;