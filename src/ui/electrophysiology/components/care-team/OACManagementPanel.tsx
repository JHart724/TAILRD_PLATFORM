import React, { useState, useMemo } from 'react';
import {
  Heart,
  AlertTriangle,
  Check,
  Clock,
  Pill,
  Activity,
  TrendingUp,
  Calendar,
  Target,
  Shield,
  Droplets,
  Calculator,
  FileText
} from 'lucide-react';

interface BleedingEvent {
  date: string;
  type: 'Major' | 'Minor' | 'Clinically relevant';
  description: string;
  management: string;
}

interface INRReading {
  date: string;
  value: number;
  target: string;
  inRange: boolean;
}

interface ProcedureBridging {
  procedureType: string;
  date: string;
  cha2ds2vasc: number;
  hasbled: number;
  bridging: boolean;
  protocol: string;
  status: 'planned' | 'active' | 'completed';
}

interface AFPatient {
  id: string;
  name: string;
  age: number;
  afType: 'Paroxysmal' | 'Persistent' | 'Permanent';
  cha2ds2vasc: number;
  hasbled: number;
  currentOAC: {
    medication: 'Warfarin' | 'Apixaban' | 'Rivaroxaban' | 'Edoxaban' | 'Dabigatran' | 'None';
    dose: string;
    frequency: string;
    startDate: string;
  };
  inr?: {
    latest: number;
    target: string;
    timeInRange: number;
    readings: INRReading[];
  };
  adherence: 'Excellent' | 'Good' | 'Poor' | 'Unknown';
  bleedingEvents: BleedingEvent[];
  upcomingProcedure?: ProcedureBridging;
  lastFollowUp: string;
  nextFollowUp: string;
}

const OACManagementPanel: React.FC = () => {
  const [patients, setPatients] = useState<AFPatient[]>([
    {
      id: 'AF001',
      name: 'John Smith',
      age: 72,
      afType: 'Persistent',
      cha2ds2vasc: 4,
      hasbled: 2,
      currentOAC: {
        medication: 'Warfarin',
        dose: '5mg',
        frequency: 'daily',
        startDate: '2024-01-15'
      },
      inr: {
        latest: 2.1,
        target: '2.0-3.0',
        timeInRange: 68,
        readings: [
          { date: '2024-12-01', value: 2.1, target: '2.0-3.0', inRange: true },
          { date: '2024-11-15', value: 1.8, target: '2.0-3.0', inRange: false },
          { date: '2024-11-01', value: 2.4, target: '2.0-3.0', inRange: true },
          { date: '2024-10-15', value: 3.2, target: '2.0-3.0', inRange: false }
        ]
      },
      adherence: 'Good',
      bleedingEvents: [],
      upcomingProcedure: {
        procedureType: 'Colonoscopy',
        date: '2024-12-20',
        cha2ds2vasc: 4,
        hasbled: 2,
        bridging: true,
        protocol: 'Hold warfarin 5 days prior, bridge with LMWH',
        status: 'planned'
      },
      lastFollowUp: '2024-11-15',
      nextFollowUp: '2024-12-15'
    },
    {
      id: 'AF002',
      name: 'Maria Garcia',
      age: 68,
      afType: 'Paroxysmal',
      cha2ds2vasc: 3,
      hasbled: 1,
      currentOAC: {
        medication: 'Apixaban',
        dose: '5mg',
        frequency: 'twice daily',
        startDate: '2024-03-01'
      },
      adherence: 'Excellent',
      bleedingEvents: [
        {
          date: '2024-10-15',
          type: 'Minor',
          description: 'Epistaxis',
          management: 'Observed, no intervention needed'
        }
      ],
      lastFollowUp: '2024-11-01',
      nextFollowUp: '2024-12-01'
    },
    {
      id: 'AF003',
      name: 'Robert Chen',
      age: 75,
      afType: 'Permanent',
      cha2ds2vasc: 5,
      hasbled: 3,
      currentOAC: {
        medication: 'Rivaroxaban',
        dose: '20mg',
        frequency: 'daily',
        startDate: '2024-02-01'
      },
      adherence: 'Poor',
      bleedingEvents: [
        {
          date: '2024-09-20',
          type: 'Major',
          description: 'GI bleeding requiring hospitalization',
          management: 'Dose reduction, PPI therapy'
        }
      ],
      lastFollowUp: '2024-10-15',
      nextFollowUp: '2024-11-15'
    }
  ]);

  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [showBridgingGuide, setShowBridgingGuide] = useState(false);
  const [filterByRisk, setFilterByRisk] = useState<string>('all');

  const getBridgingRecommendation = (cha2ds2vasc: number, hasbled: number, procedureRisk: 'Low' | 'Moderate' | 'High') => {
    if (cha2ds2vasc >= 4 && hasbled < 3) {
      if (procedureRisk === 'High') {
        return {
          recommend: true,
          protocol: 'Stop OAC 48-72h before, bridge with therapeutic LMWH',
          reasoning: 'High stroke risk, manageable bleeding risk'
        };
      } else {
        return {
          recommend: true,
          protocol: 'Stop OAC 24-48h before, bridge with therapeutic LMWH',
          reasoning: 'High stroke risk, low-moderate procedure risk'
        };
      }
    } else if (cha2ds2vasc <= 2 || hasbled >= 3) {
      return {
        recommend: false,
        protocol: 'Stop OAC without bridging, resume 12-24h post-procedure',
        reasoning: 'Low stroke risk or high bleeding risk'
      };
    } else {
      return {
        recommend: 'Consider',
        protocol: 'Individualized decision based on patient factors',
        reasoning: 'Intermediate stroke and bleeding risk'
      };
    }
  };

  const calculateTimeToNextDose = (lastDose: string, frequency: string) => {
    const lastDoseTime = new Date(lastDose);
    const now = new Date();
    const hoursAgo = (now.getTime() - lastDoseTime.getTime()) / (1000 * 60 * 60);
    
    const interval = frequency.includes('twice') ? 12 : 24;
    const nextDose = Math.max(0, interval - hoursAgo);
    
    return nextDose;
  };

  const getAdherenceColor = (adherence: string) => {
    switch (adherence) {
      case 'Excellent': return 'text-green-700 bg-green-100';
      case 'Good': return 'text-blue-700 bg-blue-100';
      case 'Poor': return 'text-red-700 bg-red-100';
      default: return 'text-steel-700 bg-steel-100';
    }
  };

  const getRiskColor = (score: number, isStroke: boolean) => {
    if (isStroke) {
      if (score >= 4) return 'text-red-700 bg-red-100';
      if (score >= 2) return 'text-amber-700 bg-amber-100';
      return 'text-green-700 bg-green-100';
    } else {
      if (score >= 3) return 'text-red-700 bg-red-100';
      if (score >= 2) return 'text-amber-700 bg-amber-100';
      return 'text-green-700 bg-green-100';
    }
  };

  const getINRStatus = (inr: number, target: string) => {
    const [min, max] = target.split('-').map(Number);
    if (inr < min) return { status: 'Low', color: 'text-red-600 bg-red-100' };
    if (inr > max) return { status: 'High', color: 'text-red-600 bg-red-100' };
    return { status: 'In Range', color: 'text-green-600 bg-green-100' };
  };

  const filteredPatients = useMemo(() => {
    if (filterByRisk === 'all') return patients;
    
    return patients.filter(patient => {
      if (filterByRisk === 'high-stroke') return patient.cha2ds2vasc >= 4;
      if (filterByRisk === 'high-bleeding') return patient.hasbled >= 3;
      if (filterByRisk === 'poor-control') {
        return patient.inr?.timeInRange && patient.inr.timeInRange < 60;
      }
      if (filterByRisk === 'upcoming-procedure') return !!patient.upcomingProcedure;
      return true;
    });
  }, [patients, filterByRisk]);

  const updateOACPlan = (patientId: string) => {
    alert(`Updating OAC plan for patient ${patientId}`);
  };

  const generateBridgingPlan = (patient: AFPatient) => {
    if (!patient.upcomingProcedure) return;

    const bridging = getBridgingRecommendation(
      patient.cha2ds2vasc,
      patient.hasbled,
      'Moderate' // This would come from procedure classification
    );

    const planData = {
      patientId: patient.id,
      procedureType: patient.upcomingProcedure.procedureType,
      procedureDate: patient.upcomingProcedure.date,
      cha2ds2vasc: patient.cha2ds2vasc,
      hasbled: patient.hasbled,
      currentOAC: patient.currentOAC,
      bridgingRecommendation: bridging,
      timestamp: new Date().toISOString()
    };

    console.log('Generated bridging plan:', planData);
    alert('Bridging plan generated and saved to patient record');
  };

  const ProcedureBridgingCard = ({ patient }: { patient: AFPatient }) => {
    if (!patient.upcomingProcedure) return null;

    const procedure = patient.upcomingProcedure;
    const daysUntil = Math.ceil(
      (new Date(procedure.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const bridging = getBridgingRecommendation(patient.cha2ds2vasc, patient.hasbled, 'Moderate');

    return (
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">Upcoming Procedure</span>
          </div>
          <div className="text-sm text-amber-600">{daysUntil} days</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-amber-600">Procedure</div>
            <div className="text-sm font-medium text-amber-800">{procedure.procedureType}</div>
          </div>
          <div>
            <div className="text-xs text-amber-600">Date</div>
            <div className="text-sm font-medium text-amber-800">
              {new Date(procedure.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-amber-200 mb-3">
          <div className="text-xs text-amber-600 mb-1">Bridging Protocol</div>
          <div className="text-sm text-amber-800">{bridging.protocol}</div>
          <div className="text-xs text-amber-600 mt-1">{bridging.reasoning}</div>
        </div>

        <button
          onClick={() => generateBridgingPlan(patient)}
          className="w-full px-3 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 transition-colors"
        >
          Generate Bridging Plan
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2 flex items-center gap-3">
              <Pill className="w-8 h-8 text-medical-red-600" />
              Oral Anticoagulation Management
            </h2>
            <p className="text-steel-600">CHA₂DS₂-VASc & HAS-BLED Integration</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={filterByRisk}
              onChange={(e) => setFilterByRisk(e.target.value)}
              className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-red-500"
            >
              <option value="all">All Patients</option>
              <option value="high-stroke">High Stroke Risk (≥4)</option>
              <option value="high-bleeding">High Bleeding Risk (≥3)</option>
              <option value="poor-control">Poor INR Control (&lt;60% TTR)</option>
              <option value="upcoming-procedure">Upcoming Procedures</option>
            </select>
            <button
              onClick={() => setShowBridgingGuide(!showBridgingGuide)}
              className="px-4 py-2 bg-medical-red-600 text-white rounded-lg hover:bg-medical-red-700 transition-colors text-sm"
            >
              Bridging Guide
            </button>
          </div>
        </div>
      </div>

      {/* Bridging Guide Modal */}
      {showBridgingGuide && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-800">Perioperative Bridging Guide</h3>
            <button
              onClick={() => setShowBridgingGuide(false)}
              className="text-steel-400 hover:text-steel-600"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 mb-2">Low Risk</div>
              <div className="text-sm text-green-700 mb-2">CHA₂DS₂-VASc ≤2 OR HAS-BLED ≥3</div>
              <div className="text-xs text-green-600">
                Stop OAC 2-5 days before procedure. Resume 12-24h post-procedure without bridging.
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="font-medium text-amber-800 mb-2">Moderate Risk</div>
              <div className="text-sm text-amber-700 mb-2">CHA₂DS₂-VASc 3 AND HAS-BLED &lt;3</div>
              <div className="text-xs text-amber-600">
                Consider bridging based on individual patient factors and procedure risk.
              </div>
            </div>
            
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-800 mb-2">High Risk</div>
              <div className="text-sm text-red-700 mb-2">CHA₂DS₂-VASc ≥4 AND HAS-BLED &lt;3</div>
              <div className="text-xs text-red-600">
                Bridge with therapeutic LMWH. Stop OAC 2-5 days before, start LMWH when INR &lt;2.0.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20 hover:shadow-lg transition-shadow"
          >
            {/* Patient Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-steel-800">{patient.name}</h3>
                <div className="text-sm text-steel-600">
                  Age {patient.age} • {patient.afType} AF
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(patient.cha2ds2vasc, true)}`}>
                  CHA₂DS₂-VASc: {patient.cha2ds2vasc}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(patient.hasbled, false)}`}>
                  HAS-BLED: {patient.hasbled}
                </span>
              </div>
            </div>

            {/* Current OAC */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="font-medium text-steel-800">Current Anticoagulation</span>
              </div>
              
              <div className="p-3 bg-steel-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-steel-800">
                      {patient.currentOAC.medication} {patient.currentOAC.dose}
                    </div>
                    <div className="text-sm text-steel-600">{patient.currentOAC.frequency}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getAdherenceColor(patient.adherence)}`}>
                    {patient.adherence}
                  </span>
                </div>
                
                <div className="text-xs text-steel-500">
                  Started: {new Date(patient.currentOAC.startDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* INR Monitoring (for Warfarin patients) */}
            {patient.currentOAC.medication === 'Warfarin' && patient.inr && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-steel-800">INR Monitoring</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-2 bg-steel-50 rounded">
                    <div className="text-xs text-steel-600">Latest INR</div>
                    <div className={`font-medium ${getINRStatus(patient.inr.latest, patient.inr.target).color}`}>
                      {patient.inr.latest}
                    </div>
                  </div>
                  <div className="p-2 bg-steel-50 rounded">
                    <div className="text-xs text-steel-600">Time in Range</div>
                    <div className={`font-medium ${patient.inr.timeInRange >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                      {patient.inr.timeInRange}%
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-steel-500">
                  Target: {patient.inr.target} • {getINRStatus(patient.inr.latest, patient.inr.target).status}
                </div>
              </div>
            )}

            {/* Bleeding Events */}
            {patient.bleedingEvents.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-steel-800">Recent Bleeding Events</span>
                </div>
                
                <div className="space-y-2">
                  {patient.bleedingEvents.slice(0, 2).map((event, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-red-800">{event.type}</span>
                        <span className="text-red-600">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="text-red-700">{event.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Procedure Bridging */}
            <ProcedureBridgingCard patient={patient} />

            {/* Follow-up */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-green-500" />
                <span className="font-medium text-steel-800">Follow-up</span>
              </div>
              
              <div className="text-sm text-steel-600">
                Next: {new Date(patient.nextFollowUp).toLocaleDateString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => updateOACPlan(patient.id)}
                className="flex-1 px-3 py-2 bg-medical-red-600 text-white rounded-lg hover:bg-medical-red-700 transition-colors text-sm"
              >
                Update OAC Plan
              </button>
              <button
                onClick={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
                className="px-3 py-2 bg-steel-600 text-white rounded-lg hover:bg-steel-700 transition-colors text-sm"
              >
                {selectedPatient === patient.id ? 'Less' : 'More'}
              </button>
            </div>

            {/* Expanded Details */}
            {selectedPatient === patient.id && (
              <div className="mt-4 space-y-3 border-t border-steel-200 pt-4">
                {/* INR Trend for Warfarin patients */}
                {patient.inr && (
                  <div>
                    <div className="font-medium text-steel-800 mb-2">INR Trend</div>
                    <div className="space-y-1">
                      {patient.inr.readings.slice(0, 4).map((reading, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-steel-600">{new Date(reading.date).toLocaleDateString()}</span>
                          <span className={`font-medium ${reading.inRange ? 'text-green-600' : 'text-red-600'}`}>
                            {reading.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Factors Detail */}
                <div>
                  <div className="font-medium text-steel-800 mb-2">Risk Assessment</div>
                  <div className="text-sm text-steel-600">
                    <div>CHA₂DS₂-VASc: {patient.cha2ds2vasc} ({patient.cha2ds2vasc < 2 ? 'Low' : patient.cha2ds2vasc < 4 ? 'Moderate' : 'High'} stroke risk)</div>
                    <div>HAS-BLED: {patient.hasbled} ({patient.hasbled < 2 ? 'Low' : patient.hasbled < 3 ? 'Moderate' : 'High'} bleeding risk)</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4">OAC Management Summary</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-medical-red-600 mb-1">
              {patients.filter(p => p.cha2ds2vasc >= 4).length}
            </div>
            <div className="text-sm text-steel-600">High Stroke Risk</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600 mb-1">
              {patients.filter(p => p.hasbled >= 3).length}
            </div>
            <div className="text-sm text-steel-600">High Bleeding Risk</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-1">
              {patients.filter(p => p.inr && p.inr.timeInRange < 60).length}
            </div>
            <div className="text-sm text-steel-600">Poor INR Control</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {patients.filter(p => p.upcomingProcedure).length}
            </div>
            <div className="text-sm text-steel-600">Need Bridging</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OACManagementPanel;