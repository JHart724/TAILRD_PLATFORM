import React, { useState, useCallback } from 'react';
import { Shield, Smartphone, Key, Copy, Download, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface MFASetupProps {
  token: string;
  onComplete: () => void;
  onCancel?: () => void;
}

type Step = 'scan' | 'verify' | 'backup';

const MFASetup: React.FC<MFASetupProps> = ({ token, onComplete, onCancel }) => {
  const [step, setStep] = useState<Step>('scan');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [showManualKey, setShowManualKey] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [setupStarted, setSetupStarted] = useState(false);
  const [copied, setCopied] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // Step 1: Start setup and get QR code
  const startSetup = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/setup`, {
        method: 'POST',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start MFA setup');
      setQrCodeUrl(data.qrCodeUrl);
      setManualKey(data.manualEntryKey);
      setSetupStarted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup');
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  // Step 2: Verify TOTP code
  const verifySetup = useCallback(async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/mfa/verify-setup`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ token: verificationCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, headers]);

  const copyBackupCodes = useCallback(() => {
    const text = backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [backupCodes]);

  const downloadBackupCodes = useCallback(() => {
    const text = [
      'TAILRD Heart - MFA Backup Codes',
      '================================',
      'Each code can be used once.',
      'Store this file securely.',
      '',
      ...backupCodes.map((c, i) => `${i + 1}. ${c}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailrd-mfa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [backupCodes]);

  const handleCodeInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(cleaned);
    setError('');
  };

  // ---- Render ----

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
            Set Up Two-Factor Authentication
          </h1>
          <p className="text-sm mt-2" style={{ color: '#64748B' }}>
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['scan', 'verify', 'backup'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: step === s ? '#2C4A60' : (
                    (['scan', 'verify', 'backup'].indexOf(step) > i) ? '#2C4A60' : '#E2E8F0'
                  ),
                  color: step === s || ['scan', 'verify', 'backup'].indexOf(step) > i ? 'white' : '#94A3B8',
                }}
              >
                {['scan', 'verify', 'backup'].indexOf(step) > i ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div className="w-12 h-0.5" style={{
                  backgroundColor: ['scan', 'verify', 'backup'].indexOf(step) > i ? '#2C4A60' : '#E2E8F0'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border p-8" style={{ borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

          {/* ---- Step 1: Scan QR ---- */}
          {step === 'scan' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-5 h-5" style={{ color: '#2C4A60' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                  Scan QR Code
                </h2>
              </div>
              <p className="text-sm mb-6" style={{ color: '#475569' }}>
                Open your authenticator app (Google Authenticator, Authy, or 1Password) and scan the QR code below.
              </p>

              {!setupStarted ? (
                <button
                  onClick={startSetup}
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#2C4A60' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" /> Generating...
                    </span>
                  ) : (
                    'Generate QR Code'
                  )}
                </button>
              ) : (
                <>
                  {/* QR Code Display */}
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border rounded-lg" style={{ borderColor: '#E2E8F0' }}>
                      <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  {/* Manual entry toggle */}
                  <button
                    onClick={() => setShowManualKey(!showManualKey)}
                    className="text-sm font-medium mb-4 block mx-auto transition-colors"
                    style={{ color: '#2C4A60' }}
                  >
                    {showManualKey ? 'Hide manual entry key' : "Can't scan? Enter key manually"}
                  </button>

                  {showManualKey && (
                    <div className="p-3 rounded-lg mb-6" style={{ backgroundColor: '#F8FAFB', border: '1px solid #E2E8F0' }}>
                      <p className="text-xs mb-1" style={{ color: '#64748B' }}>Manual entry key:</p>
                      <code className="text-sm font-mono font-bold break-all" style={{ color: '#1E293B' }}>
                        {manualKey}
                      </code>
                    </div>
                  )}

                  <button
                    onClick={() => setStep('verify')}
                    className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity"
                    style={{ backgroundColor: '#2C4A60' }}
                  >
                    I've scanned the code
                  </button>
                </>
              )}
            </div>
          )}

          {/* ---- Step 2: Verify ---- */}
          {step === 'verify' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Key className="w-5 h-5" style={{ color: '#2C4A60' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                  Verify Code
                </h2>
              </div>
              <p className="text-sm mb-6" style={{ color: '#475569' }}>
                Enter the 6-digit code shown in your authenticator app to confirm setup.
              </p>

              <div className="mb-6">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-[0.5em] py-4 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: error ? '#EF4444' : '#E2E8F0',
                    color: '#1E293B',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#2C4A60'; e.target.style.boxShadow = '0 0 0 2px rgba(44,74,96,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = error ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && verificationCode.length === 6) verifySetup(); }}
                  autoFocus
                />
              </div>

              <button
                onClick={verifySetup}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#2C4A60' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Verifying...
                  </span>
                ) : (
                  'Verify and Enable MFA'
                )}
              </button>

              <button
                onClick={() => { setStep('scan'); setVerificationCode(''); setError(''); }}
                className="w-full mt-3 py-2 text-sm font-medium"
                style={{ color: '#64748B' }}
              >
                Back to QR code
              </button>
            </div>
          )}

          {/* ---- Step 3: Backup Codes ---- */}
          {step === 'backup' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5" style={{ color: '#16A34A' }} />
                <h2 className="text-lg font-semibold" style={{ color: '#1E293B' }}>
                  MFA Enabled Successfully
                </h2>
              </div>

              <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                  <p className="text-sm" style={{ color: '#92400E' }}>
                    Save these backup codes now. They will not be shown again. Each code can be used once if you lose access to your authenticator app.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F8FAFB', border: '1px solid #E2E8F0' }}>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div key={i} className="font-mono text-sm py-1 px-2 rounded" style={{ backgroundColor: 'white', color: '#1E293B', border: '1px solid #E2E8F0' }}>
                      {i + 1}. <strong>{code}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: '#E2E8F0', color: copied ? '#16A34A' : '#475569' }}
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: '#E2E8F0', color: '#475569' }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

              <button
                onClick={onComplete}
                className="w-full py-3 rounded-lg text-white font-semibold text-sm"
                style={{ backgroundColor: '#2C4A60' }}
              >
                I've saved my backup codes
              </button>
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

        {/* Cancel link */}
        {onCancel && step !== 'backup' && (
          <div className="text-center mt-4">
            <button
              onClick={onCancel}
              className="text-sm transition-colors"
              style={{ color: '#94A3B8' }}
            >
              Set up later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;
