// Backend endpoints required for full functionality — see PHASE_4_BACKLOG.md Sprint B PR-C
// Needs: GET /api/hospitals/:id/users (team roster), messaging/collaboration backend
import React, { useState } from 'react';
import { MessageCircle, Users, Bell, Heart } from 'lucide-react';

type TabId = 'messages' | 'team' | 'alerts';

const TeamCollaborationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('team');

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="metal-card bg-white border border-titanium-200 rounded-2xl">
      <div className="px-6 py-4 border-b border-titanium-200 bg-white/80 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-titanium-900">Team Collaboration</h3>
            <p className="text-sm text-titanium-500">Care team messaging and coordination</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-titanium-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-porsche-600 border-b-2 border-porsche-600'
                  : 'text-titanium-500 hover:text-titanium-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {activeTab === 'team' && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Users className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">EHR Integration Required</div>
            <div className="text-xs mt-1">Team roster requires hospital user directory via Redox integration</div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <MessageCircle className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">EHR Integration Required</div>
            <div className="text-xs mt-1">Secure messaging requires clinical messaging backend</div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Heart className="w-8 h-8 mb-2 text-titanium-300" />
            <div className="text-sm font-medium">EHR Integration Required</div>
            <div className="text-xs mt-1">Clinical alerts require live EHR data via Redox integration</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCollaborationPanel;
