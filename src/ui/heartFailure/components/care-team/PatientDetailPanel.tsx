import React from 'react';
import { X, Heart, Thermometer, Droplets, Users, FileText, Shield, Pill, Calendar, Activity, AlertTriangle, TrendingUp, ChevronRight, Zap, Target, CheckCircle, XCircle, Clock } from 'lucide-react';

interface WorklistPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  lvef: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  priority: 'high' | 'medium' | 'low';
  gdmtGaps: string[];
  deviceEligible: boolean;
  lastVisit: string;
  nextAppointment?: string;
  assignedProvider: string;
  recentAdmission: boolean;
  actionItems: {
    category: 'GDMT' | 'Device' | 'Lab' | 'Follow-up';
    description: string;
    dueDate: string;
    urgent: boolean;
  }[];
  riskScore: number;
  phenotype?: string;
  fullChart?: {
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
      hba1c?: number;
      egfr?: number;
    };
    medications: {
      name: string;
      dose: string;
      frequency: string;
      adherence?: number;
    }[];
    provider: {
      attending: string;
      resident?: string;
      nurse: string;
      coordinator?: string;
    };
    notes: string[];
    allergies: string[];
    recentHospitalizations: {
      date: string;
      reason: string;
      los: number;
    }[];
    gdmt?: {
      overallScore: number;
      pillars: {
        arni: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        betaBlocker: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        sglt2i: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
        mra: {
          status: 'optimal' | 'suboptimal' | 'contraindicated' | 'not_started';
          currentDrug?: string;
          currentDose?: string;
          targetDose?: string;
          reason?: string;
          nextAction?: string;
        };
      };
      lastReview: string;
      nextReview: string;
      barriers: string[];
      opportunities: {
        pillar: string;
        action: string;
        priority: 'high' | 'medium' | 'low';
        timeframe: string;
      }[];
    };
  };
}

interface PatientDetailPanelProps {
  patient: WorklistPatient;
  onClose: () => void;
}

const PatientDetailPanel: React.FC<PatientDetailPanelProps> = ({ patient, onClose }) => {
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'border-red-500 bg-red-50 text-red-700';
      case 'medium': return 'border-orange-500 bg-orange-50 text-orange-700';
      case 'low': return 'border-green-500 bg-green-50 text-green-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 8) return 'text-red-600 bg-red-100';
    if (riskScore >= 6) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const getAdherenceColor = (adherence?: number) => {
    if (!adherence) return 'text-gray-600 bg-gray-100';
    if (adherence >= 90) return 'text-green-600 bg-green-100';
    if (adherence >= 75) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getGDMTStatusColor = (status: string) => {
    switch(status) {
      case 'optimal': return 'text-green-700 bg-green-100 border-green-300';
      case 'suboptimal': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'contraindicated': return 'text-red-700 bg-red-100 border-red-300';
      case 'not_started': return 'text-gray-700 bg-gray-100 border-gray-300';
      default: return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getGDMTStatusIcon = (status: string) => {
    switch(status) {
      case 'optimal': return <CheckCircle className="w-4 h-4" />;
      case 'suboptimal': return <Clock className="w-4 h-4" />;
      case 'contraindicated': return <XCircle className="w-4 h-4" />;
      case 'not_started': return <AlertTriangle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getGDMTScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-100';
    if (score >= 60) return 'text-yellow-700 bg-yellow-100';
    return 'text-red-700 bg-red-100';
  };

  // GDMT Contraindication Checking Functions
  const checkARNiContraindications = (patient: WorklistPatient) => {
    const vitals = patient.fullChart?.vitals;
    const labs = patient.fullChart?.labs;
    const alerts = [];
    
    if (vitals && parseInt(vitals.bp.split('/')[0]) < 90) {
      alerts.push({ 
        level: 'warning' as const, 
        message: 'Low SBP (<90 mmHg) - monitor closely during titration' 
      });
    }
    if (labs && labs.potassium && labs.potassium > 5.0) {
      alerts.push({ 
        level: 'caution' as const, 
        message: 'Hyperkalemia (K+ >5.0) - consider dose reduction' 
      });
    }
    if (labs && labs.egfr && labs.egfr < 30) {
      alerts.push({ 
        level: 'caution' as const, 
        message: 'Severe renal impairment - nephrology consultation' 
      });
    }
    
    return alerts;
  };

  const checkBetaBlockerContraindications = (patient: WorklistPatient) => {
    const vitals = patient.fullChart?.vitals;
    const alerts = [];
    
    if (vitals && vitals.hr < 50) {
      alerts.push({ 
        level: 'contraindication' as const, 
        message: 'Severe bradycardia (HR <50) - avoid beta-blockers' 
      });
    }
    if (vitals && vitals.hr < 60) {
      alerts.push({ 
        level: 'warning' as const, 
        message: 'Bradycardia (HR <60) - use lower starting dose' 
      });
    }
    if (vitals && parseInt(vitals.bp.split('/')[0]) < 90) {
      alerts.push({ 
        level: 'warning' as const, 
        message: 'Hypotension - monitor BP closely' 
      });
    }
    
    return alerts;
  };

  const checkSGLT2iContraindications = (patient: WorklistPatient) => {
    const labs = patient.fullChart?.labs;
    const alerts = [];
    
    if (labs && labs.egfr && labs.egfr < 25) {
      alerts.push({ 
        level: 'contraindication' as const, 
        message: 'Severe renal impairment (eGFR <25) - contraindicated' 
      });
    }
    if (labs && labs.egfr && labs.egfr < 30) {
      alerts.push({ 
        level: 'caution' as const, 
        message: 'Moderate renal impairment - monitor closely' 
      });
    }
    if (patient.age > 75) {
      alerts.push({ 
        level: 'warning' as const, 
        message: 'Advanced age - monitor volume status and falls risk' 
      });
    }
    
    return alerts;
  };

  const checkMRAContraindications = (patient: WorklistPatient) => {
    const labs = patient.fullChart?.labs;
    const alerts = [];
    
    if (labs && labs.potassium && labs.potassium > 5.0) {
      alerts.push({ 
        level: 'contraindication' as const, 
        message: 'Hyperkalemia (K+ >5.0) - contraindicated' 
      });
    }
    if (labs && labs.potassium && labs.potassium > 4.5) {
      alerts.push({ 
        level: 'caution' as const, 
        message: 'Borderline hyperkalemia - weekly K+ monitoring' 
      });
    }
    if (labs && labs.egfr && labs.egfr < 30) {
      alerts.push({ 
        level: 'contraindication' as const, 
        message: 'Severe renal impairment (eGFR <30) - contraindicated' 
      });
    }
    
    return alerts;
  };

  const getContraindicationAlerts = (pillar: string) => {
    switch(pillar) {
      case 'arni': return checkARNiContraindications(patient);
      case 'betaBlocker': return checkBetaBlockerContraindications(patient);
      case 'sglt2i': return checkSGLT2iContraindications(patient);
      case 'mra': return checkMRAContraindications(patient);
      default: return [];
    }
  };

  const getAlertColor = (level: 'contraindication' | 'caution' | 'warning') => {
    switch(level) {
      case 'contraindication': return 'text-red-800 bg-red-100 border-red-300';
      case 'caution': return 'text-orange-800 bg-orange-100 border-orange-300';
      case 'warning': return 'text-yellow-800 bg-yellow-100 border-yellow-300';
      default: return 'text-gray-800 bg-gray-100 border-gray-300';
    }
  };

  const getAlertIcon = (level: 'contraindication' | 'caution' | 'warning') => {
    switch(level) {
      case 'contraindication': return <XCircle className="w-4 h-4" />;
      case 'caution': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <Clock className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-2/3 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
              <p className="text-gray-600">
                MRN: {patient.mrn} | Age: {patient.age}{patient.gender} | Provider: {patient.assignedProvider}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-lg border-l-4 font-medium text-sm ${getPriorityColor(patient.priority)}`}>
                  {patient.priority.toUpperCase()} Priority
                </span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getRiskColor(patient.riskScore)}`}>
                  Risk Score: {patient.riskScore.toFixed(1)}
                </span>
                {patient.recentAdmission && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                    Recent Admission
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
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
                <span className="text-2xl font-bold text-gray-900">{patient.lvef}%</span>
              </div>
              <p className="text-sm text-gray-600">LVEF</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-xl font-bold text-purple-600 mb-2">NYHA {patient.nyhaClass}</div>
              <p className="text-sm text-gray-600">Functional Class</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600 mb-2">{patient.gdmtGaps.length}</div>
              <p className="text-sm text-gray-600">GDMT Gaps</p>
            </div>
          </div>

          {/* Vital Signs */}
          {patient.fullChart && (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  Current Vital Signs
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Blood Pressure</span>
                    <p className="font-medium">{patient.fullChart.vitals.bp} mmHg</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Heart Rate</span>
                    <p className="font-medium">{patient.fullChart.vitals.hr} bpm</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Temperature</span>
                    <p className="font-medium">{patient.fullChart.vitals.temp}°F</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">O2 Saturation</span>
                    <p className="font-medium">{patient.fullChart.vitals.o2sat}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Weight</span>
                    <p className="font-medium">{patient.fullChart.vitals.weight} lbs</p>
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
                    <p className="font-medium">{patient.fullChart.labs.creatinine} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">BUN</span>
                    <p className="font-medium">{patient.fullChart.labs.bun} mg/dL</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Sodium</span>
                    <p className="font-medium">{patient.fullChart.labs.sodium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Potassium</span>
                    <p className="font-medium">{patient.fullChart.labs.potassium} mEq/L</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Hemoglobin</span>
                    <p className="font-medium">{patient.fullChart.labs.hemoglobin} g/dL</p>
                  </div>
                  {patient.fullChart.labs.bnp && (
                    <div>
                      <span className="text-sm text-gray-600">BNP</span>
                      <p className="font-medium">{patient.fullChart.labs.bnp} pg/mL</p>
                    </div>
                  )}
                  {patient.fullChart.labs.hba1c && (
                    <div>
                      <span className="text-sm text-gray-600">HbA1c</span>
                      <p className="font-medium">{patient.fullChart.labs.hba1c}%</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Medications with Adherence */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  Current Medications & Adherence
                </h3>
                <div className="space-y-3">
                  {patient.fullChart.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border">
                      <div>
                        <span className="font-medium">{med.name}</span>
                        <p className="text-sm text-gray-600">{med.dose} {med.frequency}</p>
                      </div>
                      {med.adherence && (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getAdherenceColor(med.adherence)}`}>
                          {med.adherence}% adherent
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Care Team */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  Care Team
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Attending Physician</span>
                    <span className="font-medium">{patient.fullChart.provider.attending}</span>
                  </div>
                  {patient.fullChart.provider.resident && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Resident</span>
                      <span className="font-medium">{patient.fullChart.provider.resident}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Nurse</span>
                    <span className="font-medium">{patient.fullChart.provider.nurse}</span>
                  </div>
                  {patient.fullChart.provider.coordinator && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Care Coordinator</span>
                      <span className="font-medium">{patient.fullChart.provider.coordinator}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Clinical Notes */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-yellow-600" />
                  Recent Clinical Notes
                </h3>
                <div className="space-y-2">
                  {patient.fullChart.notes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
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
                  {patient.fullChart.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>

              {/* GDMT Optimization Dashboard */}
              {patient.fullChart.gdmt && (
                <div className="bg-medical-blue-50 rounded-lg p-4 border border-medical-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-medical-blue-600" />
                    GDMT Optimization Dashboard
                  </h3>
                  
                  {/* Overall GDMT Score */}
                  <div className="mb-4 p-3 bg-white rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall GDMT Score</span>
                      <span className={`px-3 py-1 rounded-full text-lg font-bold ${getGDMTScoreColor(patient.fullChart.gdmt.overallScore)}`}>
                        {patient.fullChart.gdmt.overallScore}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          patient.fullChart.gdmt.overallScore >= 80 ? 'bg-green-500' :
                          patient.fullChart.gdmt.overallScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${patient.fullChart.gdmt.overallScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 4-Pillar Status */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(patient.fullChart.gdmt.pillars).map(([pillar, data]) => (
                      <div key={pillar} className={`p-3 rounded-lg border-2 ${getGDMTStatusColor(data.status)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {getGDMTStatusIcon(data.status)}
                          <span className="font-semibold text-sm capitalize">
                            {pillar === 'arni' ? 'ARNi/ACEi/ARB' : 
                             pillar === 'betaBlocker' ? 'Beta-Blocker' :
                             pillar === 'sglt2i' ? 'SGLT2i' :
                             pillar === 'mra' ? 'MRA' : pillar}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          {data.currentDrug && (
                            <div>
                              <span className="text-gray-600">Current:</span>
                              <span className="ml-1 font-medium">{data.currentDrug} {data.currentDose}</span>
                            </div>
                          )}
                          {data.targetDose && data.status === 'suboptimal' && (
                            <div>
                              <span className="text-gray-600">Target:</span>
                              <span className="ml-1 font-medium">{data.targetDose}</span>
                            </div>
                          )}
                          {data.reason && (
                            <div className="text-gray-600 italic">{data.reason}</div>
                          )}
                        </div>

                        {/* Contraindication Alerts */}
                        {(() => {
                          const alerts = getContraindicationAlerts(pillar);
                          return alerts.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Safety Alerts:
                              </div>
                              <div className="space-y-1">
                                {alerts.map((alert, alertIdx) => (
                                  <div key={alertIdx} className={`flex items-start gap-1 p-1 rounded text-xs ${getAlertColor(alert.level)}`}>
                                    {getAlertIcon(alert.level)}
                                    <span className="text-xs leading-tight">{alert.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Optimization Opportunities */}
                  {patient.fullChart.gdmt.opportunities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Optimization Opportunities</h4>
                      <div className="space-y-2">
                        {patient.fullChart.gdmt.opportunities.map((opp, idx) => (
                          <div key={idx} className={`p-2 rounded border-l-4 text-sm ${
                            opp.priority === 'high' ? 'bg-red-50 border-red-400' :
                            opp.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                            'bg-green-50 border-green-400'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{opp.pillar}</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                opp.priority === 'high' ? 'bg-red-100 text-red-700' :
                                opp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {opp.priority} priority
                              </span>
                            </div>
                            <div className="text-gray-700">{opp.action}</div>
                            <div className="text-gray-600 text-xs mt-1">Timeframe: {opp.timeframe}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Barriers */}
                  {patient.fullChart.gdmt.barriers.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 text-sm">Current Barriers</h4>
                      <div className="flex flex-wrap gap-2">
                        {patient.fullChart.gdmt.barriers.map((barrier, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            {barrier}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Schedule */}
                  <div className="flex justify-between text-xs text-gray-600 bg-white p-2 rounded">
                    <span>Last Review: {new Date(patient.fullChart.gdmt.lastReview).toLocaleDateString()}</span>
                    <span>Next Review: {new Date(patient.fullChart.gdmt.nextReview).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Recent Hospitalizations */}
              {patient.fullChart.recentHospitalizations.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Recent Hospitalizations
                  </h3>
                  <div className="space-y-2">
                    {patient.fullChart.recentHospitalizations.map((hosp, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                        <div>
                          <span className="font-medium">{hosp.reason}</span>
                          <p className="text-sm text-gray-600">{new Date(hosp.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-sm text-gray-600">{hosp.los} days</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* GDMT Gaps */}
          {patient.gdmtGaps.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                GDMT Optimization Gaps
              </h3>
              <div className="grid gap-2">
                {patient.gdmtGaps.map((gap, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-gray-700">{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items */}
          <div className="bg-medical-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-medical-blue-600" />
              Action Items & Care Plan
            </h3>
            <div className="space-y-3">
              {patient.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded border ${
                    item.urgent 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.urgent && <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <div>
                      <span className={`font-medium ${item.urgent ? 'text-red-800' : 'text-gray-800'}`}>
                        {item.description}
                      </span>
                      <p className="text-xs text-gray-600">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                    {item.urgent && (
                      <span className="text-xs text-red-600 font-medium">URGENT</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Eligibility */}
          {patient.deviceEligible && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Device Therapy Eligibility
              </h3>
              <div className="bg-white p-3 rounded border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="font-medium text-indigo-800">Eligible for Device Therapy</span>
                </div>
                <p className="text-sm text-gray-600">
                  Patient meets criteria for device evaluation based on current LVEF and clinical status.
                  {patient.phenotype && ` Phenotype: ${patient.phenotype}`}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button 
              onClick={() => {
                console.log('Beginning care plan for patient:', patient.name, patient.mrn, 'GDMT gaps:', patient.gdmtGaps);
                alert('Begin Care Plan\n\nThis would initiate a comprehensive care plan for ' + patient.name + '.\n\n• GDMT optimization roadmap\n• Clinical milestone tracking\n• Provider task assignments\n• Patient education resources\n• Follow-up scheduling coordination\n• Progress monitoring setup\n\nTODO: Implement care plan workflow with evidence-based protocols');
              }}
              className="flex-1 px-4 py-3 bg-medical-blue-600 text-white rounded-lg font-medium hover:bg-medical-blue-700 transition-colors"
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Begin Care Plan
            </button>
            <button
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              onClick={onClose}
            >
              Close Patient Chart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailPanel;