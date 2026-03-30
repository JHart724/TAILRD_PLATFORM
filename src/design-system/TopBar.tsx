import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { NotificationPanel } from '../components/notifications';
import UserMenu from '../components/UserMenu';
import { useAuth } from '../auth/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

type ApiStatus = 'demo' | 'online' | 'offline' | 'checking';

function useApiHealth(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>(isDemoMode ? 'demo' : 'checking');

  useEffect(() => {
    if (isDemoMode) return; // no health check needed in demo mode

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        setStatus(res.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return status;
}

interface TopBarProps {
  moduleName?: string;
  viewName?: string;
}

export default function TopBar({ moduleName, viewName }: TopBarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { state } = useAuth();
  const apiStatus = useApiHealth();
  const user = state.user;
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

        {/* Right: API status + Notifications + User */}
        <div className="flex items-center gap-4">
          {/* API / Demo status pill */}
          <span
            className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium select-none"
            style={{
              background:
                apiStatus === 'online'  ? 'rgba(44,74,96,0.10)'  :
                apiStatus === 'offline' ? 'rgba(122,26,46,0.10)' :
                'rgba(200,212,220,0.30)',
              color:
                apiStatus === 'online'  ? '#2C4A60'  :
                apiStatus === 'offline' ? '#7A1A2E'  :
                '#4A6880',
            }}
            title={
              apiStatus === 'online'   ? 'Backend API connected' :
              apiStatus === 'offline'  ? 'Backend offline — demo data active' :
              apiStatus === 'checking' ? 'Checking API connection...' :
              'Demo mode — synthetic patient data'
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background:
                  apiStatus === 'online'  ? '#2C4A60'  :
                  apiStatus === 'offline' ? '#7A1A2E'  :
                  '#4A6880',
                animation: apiStatus === 'offline' ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
              }}
            />
            {apiStatus === 'online'   ? 'Live'    :
             apiStatus === 'offline'  ? 'Offline' :
             apiStatus === 'checking' ? '…'       :
             'Demo'}
          </span>
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
          <UserMenu
            userName={user ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'Superuser'}
            userRole={user?.title || user?.department || 'Cardiology Director'}
            userEmail={user?.email || ''}
          />
        </div>
      </header>
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
