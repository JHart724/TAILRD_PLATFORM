import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  Calendar, 
  Activity, 
  AlertTriangle,
  FileText,
  Phone,
  MapPin,
  TrendingUp,
  Footprints,
  UserCheck,
  Timer,
  Target,
  Award,
  Building2,
  Stethoscope
} from 'lucide-react';

const PeripheralCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('limb-salvage');

  // Limb Salvage Queue
  const limbSalvageQueue = [
    {
      id: '1',
      mrn: 'MRN-PVD001',
      name: 'Robert Martinez',
      age: 68,
      diagnosis: 'Critical Limb Ischemia',
      wifi_score: 'W3,I2,fI3',
      status: 'Urgent Evaluation',
      urgency: 'critical',
      specialist: 'Dr. Wilson',
      scheduledDate: '2024-03-12',
      woundStage: 'Stage 4'
    },
    {
      id: '2',
      mrn: 'MRN-PVD002',
      name: 'Mary Chen',
      age: 74,
      diagnosis: 'Diabetic Foot Ulcer',
      wifi_score: 'W2,I3,fI2',
      status: 'Wound Care Active',
      urgency: 'urgent',
      specialist: 'Dr. Kim',
      scheduledDate: '2024-03-15',
      woundStage: 'Stage 3'
    },
    {
      id: '3',
      mrn: 'MRN-PVD003',
      name: 'James Wilson',
      age: 62,
      diagnosis: 'Rest Pain',
      wifi_score: 'W1,I2,fI0',
      status: 'Pre-procedure',
      urgency: 'moderate',
      specialist: 'Dr. Thompson',
      scheduledDate: '2024-03-18',
      woundStage: 'N/A'
    }
  ];

  // Procedure Schedule
  const procedureSchedule = [
    {
      time: '08:00 AM',
      patient: 'Patricia Davis',
      procedure: 'SFA Angioplasty + DES',
      location: 'Endo Suite 1',
      operator: 'Dr. Wilson',
      team: ['Dr. Martinez (Assist)', 'Lisa RN', 'Tom RT'],
      status: 'prep',
      duration: '90 min'
    },
    {
      time: '10:30 AM',
      patient: 'Michael Brown',
      procedure: 'Tibial Vessel Intervention',
      location: 'Endo Suite 2',
      operator: 'Dr. Kim',
      team: ['Dr. Chen (Assist)', 'Sarah RN', 'Mike RT'],
      status: 'scheduled',
      duration: '120 min'
    },
    {
      time: '01:00 PM',
      patient: 'Susan Johnson',
      procedure: 'Femoral-Popliteal Bypass',
      location: 'OR 2',
      operator: 'Dr. Thompson',
      team: ['Dr. Rodriguez (Assist)', 'Jennifer RN', 'Alex Tech'],
      status: 'scheduled',
      duration: '180 min'
    },
    {
      time: '03:30 PM',
      patient: 'David Lee',
      procedure: 'Wound Debridement',
      location: 'Wound Care Center',
      operator: 'Dr. Park',
      team: ['Maria NP', 'Linda CNA'],
      status: 'scheduled',
      duration: '45 min'
    }
  ];

  // Team Members
  const teamMembers = [
    {
      name: 'Dr. Wilson',
      role: 'Vascular Surgeon',
      specialty: 'Endovascular',
      status: 'In Procedure',
      location: 'Endo Suite 1',
      cases: 4,
      phone: '(555) 0101',
      next: 'Available 11:30 AM'
    },
    {
      name: 'Dr. Kim',
      role: 'Interventional Radiologist',
      specialty: 'Complex Limb Salvage',
      status: 'Available',
      location: 'Reading Room',
      cases: 2,
      phone: '(555) 0102',
      next: '10:30 AM - Tibial Intervention'
    },
    {
      name: 'Dr. Thompson',
      role: 'Vascular Surgeon',
      specialty: 'Open Vascular',
      status: 'In Clinic',
      location: 'Vascular Clinic',
      cases: 3,
      phone: '(555) 0103',
      next: '01:00 PM - Bypass Surgery'
    },
    {
      name: 'Dr. Park',
      role: 'Wound Care Specialist',
      specialty: 'Diabetic Foot Care',
      status: 'Available',
      location: 'Wound Center',
      cases: 6,
      phone: '(555) 0104',
      next: '03:30 PM - Debridement'
    },
    {
      name: 'Maria Santos, NP',
      role: 'Vascular Nurse Practitioner',
      specialty: 'Patient Coordination',
      status: 'Available',
      location: 'Care Coordination',
      cases: 8,
      phone: '(555) 0201',
      next: 'Patient education visits'
    }
  ];

  // Performance Metrics
  const performanceMetrics = [
    { metric: 'Limb Salvage Rate', value: '94.3%', target: '> 90%', status: 'excellent' },
    { metric: 'Team Coordination', value: '96.8%', target: '> 90%', status: 'excellent' },
    { metric: 'Time to Treatment', value: '2.8 days', target: '< 5 days', status: 'good' },
    { metric: 'Wound Healing Rate', value: '87.2%', target: '> 80%', status: 'good' }
  ];

  // Recent Outcomes
  const recentOutcomes = [
    {
      patient: 'Linda Martinez',
      procedure: 'SFA Stenting',
      operator: 'Dr. Wilson',
      outcome: 'Patent vessel',
      woundHealing: 'Complete',
      followUp: '6 months',
      date: '2024-03-08'
    },
    {
      patient: 'John Thompson',
      procedure: 'Tibial Angioplasty',
      operator: 'Dr. Kim',
      outcome: 'Good flow',
      woundHealing: 'Partial',
      followUp: '3 months',
      date: '2024-03-06'
    },
    {
      patient: 'Mary Rodriguez',
      procedure: 'Fem-Pop Bypass',
      operator: 'Dr. Thompson',
      outcome: 'Patent graft',
      woundHealing: 'Complete',
      followUp: '1 year',
      date: '2024-03-04'
    }
  ];

  // Wound Care Tracking
  const woundCareTracking = [
    { stage: 'Stage 1 (Superficial)', count: 34, healing: 96.2, avgTime: 21 },
    { stage: 'Stage 2 (Partial thickness)', count: 28, healing: 91.4, avgTime: 42 },
    { stage: 'Stage 3 (Full thickness)', count: 19, healing: 84.2, avgTime: 67 },
    { stage: 'Stage 4 (Deep tissue)', count: 12, healing: 75.0, avgTime: 98 }
  ];

  // Multidisciplinary Conferences
  const mdiConferences = [
    {
      date: '2024-03-12',
      time: '07:30 AM',
      type: 'Limb Salvage Conference',
      cases: 8,
      attendees: ['Vascular Surgery', 'Podiatry', 'Endocrinology', 'Wound Care'],
      status: 'scheduled'
    },
    {
      date: '2024-03-14',
      time: '12:00 PM',
      type: 'PAD Tumor Board',
      cases: 5,
      attendees: ['Vascular Surgery', 'Interventional Radiology', 'Cardiology'],
      status: 'scheduled'
    },
    {
      date: '2024-03-16',
      time: '08:00 AM',
      type: 'Diabetic Foot Conference',
      cases: 12,
      attendees: ['Vascular Surgery', 'Podiatry', 'Endocrinology', 'Infectious Disease'],
      status: 'scheduled'
    }
  ];

  const getStatusColor = (status: string, urgency?: string) => {
    if (urgency === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'urgent') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (urgency === 'moderate') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    
    switch (status) {
      case 'prep': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'scheduled': return 'bg-medical-teal-100 text-medical-teal-700 border-medical-teal-200';
      case 'In Procedure': return 'bg-red-100 text-red-700 border-red-200';
      case 'Available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Clinic': return 'bg-medical-blue-100 text-medical-blue-700 border-medical-blue-200';
      default: return 'bg-steel-100 text-steel-700 border-steel-200';
    }
  };

  const tabs = [
    { id: 'limb-salvage', label: 'Limb Salvage Queue', icon: Footprints },
    { id: 'schedule', label: 'Procedure Schedule', icon: Calendar },
    { id: 'team', label: 'Team Coordination', icon: Users },
    { id: 'wound-care', label: 'Wound Care Tracking', icon: Target }
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-steel-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white text-medical-teal-600 shadow-retina-2'
                  : 'text-steel-600 hover:text-steel-900'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'limb-salvage' && (
        <div className="space-y-6">
          {/* Limb Salvage Queue */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Limb Salvage Care Queue</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-steel-600">
                  Active Cases: <span className="font-semibold text-steel-900">{limbSalvageQueue.length}</span>
                </div>
                <button className="px-4 py-2 bg-medical-teal-500 text-white rounded-lg hover:bg-medical-teal-600 transition-colors">
                  Add Patient
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {limbSalvageQueue.map((patient) => (
                <div key={patient.id} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor('', patient.urgency)}`}>
                        {patient.urgency.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{patient.name}</div>
                        <div className="text-sm text-steel-600">{patient.mrn} • Age {patient.age}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.diagnosis}</div>
                        <div className="text-xs text-steel-600">WIfI: {patient.wifi_score}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.status}</div>
                        <div className="text-xs text-steel-600">Wound: {patient.woundStage}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.specialist}</div>
                        <div className="text-xs text-steel-600">Next: {patient.scheduledDate}</div>
                      </div>
                      
                      <button className="p-2 text-medical-teal-600 hover:bg-medical-teal-50 rounded-lg transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Procedure Schedule */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Today's Procedure Schedule</h3>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-steel-400" />
                <span className="text-sm text-steel-600">March 11, 2024</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {procedureSchedule.map((procedure, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-steel-900">{procedure.time}</div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(procedure.status)}`}>
                          {procedure.status.toUpperCase()}
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-semibold text-steel-900">{procedure.patient}</div>
                        <div className="text-sm text-steel-600">{procedure.procedure}</div>
                        <div className="text-xs text-steel-500 mt-1">
                          {procedure.location} • Duration: {procedure.duration}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-steel-900">{procedure.operator}</div>
                      <div className="text-sm text-steel-600">Primary Operator</div>
                      <div className="text-xs text-steel-500 mt-1">
                        Team: {procedure.team.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Team Members */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Vascular Care Team</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-steel-600">
                  Available: <span className="font-semibold text-emerald-600">3</span>
                </div>
                <div className="text-sm text-steel-600">
                  Busy: <span className="font-semibold text-orange-600">2</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {teamMembers.map((member, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:shadow-retina-2 transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-steel-900">{member.name}</div>
                      <div className="text-sm text-steel-600">{member.role}</div>
                      <div className="text-xs text-steel-500">{member.specialty}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(member.status)}`}>
                      {member.status}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">Cases: {member.cases}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.next}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-steel-400" />
                      <span className="text-steel-600">{member.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multidisciplinary Conferences */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Multidisciplinary Conferences</h3>
              <Stethoscope className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="space-y-4">
              {mdiConferences.map((conference, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:bg-steel-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold text-steel-900">{conference.type}</div>
                      <div className="text-sm text-steel-600">{conference.date} at {conference.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-steel-900">{conference.cases} cases</div>
                      <div className="text-xs text-steel-600">Scheduled</div>
                    </div>
                  </div>
                  <div className="text-sm text-steel-600">
                    Attendees: {conference.attendees.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Outcomes */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Recent Treatment Outcomes</h3>
              <CheckCircle2 className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="space-y-4">
              {recentOutcomes.map((outcome, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:bg-steel-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{outcome.patient}</div>
                        <div className="text-sm text-steel-600">{outcome.procedure}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-emerald-600">{outcome.outcome}</div>
                        <div className="text-xs text-steel-600">Procedure</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-medical-teal-600">{outcome.woundHealing}</div>
                        <div className="text-xs text-steel-600">Wound Healing</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{outcome.followUp}</div>
                        <div className="text-xs text-steel-600">Follow-up</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{outcome.date}</div>
                        <div className="text-xs text-steel-600">Date</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wound-care' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-4 gap-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs text-emerald-600">
                    {metric.status === 'excellent' ? 'Excellent' : 'On Target'}
                  </span>
                </div>
                <div className="text-2xl font-bold text-steel-900 font-sf">{metric.value}</div>
                <div className="text-sm text-steel-600">{metric.metric}</div>
                <div className="text-xs text-steel-500 mt-1">Target: {metric.target}</div>
              </div>
            ))}
          </div>
          
          {/* Wound Care Tracking */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Wound Care Progress Tracking</h3>
              <Target className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {woundCareTracking.map((wound, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-steel-900">{wound.stage}</div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      wound.healing > 90 
                        ? 'bg-emerald-100 text-emerald-700'
                        : wound.healing > 80
                        ? 'bg-medical-amber-100 text-medical-amber-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {wound.count} patients
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">Healing Rate</span>
                      <span className="font-semibold text-emerald-600">{wound.healing}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-steel-600">Avg Healing Time</span>
                      <span className="font-semibold text-steel-900">{wound.avgTime} days</span>
                    </div>
                    
                    <div className="w-full bg-steel-100 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          wound.healing > 90 ? 'bg-emerald-500' :
                          wound.healing > 80 ? 'bg-medical-amber-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${wound.healing}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeripheralCareTeamView;