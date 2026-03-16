import React from 'react';
import { User, Mail, Phone, Building, Award, BookOpen } from 'lucide-react';

export default function ProfilePage() {
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
              <span className="text-2xl font-bold text-white">DS</span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-chrome-100 mb-1">Dr. Sarah Williams, MD, FACC</h2>
              <p className="text-chrome-400 text-sm mb-3">Cardiology Director — Cardiovascular Service Line</p>
              <div className="flex flex-wrap gap-2">
                <span className="badge-info">Heart Failure</span>
                <span className="badge-info">Electrophysiology</span>
                <span className="badge-info">Structural Heart</span>
              </div>
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
              <p className="text-sm text-chrome-200">sarah.williams@hospital.org</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Phone</label>
              <p className="text-sm text-chrome-200">(555) 234-5678</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Department</label>
              <p className="text-sm text-chrome-200">Cardiovascular Medicine</p>
            </div>
            <div className="p-3">
              <label className="text-xs text-chrome-500 block mb-1">Office</label>
              <p className="text-sm text-chrome-200">Heart Center, Suite 420</p>
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-chrome-100 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-chrome-400" />
            Credentials &amp; Specialty
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Board Certification', value: 'ABIM — Cardiovascular Disease' },
              { label: 'NPI', value: '1234567890' },
              { label: 'Medical License', value: 'Active — State Medical Board' },
              { label: 'Specialty Focus', value: 'Advanced Heart Failure, GDMT Optimization' },
              { label: 'Training', value: 'Fellowship — Advanced HF & Transplant Cardiology' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03]">
                <span className="text-sm text-chrome-400">{item.label}</span>
                <span className="text-sm text-chrome-200">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
