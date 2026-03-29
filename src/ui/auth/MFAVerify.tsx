import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Shield, Key, AlertTriangle, Loader, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface MFAVerifyProps {
  /** Partial JWT token from login (pre-MFA) */
  token: string;
  /** Called with the full MFA-verified JWT token on success */
  onVerified: (fullToken: string) => void;
  /** Called when the user wants to go back to login */
  onBack?: () => void;
}

const MFAVerify: React.FC<MFAVerifyProps> = ({ token, onVerified, onBack }) => {
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [codesRemaining, setCodesRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input when mode changes
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [mode]);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // Verify TOTP code
  const verifyTOTP = useCallback(async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      onVerified(data.token);
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [code, headers, onVerified]);

  // Verify backup code
  const verifyBackup = useCallback(async () => {
    if (!backupCode.trim()) {
      setError('Please enter a backup code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/verify-backup`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ code: backupCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid backup code');
      if (data.codesRemaining !== undefined) {
        setCodesRemaining(data.codesRemaining);
      }
      onVerified(data.token);
    } catch (err: any) {
      setError(err.message || 'Invalid backup code.');
      setBackupCode('');
      inputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [backupCode, headers, onVerified]);

  const handleCodeInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    setError('');
  };

  const handleBackupInput = (value: string) => {
    setBackupCode(value.toUpperCase());
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
               style={{ backgroundColor: '#EBF0F5' }}>
            <Shield className="w-8 h-8" style={{ color: '#2C4A60' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E293B' }}>
            Two-Factor Authentication
          </h1>
          <p className="text-sm mt-2" style={{ color: '#64748B' }}>
            {mode === 'totp'
              ? 'Enter the code from your authenticator app'
              : 'Enter one of your backup codes'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

          {/* ---- TOTP Mode ---- */}
          {mode === 'totp' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5" style={{ color: '#2C4A60' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                  Authentication Code
                </h2>
              </div>

              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-4 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: error ? '#EF4444' : '#E2E8F0',
                    color: '#1E293B',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2C4A60'; e.target.style.boxShadow = '0 0 0 2px rgba(44,74,96,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) verifyTOTP(); }}
                  autoFocus
                />
              </div>

              <button
                onClick={verifyTOTP}
                disabled={isLoading || code.length !== 6}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#2C4A60' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Verifying...
                  </span>
                ) : (
                  'Verify'
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setMode('backup'); setError(''); setCode(''); }}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#2C4A60' }}
                >
                  Use a backup code instead
                </button>
              </div>
            </div>
          )}

          {/* ---- Backup Code Mode ---- */}
          {mode === 'backup' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5" style={{ color: '#2C4A60' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                  Backup Code
                </h2>
              </div>

              <p className="text-sm mb-4" style={{ color: '#475569' }}>
                Enter one of the backup codes you saved when setting up two-factor authentication.
              </p>

              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={backupCode}
                  onChange={(e) => handleBackupInput(e.target.value)}
                  placeholder="XXXXXXXXXX"
                  maxLength={10}
                  className="w-full text-center text-lg font-mono tracking-widest py-4 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: error ? '#EF4444' : '#E2E8F0',
                    color: '#1E293B',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2C4A60'; e.target.style.boxShadow = '0 0 0 2px rgba(44,74,96,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && backupCode.trim()) verifyBackup(); }}
                />
              </div>

              {codesRemaining !== null && codesRemaining <= 2 && (
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#6B7280' }} />
                    <p className="text-sm" style={{ color: '#92400E' }}>
                      You have {codesRemaining} backup code{codesRemaining !== 1 ? 's' : ''} remaining. Consider generating new codes in your account settings.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={verifyBackup}
                disabled={isLoading || !backupCode.trim()}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#2C4A60' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Verifying...
                  </span>
                ) : (
                  'Verify Backup Code'
                )}
              </button>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setMode('totp'); setError(''); setBackupCode(''); }}
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#2C4A60' }}
                >
                  Use authenticator app instead
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#DC2626' }} />
              <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
            </div>
          )}
        </div>

        {/* Back to login */}
        {onBack && (
          <div className="text-center mt-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#94A3B8' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFAVerify;
