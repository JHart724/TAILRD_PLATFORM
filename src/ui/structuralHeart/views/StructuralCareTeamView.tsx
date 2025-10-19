import React, { useState } from 'react';
import { Users, Calendar, Heart, Clock, AlertTriangle, CheckCircle, Phone, MessageSquare } from 'lucide-react';

interface StructuralPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  procedure: string;
  status: 'pre-procedure' | 'scheduled' | 'post-procedure' | 'follow-up';
  riskLevel: 'low' | 'intermediate' | 'high' | 'prohibitive';
  scheduledDate?: string;
  procedureDate?: string;
  heartTeamDecision: string;
  provider: string;
  coordinator: string;
  alerts: string[];
  clinicalData: {
    ef: number;
    stsScore?: number;
    aorticValveArea?: number;
    mrSeverity?: string;
    frailtyScore?: number;
  };
}

interface HeartTeamMeeting {
  id: string;
  date: string;
  time: string;
  patients: string[];
  attendees: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  decisions: number;
}

const StructuralCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'heart-team' | 'scheduling'>('patients');

  const patients: StructuralPatient[] = [
    {
      id: 'SH001',
      name: 'Thompson, Margaret',
      mrn: 'MRN789012',
      age: 84,
      procedure: 'TAVR',
      status: 'scheduled',
      riskLevel: 'intermediate',
      scheduledDate: '2025-10-25',
      heartTeamDecision: 'TAVR Approved',
      provider: 'Dr. Martinez',
      coordinator: 'Sarah Johnson, RN',
      alerts: ['Pre-op clearance pending', 'Family meeting scheduled'],
      clinicalData: {
        ef: 55,
        stsScore: 6.8,
        aorticValveArea: 0.6,
        frailtyScore: 3
      }
    },
    {
      id: 'SH002',
      name: 'Rodriguez, Carlos',
      mrn: 'MRN890123',
      age: 72,
      procedure: 'TAVR',
      status: 'pre-procedure',
      riskLevel: 'low',
      heartTeamDecision: 'TAVR vs SAVR Discussion',
      provider: 'Dr. Chen',
      coordinator: 'Michael Davis, RN',
      alerts: ['Awaiting anesthesia consult'],
      clinicalData: {
        ef: 60,
        stsScore: 3.2,
        aorticValveArea: 0.7,
        frailtyScore: 2
      }
    },
    {
      id: 'SH003',
      name: 'Anderson, Dorothy',
      mrn: 'MRN901234',
      age: 78,
      procedure: 'MitraClip',
      status: 'post-procedure',
      riskLevel: 'intermediate',
      procedureDate: '2025-10-15',
      heartTeamDecision: 'MitraClip Approved',
      provider: 'Dr. Thompson',
      coordinator: 'Lisa Brown, RN',
      alerts: ['30-day echo scheduled'],
      clinicalData: {
        ef: 45,
        mrSeverity: 'Severe'
      }
    },
    {
      id: 'SH004',
      name: 'Wilson, Robert',
      mrn: 'MRN012345',
      age: 89,
      procedure: 'TAVR',
      status: 'follow-up',
      riskLevel: 'prohibitive',
      procedureDate: '2025-09-28',
      heartTeamDecision: 'TAVR - Compassionate Use',
      provider: 'Dr. Rodriguez',
      coordinator: 'Jennifer Wilson, RN',
      alerts: ['30-day readmission risk'],
      clinicalData: {
        ef: 35,
        stsScore: 12.4,
        aorticValveArea: 0.5,
        frailtyScore: 5
      }
    }
  ];

  const heartTeamMeetings: HeartTeamMeeting[] = [
    {
      id: 'HT001',
      date: '2025-10-21',
      time: '07:00',
      patients: ['Thompson, Margaret', 'Rodriguez, Carlos', 'Johnson, Patricia'],
      attendees: ['Dr. Martinez', 'Dr. Chen', 'Dr. Thompson', 'Dr. Rodriguez'],
      status: 'scheduled',
      decisions: 3
    },
    {
      id: 'HT002',
      date: '2025-10-14',
      time: '07:00',
      patients: ['Anderson, Dorothy', 'Williams, James'],
      attendees: ['Dr. Martinez', 'Dr. Chen', 'Dr. Thompson'],
      status: 'completed',
      decisions: 2
    }
  ];

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'border-l-medical-green-400 bg-medical-green-50/50',
      intermediate: 'border-l-medical-amber-400 bg-medical-amber-50/50',
      high: 'border-l-medical-red-400 bg-medical-red-50/50',
      prohibitive: 'border-l-medical-red-600 bg-medical-red-100/50'
    };
    return colors[risk as keyof typeof colors];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'pre-procedure': 'text-medical-amber-600 bg-medical-amber-100',
      'scheduled': 'text-medical-blue-600 bg-medical-blue-100',
      'post-procedure': 'text-medical-green-600 bg-medical-green-100',
      'follow-up': 'text-steel-600 bg-steel-100'
    };
    return colors[status as keyof typeof colors];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-steel-200">
        {[
          { id: 'patients', label: 'Patient Pipeline', icon: Heart },
          { id: 'heart-team', label: 'Heart Team', icon: Users },
          { id: 'scheduling', label: 'Scheduling', icon: Calendar }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 border-b-2 transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-medical-red-500 text-medical-red-600 bg-medical-red-50'
                  : 'border-transparent text-steel-600 hover:text-steel-800 hover:bg-steel-50'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Patient Pipeline Tab */}
      {activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`retina-card p-6 border-l-4 ${getRiskColor(patient.riskLevel)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-steel-900">{patient.name}</h3>
                  <p className="text-sm text-steel-600">MRN: {patient.mrn} • Age {patient.age}</p>
                  <p className="text-sm text-steel-600">EF: {patient.clinicalData.ef}%</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  patient.riskLevel === 'low' ? 'bg-medical-green-100 text-medical-green-800' :
                  patient.riskLevel === 'intermediate' ? 'bg-medical-amber-100 text-medical-amber-800' :
                  patient.riskLevel === 'high' ? 'bg-medical-red-100 text-medical-red-800' :
                  'bg-medical-red-200 text-medical-red-900'
                }`}>
                  {patient.riskLevel.toUpperCase()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Procedure:</span>
                  <span className="text-sm font-semibold text-steel-900">{patient.procedure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Status:</span>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusColor(patient.status)}`}>
                    {patient.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Provider:</span>
                  <span className="text-sm font-semibold text-steel-900">{patient.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-steel-600">Coordinator:</span>
                  <span className="text-sm font-semibold text-steel-900">{patient.coordinator}</span>
                </div>
                
                {patient.scheduledDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-steel-600">Scheduled:</span>
                    <span className="text-sm font-semibold text-medical-blue-600">
                      {formatDate(patient.scheduledDate)}
                    </span>
                  </div>
                )}

                {patient.procedureDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-steel-600">Procedure Date:</span>
                    <span className="text-sm font-semibold text-medical-green-600">
                      {formatDate(patient.procedureDate)}
                    </span>
                  </div>
                )}

                {patient.clinicalData.stsScore && (
                  <div className="flex justify-between">
                    <span className="text-sm text-steel-600">STS Score:</span>
                    <span className="text-sm font-semibold text-medical-red-600">
                      {patient.clinicalData.stsScore}%
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-steel-200">
                <div className="text-sm font-semibold text-steel-800 mb-2">Heart Team Decision</div>
                <div className="text-sm text-steel-700 mb-3">{patient.heartTeamDecision}</div>
                
                {patient.alerts.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-steel-600 mb-1">Active Alerts</div>
                    {patient.alerts.map((alert, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-medical-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        {alert}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 px-3 py-2 bg-medical-red-500 text-white text-xs rounded-lg hover:bg-medical-red-600 transition-colors flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" />
                  Call
                </button>
                <button className="flex-1 px-3 py-2 bg-steel-200 text-steel-800 text-xs rounded-lg hover:bg-steel-300 transition-colors flex items-center justify-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heart Team Tab */}
      {activeTab === 'heart-team' && (
        <div className="space-y-6">
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
              Multidisciplinary Heart Team
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-steel-800 mb-4">Upcoming Meetings</h3>
                <div className="space-y-3">
                  {heartTeamMeetings.filter(m => m.status === 'scheduled').map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 bg-medical-blue-50 rounded-lg border border-medical-blue-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-steel-900">
                          {formatDate(meeting.date)} at {meeting.time}
                        </span>
                        <span className="text-sm text-medical-blue-600">{meeting.patients.length} patients</span>
                      </div>
                      <div className="text-sm text-steel-600 mb-2">
                        Patients: {meeting.patients.join(', ')}
                      </div>
                      <div className="text-xs text-steel-600">
                        Attendees: {meeting.attendees.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-steel-800 mb-4">Recent Decisions</h3>
                <div className="space-y-3">
                  {heartTeamMeetings.filter(m => m.status === 'completed').map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-steel-900">
                          {formatDate(meeting.date)}
                        </span>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-medical-green-600" />
                          <span className="text-sm text-medical-green-600">{meeting.decisions} decisions</span>
                        </div>
                      </div>
                      <div className="text-sm text-steel-600">
                        Patients: {meeting.patients.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="retina-card p-8">
            <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
              Heart Team Members
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {[
                { name: 'Dr. Martinez', role: 'Interventional Cardiologist', status: 'Available', cases: 12 },
                { name: 'Dr. Chen', role: 'Cardiac Surgeon', status: 'In Surgery', cases: 8 },
                { name: 'Dr. Thompson', role: 'Imaging Specialist', status: 'Available', cases: 15 },
                { name: 'Dr. Rodriguez', role: 'Anesthesiologist', status: 'Available', cases: 10 }
              ].map((member, index) => (
                <div
                  key={index}
                  className="p-4 bg-white rounded-xl border border-steel-200 hover:shadow-retina-2 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      member.status === 'Available' ? 'bg-medical-green-500' :
                      member.status === 'In Surgery' ? 'bg-medical-red-500' :
                      'bg-medical-amber-500'
                    }`}></div>
                    <div>
                      <div className="font-semibold text-steel-900">{member.name}</div>
                      <div className="text-sm text-steel-600">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-xs text-steel-600 mb-2">Status: {member.status}</div>
                  <div className="text-xs text-steel-600">Active Cases: {member.cases}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === 'scheduling' && (
        <div className="retina-card p-8">
          <h2 className="text-2xl font-bold text-steel-900 mb-6 font-sf">
            Hybrid OR Schedule
          </h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-steel-800 mb-4">This Week's Schedule</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-medical-red-50 rounded-lg border border-medical-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-steel-900">Monday, Oct 21</span>
                      <span className="text-sm text-medical-red-600">3 procedures</span>
                    </div>
                    <div className="text-sm text-steel-600">
                      08:00 - TAVR (Thompson) | 12:00 - MitraClip (Anderson) | 15:00 - TAVR (Rodriguez)
                    </div>
                  </div>

                  <div className="p-4 bg-medical-blue-50 rounded-lg border border-medical-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-steel-900">Wednesday, Oct 23</span>
                      <span className="text-sm text-medical-blue-600">2 procedures</span>
                    </div>
                    <div className="text-sm text-steel-600">
                      08:00 - TAVR (Wilson) | 13:00 - WATCHMAN (Johnson)
                    </div>
                  </div>

                  <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-steel-900">Friday, Oct 25</span>
                      <span className="text-sm text-medical-green-600">1 procedure</span>
                    </div>
                    <div className="text-sm text-steel-600">
                      08:00 - MitraClip (Davis)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-steel-800 mb-4">OR Utilization</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                    <div>
                      <div className="font-medium text-steel-900">Hybrid OR A</div>
                      <div className="text-sm text-steel-600">Primary structural suite</div>
                    </div>
                    <div className="text-2xl font-bold text-medical-blue-600">87.3%</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                    <div>
                      <div className="font-medium text-steel-900">Hybrid OR B</div>
                      <div className="text-sm text-steel-600">Backup/complex cases</div>
                    </div>
                    <div className="text-2xl font-bold text-medical-green-600">72.1%</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                    <div>
                      <div className="font-medium text-steel-900">Average Case Time</div>
                      <div className="text-sm text-steel-600">All structural procedures</div>
                    </div>
                    <div className="text-2xl font-bold text-steel-900">142min</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                    <div>
                      <div className="font-medium text-steel-900">Turnover Time</div>
                      <div className="text-sm text-steel-600">Between cases</div>
                    </div>
                    <div className="text-2xl font-bold text-medical-amber-600">28min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuralCareTeamView;