import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

const MODULE_NAME_MAP: Record<string, string> = {
  hf: 'Heart Failure',
  ep: 'Electrophysiology',
  structural: 'Structural Heart',
  coronary: 'Coronary Revascularization',
  valvular: 'Valvular Surgery',
  peripheral: 'Peripheral Vascular',
};

function useModuleName(): string | undefined {
  const location = useLocation();
  const firstSegment = location.pathname.split('/').filter(Boolean)[0];
  if (!firstSegment) return undefined;
  return MODULE_NAME_MAP[firstSegment];
}

function useModuleKey(): string | undefined {
  const location = useLocation();
  return location.pathname.split('/').filter(Boolean)[0];
}

export default function AppShell({ children }: AppShellProps) {
  const moduleName = useModuleName();
  const moduleKey = useModuleKey();

  return (
    <div className="flex min-h-screen app-surface">
      <a href="#main-content" className="skip-nav">Skip to main content</a>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto h-screen">
        <TopBar moduleName={moduleName} />
        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
