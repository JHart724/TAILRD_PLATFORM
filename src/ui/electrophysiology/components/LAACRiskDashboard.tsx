import React, { useState, useMemo } from 'react';
import { Calculator, Target, Droplets, TrendingUp, CheckCircle, XCircle, AlertTriangle, DollarSign, FileText, Shield, Heart, Eye, User, Calendar } from 'lucide-react';

interface PatientLAACData {
  patientId: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  mrn: string;
  admissionDate: string;
  afType: 'Paroxysmal' | 'Persistent' | 'Permanent';
  
  // Clinical data for automated calculation
  clinicalHistory: {
    chf: boolean;
    hypertension: boolean;
    diabetes: boolean;
    stroke: boolean;
    vascularDisease: boolean;
    bleedingHistory: boolean;
    renalDisease: boolean;
    liverDisease: boolean;
    anticoagContraindicated: boolean;
    anticoagFailure: boolean;
  };
  
  // Labs and vitals
  labValues: {
    creatinine: number;
    inr?: number;
    hemoglobin: number;
    platelets: number;
  };
  
  // Current medications
  medications: {
    anticoagulant?: string;
    antiplatelet: boolean;
    riskDrugs: boolean;
  };
  
  // Imaging
  imaging: {
    laaSize: number; // mm
    lvef: number; // %
    laaThrombus: boolean;
  };
}

interface LAACAssessment {
  chaScore: number;
  hasBleedScore: number;
  strokeRisk: number;
  bleedingRisk: number;
  laacAppropriate: boolean;
  watchmanEligible: boolean;
  reimbursementLikelihood: 'high' | 'medium' | 'low';
  clinicalRecommendation: string;
  coverageCriteria: string[];
  contraindications: string[];
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedCost: number;
}

const LAACRiskDashboard: React.FC = () => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'strokeRisk' | 'chaScore'>('priority');

  // Mock patient data with clinical information for automated calculation
  const patientData: PatientLAACData[] = [
    {
      patientId: 'EP-2024-001',
      name: 'Johnson, Margaret',
      age: 78,
      gender: 'female',
      mrn: 'MRN-EP-001',
      admissionDate: '2024-10-20',
      afType: 'Persistent',
      clinicalHistory: {
        chf: true,
        hypertension: true,
        diabetes: true,
        stroke: false,
        vascularDisease: true,
        bleedingHistory: true,
        renalDisease: false,
        liverDisease: false,
        anticoagContraindicated: true,
        anticoagFailure: false
      },
      labValues: {
        creatinine: 1.8,
        hemoglobin: 10.2,
        platelets: 185000
      },
      medications: {
        antiplatelet: true,
        riskDrugs: false
      },
      imaging: {
        laaSize: 22,
        lvef: 35,
        laaThrombus: false
      }
    },
    {
      patientId: 'EP-2024-002',
      name: 'Chen, Robert',
      age: 72,
      gender: 'male',
      mrn: 'MRN-EP-002',
      admissionDate: '2024-10-18',
      afType: 'Paroxysmal',
      clinicalHistory: {
        chf: false,
        hypertension: true,
        diabetes: false,
        stroke: true,
        vascularDisease: false,
        bleedingHistory: false,
        renalDisease: false,
        liverDisease: false,
        anticoagContraindicated: false,
        anticoagFailure: true
      },
      labValues: {
        creatinine: 1.1,
        inr: 1.8,
        hemoglobin: 12.5,
        platelets: 240000
      },
      medications: {
        anticoagulant: 'Warfarin',
        antiplatelet: false,
        riskDrugs: false
      },
      imaging: {
        laaSize: 18,
        lvef: 55,
        laaThrombus: false
      }
    },
    {
      patientId: 'EP-2024-003',
      name: 'Rodriguez, Maria',
      age: 68,
      gender: 'female',
      mrn: 'MRN-EP-003',
      admissionDate: '2024-10-22',
      afType: 'Permanent',
      clinicalHistory: {
        chf: true,
        hypertension: true,
        diabetes: true,
        stroke: false,
        vascularDisease: false,
        bleedingHistory: true,
        renalDisease: true,
        liverDisease: false,
        anticoagContraindicated: false,
        anticoagFailure: false
      },
      labValues: {
        creatinine: 2.1,
        hemoglobin: 9.8,
        platelets: 150000
      },
      medications: {
        anticoagulant: 'Apixaban',
        antiplatelet: false,
        riskDrugs: true
      },
      imaging: {
        laaSize: 25,
        lvef: 45,
        laaThrombus: false
      }
    },
    {
      patientId: 'EP-2024-004',
      name: 'Thompson, William',
      age: 81,
      gender: 'male',
      mrn: 'MRN-EP-004',
      admissionDate: '2024-10-19',
      afType: 'Persistent',
      clinicalHistory: {
        chf: true,
        hypertension: true,
        diabetes: false,
        stroke: true,
        vascularDisease: true,
        bleedingHistory: false,
        renalDisease: false,
        liverDisease: false,
        anticoagContraindicated: true,
        anticoagFailure: false
      },
      labValues: {
        creatinine: 1.3,
        hemoglobin: 11.8,
        platelets: 210000
      },
      medications: {
        antiplatelet: true,
        riskDrugs: false
      },
      imaging: {
        laaSize: 20,
        lvef: 40,
        laaThrombus: false
      }
    },
    {
      patientId: 'EP-2024-005',
      name: 'Davis, Patricia',
      age: 75,
      gender: 'female',
      mrn: 'MRN-EP-005',
      admissionDate: '2024-10-21',
      afType: 'Paroxysmal',
      clinicalHistory: {
        chf: false,
        hypertension: true,
        diabetes: true,
        stroke: false,
        vascularDisease: false,
        bleedingHistory: false,
        renalDisease: false,
        liverDisease: false,
        anticoagContraindicated: false,
        anticoagFailure: false
      },
      labValues: {
        creatinine: 0.9,
        inr: 2.3,
        hemoglobin: 13.1,
        platelets: 280000
      },
      medications: {
        anticoagulant: 'Rivaroxaban',
        antiplatelet: false,
        riskDrugs: false
      },
      imaging: {
        laaSize: 19,
        lvef: 60,
        laaThrombus: false
      }
    }
  ];

  // Automated calculation function
  const calculateLAACAssessment = (patient: PatientLAACData): LAACAssessment => {
    const { clinicalHistory, age, gender, labValues, medications, imaging } = patient;

    // Calculate CHA₂DS₂-VASc score automatically
    let chaScore = 0;
    if (clinicalHistory.chf) chaScore += 1;
    if (clinicalHistory.hypertension) chaScore += 1;
    if (age >= 75) chaScore += 2;
    else if (age >= 65) chaScore += 1;
    if (clinicalHistory.diabetes) chaScore += 1;
    if (clinicalHistory.stroke) chaScore += 2;
    if (clinicalHistory.vascularDisease) chaScore += 1;
    if (gender === 'female') chaScore += 1;

    // Calculate HAS-BLED score automatically
    let hasBleedScore = 0;
    if (clinicalHistory.hypertension) hasBleedScore += 1;
    if (clinicalHistory.renalDisease || labValues.creatinine > 2.0) hasBleedScore += 1;
    if (clinicalHistory.liverDisease) hasBleedScore += 1;
    if (clinicalHistory.stroke) hasBleedScore += 1;
    if (clinicalHistory.bleedingHistory) hasBleedScore += 1;
    if (labValues.inr && (labValues.inr < 2.0 || labValues.inr > 3.0)) hasBleedScore += 1;
    if (age > 65) hasBleedScore += 1;
    if (medications.riskDrugs || medications.antiplatelet) hasBleedScore += 1;

    // Annual stroke risk based on CHA₂DS₂-VASc
    const strokeRiskTable = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];
    const strokeRisk = strokeRiskTable[Math.min(chaScore, 9)] || 15.2;

    // WATCHMAN LAAC appropriateness logic (2025 Boston Scientific Guidelines)
    const laacAppropriate = chaScore >= 2 && (
      clinicalHistory.anticoagContraindicated ||
      clinicalHistory.anticoagFailure ||
      hasBleedScore >= 3 || 
      clinicalHistory.bleedingHistory
    );

    // WATCHMAN specific eligibility
    const watchmanEligible = laacAppropriate && 
      !imaging.laaThrombus &&
      imaging.laaSize >= 17 && imaging.laaSize <= 31 &&
      labValues.platelets > 100000;

    // Reimbursement likelihood (2025 CMS/Medicare criteria)
    let reimbursementLikelihood: 'high' | 'medium' | 'low' = 'low';
    if (chaScore >= 3 && (clinicalHistory.anticoagContraindicated || hasBleedScore >= 3)) {
      reimbursementLikelihood = 'high';
    } else if (chaScore >= 2 && (clinicalHistory.anticoagFailure || hasBleedScore >= 2)) {
      reimbursementLikelihood = 'medium';
    }

    // Clinical recommendation
    let clinicalRecommendation = '';
    if (watchmanEligible) {
      if (chaScore >= 3 && clinicalHistory.anticoagContraindicated) {
        clinicalRecommendation = 'Strong WATCHMAN candidate - CHA₂DS₂-VASc ≥3 with contraindication to long-term anticoagulation';
      } else if (chaScore >= 2 && (clinicalHistory.anticoagFailure || hasBleedScore >= 3)) {
        clinicalRecommendation = 'WATCHMAN candidate - Elevated stroke risk with bleeding concern or anticoagulation failure';
      } else {
        clinicalRecommendation = 'WATCHMAN candidate - Consider shared decision making with patient';
      }
    } else if (laacAppropriate && !watchmanEligible) {
      clinicalRecommendation = 'LAAC appropriate but WATCHMAN contraindicated - Consider alternative LAAC device or address contraindications';
    } else if (chaScore >= 2 && hasBleedScore < 2) {
      clinicalRecommendation = 'Anticoagulation preferred - Elevated stroke risk with acceptable bleeding risk';
    } else {
      clinicalRecommendation = 'LAAC not indicated - Stroke risk does not justify intervention risk';
    }

    // Coverage criteria
    const coverageCriteria = [];
    if (chaScore >= 3) coverageCriteria.push(`CHA₂DS₂-VASc ≥3 (Score: ${chaScore}) - Medicare coverage requirement`);
    if (chaScore >= 2) coverageCriteria.push(`CHA₂DS₂-VASc ≥2 (Score: ${chaScore}) - General population criteria`);
    if (clinicalHistory.anticoagContraindicated) coverageCriteria.push('Contraindication to long-term anticoagulation');
    if (hasBleedScore >= 3) coverageCriteria.push(`HAS-BLED ≥3 (Score: ${hasBleedScore}) - High bleeding risk`);
    if (clinicalHistory.bleedingHistory) coverageCriteria.push('History of major bleeding');
    if (clinicalHistory.anticoagFailure) coverageCriteria.push('Anticoagulation therapy failure');

    // Contraindications
    const contraindications = [];
    if (imaging.laaThrombus) contraindications.push('Intracardiac thrombus present');
    if (imaging.laaSize < 17 || imaging.laaSize > 31) contraindications.push('LAA anatomy will not accommodate WATCHMAN device');
    if (labValues.platelets < 100000) contraindications.push('Thrombocytopenia - platelets <100,000');

    // Priority calculation
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
    if (watchmanEligible && chaScore >= 4 && hasBleedScore >= 3) {
      priority = 'urgent';
    } else if (watchmanEligible && chaScore >= 3) {
      priority = 'high';
    } else if (laacAppropriate) {
      priority = 'medium';
    }

    return {
      chaScore,
      hasBleedScore,
      strokeRisk,
      bleedingRisk: hasBleedScore * 1.5,
      laacAppropriate,
      watchmanEligible,
      reimbursementLikelihood,
      clinicalRecommendation,
      coverageCriteria,
      contraindications,
      priority,
      estimatedCost: watchmanEligible ? 55000 : 0
    };
  };

  // Calculate assessments for all patients
  const assessedPatients = useMemo(() => {
    return patientData.map(patient => ({
      ...patient,
      assessment: calculateLAACAssessment(patient)
    }));
  }, []);

  // Sort patients based on selected criteria
  const sortedPatients = useMemo(() => {
    return [...assessedPatients].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.assessment.priority] - priorityOrder[a.assessment.priority];
        case 'strokeRisk':
          return b.assessment.strokeRisk - a.assessment.strokeRisk;
        case 'chaScore':
          return b.assessment.chaScore - a.assessment.chaScore;
        default:
          return 0;
      }
    });
  }, [assessedPatients, sortBy]);

  const getRiskColor = (score: number, type: 'stroke' | 'bleeding') => {
    if (type === 'stroke') {
      if (score >= 6) return 'text-medical-red-600 bg-medical-red-100';
      if (score >= 3) return 'text-medical-amber-600 bg-medical-amber-100';
      return 'text-medical-green-600 bg-medical-green-100';
    } else {
      if (score >= 3) return 'text-medical-red-600 bg-medical-red-100';
      if (score >= 2) return 'text-medical-amber-600 bg-medical-amber-100';
      return 'text-medical-green-600 bg-medical-green-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-medical-red-100 text-medical-red-800 border-medical-red-200';
      case 'high': return 'bg-medical-amber-100 text-medical-amber-800 border-medical-amber-200';
      case 'medium': return 'bg-medical-green-100 text-medical-green-800 border-medical-green-200';
      default: return 'bg-steel-100 text-steel-600 border-steel-200';
    }
  };

  const getReimbursementColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return 'text-medical-green-600';
      case 'medium': return 'text-medical-amber-600';
      default: return 'text-medical-red-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="retina-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-medical-green-600" />
            <h2 className="text-2xl font-bold text-steel-900">WATCHMAN LAAC Risk Assessment Dashboard</h2>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-steel-300 rounded-lg focus:ring-medical-green-500 focus:border-medical-green-500"
            >
              <option value="priority">Sort by Priority</option>
              <option value="strokeRisk">Sort by Stroke Risk</option>
              <option value="chaScore">Sort by CHA₂DS₂-VASc</option>
            </select>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
            <div className="text-2xl font-bold text-medical-green-600">
              {assessedPatients.filter(p => p.assessment.watchmanEligible).length}
            </div>
            <div className="text-sm text-steel-600">WATCHMAN Eligible</div>
          </div>
          <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
            <div className="text-2xl font-bold text-medical-green-600">
              {assessedPatients.filter(p => p.assessment.reimbursementLikelihood === 'high').length}
            </div>
            <div className="text-sm text-steel-600">High Reimbursement</div>
          </div>
          <div className="p-4 bg-medical-red-50 rounded-lg border border-medical-red-200">
            <div className="text-2xl font-bold text-medical-red-600">
              {assessedPatients.filter(p => p.assessment.priority === 'urgent' || p.assessment.priority === 'high').length}
            </div>
            <div className="text-sm text-steel-600">High Priority</div>
          </div>
          <div className="p-4 bg-medical-amber-50 rounded-lg border border-medical-amber-200">
            <div className="text-2xl font-bold text-medical-amber-600">
              ${assessedPatients.filter(p => p.assessment.watchmanEligible).reduce((sum, p) => sum + p.assessment.estimatedCost, 0).toLocaleString()}
            </div>
            <div className="text-sm text-steel-600">Total Revenue Potential</div>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-4">
        {sortedPatients.map((patient) => (
          <div key={patient.patientId} className="retina-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-steel-600" />
                  <div>
                    <div className="font-semibold text-steel-900">{patient.name}</div>
                    <div className="text-sm text-steel-600">
                      {patient.age}yo {patient.gender} • {patient.mrn} • {patient.afType} AF
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getPriorityColor(patient.assessment.priority)}`}>
                  {patient.assessment.priority.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setExpandedPatient(expandedPatient === patient.patientId ? null : patient.patientId)}
                className="flex items-center gap-2 px-4 py-2 bg-medical-green-100 text-medical-green-700 rounded-lg hover:bg-medical-green-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {expandedPatient === patient.patientId ? 'Hide Details' : 'View Details'}
              </button>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
              <div className="text-center">
                <div className="text-sm text-steel-600">CHA₂DS₂-VASc</div>
                <div className={`text-lg font-bold px-2 py-1 rounded ${getRiskColor(patient.assessment.chaScore, 'stroke')}`}>
                  {patient.assessment.chaScore}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-steel-600">HAS-BLED</div>
                <div className={`text-lg font-bold px-2 py-1 rounded ${getRiskColor(patient.assessment.hasBleedScore, 'bleeding')}`}>
                  {patient.assessment.hasBleedScore}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-steel-600">Stroke Risk</div>
                <div className="text-lg font-bold text-steel-900">{patient.assessment.strokeRisk}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-steel-600">LAAC Appropriate</div>
                <div className="flex justify-center">
                  {patient.assessment.laacAppropriate ? (
                    <CheckCircle className="w-6 h-6 text-medical-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-medical-red-500" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-steel-600">WATCHMAN Eligible</div>
                <div className="flex justify-center">
                  {patient.assessment.watchmanEligible ? (
                    <Shield className="w-6 h-6 text-medical-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-medical-red-500" />
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-steel-600">Reimbursement</div>
                <div className={`text-lg font-bold capitalize ${getReimbursementColor(patient.assessment.reimbursementLikelihood)}`}>
                  {patient.assessment.reimbursementLikelihood}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPatient === patient.patientId && (
              <div className="mt-6 pt-6 border-t border-steel-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Clinical Recommendation */}
                  <div className="space-y-4">
                    <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-medical-green-500 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-steel-900 mb-1">Clinical Recommendation</div>
                          <div className="text-sm text-steel-700">{patient.assessment.clinicalRecommendation}</div>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Data */}
                    <div className="p-4 bg-white rounded-lg border border-steel-200">
                      <h4 className="text-sm font-medium text-steel-900 mb-3">Clinical History</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.chf ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Heart Failure
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.hypertension ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Hypertension
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.diabetes ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Diabetes
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.stroke ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Stroke/TIA
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.bleedingHistory ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Bleeding History
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${patient.clinicalHistory.anticoagContraindicated ? 'bg-medical-red-500' : 'bg-steel-300'}`}></div>
                          Anticoag Contraindicated
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Coverage Criteria */}
                    {patient.assessment.coverageCriteria.length > 0 && (
                      <div className="p-4 bg-medical-green-50 rounded-lg border border-medical-green-200">
                        <div className="text-sm font-medium text-steel-900 mb-2">Coverage Criteria Met</div>
                        <div className="space-y-1">
                          {patient.assessment.coverageCriteria.slice(0, 3).map((criteria, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-medical-green-700">
                              <CheckCircle className="w-4 h-4" />
                              {criteria}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Values */}
                    <div className="p-4 bg-white rounded-lg border border-steel-200">
                      <h4 className="text-sm font-medium text-steel-900 mb-3">Lab Values & Imaging</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Creatinine: <span className="font-medium">{patient.labValues.creatinine} mg/dL</span></div>
                        <div>Hemoglobin: <span className="font-medium">{patient.labValues.hemoglobin} g/dL</span></div>
                        <div>LAA Size: <span className="font-medium">{patient.imaging.laaSize} mm</span></div>
                        <div>LVEF: <span className="font-medium">{patient.imaging.lvef}%</span></div>
                        {patient.labValues.inr && (
                          <div>INR: <span className="font-medium">{patient.labValues.inr}</span></div>
                        )}
                        <div>Revenue: <span className="font-medium text-medical-green-600">${patient.assessment.estimatedCost.toLocaleString()}</span></div>
                      </div>
                    </div>

                    {/* Contraindications */}
                    {patient.assessment.contraindications.length > 0 && (
                      <div className="p-4 bg-medical-red-50 rounded-lg border border-medical-red-200">
                        <div className="text-sm font-medium text-steel-900 mb-2">Contraindications</div>
                        <div className="space-y-1">
                          {patient.assessment.contraindications.map((contraindication, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-medical-red-700">
                              <XCircle className="w-4 h-4" />
                              {contraindication}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LAACRiskDashboard;