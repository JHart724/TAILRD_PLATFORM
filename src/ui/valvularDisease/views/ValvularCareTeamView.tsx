import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Heart, 
  CheckCircle2, 
  Calendar, 
  Activity, 
  AlertTriangle,
  FileText,
  Phone,
  MapPin,
  TrendingUp,
  Stethoscope,
  UserCheck,
  Timer,
  Target,
  Award,
  Building2
} from 'lucide-react';

const ValvularCareTeamView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('heart-team');

  // Heart Team Queue
  const heartTeamQueue = [
    {
      id: '1',
      mrn: 'MRN-VLV001',
      name: 'Dorothy Chen',
      age: 78,
      diagnosis: 'Severe Aortic Stenosis',
      sts_score: 3.2,
      status: 'Pending Review',
      urgency: 'moderate',
      referringMD: 'Dr. Williams',
      scheduledDate: '2024-03-15',
      recommendation: 'TBD'
    },
    {
      id: '2',
      mrn: 'MRN-VLV002',
      name: 'Robert Johnson',
      age: 85,
      diagnosis: 'Severe Mitral Regurgitation',
      sts_score: 8.7,
      status: 'Surgical Evaluation',
      urgency: 'urgent',
      referringMD: 'Dr. Lopez',
      scheduledDate: '2024-03-12',
      recommendation: 'Surgical Repair'
    },
    {
      id: '3',
      mrn: 'MRN-VLV003',
      name: 'Maria Santos',
      age: 72,
      diagnosis: 'Moderate-Severe MR',
      sts_score: 4.1,
      status: 'Surgical Candidate',
      urgency: 'moderate',
      referringMD: 'Dr. Kim',
      scheduledDate: '2024-03-18',
      recommendation: 'Surgical Repair'
    }
  ];

  // Procedure Schedule
  const procedureSchedule = [
    {
      time: '07:30 AM',
      patient: 'James Wilson',
      procedure: 'Surgical AVR - Bioprosthetic',
      room: 'OR 1',
      operator: 'Dr. Mitchell',
      team: ['Dr. Chen (Anesthesia)', 'Sarah RN', 'Alex Perfusion'],
      status: 'prep',
      duration: '180 min'
    },
    {
      time: '09:30 AM',
      patient: 'Linda Brown',
      procedure: 'Mitral Valve Repair',
      room: 'OR 2',
      operator: 'Dr. Rodriguez',
      team: ['Dr. Park (Anesthesia)', 'Jennifer RN', 'Tom Perfusion'],
      status: 'scheduled',
      duration: '210 min'
    },
    {
      time: '12:00 PM',
      patient: 'David Lee',
      procedure: 'Surgical AVR',
      room: 'OR 3',
      operator: 'Dr. Thompson',
      team: ['Dr. Williams (Anesthesia)', 'Maria RN', 'Alex Perfusion'],
      status: 'scheduled',
      duration: '240 min'
    },
    {
      time: '02:30 PM',
      patient: 'Patricia Davis',
      procedure: 'Ross Procedure',
      room: 'OR 3',
      operator: 'Dr. Park',
      team: ['Dr. Martinez (Anesthesia)', 'Lisa RN', 'John Perfusion'],
      status: 'scheduled',
      duration: '285 min'
    }
  ];

  // Heart Team Members
  const heartTeamMembers = [
    {
      name: 'Dr. Mitchell',
      role: 'Cardiac Surgeon',
      specialty: 'Aortic Valve Surgery',
      status: 'Available',
      location: 'OR 1',
      cases: 3,
      phone: '(555) 0101',
      next: '07:30 AM - Surgical AVR'
    },
    {
      name: 'Dr. Chen',
      role: 'Cardiac Surgeon',
      specialty: 'Valve Surgery',
      status: 'In Meeting',
      location: 'Conference Room A',
      cases: 2,
      phone: '(555) 0102',
      next: '12:00 PM - Complex Valve Surgery'
    },
    {
      name: 'Dr. Rodriguez',
      role: 'Cardiac Surgeon',
      specialty: 'Mitral Valve Surgery',
      status: 'Available',
      location: 'OR 2',
      cases: 2,
      phone: '(555) 0103',
      next: '09:30 AM - Mitral Repair'
    },
    {
      name: 'Dr. Kim',
      role: 'Imaging Cardiologist',
      specialty: 'Echocardiography',
      status: 'Reading Studies',
      location: 'Echo Lab',
      cases: 5,
      phone: '(555) 0104',
      next: 'Available for consultation'
    },
    {
      name: 'Sarah Mitchell, NP',
      role: 'Valve Coordinator',
      specialty: 'Patient Navigation',
      status: 'Available',
      location: 'Valve Clinic',
      cases: 8,
      phone: '(555) 0201',
      next: 'Patient education visits'
    }
  ];

  // Performance Metrics
  const performanceMetrics = [
    { metric: 'Heart Team Efficiency', value: '94%', target: '> 90%', status: 'good' },
    { metric: 'Decision Concordance', value: '97.2%', target: '> 95%', status: 'good' },
    { metric: 'Time to Decision', value: '3.2 days', target: '< 5 days', status: 'good' },
    { metric: 'Patient Satisfaction', value: '4.9/5', target: '> 4.5', status: 'excellent' }
  ];

  // Recent Decisions
  const recentDecisions = [
    {
      patient: 'Mary Johnson',
      age: 82,
      diagnosis: 'Severe AS',
      sts_score: 6.8,
      decision: 'Surgical AVR',
      rationale: 'Suitable for surgical intervention',
      outcome: 'Successful',
      date: '2024-03-10'
    },
    {
      patient: 'John Davis',
      age: 67,
      diagnosis: 'Severe MR',
      sts_score: 3.1,
      decision: 'Surgical Repair',
      rationale: 'Young, low risk, repairable valve',
      outcome: 'Successful',
      date: '2024-03-08'
    },
    {
      patient: 'Susan Wilson',
      age: 79,
      diagnosis: 'Moderate-Severe MR',
      sts_score: 7.2,
      decision: 'Surgical Repair',
      rationale: 'Suitable for valve repair',
      outcome: 'Successful',
      date: '2024-03-05'
    }
  ];

  // Quality Metrics
  const qualityTracking = [
    { metric: 'Decision Accuracy', current: 97.8, target: 95.0, trend: '+1.2%' },
    { metric: 'Consensus Rate', current: 94.3, target: 90.0, trend: '+2.1%' },
    { metric: 'Time to Treatment', current: 8.7, target: 10.0, trend: '-0.8 days' },
    { metric: 'Appropriateness Score', current: 9.2, target: 8.5, trend: '+0.3' }
  ];

  const getStatusColor = (status: string, urgency?: string) => {
    if (urgency === 'critical') return 'bg-red-100 text-red-700 border-red-200';
    if (urgency === 'urgent') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (urgency === 'moderate') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    
    switch (status) {
      case 'prep': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'scheduled': return 'bg-medical-blue-100 text-medical-blue-700 border-medical-blue-200';
      case 'Available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'In Meeting': return 'bg-medical-purple-100 text-medical-purple-700 border-medical-purple-200';
      case 'Reading Studies': return 'bg-medical-amber-100 text-medical-amber-700 border-medical-amber-200';
      default: return 'bg-steel-100 text-steel-700 border-steel-200';
    }
  };

  const tabs = [
    { id: 'heart-team', label: 'Heart Team Queue', icon: Heart },
    { id: 'schedule', label: 'Procedure Schedule', icon: Calendar },
    { id: 'team-members', label: 'Team Coordination', icon: Users },
    { id: 'quality', label: 'Quality Metrics', icon: TrendingUp }
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
                  ? 'bg-white text-medical-purple-600 shadow-retina-2'
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
      {activeTab === 'heart-team' && (
        <div className="space-y-6">
          {/* Heart Team Queue */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Heart Team Decision Queue</h3>
              <div className="flex items-center gap-4">
                <div className="text-sm text-steel-600">
                  Pending: <span className="font-semibold text-steel-900">{heartTeamQueue.length}</span>
                </div>
                <button className="px-4 py-2 bg-medical-purple-500 text-white rounded-lg hover:bg-medical-purple-600 transition-colors">
                  Add Case
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {heartTeamQueue.map((patient) => (
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
                        <div className="text-xs text-steel-600">STS Score: {patient.sts_score}%</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.status}</div>
                        <div className="text-xs text-steel-600">Scheduled: {patient.scheduledDate}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{patient.referringMD}</div>
                        <div className="text-xs text-steel-600">Referring</div>
                      </div>
                      
                      <button className="p-2 text-medical-purple-600 hover:bg-medical-purple-50 rounded-lg transition-colors">
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
          {/* Today's Procedure Schedule */}
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
                          {procedure.room} • Duration: {procedure.duration}
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

      {activeTab === 'team-members' && (
        <div className="space-y-6">
          {/* Heart Team Members */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Heart Team Members</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm text-steel-600">
                  Available: <span className="font-semibold text-emerald-600">2</span>
                </div>
                <div className="text-sm text-steel-600">
                  Busy: <span className="font-semibold text-orange-600">3</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {heartTeamMembers.map((member, index) => (
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

          {/* Recent Heart Team Decisions */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Recent Heart Team Decisions</h3>
              <Stethoscope className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="space-y-4">
              {recentDecisions.map((decision, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-200 hover:bg-steel-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{decision.patient}</div>
                        <div className="text-sm text-steel-600">
                          {decision.diagnosis} • Age {decision.age} • STS: {decision.sts_score}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium text-medical-purple-600">{decision.decision}</div>
                        <div className="text-xs text-steel-600">Recommendation</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-emerald-600">{decision.outcome}</div>
                        <div className="text-xs text-steel-600">Outcome</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-steel-900">{decision.date}</div>
                        <div className="text-xs text-steel-600">Decision Date</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-steel-600 italic pl-10">
                    Rationale: {decision.rationale}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quality' && (
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
          
          {/* Quality Tracking Details */}
          <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-steel-900 font-sf">Detailed Quality Tracking</h3>
              <TrendingUp className="w-5 h-5 text-steel-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {qualityTracking.map((quality, index) => (
                <div key={index} className="p-4 rounded-lg border border-steel-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-steel-900">{quality.metric}</div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      quality.trend.startsWith('+') || quality.trend.startsWith('-0') 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {quality.trend}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-steel-900">
                        {quality.current}{quality.metric.includes('Time') ? ' days' : quality.metric.includes('Score') ? '/10' : '%'}
                      </div>
                      <div className="text-sm text-steel-600">
                        Target: {quality.target}{quality.metric.includes('Time') ? ' days' : quality.metric.includes('Score') ? '/10' : '%'}
                      </div>
                    </div>
                    
                    <div className="w-16 h-16 relative">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${(quality.current / (quality.target * 1.2)) * 100}, 100`}
                          className="text-medical-purple-500"
                        />
                      </svg>
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

export default ValvularCareTeamView;