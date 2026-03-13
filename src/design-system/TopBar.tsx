import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from '../components/notifications';

interface TopBarProps {
  moduleName?: string;
  viewName?: string;
}

export default function TopBar({ moduleName, viewName }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const segments: { label: string; isLast: boolean }[] = [];

  if (!moduleName) {
    segments.push({ label: 'Dashboard', isLast: true });
  } else if (!viewName) {
    segments.push({ label: moduleName, isLast: true });
  } else {
    segments.push({ label: moduleName, isLast: false });
    segments.push({ label: viewName, isLast: true });
  }

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 font-body"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(24px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'inset 0 -1px 0 0 rgba(255, 255, 255, 0.04)',
        }}
      >
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          {segments.map((seg, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-chrome-500 mx-1">/</span>}
              <span
                className={
                  seg.isLast
                    ? 'text-chrome-100 font-semibold'
                    : 'text-chrome-400'
                }
              >
                {seg.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Center: Search placeholder */}
        <div className="hidden md:block">
          <input
            type="text"
            disabled
            placeholder="Search patients, protocols..."
            className="w-80 px-4 py-1.5 text-sm rounded-lg cursor-not-allowed transition-colors"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(168, 197, 221, 0.5)',
            }}
          />
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative text-chrome-400 hover:text-chrome-200 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{
                background: '#D42A3E',
                boxShadow: '0 0 6px rgba(212, 42, 62, 0.6)',
                border: '2px solid #060A12',
              }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-chrome-300">Dr. Smith</span>
            <div
              className="w-8 h-8 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #1A3B5C, #3D6F94)',
                border: '1px solid rgba(168, 197, 221, 0.2)',
              }}
              aria-label="User avatar"
            />
          </div>
        </div>
      </header>
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
