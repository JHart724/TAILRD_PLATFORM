import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  Zap,
  Stethoscope,
  GitBranch,
  CircuitBoard,
  Activity,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Settings,
  UserCircle,
  BarChart3,
  Upload,
  ChevronDown,
} from 'lucide-react';

const STORAGE_KEY = 'tailrd-sidebar-expanded';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  /** CSS glow color for active indicator dot */
  glowColor: string;
  /** Module accent tint for active background */
  accentBg: string;
}

// Approved module palette — no purple/violet
const moduleNavItems: NavItem[] = [
  { label: 'Heart Failure',        icon: Heart,        path: '/hf',         glowColor: '#C8D4DC', accentBg: 'rgba(200, 212, 220, 0.15)' },
  { label: 'Electrophysiology',    icon: Zap,          path: '/ep',         glowColor: '#8FA8BC', accentBg: 'rgba(143, 168, 188, 0.15)' },
  { label: 'Structural Heart',     icon: Stethoscope,  path: '/structural', glowColor: '#D4707F', accentBg: 'rgba(155, 36, 56, 0.15)' },
  { label: 'Coronary',             icon: GitBranch,     path: '/coronary',   glowColor: '#5CAA72', accentBg: 'rgba(26, 74, 46, 0.15)' },
  { label: 'Valvular',             icon: CircuitBoard,  path: '/valvular',   glowColor: '#D4B85C', accentBg: 'rgba(139, 105, 20, 0.15)' },
  { label: 'Peripheral Vascular',  icon: Activity,      path: '/peripheral', glowColor: '#7B8698', accentBg: 'rgba(46, 52, 64, 0.15)' },
  { label: 'Clinical Research',    icon: FlaskConical,  path: '/research',   glowColor: '#7B8698', accentBg: 'rgba(46, 52, 64, 0.15)' },
];

function getInitialExpanded(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage unavailable
  }
  return true;
}

export default function Sidebar() {
  const [expanded, setExpanded] = useState<boolean>(getInitialExpanded);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      // localStorage unavailable
    }
  }, [expanded]);

  const isActive = (path: string): boolean => location.pathname.startsWith(path);

  return (
    <aside
      className={`
        sidebar-dark sidebar-container flex flex-col h-screen shrink-0
        transition-[width] duration-200 ease-in-out
        ${expanded ? 'w-60' : 'w-16'}
      `}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-white/[0.08] relative z-[1]">
        {expanded && (
          <button
            onClick={() => navigate('/dashboard')}
            className="font-display text-lg tracking-wide hover:opacity-80 transition-opacity sidebar-logo-text"
            style={{
              background: 'linear-gradient(135deg, #C8D4DC 0%, #8FA8BC 40%, #F0F5FA 60%, #C8D4DC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TAILRD
          </button>
        )}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="p-1.5 rounded-md transition-colors relative z-[1]"
          style={{ color: 'rgba(180,210,240,0.42)' }}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      {expanded && (
        <div className="px-3 relative z-[1]">
          <div className="sb-live">
            <div className="sb-live-dot"></div>
            <span>Live · Updated 2m ago</span>
          </div>
        </div>
      )}

      {/* Module Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto relative z-[1]">
        {/* Service Line */}
        <button
          onClick={() => navigate('/service-line')}
          title={!expanded ? 'Service Line' : undefined}
          className={`
            flex items-center w-full rounded-lg transition-all duration-200 mb-2
            ${expanded ? 'px-3 py-2.5 gap-3' : 'justify-center px-0 py-2.5'}
            ${isActive('/service-line') ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
          `}
        >
          {isActive('/service-line') && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: '#9B2438',
                boxShadow: '0 0 6px rgba(155, 36, 56, 0.6), 0 0 12px rgba(155, 36, 56, 0.3)',
              }}
            />
          )}
          <BarChart3 size={18} className="shrink-0" />
          {expanded && <span className="text-sm font-medium truncate">Service Line</span>}
        </button>
        <div className="border-t border-white/[0.06] mb-2" />

        {moduleNavItems.map((item, index) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const isResearch = item.path === '/research';

          return (
            <React.Fragment key={item.path}>
              {/* Separator before Research Infrastructure section */}
              {isResearch && (
                <div className="pt-2 pb-1">
                  <div className="border-t border-white/[0.06]" />
                  {expanded && (
                    <div className="px-3 pt-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(180,210,240,0.35)' }}>
                        Research Infrastructure
                      </span>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => navigate(item.path)}
                title={!expanded ? item.label : undefined}
                className={`
                  flex items-center w-full rounded-lg transition-all duration-200
                  ${expanded ? 'px-3 py-2.5 gap-3' : 'justify-center px-0 py-2.5'}
                  ${active ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
                `}
              >
                {/* Glow dot for active module — Carmona Red */}
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: '#9B2438',
                      boxShadow: '0 0 6px rgba(155, 36, 56, 0.6), 0 0 12px rgba(155, 36, 56, 0.3)',
                    }}
                  />
                )}
                <Icon size={18} className="shrink-0" />
                {expanded && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </button>
            </React.Fragment>
          );
        })}

      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/[0.08] py-3 px-2 space-y-1 relative z-[1]">
        {/* Settings with dropdown */}
        <div className="relative">
          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            title={!expanded ? 'Settings' : undefined}
            className={`
              flex items-center rounded-lg transition-colors w-full
              ${expanded ? 'px-3 py-2 gap-3' : 'justify-center py-2'}
              ${isActive('/settings') || isActive('/data') || isActive('/profile') ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
            `}
          >
            <Settings size={18} className="shrink-0" />
            {expanded && (
              <>
                <span className="text-sm flex-1 text-left">Settings</span>
                <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} style={{ opacity: 0.5 }} />
              </>
            )}
          </button>
          {settingsOpen && expanded && (
            <div className="ml-4 mt-1 space-y-0.5">
              <button
                onClick={() => navigate('/data')}
                className={`
                  flex items-center w-full rounded-md px-3 py-1.5 gap-2.5 transition-colors
                  ${isActive('/data') ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
                `}
              >
                <Upload size={15} className="shrink-0" />
                <span className="text-xs">Data Management</span>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className={`
                  flex items-center w-full rounded-md px-3 py-1.5 gap-2.5 transition-colors
                  ${isActive('/profile') ? 'sidebar-nav-item-active' : 'sidebar-nav-item'}
                `}
              >
                <UserCircle size={15} className="shrink-0" />
                <span className="text-xs">Profile</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
