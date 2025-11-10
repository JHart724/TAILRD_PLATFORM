import React, { useState } from 'react';
import { MessageCircle, Users, Bell, Send, Clock, CheckCircle, AlertTriangle, User, Phone, Video, ExternalLink, X, Heart, Thermometer, Droplets, Shield, Pill, FileText, Calendar, Activity } from 'lucide-react';

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

interface PatientInfo {
  mrn: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  lvef: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  priority: 'high' | 'medium' | 'low';
  recentAdmission: boolean;
  fullChart: {
    vitals: {
      bp: string;
      hr: number;
      temp: number;
      o2sat: number;
      weight: number;
    };
    labs: {
      creatinine: number;
      bun: number;
      sodium: number;
      potassium: number;
      hemoglobin: number;
      bnp?: number;
      troponin?: number;
    };
    medications: {
      name: string;
      dose: string;
      frequency: string;
    }[];
    provider: {
      attending: string;
      resident?: string;
      nurse: string;
    };
    notes: string[];
    allergies: string[];
    gdmtStatus: {
      betaBlocker: boolean;
      aceArb: boolean;
      mra: boolean;
      sglt2: boolean;
    };
  };
}

const TeamCollaborationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'team' | 'alerts'>('messages');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'urgent' | 'unread'>('all');
  const [showPatientPanel, setShowPatientPanel] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);

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

  // Mock patient data for collaboration context
  const patientDatabase: PatientInfo[] = [
    {
      mrn: '123456789',
      name: 'Johnson, Maria',
      age: 67,
      gender: 'F',
      lvef: 28,
      nyhaClass: 'III',
      priority: 'high',
      recentAdmission: true,
      fullChart: {
        vitals: {
          bp: '138/82',
          hr: 94,
          temp: 98.4,
          o2sat: 93,
          weight: 175.2
        },
        labs: {
          creatinine: 1.3,
          bun: 28,
          sodium: 136,
          potassium: 4.2,
          hemoglobin: 11.8,
          bnp: 2400
        },
        medications: [
          { name: 'Carvedilol', dose: '25mg', frequency: 'BID' },
          { name: 'Lisinopril', dose: '20mg', frequency: 'Daily' },
          { name: 'Furosemide', dose: '40mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Michael Chen',
          resident: 'Dr. Thompson',
          nurse: 'Sarah Johnson, NP'
        },
        notes: [
          'Patient reports increased dyspnea with minimal exertion',
          'BNP significantly elevated from 800 to 2,400',
          'Considering IV diuretics per Dr. Chen recommendation',
          'CRT evaluation scheduled'
        ],
        allergies: ['Sulfa drugs'],
        gdmtStatus: {
          betaBlocker: true,
          aceArb: true,
          mra: false,
          sglt2: false
        }
      }
    },
    {
      mrn: '456789123',
      name: 'Davis, Linda',
      age: 58,
      gender: 'F',
      lvef: 22,
      nyhaClass: 'IV',
      priority: 'high',
      recentAdmission: true,
      fullChart: {
        vitals: {
          bp: '98/62',
          hr: 110,
          temp: 99.2,
          o2sat: 89,
          weight: 162.8
        },
        labs: {
          creatinine: 2.1,
          bun: 58,
          sodium: 132,
          potassium: 5.1,
          hemoglobin: 9.8,
          bnp: 3850
        },
        medications: [
          { name: 'Carvedilol', dose: '12.5mg', frequency: 'BID' },
          { name: 'Lisinopril', dose: '5mg', frequency: 'Daily' },
          { name: 'Spironolactone', dose: '25mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Martinez',
          resident: 'Dr. Wilson',
          nurse: 'Angela Davis, RN'
        },
        notes: [
          'Advanced heart failure with frequent hospitalizations',
          'Drug interaction monitoring between spironolactone and ACE inhibitor',
          'K+ elevated at 5.1 - close monitoring required',
          'Candidate for advanced heart failure interventions'
        ],
        allergies: ['Penicillin'],
        gdmtStatus: {
          betaBlocker: true,
          aceArb: true,
          mra: true,
          sglt2: false
        }
      }
    },
    {
      mrn: '987654321',
      name: 'Williams, Robert',
      age: 72,
      gender: 'M',
      lvef: 35,
      nyhaClass: 'II',
      priority: 'medium',
      recentAdmission: false,
      fullChart: {
        vitals: {
          bp: '124/76',
          hr: 68,
          temp: 98.6,
          o2sat: 97,
          weight: 189.5
        },
        labs: {
          creatinine: 1.1,
          bun: 22,
          sodium: 140,
          potassium: 4.5,
          hemoglobin: 13.2,
          bnp: 680
        },
        medications: [
          { name: 'Metoprolol XL', dose: '50mg', frequency: 'Daily' },
          { name: 'Lisinopril', dose: '10mg', frequency: 'Daily' },
          { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Rivera',
          nurse: 'David Park, RN'
        },
        notes: [
          'Stable heart failure with good functional capacity',
          'Post-cath stable, moving to step-down unit',
          'Continue current medications',
          'Follow-up echo scheduled for morning'
        ],
        allergies: ['NKDA'],
        gdmtStatus: {
          betaBlocker: true,
          aceArb: true,
          mra: false,
          sglt2: false
        }
      }
    },
    {
      mrn: '321654987',
      name: 'Anderson, Sarah',
      age: 81,
      gender: 'F',
      lvef: 31,
      nyhaClass: 'III',
      priority: 'high',
      recentAdmission: false,
      fullChart: {
        vitals: {
          bp: '108/68',
          hr: 58,
          temp: 98.8,
          o2sat: 95,
          weight: 156.3
        },
        labs: {
          creatinine: 1.6,
          bun: 42,
          sodium: 139,
          potassium: 4.6,
          hemoglobin: 10.9,
          bnp: 890,
          troponin: 15.2
        },
        medications: [
          { name: 'Diltiazem', dose: '120mg', frequency: 'Daily' },
          { name: 'Lisinopril', dose: '2.5mg', frequency: 'Daily' },
          { name: 'Furosemide', dose: '20mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Rivera',
          nurse: 'Michael Chen, RN'
        },
        notes: [
          'CRITICAL: Troponin significantly elevated at 15.2',
          'Elderly patient with multiple comorbidities',
          'Beta-blocker intolerance due to bradycardia',
          'Requires immediate cardiology evaluation'
        ],
        allergies: ['Beta-blockers', 'NSAIDs'],
        gdmtStatus: {
          betaBlocker: false,
          aceArb: true,
          mra: false,
          sglt2: false
        }
      }
    },
    {
      mrn: '789123456',
      name: 'Brown, Charles',
      age: 45,
      gender: 'M',
      lvef: 42,
      nyhaClass: 'II',
      priority: 'medium',
      recentAdmission: false,
      fullChart: {
        vitals: {
          bp: '142/88',
          hr: 72,
          temp: 98.1,
          o2sat: 98,
          weight: 201.5
        },
        labs: {
          creatinine: 0.9,
          bun: 18,
          sodium: 142,
          potassium: 4.1,
          hemoglobin: 14.2,
          bnp: 180
        },
        medications: [
          { name: 'Amlodipine', dose: '5mg', frequency: 'Daily' },
          { name: 'Losartan', dose: '50mg', frequency: 'Daily' },
          { name: 'HCTZ', dose: '25mg', frequency: 'Daily' }
        ],
        provider: {
          attending: 'Dr. Foster',
          nurse: 'Lisa Martinez, PharmD'
        },
        notes: [
          'Medication allergy alert triggered',
          'Patient allergic to lisinopril - ACE inhibitor ordered',
          'Stable heart failure with preserved ejection fraction',
          'Pharmacy intervention successful'
        ],
        allergies: ['Lisinopril', 'ACE inhibitors'],
        gdmtStatus: {
          betaBlocker: false,
          aceArb: false,
          mra: false,
          sglt2: false
        }
      }
    }
  ];

  // Function to get patient data by MRN
  const getPatientByMRN = (mrn: string): PatientInfo | undefined => {
    return patientDatabase.find(patient => patient.mrn === mrn);
  };

  // Function to open patient chart
  const openPatientChart = (mrn: string) => {
    const patient = getPatientByMRN(mrn);
    if (patient) {
      setSelectedPatient(patient);
      setShowPatientPanel(true);
    }
  };

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
                  <div 
                    className="mb-2 p-2 bg-steel-100 rounded text-sm cursor-pointer hover:bg-steel-200 transition-colors flex items-center justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPatientChart(message.patientContext!.mrn);
                    }}
                  >
                    <div>
                      <span className="font-medium">Patient:</span> {message.patientContext.name} 
                      <span className="text-steel-600 ml-2">MRN: {message.patientContext.mrn}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-steel-600" />
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
                    <div 
                      className="text-sm text-steel-600 cursor-pointer hover:text-medical-blue-600 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPatientChart(alert.mrn);
                      }}
                    >
                      {alert.patient} (MRN: {alert.mrn})
                      <ExternalLink className="w-3 h-3" />
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

      {/* Patient Detail Side Panel */}
      {showPatientPanel && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-1/2 h-full overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                  <p className="text-gray-600">
                    MRN: {selectedPatient.mrn} | Age: {selectedPatient.age}{selectedPatient.gender}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 rounded-lg border-l-4 font-medium text-sm ${
                      selectedPatient.priority === 'high' ? 'border-red-500 bg-red-50 text-red-700' :
                      selectedPatient.priority === 'medium' ? 'border-orange-500 bg-orange-50 text-orange-700' :
                      'border-green-500 bg-green-50 text-green-700'
                    }`}>
                      {selectedPatient.priority.toUpperCase()} Priority
                    </span>
                    {selectedPatient.recentAdmission && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                        Recent Admission
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPatientPanel(false);
                    setSelectedPatient(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Clinical Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">{selectedPatient.lvef}%</span>
                  </div>
                  <p className="text-sm text-gray-600">LVEF</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold text-purple-600 mb-2">NYHA {selectedPatient.nyhaClass}</div>
                  <p className="text-sm text-gray-600">Functional Class</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600 mb-2">
                    {Object.values(selectedPatient.fullChart.gdmtStatus).filter(status => !status).length}
                  </div>
                  <p className="text-sm text-gray-600">GDMT Gaps</p>
                </div>
              </div>

              {/* Vital Signs */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  Current Vital Signs
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Blood Pressure</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.bp} mmHg</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Heart Rate</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.hr} bpm</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Temperature</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.temp}°F</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">O2 Saturation</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.o2sat}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Weight</span>
                    <p className="font-medium">{selectedPatient.fullChart.vitals.weight} lbs</p>
                  </div>
                </div>
              </div>

              {/* Laboratory Results */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-green-600" />
                  Laboratory Results
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Creatinine</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.creatinine} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">BUN</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.bun} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Sodium</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.sodium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Potassium</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.potassium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hemoglobin</span>
                    <p className="font-medium">{selectedPatient.fullChart.labs.hemoglobin} g/dL</p>
                  </div>
                  {selectedPatient.fullChart.labs.bnp && (
                    <div>
                      <span className="text-sm text-gray-600">BNP</span>
                      <p className="font-medium">{selectedPatient.fullChart.labs.bnp} pg/mL</p>
                    </div>
                  )}
                  {selectedPatient.fullChart.labs.troponin && (
                    <div>
                      <span className="text-sm text-gray-600">Troponin</span>
                      <p className={`font-medium ${selectedPatient.fullChart.labs.troponin > 0.04 ? 'text-red-600' : ''}`}>
                        {selectedPatient.fullChart.labs.troponin} ng/mL
                        {selectedPatient.fullChart.labs.troponin > 0.04 && (
                          <span className="text-xs text-red-600 block">CRITICAL</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Medications */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  Current Medications
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                      <span className="font-medium">{med.name}</span>
                      <span className="text-sm text-gray-600">{med.dose} {med.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GDMT Status */}
              <div className="bg-medical-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-medical-blue-600" />
                  GDMT Status
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPatient.fullChart.gdmtStatus.betaBlocker ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">Beta Blocker</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPatient.fullChart.gdmtStatus.aceArb ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">ACE/ARB/ARNi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPatient.fullChart.gdmtStatus.mra ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">MRA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPatient.fullChart.gdmtStatus.sglt2 ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm">SGLT2i</span>
                  </div>
                </div>
              </div>

              {/* Care Team */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Care Team
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attending Physician</span>
                    <span className="font-medium">{selectedPatient.fullChart.provider.attending}</span>
                  </div>
                  {selectedPatient.fullChart.provider.resident && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resident</span>
                      <span className="font-medium">{selectedPatient.fullChart.provider.resident}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Nurse</span>
                    <span className="font-medium">{selectedPatient.fullChart.provider.nurse}</span>
                  </div>
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  Recent Clinical Notes
                </h3>
                <div className="space-y-2">
                  {selectedPatient.fullChart.notes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Activity className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allergies */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Allergies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.fullChart.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button className="flex-1 px-4 py-3 bg-medical-blue-600 text-white rounded-lg font-medium hover:bg-medical-blue-700 transition-colors">
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Message Team About Patient
                </button>
                <button
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  onClick={() => {
                    setShowPatientPanel(false);
                    setSelectedPatient(null);
                  }}
                >
                  Close Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCollaborationPanel;