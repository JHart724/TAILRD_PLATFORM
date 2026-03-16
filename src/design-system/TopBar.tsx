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
        className="sticky top-0 z-30 flex items-center justify-between h-14 px-6 font-body topbar-container"
      >
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          {segments.map((seg, idx) => (
            <React.Fragment key={seg.label}>
              {idx > 0 && <span className="text-titanium-400 mx-1">/</span>}
              <span
                className={
                  seg.isLast
                    ? 'font-semibold'
                    : ''
                }
                style={{ color: seg.isLast ? '#0A1828' : '#3A5268' }}
              >
                {seg.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Center: Search */}
        <div className="hidden md:block">
          <input
            type="text"
            placeholder="Search patients, protocols..."
            className="w-80 px-4 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              background: 'rgba(244, 246, 248, 0.80)',
              border: '1px solid rgba(200, 212, 220, 0.40)',
              color: '#374151',
            }}
          />
        </div>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setNotifOpen(true)}
            className="relative transition-colors topbar-icon-btn p-1.5"
            style={{ color: '#3A5268' }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
              style={{
                background: '#7A1A2E',
                border: '1.5px solid rgba(253,254,255,0.9)',
                boxShadow: '0 0 4px rgba(122,26,46,0.6)',
              }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: '#0A1828' }}>Dr. Smith</span>
            <div
              className="w-8 h-8 rounded-full sidebar-avatar"
              aria-label="User avatar"
            />
          </div>
        </div>
      </header>
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
