import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  ShieldCheck,
  TrendingUp,
  Database,
  Shield,
  LogOut,
} from 'lucide-react';
import PlatformOverview from './tabs/PlatformOverview';
import HealthSystems from './tabs/HealthSystems';
import UsersManagement from './tabs/UsersManagement';
import PlatformConfiguration from './tabs/PlatformConfiguration';
import AuditSecurity from './tabs/AuditSecurity';
import CustomerSuccess from './tabs/CustomerSuccess';
import DataManagement from './tabs/DataManagement';

type TabId =
  | 'overview'
  | 'health-systems'
  | 'users'
  | 'config'
  | 'audit'
  | 'customer-success'
  | 'data';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Platform Overview', icon: LayoutDashboard },
  { id: 'health-systems', label: 'Health Systems', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'config', label: 'Platform Configuration', icon: Settings },
  { id: 'audit', label: 'Audit & Security', icon: ShieldCheck },
  { id: 'customer-success', label: 'Customer Success', icon: TrendingUp },
  { id: 'data', label: 'Data Management', icon: Database },
];

const TAB_COMPONENTS: Record<TabId, React.FC> = {
  overview: PlatformOverview,
  'health-systems': HealthSystems,
  users: UsersManagement,
  config: PlatformConfiguration,
  audit: AuditSecurity,
  'customer-success': CustomerSuccess,
  data: DataManagement,
};

const SuperAdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { state, logout } = useAuth();
  const navigate = useNavigate();

  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin-login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header Bar */}
      <header
        className="sticky top-0 z-50 border-b border-gray-200"
        style={{ background: 'linear-gradient(135deg, #3A0A14 0%, #7A1A2E 50%, #5C1022 100%)' }}
      >
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-white/80" />
            <span className="font-display text-lg font-bold text-white tracking-wide">
              TAILRD Admin Console
            </span>
            <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/70 font-body">
              {state.user?.email || 'admin@tailrd.com'}
            </span>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-white/70 hover:text-white transition-colors font-body"
            >
              Main Platform
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors font-body"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors duration-150
                    ${
                      isActive
                        ? 'border-[#7A1A2E] text-[#7A1A2E]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <ActiveComponent />
      </main>
    </div>
  );
};

export default SuperAdminConsole;
