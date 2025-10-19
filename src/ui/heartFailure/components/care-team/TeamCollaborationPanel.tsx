import React, { useState } from 'react';
import { MessageCircle, Users, Bell, Send, Clock, CheckCircle, AlertTriangle, User, Phone, Video } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialty?: string;
  status: 'online' | 'away' | 'offline';
  avatar?: string;
  phone?: string;
  pager?: string;
  lastActive: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  priority: 'normal' | 'urgent';
  patientContext?: {
    mrn: string;
    name: string;
  };
  messageType: 'text' | 'consultation' | 'alert' | 'handoff';
  read: boolean;
  responses?: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
  }[];
}

interface Alert {
  id: string;
  type: 'critical_value' | 'medication' | 'appointment' | 'discharge';
  patient: string;
  mrn: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  assignedTo: string;
}

const TeamCollaborationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'team' | 'alerts'>('messages');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'urgent' | 'unread'>('all');

  const teamMembers: TeamMember[] = [
    {
      id: 'TM001',
      name: 'Dr. Sarah Rivera',
      role: 'Attending Cardiologist',
      specialty: 'Interventional Cardiology',
      status: 'online',
      phone: '(555) 123-4567',
      pager: '12345',
      lastActive: '2025-10-19T10:30:00',
    },
    {
      id: 'TM002',
      name: 'Dr. Michael Chen',
      role: 'Heart Failure Specialist',
      specialty: 'Advanced Heart Failure',
      status: 'online',
      phone: '(555) 234-5678',
      pager: '23456',
      lastActive: '2025-10-19T11:45:00',
    },
    {
      id: 'TM003',
      name: 'Sarah Johnson, NP',
      role: 'Nurse Practitioner',
      specialty: 'Cardiology',
      status: 'away',
      phone: '(555) 345-6789',
      lastActive: '2025-10-19T09:15:00',
    },
    {
      id: 'TM004',
      name: 'Dr. Amanda Foster',
      role: 'Cardiology Fellow',
      specialty: 'General Cardiology',
      status: 'online',
      phone: '(555) 456-7890',
      lastActive: '2025-10-19T11:30:00',
    },
    {
      id: 'TM005',
      name: 'Lisa Martinez, PharmD',
      role: 'Clinical Pharmacist',
      specialty: 'Cardiology',
      status: 'offline',
      phone: '(555) 567-8901',
      lastActive: '2025-10-18T17:00:00',
    },
    {
      id: 'TM006',
      name: 'David Park, RN',
      role: 'Charge Nurse',
      specialty: 'Cardiac ICU',
      status: 'online',
      phone: '(555) 678-9012',
      lastActive: '2025-10-19T12:00:00',
    },
  ];

  const messages: Message[] = [
    {
      id: 'MSG001',
      senderId: 'TM003',
      senderName: 'Sarah Johnson, NP',
      senderRole: 'Nurse Practitioner',
      content: 'Patient Johnson (MRN: 123456789) is experiencing worsening SOB. Current BNP is 2,400 (up from 800 last week). Should we consider IV diuretics?',
      timestamp: '2025-10-19T11:45:00',
      priority: 'urgent',
      patientContext: {
        mrn: '123456789',
        name: 'Johnson, Maria',
      },
      messageType: 'consultation',
      read: false,
      responses: [
        {
          id: 'RESP001',
          senderId: 'TM002',
          senderName: 'Dr. Michael Chen',
          content: 'Yes, please start IV furosemide 40mg BID. Also check echo for interval change and consider CRT evaluation.',
          timestamp: '2025-10-19T11:50:00',
        },
      ],
    },
    {
      id: 'MSG002',
      senderId: 'TM005',
      senderName: 'Lisa Martinez, PharmD',
      senderRole: 'Clinical Pharmacist',
      content: 'Medication reconciliation complete for Davis, Linda (MRN: 456789123). Found potential drug interaction between spironolactone and ACE inhibitor - monitoring K+ closely.',
      timestamp: '2025-10-19T10:30:00',
      priority: 'normal',
      patientContext: {
        mrn: '456789123',
        name: 'Davis, Linda',
      },
      messageType: 'alert',
      read: true,
    },
    {
      id: 'MSG003',
      senderId: 'TM001',
      senderName: 'Dr. Sarah Rivera',
      senderRole: 'Attending Cardiologist',
      content: 'Team: We have a new STEMI activation coming to the cath lab in 10 minutes. Patient is 67M with anterior STEMI, cardiogenic shock. EP fellow please prepare for IABP.',
      timestamp: '2025-10-19T09:15:00',
      priority: 'urgent',
      messageType: 'alert',
      read: true,
    },
    {
      id: 'MSG004',
      senderId: 'TM006',
      senderName: 'David Park, RN',
      senderRole: 'Charge Nurse',
      content: 'Handoff update: Williams, Robert (MRN: 987654321) is stable post-cath. Moving to step-down unit. Continue current meds, follow-up echo in AM.',
      timestamp: '2025-10-19T08:45:00',
      priority: 'normal',
      messageType: 'handoff',
      read: true,
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'AL001',
      type: 'critical_value',
      patient: 'Anderson, Sarah',
      mrn: '321654987',
      message: 'Critical troponin level: 15.2 ng/mL (Normal: <0.04)',
      timestamp: '2025-10-19T11:55:00',
      acknowledged: false,
      assignedTo: 'Dr. Rivera',
    },
    {
      id: 'AL002',
      type: 'medication',
      patient: 'Brown, Charles',
      mrn: '789123456',
      message: 'Medication allergy alert: Patient allergic to lisinopril, ACE inhibitor ordered',
      timestamp: '2025-10-19T10:20:00',
      acknowledged: true,
      assignedTo: 'Lisa Martinez, PharmD',
    },
    {
      id: 'AL003',
      type: 'appointment',
      patient: 'Johnson, Maria',
      mrn: '123456789',
      message: 'Upcoming CRT-D evaluation appointment tomorrow at 2 PM - patient has transportation concerns',
      timestamp: '2025-10-19T09:30:00',
      acknowledged: false,
      assignedTo: 'Sarah Johnson, NP',
    },
  ];

  const filteredMessages = messages.filter(msg => {
    if (messageFilter === 'urgent') return msg.priority === 'urgent';
    if (messageFilter === 'unread') return !msg.read;
    return true;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      online: 'bg-medical-green-500',
      away: 'bg-medical-amber-500',
      offline: 'bg-steel-400',
    };
    return colors[status as keyof typeof colors];
  };

  const getMessageTypeIcon = (type: string) => {
    const icons = {
      text: <MessageCircle className="w-4 h-4" />,
      consultation: <Users className="w-4 h-4" />,
      alert: <AlertTriangle className="w-4 h-4" />,
      handoff: <CheckCircle className="w-4 h-4" />,
    };
    return icons[type as keyof typeof icons];
  };

  const getMessageTypeColor = (type: string) => {
    const colors = {
      text: 'text-steel-600',
      consultation: 'text-medical-blue-600',
      alert: 'text-medical-red-600',
      handoff: 'text-medical-green-600',
    };
    return colors[type as keyof typeof colors];
  };

  const unreadCount = messages.filter(m => !m.read).length;
  const urgentCount = messages.filter(m => m.priority === 'urgent' && !m.read).length;
  const onlineCount = teamMembers.filter(m => m.status === 'online').length;
  const alertCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="retina-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-steel-900 mb-2 font-sf">
            Team Collaboration Hub
          </h2>
          <p className="text-steel-600">
            Real-time communication and care coordination
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-steel-600 mb-1">Unread Messages</div>
            <div className="text-2xl font-bold text-medical-red-600 font-sf">
              {unreadCount}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-steel-600 mb-1">Team Online</div>
            <div className="text-2xl font-bold text-medical-green-600 font-sf">
              {onlineCount}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'messages', label: 'Messages', count: unreadCount, icon: MessageCircle },
          { id: 'team', label: 'Team', count: onlineCount, icon: Users },
          { id: 'alerts', label: 'Alerts', count: alertCount, icon: Bell },
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'messages' | 'team' | 'alerts')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                activeTab === tab.id
                  ? 'border-medical-blue-400 bg-medical-blue-50 shadow-retina-3'
                  : 'border-steel-200 hover:border-steel-300 bg-white'
              }`}
            >
              <IconComponent className={`w-5 h-5 ${
                activeTab === tab.id ? 'text-medical-blue-600' : 'text-steel-600'
              }`} />
              <span className={`font-semibold ${
                activeTab === tab.id ? 'text-medical-blue-900' : 'text-steel-900'
              }`}>
                {tab.label}
              </span>
              {tab.count > 0 && (
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  activeTab === tab.id 
                    ? 'bg-medical-blue-100 text-medical-blue-700' 
                    : 'bg-medical-red-100 text-medical-red-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div>
          {/* Message Filters */}
          <div className="flex items-center justify-between mb-4 p-3 bg-steel-50 rounded-lg">
            <div className="flex gap-2">
              {['all', 'urgent', 'unread'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setMessageFilter(filter as 'all' | 'urgent' | 'unread')}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    messageFilter === filter
                      ? 'bg-medical-blue-100 text-medical-blue-800'
                      : 'text-steel-600 hover:bg-steel-100'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="text-sm text-steel-600">
              {filteredMessages.length} messages
            </div>
          </div>

          {/* Message List */}
          <div className="space-y-3 mb-4">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  !message.read 
                    ? 'border-medical-blue-200 bg-medical-blue-50/30' 
                    : 'border-steel-200 bg-white hover:border-steel-300'
                } ${message.priority === 'urgent' ? 'border-l-4 border-l-medical-red-400' : ''}`}
                onClick={() => setSelectedMessage(selectedMessage?.id === message.id ? null : message)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={getMessageTypeColor(message.messageType)}>
                      {getMessageTypeIcon(message.messageType)}
                    </div>
                    <div>
                      <div className="font-semibold text-steel-900">{message.senderName}</div>
                      <div className="text-sm text-steel-600">{message.senderRole}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {message.priority === 'urgent' && (
                      <span className="px-2 py-1 bg-medical-red-100 text-medical-red-700 text-xs font-semibold rounded">
                        URGENT
                      </span>
                    )}
                    {!message.read && (
                      <div className="w-3 h-3 bg-medical-blue-500 rounded-full"></div>
                    )}
                    <span className="text-xs text-steel-500">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                {message.patientContext && (
                  <div className="mb-2 p-2 bg-steel-100 rounded text-sm">
                    <span className="font-medium">Patient:</span> {message.patientContext.name} 
                    <span className="text-steel-600 ml-2">MRN: {message.patientContext.mrn}</span>
                  </div>
                )}
                
                <div className="text-steel-800 mb-2">{message.content}</div>
                
                {message.responses && message.responses.length > 0 && (
                  <div className="mt-3 pl-4 border-l-2 border-steel-200">
                    {message.responses.map((response) => (
                      <div key={response.id} className="mb-2 last:mb-0">
                        <div className="text-sm font-medium text-steel-700">{response.senderName}</div>
                        <div className="text-sm text-steel-600">{response.content}</div>
                        <div className="text-xs text-steel-500">
                          {new Date(response.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Message Compose */}
          <div className="p-4 bg-steel-50 rounded-xl border border-steel-200">
            <div className="flex gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to the team..."
                className="flex-1 p-3 border border-steel-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                rows={3}
              />
              <div className="flex flex-col gap-2">
                <button className="p-3 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors">
                  <Send className="w-5 h-5" />
                </button>
                <button className="p-3 bg-medical-red-600 text-white rounded-lg hover:bg-medical-red-700 transition-colors">
                  <AlertTriangle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-2 gap-4">
          {teamMembers.map((member) => (
            <div key={member.id} className="p-4 bg-white rounded-xl border border-steel-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-medical-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-medical-blue-600" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(member.status)}`}></div>
                  </div>
                  <div>
                    <div className="font-semibold text-steel-900">{member.name}</div>
                    <div className="text-sm text-steel-600">{member.role}</div>
                    {member.specialty && (
                      <div className="text-xs text-steel-500">{member.specialty}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-medical-green-100 text-medical-green-600 rounded-lg hover:bg-medical-green-200 transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-medical-blue-100 text-medical-blue-600 rounded-lg hover:bg-medical-blue-200 transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-steel-600 space-y-1">
                {member.phone && (
                  <div>Phone: {member.phone}</div>
                )}
                {member.pager && (
                  <div>Pager: {member.pager}</div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Last active: {new Date(member.lastActive).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                !alert.acknowledged 
                  ? 'border-medical-red-200 bg-medical-red-50/30' 
                  : 'border-steel-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    !alert.acknowledged ? 'text-medical-red-600' : 'text-steel-400'
                  }`} />
                  <div>
                    <div className="font-semibold text-steel-900">
                      {alert.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-steel-600">
                      {alert.patient} (MRN: {alert.mrn})
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-steel-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-steel-600">
                    Assigned: {alert.assignedTo}
                  </div>
                </div>
              </div>
              
              <div className="text-steel-800 mb-3">{alert.message}</div>
              
              {!alert.acknowledged && (
                <button className="px-4 py-2 bg-medical-green-600 text-white text-sm rounded-lg hover:bg-medical-green-700 transition-colors">
                  Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamCollaborationPanel;