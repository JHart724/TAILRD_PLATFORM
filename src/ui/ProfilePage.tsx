import React from 'react';
import { Mail, Award } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

/**
 * Identity (name / role / department / email) is read from the authenticated
 * user (useAuth().state.user) -- the same source the UserMenu uses -- so the
 * profile reflects who is actually signed in.
 *
 * Credentialing fields (NPI, medical license, board certification, specialty,
 * training) plus phone/office are NOT carried on the auth user record, so they
 * are shown as an honest interim state ("Not on file") rather than fabricated
 * (AUDIT-304: previously hardcoded to "Dr. Sarah Williams" with invented codes).
 */
const NOT_ON_FILE = 'Not on file';

export default function ProfilePage() {
  const { state } = useAuth();
  const user = state.user;

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : NOT_ON_FILE;
  const initials =
    ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?';
  const roleLine = user
    ? [user.title, user.department].filter(Boolean).join(' - ') || NOT_ON_FILE
    : NOT_ON_FILE;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-chrome-100 font-display mb-2">Profile</h1>
      <p className="text-chrome-400 text-sm mb-8">Your professional profile and credentials.</p>

      <div className="space-y-6">
        {/* User Info */}
        <section className="glass-panel p-6">
          <div className="flex items-start gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1A3B5C, #3D6F94)',
                border: '2px solid rgba(168, 197, 221, 0.3)',
              }}
            >
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-chrome-100 mb-1">{fullName}</h2>
              <p className="text-chrome-400 text-sm mb-3">{roleLine}</p>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-chrome-100 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-chrome-400" />
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Email</label>
              <p className="text-sm text-chrome-200">{user?.email || NOT_ON_FILE}</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Department</label>
              <p className="text-sm text-chrome-200">{user?.department || NOT_ON_FILE}</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Phone</label>
              <p className="text-sm text-chrome-500 italic">{NOT_ON_FILE}</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Office</label>
              <p className="text-sm text-chrome-500 italic">{NOT_ON_FILE}</p>
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-chrome-100 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-chrome-400" />
            Credentials &amp; Specialty
          </h2>
          <p className="text-xs text-chrome-500 mb-4">
            Credentialing details are not yet captured in your account. Contact your administrator to add them.
          </p>
          <div className="space-y-3">
            {['Board Certification', 'NPI', 'Medical License', 'Specialty Focus', 'Training'].map(
              (label) => (
                <div
                  key={label}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03]"
                >
                  <span className="text-sm text-chrome-400">{label}</span>
                  <span className="text-sm text-chrome-500 italic">{NOT_ON_FILE}</span>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
