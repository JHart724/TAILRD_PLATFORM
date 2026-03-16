import React from 'react';
import { Bell, Monitor, User, Shield, Save } from 'lucide-react';
import { toast } from '../components/shared/Toast';

export default function SettingsPage() {
  const handleSave = () => {
    toast.success('Settings Saved', 'Your preferences have been updated successfully.');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-chrome-100 font-display mb-2">Settings</h1>
      <p className="text-chrome-400 text-sm mb-8">Manage your platform preferences and account configuration.</p>

      <div className="space-y-6">
        {/* Notification Preferences */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-chrome-400" />
            <h2 className="text-lg font-semibold text-chrome-100">Notification Preferences</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Care gap alerts', desc: 'Receive alerts when new care gaps are detected', defaultChecked: true },
              { label: 'Patient escalations', desc: 'Notifications for patient risk escalations', defaultChecked: true },
              { label: 'Referral updates', desc: 'Status changes on cross-referral pathways', defaultChecked: false },
              { label: 'Weekly summary digest', desc: 'Email summary of weekly module metrics', defaultChecked: true },
            ].map((pref) => (
              <label key={pref.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer">
                <div>
                  <span className="text-sm text-chrome-200 font-medium">{pref.label}</span>
                  <p className="text-xs text-chrome-500">{pref.desc}</p>
                </div>
                <input type="checkbox" defaultChecked={pref.defaultChecked} className="rounded w-4 h-4" />
              </label>
            ))}
          </div>
        </section>

        {/* Display Options */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <Monitor className="w-5 h-5 text-chrome-400" />
            <h2 className="text-lg font-semibold text-chrome-100">Display Options</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3">
              <div>
                <span className="text-sm text-chrome-200 font-medium">Default module on login</span>
                <p className="text-xs text-chrome-500">Which module to open when you sign in</p>
              </div>
              <select className="input-glass text-sm py-2 px-3" defaultValue="hf">
                <option value="hf">Heart Failure</option>
                <option value="ep">Electrophysiology</option>
                <option value="structural">Structural Heart</option>
                <option value="coronary">Coronary</option>
                <option value="valvular">Valvular</option>
                <option value="peripheral">Peripheral Vascular</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3">
              <div>
                <span className="text-sm text-chrome-200 font-medium">Data refresh interval</span>
                <p className="text-xs text-chrome-500">How often dashboard data auto-refreshes</p>
              </div>
              <select className="input-glass text-sm py-2 px-3" defaultValue="5">
                <option value="1">Every 1 minute</option>
                <option value="5">Every 5 minutes</option>
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
              </select>
            </div>
          </div>
        </section>

        {/* Account Details */}
        <section className="glass-panel p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-chrome-400" />
            <h2 className="text-lg font-semibold text-chrome-100">Account Details</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-chrome-200">Email</span>
              <span className="text-sm text-chrome-400">dr.smith@hospital.org</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-chrome-200">Role</span>
              <span className="badge-info">Cardiology Director</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-chrome-200">Last login</span>
              <span className="text-sm text-chrome-400">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
