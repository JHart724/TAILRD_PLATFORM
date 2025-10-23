import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Zap, Clock, Activity, User, ChevronRight, Shield, Heart, Pill, AlertCircle } from 'lucide-react';

interface HospitalAlert {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  location: 'ED' | 'ICU' | 'Floor' | 'Tele';
  admitTime: string;
  chiefComplaint: string;
  lvef?: number;
  bnp?: number;
  currentGDMT: {
    betaBlocker: boolean;
    aceArb: boolean;
    mra: boolean;
    sglt2: boolean;
  };
  gdmtGaps: string[];
  contraindications: string[];
  alertLevel: 'critical' | 'high' | 'medium';
  timeToIntervene: string;
  recommendations: string[];
  lastHFAdmission?: string;
  readmissionRisk: number;
}

const RealTimeHospitalAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<HospitalAlert[]>([
    {
      id: 'ALERT001',
      patientName: 'Thompson, James',
      mrn: 'MRN-89432',
      age: 68,
      location: 'ED',
      admitTime: '14:23',
      chiefComplaint: 'Shortness of breath, lower extremity edema',
      lvef: 32,
      bnp: 1850,
      currentGDMT: {
        betaBlocker: true,
        aceArb: false,
        mra: false,
        sglt2: false,
      },
      gdmtGaps: ['ARNi not initiated', 'MRA not started', 'SGLT2i not prescribed'],
      contraindications: [],
      alertLevel: 'critical',
      timeToIntervene: '< 4 hours',
      recommendations: [
        'Initiate ARNi (sacubitril/valsartan) if BP stable',
        'Start spironolactone 12.5mg daily',
        'Add empagliflozin 10mg daily',
        'Order CardioMEMS evaluation'
      ],
      lastHFAdmission: '3 months ago',
      readmissionRisk: 78
    },
    {
      id: 'ALERT002',
      patientName: 'Garcia, Maria',
      mrn: 'MRN-76543',
      age: 74,
      location: 'Floor',
      admitTime: '09:15',
      chiefComplaint: 'HF exacerbation',
      lvef: 28,
      bnp: 2340,
      currentGDMT: {
        betaBlocker: true,
        aceArb: true,
        mra: false,
        sglt2: false,
      },
      gdmtGaps: ['MRA not started', 'SGLT2i not prescribed'],
      contraindications: ['Mild hyperkalemia (K+ 5.1)'],
      alertLevel: 'high',
      timeToIntervene: '< 24 hours',
      recommendations: [
        'Monitor K+ and consider MRA when < 5.0',
        'Start dapagliflozin 10mg daily',
        'Consider CRT-D evaluation (QRS 142ms)',
        'Iron studies pending - likely IV iron candidate'
      ],
      lastHFAdmission: '6 weeks ago',
      readmissionRisk: 85
    },
    {
      id: 'ALERT003',
      patientName: 'Wilson, Robert',
      mrn: 'MRN-65432',
      age: 59,
      location: 'ICU',
      admitTime: '06:45',
      chiefComplaint: 'Acute decompensated HF, cardiogenic shock',
      lvef: 18,
      bnp: 4200,
      currentGDMT: {
        betaBlocker: false,
        aceArb: false,
        mra: false,
        sglt2: false,
      },
      gdmtGaps: ['Not on ANY pillar therapy'],
      contraindications: ['Hypotension', 'Acute kidney injury'],
      alertLevel: 'critical',
      timeToIntervene: 'Post-stabilization',
      recommendations: [
        'Stabilize hemodynamics first',
        'Consider inotropic support',
        'Plan GDMT initiation post-stabilization',
        'Urgent advanced HF consultation',
        'Evaluate for temporary MCS'
      ],
      readmissionRisk: 92
    },
    {
      id: 'ALERT004',
      patientName: 'Chen, Linda',
      mrn: 'MRN-54321',
      age: 62,
      location: 'Tele',
      admitTime: '22:30',
      chiefComplaint: 'Chest pain, elevated troponin',
      lvef: 38,
      bnp: 980,
      currentGDMT: {
        betaBlocker: true,
        aceArb: true,
        mra: false,
        sglt2: false,
      },
      gdmtGaps: ['Suboptimal beta-blocker dose', 'No MRA', 'No SGLT2i'],
      contraindications: [],
      alertLevel: 'medium',
      timeToIntervene: '< 48 hours',
      recommendations: [
        'Uptitrate carvedilol to target dose',
        'Start eplerenone 25mg daily',
        'Add jardiance 10mg daily',
        'Schedule outpatient GDMT clinic follow-up'
      ],
      lastHFAdmission: 'First admission',
      readmissionRisk: 45
    }
  ]);

  const [selectedAlert, setSelectedAlert] = useState<HospitalAlert | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'ED'>('all');
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update time to intervene
      setAlerts(prev => prev.map(alert => ({
        ...alert,
        timeToIntervene: alert.alertLevel === 'critical' ? '< 4 hours' : 
                         alert.alertLevel === 'high' ? '< 24 hours' : '< 48 hours'
      })));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'critical') return alert.alertLevel === 'critical';
    if (filter === 'ED') return alert.location === 'ED';
    return true;
  });

  const getLocationColor = (location: string) => {
    switch(location) {
      case 'ED': return 'bg-red-100 text-red-700 border-red-200';
      case 'ICU': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Floor': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Tele': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAlertColor = (level: string) => {
    switch(level) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-8 h-8 text-red-600" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Real-Time Hospital Alerts</h2>
              <p className="text-sm text-gray-600">Live monitoring of HF patients not on optimal GDMT</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">{alerts.length}</div>
              <div className="text-xs text-gray-600">Active Alerts</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {alerts.filter(a => a.alertLevel === 'critical').length}
              </div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'critical' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Critical Only ({alerts.filter(a => a.alertLevel === 'critical').length})
          </button>
          <button
            onClick={() => setFilter('ED')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'ED' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            ED Patients ({alerts.filter(a => a.location === 'ED').length})
          </button>
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`border-l-4 rounded-xl p-6 transition-all cursor-pointer hover:shadow-lg ${
              getAlertColor(alert.alertLevel)
            }`}
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Patient Header */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-bold text-lg">{alert.patientName}</span>
                    <span className="text-gray-500">| MRN: {alert.mrn}</span>
                    <span className="text-gray-500">| Age: {alert.age}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    getLocationColor(alert.location)
                  }`}>
                    {alert.location}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    Admitted: {alert.admitTime}
                  </span>
                </div>

                {/* Clinical Data */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Chief Complaint</div>
                    <div className="font-medium">{alert.chiefComplaint}</div>
                    
                    <div className="flex gap-4 mt-3">
                      {alert.lvef && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-sm">LVEF: {alert.lvef}%</span>
                        </div>
                      )}
                      {alert.bnp && (
                        <div className="flex items-center gap-1">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">BNP: {alert.bnp}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">Readmit Risk: {alert.readmissionRisk}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">GDMT Status - NOT ON 4 PILLARS</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          alert.currentGDMT.betaBlocker ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm">Beta Blocker</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          alert.currentGDMT.aceArb ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm">ACE/ARB/ARNi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          alert.currentGDMT.mra ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm">MRA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          alert.currentGDMT.sglt2 ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm">SGLT2i</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GDMT Gaps and Actions */}
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-red-500" />
                      <span className="font-semibold text-red-700">GDMT Gaps Identified</span>
                    </div>
                    <span className="text-sm font-medium text-orange-600">
                      Time to Intervene: {alert.timeToIntervene}
                    </span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {alert.gdmtGaps.map((gap, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{gap}</span>
                      </div>
                    ))}
                  </div>

                  {alert.contraindications.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded">
                      <div className="flex items-center gap-2 text-yellow-700 text-sm">
                        <Shield className="w-4 h-4" />
                        <span className="font-medium">Contraindications:</span>
                        {alert.contraindications.join(', ')}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="font-medium text-sm text-gray-700 mb-1">Recommended Actions:</div>
                    <ul className="space-y-1">
                      {alert.recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-500 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="ml-4">
                <button
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    alert.alertLevel === 'critical' 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAlert(alert);
                  }}
                >
                  <Zap className="w-4 h-4 inline mr-1" />
                  Intervene Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live monitoring - Auto-refreshes every 60 seconds
        </div>
      </div>
    </div>
  );
};

export default RealTimeHospitalAlerts;