import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import TailrdLogo from './TailrdLogo';
import { Eye, EyeOff, Shield, Lock, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from '../components/shared/Toast';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(true);

  // Redirect if already authenticated (demo auto-login from AuthContext will trigger this)
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

 try {
 const success = await login(email, password);

 if (success) {
 const from = (location.state as any)?.from?.pathname || '/dashboard';
 toast.success('Login Successful', `Welcome back!`);
 navigate(from, { replace: true });
 }
 } catch (err: any) {
 // Surface specific backend error messages
 const message = err?.message || 'Login failed. Please check your credentials.';
 toast.error('Login Failed', message);
 }
  };

  const handleDemoLogin = (demoEmail: string) => {
 setEmail(demoEmail);
 setPassword('demo123');
  };

  return (
 <div className="min-h-screen flex">
 {/* Left Panel - Dark Chrome Gradient Branding */}
 <div
 className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12"
 style={{
 background: 'linear-gradient(135deg, #0D2640 0%, #3D6F94 100%)',
 }}
 >
 {/* Subtle decorative elements */}
 <div className="absolute inset-0 overflow-hidden">
 <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-[0.05]" />
 <div className="absolute bottom-12 right-12 w-72 h-72 rounded-full bg-white opacity-[0.05]" />
 <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/[0.03]" />
 </div>

 <div className="relative z-10 text-center max-w-md">
 <div className="mb-8">
 <TailrdLogo size="large" variant="dark" />
 </div>
 <h1 className="font-display text-4xl font-bold text-white mb-4 tracking-tight">
 TAILRD
 </h1>
 <p className="font-body text-lg text-chrome-200 leading-relaxed">
 Cardiovascular Intelligence Platform
 </p>
 <div className="mt-8 w-16 h-0.5 bg-white mx-auto rounded-full" />
 <p className="mt-6 font-body text-sm text-chrome-300/70">
 Evidence-driven insights for cardiovascular care teams
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
 {/* Sign In Heading */}
 <h2 className="font-display text-2xl font-bold text-titanium-900 mb-1">
 Sign In
 </h2>
 <p className="font-body text-sm text-titanium-500 mb-8">
 Access your cardiovascular analytics dashboard
 </p>

 {/* Demo Credentials Banner — only visible in demo mode */}
 {isDemoMode && showDemoCredentials && (
 <div className="mb-6 bg-chrome-50 border border-chrome-200 rounded-xl p-4">
 <div className="flex items-start justify-between">
 <div className="flex">
 <Shield className="w-5 h-5 text-chrome-600 mt-0.5 mr-3 flex-shrink-0" />
 <div>
 <h3 className="text-sm font-semibold text-chrome-900 mb-2 font-body">Demo Accounts</h3>
 <div className="space-y-1.5">
 <button
 onClick={() => handleDemoLogin('admin@stmarys.org')}
 className="flex items-center gap-2 w-full text-left"
 >
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-chrome-100 text-chrome-700 hover:bg-chrome-200 transition-colors font-body">
 Admin
 </span>
 <span className="text-xs text-chrome-600 font-body">admin@stmarys.org</span>
 </button>
 <button
 onClick={() => handleDemoLogin('cardio@stmarys.org')}
 className="flex items-center gap-2 w-full text-left"
 >
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-chrome-100 text-chrome-700 hover:bg-chrome-200 transition-colors font-body">
 Physician
 </span>
 <span className="text-xs text-chrome-600 font-body">cardio@stmarys.org</span>
 </button>
 <button
 onClick={() => handleDemoLogin('admin@community.org')}
 className="flex items-center gap-2 w-full text-left"
 >
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-chrome-100 text-chrome-700 hover:bg-chrome-200 transition-colors font-body">
 Quality Dir.
 </span>
 <span className="text-xs text-chrome-600 font-body">admin@community.org</span>
 </button>
 </div>
 <p className="text-xs text-chrome-500 mt-2 font-body">Password: demo123</p>
 </div>
 </div>
 <button
 onClick={() => setShowDemoCredentials(false)}
 className="text-chrome-400 hover:text-chrome-600 ml-4 transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>
 )}

 {/* Login Form */}
 <form onSubmit={handleSubmit} className="space-y-5">
 <div>
 <label htmlFor="email" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
 Email Address
 </label>
 <input
 id="email"
 type="email"
 placeholder="Enter your email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-4 py-3 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-600 focus:border-chrome-600 bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
 required
 disabled={state.isLoading}
 />
 </div>

 <div>
 <label htmlFor="password" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
 Password
 </label>
 <div className="relative">
 <input
 id="password"
 type={showPassword ? 'text' : 'password'}
 placeholder="Enter your password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full px-4 py-3 pr-12 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-chrome-600 focus:border-chrome-600 bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
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

 <div className="flex items-center justify-between">
 <label className="flex items-center">
 <input
 type="checkbox"
 checked={rememberMe}
 onChange={(e) => setRememberMe(e.target.checked)}
 className="h-4 w-4 text-chrome-600 focus:ring-chrome-600 border-titanium-300 rounded"
 disabled={state.isLoading}
 />
 <span className="ml-2 text-sm text-titanium-600 font-body">Remember me</span>
 </label>
 <a href="#" className="text-sm text-chrome-600 hover:text-chrome-700 transition-colors font-body">
 Forgot password?
 </a>
 </div>

 {state.isLocked && (
 <div className="bg-arterial-50 border border-arterial-200 rounded-lg p-3 flex items-start">
 <Lock className="w-5 h-5 text-arterial-600 mt-0.5 mr-3 flex-shrink-0" />
 <div>
 <p className="text-sm text-arterial-800 font-medium font-body">Account Locked</p>
 <p className="text-sm text-arterial-700 mt-1 font-body">
 Too many failed attempts. Contact IT Support at ext. 4357.
 </p>
 </div>
 </div>
 )}

 <button
 type="submit"
 disabled={state.isLoading || state.isLocked}
 className="w-full py-3 px-4 bg-chrome-600 hover:bg-chrome-700 disabled:bg-titanium-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-chrome-card flex items-center justify-center font-body"
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
 <p className="text-titanium-500 font-body text-sm">
 Don't have an account?{' '}
 <a href="#" className="text-chrome-600 hover:text-chrome-700 font-semibold transition-colors">
 Register here today.
 </a>
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default Login;
