import React, { useState } from 'react';
import { Users, Calendar, AlertTriangle, Clock, Heart, Zap, Phone, MessageSquare, Shield } from 'lucide-react';
import AnticoagulationSafetyChecker from '../components/AnticoagulationSafetyChecker';

interface EPPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  rhythm: string;
  device?: string;
  lastEP: string;
  nextAppt: string;
  riskLevel: 'low' | 'medium' | 'high';
  alerts: string[];
  provider: string;
  deviceStatus?: {
    type: string;
    battery: number;
    lastInterrogation: string;
    alerts: string[];
  };
}

interface EPTask {
  id: string;
  type: 'device-check' | 'follow-up' | 'urgent' | 'consult';
  patient: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed';
}

const EPCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'tasks' | 'schedule' | 'safety'>('patients');
  const [selectedPatient, setSelectedPatient] = useState<EPPatient | null>(null);

  const patients: EPPatient[] = [
    {
      id: 'EP001',
      name: 'Johnson, Michael',
      mrn: 'MRN123456',
      age: 67,
      rhythm: 'Atrial Fibrillation',
      device: 'ICD',
      lastEP: '2025-08-15',
      nextAppt: '2025-10-25',
      riskLevel: 'high',
      alerts: ['Device interrogation overdue', 'Missed last appointment'],
      provider: 'Dr. Martinez',
      deviceStatus: {
        type: 'ICD',
        battery: 78,
        lastInterrogation: '2025-09-01',
        alerts: ['Inappropriate shocks detected']
      }
    },
    {
      id: 'EP002',
      name: 'Davis, Sarah',
      mrn: 'MRN234567',
      age: 54,
      rhythm: 'Ventricular Tachycardia',
      device: 'CRT-D',
      lastEP: '2025-09-20',
      nextAppt: '2025-10-22',
      riskLevel: 'medium',
      alerts: ['Pre-procedure clearance needed'],
      provider: 'Dr. Chen',
      deviceStatus: {
        type: 'CRT-D',
        battery: 92,
        lastInterrogation: '2025-10-01',
        alerts: []
      }
    },
    {
      id: 'EP003',
      name: 'Wilson, Robert',
      mrn: 'MRN345678',
      age: 72,
      rhythm: 'Bradycardia',
      device: 'Pacemaker',
      lastEP: '2025-07-10',
      nextAppt: '2025-10-28',
      riskLevel: 'low',
      alerts: [],
      provider: 'Dr. Thompson',
      deviceStatus: {
        type: 'Pacemaker',
        battery: 65,
        lastInterrogation: '2025-09-28',
        alerts: ['Battery EOL approaching']
      }
    },
    {
      id: 'EP004',
      name: 'Brown, Jennifer',
      mrn: 'MRN456789',
      age: 48,
      rhythm: 'Atrial Flutter',
      lastEP: '2025-09-05',
      nextAppt: '2025-11-02',
      riskLevel: 'medium',
      alerts: ['Post-ablation follow-up'],
      provider: 'Dr. Rodriguez'
    }
  ];

  const tasks: EPTask[] = [
    {
      id: 'T001',
      type: 'device-check',
      patient: 'Johnson, Michael',
      description: 'ICD interrogation and battery check',
      dueDate: '2025-10-21',
      priority: 'high',
      assignedTo: 'RN Davis',
      status: 'pending'
    },
    {
      id: 'T002',
      type: 'follow-up',
      patient: 'Davis, Sarah',
      description: 'Post-ablation wound check',
      dueDate: '2025-10-22',
      priority: 'medium',
      assignedTo: 'NP Johnson',
      status: 'in-progress'
    },
    {
      id: 'T003',
      type: 'urgent',
      patient: 'Wilson, Robert',
      description: 'Battery replacement consultation',
      dueDate: '2025-10-20',
      priority: 'high',
      assignedTo: 'Dr. Thompson',
      status: 'pending'
    },
    {
      id: 'T004',
      type: 'consult',
      patient: 'Brown, Jennifer',
      description: 'Ablation success assessment',
      dueDate: '2025-10-25',
      priority: 'medium',
      assignedTo: 'Dr. Rodriguez',
      status: 'completed'
    }
  ];

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'border-l-medical-green-400 bg-medical-green-50/50',
      medium: 'border-l-medical-amber-400 bg-medical-amber-50/50',
      high: 'border-l-medical-red-400 bg-medical-red-50/50'
    };
    return colors[risk as keyof typeof colors];
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-medical-green-600 bg-medical-green-100',
      medium: 'text-medical-amber-600 bg-medical-amber-100',
      high: 'text-medical-red-600 bg-medical-red-100'
    };
    return colors[priority as keyof typeof colors];
  };

  const getTaskIcon = (type: string) => {
    const icons = {
      'device-check': Zap,
      'follow-up': Calendar,
      'urgent': AlertTriangle,
      'consult': Users
    };
    return icons[type as keyof typeof icons] || Users;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'patients', label: 'Patient Census', icon: Heart },
          { id: 'tasks', label: 'Task Management', icon: Clock },
          { id: 'safety', label: 'Safety Screening', icon: Shield },
          { id: 'schedule', label: 'Team Schedule', icon: Calendar }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-medical-blue-500 text-medical-blue-600 bg-medical-blue-50'
                  : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Patient Census Tab */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`retina-card p-6 border-l-4 cursor-pointer transition-all duration-300 hover:shadow-retina-3 ${getRiskColor(patient.riskLevel)}`}
              onClick={() => setSelectedPatient(selectedPatient?.id === patient.id ? null : patient)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-steel-900">{patient.name}</h3>
                  <p className="text-sm text-steel-600">MRN: {patient.mrn} • Age {patient.age}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  patient.riskLevel === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
                  patient.riskLevel === 'medium' ? 'bg-medical-amber-100 text-medical-amber-800' :
                  'bg-medical-green-100 text-medical-green-800'
                }`}>
                  {patient.riskLevel.toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Rhythm:</span>
                  <span className="text-sm font-semibold text-steel-900">{patient.rhythm}</span>
                </div>
                {patient.device && (
                  <div className="flex justify-between">
                    <span className="text-sm text-steel-600">Device:</span>
                    <span className="text-sm font-semibold text-medical-blue-600">{patient.device}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Provider:</span>
                  <span className="text-sm font-semibold text-steel-900">{patient.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Next Appt:</span>
                  <span className="text-sm font-semibold text-steel-900">{formatDate(patient.nextAppt)}</span>
                </div>
              </div>

              {patient.alerts.length > 0 && (
                <div className="mt-4 pt-3 border-t border-steel-200">
                  <div className="text-xs text-steel-600 mb-2">Active Alerts</div>
                  <div className="space-y-1">
                    {patient.alerts.map((alert, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-medical-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        {alert}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPatient?.id === patient.id && patient.deviceStatus && (
                <div className="mt-4 pt-3 border-t border-steel-200">
                  <div className="text-sm font-semibold text-steel-800 mb-2">Device Status</div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-steel-600">Battery:</span>
                      <span className="text-xs font-semibold text-steel-900">{patient.deviceStatus.battery}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-steel-600">Last Check:</span>
                      <span className="text-xs font-semibold text-steel-900">{formatDate(patient.deviceStatus.lastInterrogation)}</span>
                    </div>
                    {patient.deviceStatus.alerts.length > 0 && (
                      <div className="space-y-1">
                        {patient.deviceStatus.alerts.map((alert, index) => (
                          <div key={index} className="text-xs text-medical-amber-700 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {alert}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-gradient-to-r from-medical-blue-600 to-medical-blue-700 text-white text-xs rounded-lg hover:from-medical-blue-700 hover:to-medical-blue-800 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1 backdrop-blur border border-white/20">
                  <Phone className="w-3 h-3" />
                  Call
                </button>
                <button className="flex-1 px-3 py-2 bg-gradient-to-r from-steel-100/80 to-steel-200/80 text-steel-800 text-xs rounded-lg hover:from-steel-200/90 hover:to-steel-300/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1 backdrop-blur border border-steel-300/40">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Management Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="retina-card p-6">
            <h2 className="text-xl font-bold text-steel-900 mb-4 font-sf">Active Tasks</h2>
            <div className="space-y-3">
              {tasks.filter(task => task.status !== 'completed').map((task) => {
                const IconComponent = getTaskIcon(task.type);
                return (
                  <div
                    key={task.id}
                    className="retina-card p-4 data-focus"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-medical-blue-100">
                          <IconComponent className="w-4 h-4 text-medical-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-steel-900">{task.description}</h3>
                          <p className="text-sm text-steel-600">Patient: {task.patient}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-steel-600">Due Date:</span>
                        <div className="font-semibold text-steel-900">{formatDate(task.dueDate)}</div>
                      </div>
                      <div>
                        <span className="text-steel-600">Assigned To:</span>
                        <div className="font-semibold text-steel-900">{task.assignedTo}</div>
                      </div>
                      <div>
                        <span className="text-steel-600">Status:</span>
                        <div className={`font-semibold ${
                          task.status === 'pending' ? 'text-medical-amber-600' :
                          task.status === 'in-progress' ? 'text-medical-blue-600' :
                          'text-medical-green-600'
                        }`}>
                          {task.status.replace('-', ' ').toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button className="px-4 py-2 bg-medical-blue-500 text-white text-sm rounded-lg hover:bg-medical-blue-600 transition-colors">
                        Update Status
                      </button>
                      <button className="px-4 py-2 bg-steel-200 text-steel-800 text-sm rounded-lg hover:bg-steel-300 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="retina-card p-6">
            <h2 className="text-xl font-bold text-steel-900 mb-4 font-sf">Completed Tasks</h2>
            <div className="space-y-3">
              {tasks.filter(task => task.status === 'completed').map((task) => {
                const IconComponent = getTaskIcon(task.type);
                return (
                  <div
                    key={task.id}
                    className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200 opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-medical-green-100">
                          <IconComponent className="w-4 h-4 text-medical-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-steel-900">{task.description}</h3>
                          <p className="text-sm text-steel-600">Patient: {task.patient} • {task.assignedTo}</p>
                        </div>
                      </div>
                      <div className="text-xs text-medical-green-600 font-semibold">COMPLETED</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Team Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="retina-card p-6">
          <h2 className="text-xl font-bold text-steel-900 mb-6 font-sf">EP Team Schedule</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-steel-800 mb-4">Today's Schedule</h3>
              <div className="space-y-3">
                <div className="p-4 bg-medical-blue-50 rounded-lg border border-medical-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-steel-900">Dr. Martinez</span>
                    <span className="text-sm text-medical-blue-600">EP Lab A</span>
                  </div>
                  <div className="text-sm text-steel-600">
                    08:00 - 16:00 • AF Ablations (3 cases)
                  </div>
                </div>

                <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-steel-900">Dr. Chen</span>
                    <span className="text-sm text-medical-green-600">EP Lab B</span>
                  </div>
                  <div className="text-sm text-steel-600">
                    09:00 - 15:00 • Device Implants (4 cases)
                  </div>
                </div>

                <div className="p-4 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-steel-900">Dr. Thompson</span>
                    <span className="text-sm text-medical-amber-600">Clinic</span>
                  </div>
                  <div className="text-sm text-steel-600">
                    13:00 - 17:00 • Post-op Follow-ups (8 patients)
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-steel-800 mb-4">Team Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-medical-green-500 rounded-full"></div>
                    <span className="font-medium text-steel-900">RN Davis</span>
                  </div>
                  <span className="text-sm text-steel-600">Available</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-medical-amber-500 rounded-full"></div>
                    <span className="font-medium text-steel-900">NP Johnson</span>
                  </div>
                  <span className="text-sm text-steel-600">In Procedure</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-medical-red-500 rounded-full"></div>
                    <span className="font-medium text-steel-900">Tech Wilson</span>
                  </div>
                  <span className="text-sm text-steel-600">On Break</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-steel-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-medical-green-500 rounded-full"></div>
                    <span className="font-medium text-steel-900">Tech Brown</span>
                  </div>
                  <span className="text-sm text-steel-600">Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Screening Tab */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <AnticoagulationSafetyChecker />
        </div>
      )}
    </div>
  );
};

export default EPCareTeamView;