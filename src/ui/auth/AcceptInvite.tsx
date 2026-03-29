import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import TailrdLogo from '../../components/TailrdLogo';
import { Eye, EyeOff, Check, X, Shield, ArrowLeft, Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface InviteDetails {
  email: string;
  role: string;
  hospitalName: string;
}

type PageState = 'loading' | 'valid' | 'invalid' | 'submitting' | 'success' | 'error';

// ─── Password validation ────────────────────────────────────────────────────────

interface PasswordCheck {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: '12 or more characters', test: (pw) => pw.length >= 12 },
  { label: 'At least 1 uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'At least 1 number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'At least 1 special character (!@#$%^&*)', test: (pw) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
];

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ─── Component ──────────────────────────────────────────────────────────────────

const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Validate invite token on mount ──
  useEffect(() => {
    if (!token) {
      setPageState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`${API_URL}/users/invite/validate/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInvite({
            email: data.email || data.data?.email || '',
            role: data.role || data.data?.role || '',
            hospitalName: data.hospitalName || data.data?.hospitalName || '',
          });
          setPageState('valid');
        } else {
          setPageState('invalid');
        }
      } catch {
        setPageState('invalid');
      }
    };

    validateToken();
  }, [token]);

  // ── Password validation state ──
  const passwordChecks = PASSWORD_CHECKS.map((check) => ({
    ...check,
    passed: check.test(password),
  }));
  const allChecksPassed = passwordChecks.every((c) => c.passed);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = allChecksPassed && passwordsMatch;

  // ── Submit handler ──
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || !token) return;

      setPageState('submitting');
      setErrorMessage('');

      try {
        const res = await fetch(`${API_URL}/users/invite/accept/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          const data = await res.json();
          const jwt = data.token || data.data?.token;
          if (jwt) {
            localStorage.setItem('tailrd-session-token', jwt);
          }
          setPageState('success');
          // Redirect after brief success message
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
        } else {
          const errData = await res.json().catch(() => null);
          setErrorMessage(errData?.message || errData?.error || 'Failed to activate account. Please try again.');
          setPageState('error');
        }
      } catch {
        setErrorMessage('Network error. Please check your connection and try again.');
        setPageState('error');
      }
    },
    [canSubmit, token, password, navigate],
  );

  // ── Render: Loading ──
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#2C4A60] animate-spin mx-auto mb-4" />
          <p className="text-sm text-titanium-500 font-body">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // ── Render: Invalid / Expired ──
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen flex">
        {/* Left branding panel — matches login */}
        <div
          className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12"
          style={{ background: 'linear-gradient(135deg, #0D2640 0%, #3D6F94 100%)' }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-[0.05]" />
            <div className="absolute bottom-12 right-12 w-72 h-72 rounded-full bg-white opacity-[0.05]" />
          </div>
          <div className="relative z-10 text-center max-w-md">
            <div className="mb-8">
              <TailrdLogo size="large" variant="dark" />
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-4 tracking-tight">TAILRD</h1>
            <p className="font-body text-lg text-chrome-200 leading-relaxed">Cardiovascular Intelligence Platform</p>
            <div className="mt-8 w-16 h-0.5 bg-white mx-auto rounded-full" />
            <p className="mt-6 font-body text-sm text-chrome-300/70">Evidence-driven insights for cardiovascular care teams</p>
          </div>
        </div>

        {/* Right panel — invalid state */}
        <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8 lg:hidden">
              <TailrdLogo size="large" variant="light" />
            </div>
            <div className="bg-white rounded-xl shadow-chrome-card border border-titanium-200 p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-display text-2xl font-bold text-titanium-900 mb-3">Invitation Expired</h2>
              <p className="font-body text-sm text-titanium-500 mb-2">This invitation has expired or is invalid.</p>
              <p className="font-body text-sm text-titanium-500 mb-8">
                Please contact your administrator for a new invitation.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-semibold text-[#2C4A60] hover:text-[#1d3344] transition-colors font-body"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Success ──
  if (pageState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl shadow-chrome-card border border-titanium-200 p-8 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-[#F0F5FA] rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#2C4A60]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-titanium-900 mb-3">Account Activated</h2>
          <p className="font-body text-sm text-titanium-500">
            Your account has been created. Redirecting to the dashboard...
          </p>
          <div className="mt-6">
            <Loader2 className="w-5 h-5 text-[#2C4A60] animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Valid (form) and Error (form with error message) ──
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — matches login */}
      <div
        className="hidden lg:flex lg:w-[55%] relative items-center justify-center p-12"
        style={{ background: 'linear-gradient(135deg, #0D2640 0%, #3D6F94 100%)' }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-[0.05]" />
          <div className="absolute bottom-12 right-12 w-72 h-72 rounded-full bg-white opacity-[0.05]" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/[0.03]" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="mb-8">
            <TailrdLogo size="large" variant="dark" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-4 tracking-tight">TAILRD</h1>
          <p className="font-body text-lg text-chrome-200 leading-relaxed">Cardiovascular Intelligence Platform</p>
          <div className="mt-8 w-16 h-0.5 bg-white mx-auto rounded-full" />
          <p className="mt-6 font-body text-sm text-chrome-300/70">Evidence-driven insights for cardiovascular care teams</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <TailrdLogo size="large" variant="light" />
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-chrome-card border border-titanium-200 p-8">
            {/* Header */}
            <h2 className="font-display text-2xl font-bold text-titanium-900 mb-1">Welcome to TAILRD Heart</h2>
            {invite && (
              <p className="font-body text-sm text-titanium-500 mb-8">
                <span className="font-semibold text-titanium-700">{invite.hospitalName}</span> has invited you as{' '}
                <span className="font-semibold text-titanium-700">{invite.role}</span>
              </p>
            )}

            {/* Error banner */}
            {pageState === 'error' && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start">
                <X className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800 font-body">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (pageState === 'error') setPageState('valid');
                    }}
                    className="w-full px-4 py-3 pr-12 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C4A60] focus:border-[#2C4A60] bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
                    disabled={pageState === 'submitting'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-titanium-400 hover:text-titanium-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-titanium-700 mb-2 font-body">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (pageState === 'error') setPageState('valid');
                    }}
                    className="w-full px-4 py-3 pr-12 border border-titanium-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C4A60] focus:border-[#2C4A60] bg-white text-titanium-900 placeholder-titanium-400 transition-colors font-body"
                    disabled={pageState === 'submitting'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-titanium-400 hover:text-titanium-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {/* Passwords match indicator */}
                {confirmPassword.length > 0 && (
                  <div className={`flex items-center mt-2 text-xs font-body ${passwordsMatch ? 'text-[#2C4A60]' : 'text-red-500'}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5 mr-1" /> : <X className="w-3.5 h-3.5 mr-1" />}
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              {/* Password requirements */}
              <div className="bg-slate-50 rounded-lg p-4 border border-titanium-100">
                <div className="flex items-center mb-3">
                  <Shield className="w-4 h-4 text-[#2C4A60] mr-2" />
                  <span className="text-xs font-semibold text-titanium-700 font-body uppercase tracking-wide">
                    Password Requirements
                  </span>
                </div>
                <ul className="space-y-2">
                  {passwordChecks.map((check, idx) => (
                    <li key={idx} className="flex items-center text-sm font-body">
                      {password.length === 0 ? (
                        <div className="w-4 h-4 rounded-full border-2 border-titanium-300 mr-2.5 flex-shrink-0" />
                      ) : check.passed ? (
                        <Check className="w-4 h-4 text-[#2C4A60] mr-2.5 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-red-400 mr-2.5 flex-shrink-0" />
                      )}
                      <span className={password.length === 0 ? 'text-titanium-500' : check.passed ? 'text-[#2C4A60]' : 'text-red-600'}>
                        {check.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!canSubmit || pageState === 'submitting'}
                className="w-full py-3 px-4 bg-[#2C4A60] hover:bg-[#1d3344] disabled:bg-titanium-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-chrome-card flex items-center justify-center font-body"
              >
                {pageState === 'submitting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Activating Account...
                  </>
                ) : (
                  'Activate Account'
                )}
              </button>
            </form>

            {/* Footer link */}
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-[#2C4A60] hover:text-[#1d3344] font-semibold transition-colors font-body"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
