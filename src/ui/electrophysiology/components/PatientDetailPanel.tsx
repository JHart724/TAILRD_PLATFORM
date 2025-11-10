import React from 'react';
import { X, Heart, Thermometer, Droplets, Users, FileText, Shield, Pill, Calendar, Activity, AlertTriangle, TrendingUp, ChevronRight, Zap, Target, CheckCircle, XCircle, Clock, Battery, Waves, DollarSign } from 'lucide-react';

interface EPPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: 'M' | 'F';
  rhythm: string;
  device?: string;
  lastEP: string;
  nextAppt: string;
  riskLevel: 'low' | 'medium' | 'high';
  alerts: string[];
  provider: string;
  laacCandidate?: boolean;
  laacStatus?: 'eligible' | 'scheduled' | 'completed' | 'contraindicated';
  chaScore?: number;
  hasbleedScore?: number;
  priority: 'high' | 'medium' | 'low';
  actionItems: {
    category: 'Device' | 'LAAC' | 'Anticoagulation' | 'Follow-up' | 'Ablation';
    description: string;
    dueDate: string;
    urgent: boolean;
  }[];
  deviceMonitoring?: {
    patientId: string;
    patientName: string;
    mrn: string;
    deviceType: 'Pacemaker' | 'ICD' | 'CRT-P' | 'CRT-D' | 'S-ICD' | 'Loop Recorder';
    manufacturer: string;
    model: string;
    implantDate: string;
    batteryLevel: number;
    batteryEOL: string;
    lastInterrogation: string;
    nextScheduled: string;
    remoteMonitoring: boolean;
    alerts: {
      type: 'battery' | 'lead' | 'therapy' | 'arrhythmia' | 'system';
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      date: string;
    }[];
    therapyDelivery: {
      appropriateShocks: number;
      inappropriateShocks: number;
      atpEpisodes: number;
      lastTherapy: string;
    };
    leadParameters: {
      lead: string;
      impedance: number;
      threshold: number;
      sensing: number;
      status: 'normal' | 'warning' | 'alert';
    }[];
  };
  afibDetails?: {
    type: 'paroxysmal' | 'persistent' | 'longstanding-persistent' | 'permanent';
    duration: string;
    symptoms: string[];
    priorAblations: number;
    lastEpisode: string;
    anticoagulation: {
      current: boolean;
      medication?: string;
      dose?: string;
      adherence?: number;
      inrTarget?: string;
      lastINR?: number;
      reasons: string[];
    };
  };
  fullChart?: {
    vitals: {
      bp: string;
      hr: number;
      temp: number;
      o2sat: number;
      weight: number;
      rhythm: string;
    };
    labs: {
      creatinine: number;
      bun: number;
      sodium: number;
      potassium: number;
      hemoglobin: number;
      inr?: number;
      troponin?: number;
      bnp?: number;
      tsh?: number;
    };
    medications: {
      name: string;
      dose: string;
      frequency: string;
      adherence?: number;
      indication: string;
    }[];
    provider: {
      attending: string;
      resident?: string;
      nurse: string;
      coordinator?: string;
    };
    notes: string[];
    allergies: string[];
    procedures: {
      date: string;
      procedure: string;
      outcome: string;
      complications?: string[];
    }[];
  };
}

interface PatientDetailPanelProps {
  patient: EPPatient;
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

  const getRiskColor = (riskLevel: string) => {
    switch(riskLevel) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAdherenceColor = (adherence?: number) => {
    if (!adherence) return 'text-gray-600 bg-gray-100';
    if (adherence >= 90) return 'text-green-600 bg-green-100';
    if (adherence >= 75) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getBatteryColor = (level: number) => {
    if (level >= 80) return 'text-green-600 bg-green-100';
    if (level >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLeadStatusColor = (status: string) => {
    switch(status) {
      case 'normal': return 'text-green-700 bg-green-100';
      case 'warning': return 'text-yellow-700 bg-yellow-100';
      case 'alert': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getCHADSColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 3) return 'text-red-600';
    if (score >= 2) return 'text-orange-600';
    return 'text-green-600';
  };

  const getHASBLEDColor = (score?: number) => {
    if (!score) return 'text-gray-600';
    if (score >= 3) return 'text-red-600';
    if (score >= 2) return 'text-orange-600';
    return 'text-green-600';
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
                MRN: {patient.mrn} | Age: {patient.age}{patient.gender} | Provider: {patient.provider}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-lg border-l-4 font-medium text-sm ${getPriorityColor(patient.priority)}`}>
                  {patient.priority.toUpperCase()} Priority
                </span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${getRiskColor(patient.riskLevel)}`}>
                  {patient.riskLevel.toUpperCase()} Risk
                </span>
                {patient.rhythm.toLowerCase().includes('atrial') && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                    AFib Patient
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
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Waves className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-bold text-gray-900">{patient.rhythm}</span>
              </div>
              <p className="text-sm text-gray-600">Current Rhythm</p>
            </div>
            {patient.device && (
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span className="text-lg font-bold text-purple-600">{patient.device}</span>
                </div>
                <p className="text-sm text-gray-600">Device</p>
              </div>
            )}
            {patient.chaScore && (
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-red-600 mb-2">CHA₂DS₂-VASc: {patient.chaScore}</div>
                <p className="text-sm text-gray-600">Stroke Risk</p>
              </div>
            )}
            {patient.hasbleedScore && (
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-xl font-bold text-orange-600 mb-2">HAS-BLED: {patient.hasbleedScore}</div>
                <p className="text-sm text-gray-600">Bleeding Risk</p>
              </div>
            )}
          </div>

          {/* AFib Details */}
          {patient.afibDetails && (
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-purple-600" />
                Atrial Fibrillation Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <p className="font-medium capitalize">{patient.afibDetails.type}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Duration:</span>
                  <p className="font-medium">{patient.afibDetails.duration}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Prior Ablations:</span>
                  <p className="font-medium">{patient.afibDetails.priorAblations}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Last Episode:</span>
                  <p className="font-medium">{new Date(patient.afibDetails.lastEpisode).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Symptoms:</h4>
                <div className="flex flex-wrap gap-2">
                  {patient.afibDetails.symptoms.map((symptom, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>

              {/* Anticoagulation Status */}
              <div className="mt-4 p-3 bg-white rounded border">
                <h4 className="font-medium text-gray-900 mb-2">Anticoagulation Status:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Currently Anticoagulated:</span>
                    <p className={`font-medium ${patient.afibDetails.anticoagulation.current ? 'text-green-600' : 'text-red-600'}`}>
                      {patient.afibDetails.anticoagulation.current ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {patient.afibDetails.anticoagulation.medication && (
                    <div>
                      <span className="text-sm text-gray-600">Medication:</span>
                      <p className="font-medium">{patient.afibDetails.anticoagulation.medication} {patient.afibDetails.anticoagulation.dose}</p>
                    </div>
                  )}
                </div>
                {patient.afibDetails.anticoagulation.reasons.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-600">Reasons:</span>
                    <ul className="mt-1 space-y-1">
                      {patient.afibDetails.anticoagulation.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Device Monitoring */}
          {patient.deviceMonitoring && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Battery className="w-5 h-5 text-blue-600" />
                Device Monitoring Status
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="bg-white rounded p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{patient.deviceMonitoring.deviceType}</span>
                      <span className={`px-2 py-1 rounded text-sm font-bold ${getBatteryColor(patient.deviceMonitoring.batteryLevel)}`}>
                        {patient.deviceMonitoring.batteryLevel}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{patient.deviceMonitoring.manufacturer} {patient.deviceMonitoring.model}</p>
                    <p className="text-xs text-gray-500">Implanted: {new Date(patient.deviceMonitoring.implantDate).toLocaleDateString()}</p>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Interrogation:</span>
                      <span className="font-medium">{new Date(patient.deviceMonitoring.lastInterrogation).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Scheduled:</span>
                      <span className="font-medium">{new Date(patient.deviceMonitoring.nextScheduled).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remote Monitoring:</span>
                      <span className={`font-medium ${patient.deviceMonitoring.remoteMonitoring ? 'text-green-600' : 'text-red-600'}`}>
                        {patient.deviceMonitoring.remoteMonitoring ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battery EOL:</span>
                      <span className="font-medium">{new Date(patient.deviceMonitoring.batteryEOL).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Therapy Delivery (for ICDs) */}
                {patient.deviceMonitoring.deviceType.includes('ICD') && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Therapy Delivery</h4>
                    <div className="bg-white rounded p-3 border">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">{patient.deviceMonitoring.therapyDelivery.appropriateShocks}</div>
                          <div className="text-xs text-gray-600">Appropriate</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">{patient.deviceMonitoring.therapyDelivery.inappropriateShocks}</div>
                          <div className="text-xs text-gray-600">Inappropriate</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{patient.deviceMonitoring.therapyDelivery.atpEpisodes}</div>
                          <div className="text-xs text-gray-600">ATP</div>
                        </div>
                      </div>
                      <div className="mt-2 text-center text-xs text-gray-600">
                        Last Therapy: {patient.deviceMonitoring.therapyDelivery.lastTherapy}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Lead Parameters */}
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Lead Parameters</h4>
                <div className="space-y-2">
                  {patient.deviceMonitoring.leadParameters.map((lead, idx) => (
                    <div key={idx} className="bg-white rounded p-3 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{lead.lead}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getLeadStatusColor(lead.status)}`}>
                          {lead.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Impedance:</span>
                          <div className="font-medium">{lead.impedance}Ω</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Threshold:</span>
                          <div className="font-medium">{lead.threshold}V</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Sensing:</span>
                          <div className="font-medium">{lead.sensing}mV</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Alerts */}
              {patient.deviceMonitoring.alerts.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Active Device Alerts</h4>
                  <div className="space-y-2">
                    {patient.deviceMonitoring.alerts.map((alert, idx) => (
                      <div key={idx} className={`p-3 rounded border-l-4 ${ 
                        alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{alert.type.toUpperCase()} Alert</span>
                          <span className="text-xs text-gray-600">{new Date(alert.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LAAC Status */}
          {patient.laacCandidate && (
            <div className="bg-medical-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-medical-purple-600" />
                LAAC Candidacy Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">LAAC Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                    patient.laacStatus === 'eligible' ? 'bg-green-100 text-green-700' :
                    patient.laacStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    patient.laacStatus === 'completed' ? 'bg-purple-100 text-purple-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {patient.laacStatus?.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">CHA₂DS₂-VASc:</span>
                    <span className={`ml-2 font-bold ${getCHADSColor(patient.chaScore)}`}>
                      {patient.chaScore}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">HAS-BLED:</span>
                    <span className={`ml-2 font-bold ${getHASBLEDColor(patient.hasbleedScore)}`}>
                      {patient.hasbleedScore}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-white rounded border">
                <h4 className="font-medium text-gray-900 mb-2">LAAC Indication:</h4>
                <div className="text-sm text-gray-700">
                  {patient.chaScore && patient.chaScore >= 3 && patient.hasbleedScore && patient.hasbleedScore >= 3 ? (
                    <div className="text-green-700">
                      ✓ Strong indication for LAAC: High stroke risk (CHA₂DS₂-VASc ≥3) with high bleeding risk (HAS-BLED ≥3)
                    </div>
                  ) : patient.afibDetails?.anticoagulation.current === false ? (
                    <div className="text-green-700">
                      ✓ LAAC candidate: Contraindication to anticoagulation
                    </div>
                  ) : (
                    <div className="text-yellow-700">
                      ⚠ Consider LAAC: Patient meets some criteria but requires individualized assessment
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
                    <span className="text-sm text-gray-600">Rhythm</span>
                    <p className="font-medium">{patient.fullChart.vitals.rhythm}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">O2 Saturation</span>
                    <p className="font-medium">{patient.fullChart.vitals.o2sat}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Weight</span>
                    <p className="font-medium">{patient.fullChart.vitals.weight} lbs</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Temperature</span>
                    <p className="font-medium">{patient.fullChart.vitals.temp}°F</p>
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
                  {patient.fullChart.labs.inr && (
                    <div>
                      <span className="text-sm text-gray-600">INR</span>
                      <p className="font-medium">{patient.fullChart.labs.inr}</p>
                    </div>
                  )}
                  {patient.fullChart.labs.bnp && (
                    <div>
                      <span className="text-sm text-gray-600">BNP</span>
                      <p className="font-medium">{patient.fullChart.labs.bnp} pg/mL</p>
                    </div>
                  )}
                  {patient.fullChart.labs.troponin && (
                    <div>
                      <span className="text-sm text-gray-600">Troponin</span>
                      <p className="font-medium">{patient.fullChart.labs.troponin} ng/mL</p>
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
                <div className="space-y-3">
                  {patient.fullChart.medications.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border">
                      <div>
                        <span className="font-medium">{med.name}</span>
                        <p className="text-sm text-gray-600">{med.dose} {med.frequency}</p>
                        <p className="text-xs text-gray-500">Indication: {med.indication}</p>
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

              {/* Procedures History */}
              {patient.fullChart.procedures.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Procedure History
                  </h3>
                  <div className="space-y-3">
                    {patient.fullChart.procedures.map((proc, idx) => (
                      <div key={idx} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{proc.procedure}</span>
                          <span className="text-sm text-gray-600">{new Date(proc.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">Outcome: {proc.outcome}</p>
                        {proc.complications && proc.complications.length > 0 && (
                          <div>
                            <span className="text-sm text-red-600 font-medium">Complications:</span>
                            <ul className="list-disc list-inside text-sm text-red-600 ml-2">
                              {proc.complications.map((comp, compIdx) => (
                                <li key={compIdx}>{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
            </>
          )}

          {/* Action Items */}
          <div className="bg-medical-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-medical-green-600" />
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button 
              className="flex-1 px-4 py-3 bg-medical-green-600 text-white rounded-lg font-medium hover:bg-medical-green-700 transition-colors"
              onClick={() => {
                console.log(`EP: Beginning care plan for patient ${patient.name} (${patient.mrn})`);
                alert(`Begin EP Care Plan - ${patient.name}\n\nInitiating comprehensive electrophysiology care plan:\n\n• Current Status: ${patient.rhythm} rhythm\n• Risk Level: ${patient.riskLevel.toUpperCase()}\n• Priority: ${patient.priority.toUpperCase()}\n\nCare Plan Components:\n• Risk stratification assessment\n• Anticoagulation optimization\n• Rhythm management strategy\n• Device therapy evaluation\n• LAAC candidacy assessment\n• Follow-up scheduling\n• Patient education materials\n• Quality metrics tracking\n\nNext steps:\n1. Review clinical guidelines\n2. Coordinate multidisciplinary consultation\n3. Implement evidence-based protocols\n4. Schedule appropriate follow-up`);
                // TODO: Implement comprehensive EP care plan workflow with clinical decision support and automated scheduling
              }}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Begin Care Plan
            </button>
            {patient.deviceMonitoring && (
              <button 
                className="px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                onClick={() => {
                  console.log(`EP: Opening device actions for patient ${patient.name} with ${patient.deviceMonitoring?.deviceType}`);
                  alert(`Device Management Actions - ${patient.name}\n\nDevice: ${patient.deviceMonitoring?.deviceType} (${patient.deviceMonitoring?.manufacturer})\nBattery: ${patient.deviceMonitoring?.batteryLevel}%\n\nAvailable Actions:\n\n• Interrogate device remotely\n• Schedule in-person follow-up\n• Review therapy delivery log\n• Adjust device parameters\n• Update remote monitoring settings\n• Generate device report\n• Check lead impedances\n• Review arrhythmia episodes\n• Patient education on device\n• Battery replacement planning\n\nNext interrogation: ${patient.deviceMonitoring?.nextScheduled}\nRemote monitoring: ${patient.deviceMonitoring?.remoteMonitoring ? 'Active' : 'Inactive'}`);
                  // TODO: Implement comprehensive device management system with remote interrogation and parameter adjustment
                }}
              >
                <Battery className="w-4 h-4 inline mr-2" />
                Device Actions
              </button>
            )}
            {patient.laacCandidate && (
              <button 
                className="px-4 py-3 bg-medical-purple-600 text-white rounded-lg font-medium hover:bg-medical-purple-700 transition-colors"
                onClick={() => {
                  console.log(`EP: Opening LAAC workflow for patient ${patient.name} with status ${patient.laacStatus}`);
                  alert(`LAAC Workflow - ${patient.name}\n\nLAAC Status: ${patient.laacStatus?.toUpperCase()}\nStroke Risk (CHA₂DS₂-VASc): ${patient.chaScore}\nBleeding Risk (HAS-BLED): ${patient.hasbleedScore}\n\nWorkflow Steps:\n\n• Pre-procedure assessment\n  - TEE evaluation\n  - Anticoagulation status review\n  - Anatomical suitability assessment\n\n• Procedure planning\n  - Device selection and sizing\n  - Anesthesia consultation\n  - Risk assessment and consent\n\n• Post-procedure management\n  - Antiplatelet therapy protocol\n  - TEE follow-up scheduling\n  - Registry data collection\n  - Long-term monitoring plan\n\nCurrent recommendation: ${patient.laacStatus === 'eligible' ? 'Proceed with LAAC evaluation' : patient.laacStatus === 'scheduled' ? 'Review pre-procedure checklist' : 'Complete post-procedure care plan'}`);
                  // TODO: Implement comprehensive LAAC workflow with automated checklists, scheduling, and registry integration
                }}
              >
                <Shield className="w-4 h-4 inline mr-2" />
                LAAC Workflow
              </button>
            )}
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