import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import ExecutiveView from './views/ExecutiveView';
import ServiceLineView from './views/ServiceLineView';
import CareTeamView from './views/CareTeamView';

const HFModule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const tabs = [
    { path: '/hf/executive', label: 'Executive' },
    { path: '/hf/service-line', label: 'Service Line' },
    { path: '/hf/care-team', label: 'Care Team' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-slate-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {/* Logo - Clickable back to home */}
            <button
              onClick={() => navigate('/')}
              className="py-4 text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors"
            >
              TAILRD | Heart
            </button>

            {/* Tabs */}
            <div className="flex gap-8">
              {tabs.map(tab => (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    location.pathname === tab.path
                      ? 'border-slate-700 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/executive" element={<ExecutiveView />} />
        <Route path="/service-line" element={<ServiceLineView />} />
        <Route path="/care-team" element={<CareTeamView />} />
      </Routes>
    </div>
  );
};

export default HFModule;
