import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  Zap,
  Stethoscope,
  GitBranch,
  CircuitBoard,
  Activity,
  ChevronLeft,
  ChevronRight,
  Settings,
  UserCircle,
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

const moduleNavItems: NavItem[] = [
  { label: 'Heart Failure',        icon: Heart,        path: '/hf',         glowColor: '#A8C5DD', accentBg: 'rgba(61, 111, 148, 0.12)' },
  { label: 'Electrophysiology',    icon: Zap,          path: '/ep',         glowColor: '#FBBF24', accentBg: 'rgba(180, 83, 9, 0.12)' },
  { label: 'Structural Heart',     icon: Stethoscope,  path: '/structural', glowColor: '#C084FC', accentBg: 'rgba(124, 58, 237, 0.12)' },
  { label: 'Coronary',             icon: GitBranch,     path: '/coronary',   glowColor: '#D42A3E', accentBg: 'rgba(139, 21, 32, 0.12)' },
  { label: 'Valvular',             icon: CircuitBoard,  path: '/valvular',   glowColor: '#2DD4BF', accentBg: 'rgba(13, 148, 136, 0.12)' },
  { label: 'Peripheral Vascular',  icon: Activity,      path: '/peripheral', glowColor: '#4ADE80', accentBg: 'rgba(21, 128, 61, 0.12)' },
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
        flex flex-col h-screen shrink-0
        bg-chrome-950/80 backdrop-blur-xl
        border-r border-white/[0.06]
        transition-[width] duration-200 ease-in-out
        ${expanded ? 'w-60' : 'w-16'}
      `}
    >
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-white/[0.06]">
        {expanded && (
          <button
            onClick={() => navigate('/dashboard')}
            className="font-display text-lg tracking-wide hover:opacity-80 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #A8C5DD 0%, #5A8AB0 40%, #C8DAE8 60%, #7BA3C4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TAILRD
          </button>
        )}
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="p-1.5 rounded-md text-chrome-400 hover:text-chrome-200 hover:bg-white/[0.06] transition-colors"
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Module Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {moduleNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={!expanded ? item.label : undefined}
              className={`
                flex items-center w-full rounded-lg transition-all duration-200
                ${expanded ? 'px-3 py-2.5 gap-3' : 'justify-center px-0 py-2.5'}
                ${
                  active
                    ? 'text-white'
                    : 'text-chrome-400 hover:text-chrome-200 hover:bg-white/[0.04]'
                }
              `}
              style={active ? { background: item.accentBg } : undefined}
            >
              {/* Glow dot for active module */}
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: item.glowColor,
                    boxShadow: `0 0 6px ${item.glowColor}, 0 0 12px ${item.glowColor}`,
                  }}
                />
              )}
              <Icon size={18} className="shrink-0" />
              {expanded && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/[0.06] py-3 px-2 space-y-1">
        <button
          className={`
            flex items-center text-chrome-400 hover:text-chrome-200 hover:bg-white/[0.04] rounded-lg transition-colors w-full
            ${expanded ? 'px-3 py-2 gap-3' : 'justify-center py-2'}
          `}
        >
          <Settings size={18} className="shrink-0" />
          {expanded && <span className="text-sm">Settings</span>}
        </button>
        <button
          className={`
            flex items-center text-chrome-400 hover:text-chrome-200 hover:bg-white/[0.04] rounded-lg transition-colors w-full
            ${expanded ? 'px-3 py-2 gap-3' : 'justify-center py-2'}
          `}
        >
          <UserCircle size={18} className="shrink-0" />
          {expanded && <span className="text-sm">Profile</span>}
        </button>
      </div>
    </aside>
  );
}
