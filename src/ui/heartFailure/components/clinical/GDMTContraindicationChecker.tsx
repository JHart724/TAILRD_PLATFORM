import React, { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Pill, Heart, Zap } from 'lucide-react';

interface PatientData {
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  potassium: number;
  creatinine: number;
  eGFR: number;
  age: number;
  weight: number;
  isPregnant: boolean;
  hasAngioedemaHistory: boolean;
  hasRecentDKA: boolean;
  hasAddisons: boolean;
  hasAsthma: boolean;
  hasCOPD: boolean;
  hasAVBlock: boolean;
  avBlockDegree: 1 | 2 | 3;
  hasCardiogenicShock: boolean;
  hasBilateralRAS: boolean;
  currentMedications: string[];
}

interface ContraindicationResult {
  drug: 'ARNi' | 'Beta-Blocker' | 'SGLT2i' | 'MRA';
  status: 'contraindicated' | 'caution' | 'monitor' | 'safe';
  level: 'absolute' | 'relative' | 'none';
  reasons: string[];
  alternatives: string[];
  monitoring: string[];
  dosing: {
    startDose: string;
    targetDose: string;
    titrationSchedule: string;
  };
  labsRequired: string[];
  labFrequency: string;
}

const GDMTContraindicationChecker: React.FC = () => {
  const [patientData, setPatientData] = useState<PatientData>({
    systolicBP: 120,
    diastolicBP: 80,
    heartRate: 72,
    potassium: 4.2,
    creatinine: 1.1,
    eGFR: 65,
    age: 65,
    weight: 80,
    isPregnant: false,
    hasAngioedemaHistory: false,
    hasRecentDKA: false,
    hasAddisons: false,
    hasAsthma: false,
    hasCOPD: false,
    hasAVBlock: false,
    avBlockDegree: 1,
    hasCardiogenicShock: false,
    hasBilateralRAS: false,
    currentMedications: []
  });

  const checkContraindications = (): ContraindicationResult[] => {
    const results: ContraindicationResult[] = [];

    // ARNi Assessment
    let arniStatus: ContraindicationResult['status'] = 'safe';
    let arniLevel: ContraindicationResult['level'] = 'none';
    const arniReasons: string[] = [];
    const arniAlternatives: string[] = [];
    const arniMonitoring: string[] = ['Blood pressure monitoring', 'Renal function', 'Electrolytes'];

    // Absolute contraindications for ARNi
    if (patientData.isPregnant) {
      arniStatus = 'contraindicated';
      arniLevel = 'absolute';
      arniReasons.push('Pregnancy (teratogenic risk)');
      arniAlternatives.push('Hydralazine + Isosorbide dinitrate', 'Methyldopa for HTN');
    }
    if (patientData.hasAngioedemaHistory) {
      arniStatus = 'contraindicated';
      arniLevel = 'absolute';
      arniReasons.push('History of angioedema');
      arniAlternatives.push('Hydralazine + Isosorbide dinitrate');
    }
    if (patientData.hasBilateralRAS) {
      arniStatus = 'contraindicated';
      arniLevel = 'absolute';
      arniReasons.push('Bilateral renal artery stenosis');
      arniAlternatives.push('Calcium channel blockers', 'Hydralazine + Isosorbide');
    }

    // Relative contraindications for ARNi
    if (patientData.systolicBP < 90 && arniStatus !== 'contraindicated') {
      arniStatus = 'caution';
      arniLevel = 'relative';
      arniReasons.push('Systolic BP <90 mmHg');
      arniMonitoring.push('Frequent BP monitoring', 'Consider lower starting dose');
    }
    if (patientData.potassium > 5.0 && arniStatus !== 'contraindicated') {
      arniStatus = 'caution';
      arniLevel = 'relative';
      arniReasons.push('Hyperkalemia (K+ >5.0 mEq/L)');
      arniMonitoring.push('Daily K+ monitoring initially');
    }
    if (patientData.eGFR < 30 && arniStatus !== 'contraindicated') {
      arniStatus = 'caution';
      arniLevel = 'relative';
      arniReasons.push('Severe renal impairment (eGFR <30)');
      arniMonitoring.push('Nephrology consultation', 'Weekly renal function');
    }

    results.push({
      drug: 'ARNi',
      status: arniStatus,
      level: arniLevel,
      reasons: arniReasons,
      alternatives: arniAlternatives,
      monitoring: arniMonitoring,
      dosing: {
        startDose: arniStatus === 'caution' ? 'Sacubitril/valsartan 24/26mg BID' : 'Sacubitril/valsartan 49/51mg BID',
        targetDose: 'Sacubitril/valsartan 97/103mg BID',
        titrationSchedule: 'Double dose every 2-4 weeks as tolerated'
      },
      labsRequired: ['K+', 'Creatinine', 'eGFR'],
      labFrequency: arniStatus === 'caution' ? '1-2 weeks after initiation/titration' : '2-4 weeks after initiation'
    });

    // Beta-Blocker Assessment
    let bbStatus: ContraindicationResult['status'] = 'safe';
    let bbLevel: ContraindicationResult['level'] = 'none';
    const bbReasons: string[] = [];
    const bbAlternatives: string[] = [];
    const bbMonitoring: string[] = ['Heart rate monitoring', 'Blood pressure', 'Symptoms assessment'];

    // Absolute contraindications for Beta-Blockers
    if (patientData.hasCardiogenicShock) {
      bbStatus = 'contraindicated';
      bbLevel = 'absolute';
      bbReasons.push('Cardiogenic shock');
      bbAlternatives.push('Inotropic support first', 'Delay until stabilized');
    }
    if (patientData.heartRate < 50) {
      bbStatus = 'contraindicated';
      bbLevel = 'absolute';
      bbReasons.push('Severe bradycardia (HR <50 bpm)');
      bbAlternatives.push('Pacemaker evaluation', 'Ivabradine if sinus rhythm');
    }
    if (patientData.hasAVBlock && patientData.avBlockDegree >= 2) {
      bbStatus = 'contraindicated';
      bbLevel = 'absolute';
      bbReasons.push('High-degree AV block (2nd/3rd degree)');
      bbAlternatives.push('Pacemaker required first');
    }

    // Relative contraindications for Beta-Blockers
    if (patientData.hasAsthma && bbStatus !== 'contraindicated') {
      bbStatus = 'caution';
      bbLevel = 'relative';
      bbReasons.push('Bronchial asthma');
      bbMonitoring.push('Pulmonary function monitoring', 'Use cardioselective BB only');
    }
    if (patientData.hasCOPD && bbStatus !== 'contraindicated') {
      bbStatus = 'caution';
      bbLevel = 'relative';
      bbReasons.push('COPD');
      bbMonitoring.push('Respiratory status monitoring', 'Cardioselective preferred');
    }
    if (patientData.systolicBP < 90 && bbStatus !== 'contraindicated') {
      bbStatus = 'monitor';
      bbReasons.push('Hypotension (SBP <90 mmHg)');
      bbMonitoring.push('Close BP monitoring during titration');
    }

    results.push({
      drug: 'Beta-Blocker',
      status: bbStatus,
      level: bbLevel,
      reasons: bbReasons,
      alternatives: bbAlternatives,
      monitoring: bbMonitoring,
      dosing: {
        startDose: 'Carvedilol 3.125mg BID or Metoprolol succinate 25mg daily',
        targetDose: 'Carvedilol 25mg BID or Metoprolol succinate 200mg daily',
        titrationSchedule: 'Double dose every 2 weeks as tolerated'
      },
      labsRequired: ['Basic metabolic panel'],
      labFrequency: 'Every 2-4 weeks during titration'
    });

    // SGLT2i Assessment
    let sglt2Status: ContraindicationResult['status'] = 'safe';
    let sglt2Level: ContraindicationResult['level'] = 'none';
    const sglt2Reasons: string[] = [];
    const sglt2Alternatives: string[] = [];
    const sglt2Monitoring: string[] = ['Renal function', 'Volume status', 'Ketones if symptoms'];

    // Absolute contraindications for SGLT2i
    if (patientData.hasRecentDKA) {
      sglt2Status = 'contraindicated';
      sglt2Level = 'absolute';
      sglt2Reasons.push('Recent diabetic ketoacidosis');
      sglt2Alternatives.push('Optimize other GDMT first');
    }
    if (patientData.eGFR < 25) {
      sglt2Status = 'contraindicated';
      sglt2Level = 'absolute';
      sglt2Reasons.push('Severe renal impairment (eGFR <25)');
      sglt2Alternatives.push('Consider after renal function improves');
    }

    // Relative contraindications for SGLT2i
    if (patientData.eGFR < 30 && sglt2Status !== 'contraindicated') {
      sglt2Status = 'caution';
      sglt2Level = 'relative';
      sglt2Reasons.push('Moderate renal impairment (eGFR 25-30)');
      sglt2Monitoring.push('Close renal monitoring', 'Nephrology consultation');
    }
    if (patientData.age > 75 && sglt2Status !== 'contraindicated') {
      sglt2Status = 'monitor';
      sglt2Reasons.push('Advanced age (>75 years)');
      sglt2Monitoring.push('Enhanced volume status monitoring', 'Fall risk assessment');
    }

    results.push({
      drug: 'SGLT2i',
      status: sglt2Status,
      level: sglt2Level,
      reasons: sglt2Reasons,
      alternatives: sglt2Alternatives,
      monitoring: sglt2Monitoring,
      dosing: {
        startDose: 'Dapagliflozin 10mg daily or Empagliflozin 10mg daily',
        targetDose: 'Dapagliflozin 10mg daily or Empagliflozin 10mg daily',
        titrationSchedule: 'No titration required'
      },
      labsRequired: ['eGFR', 'Electrolytes'],
      labFrequency: '2-4 weeks after initiation, then every 3 months'
    });

    // MRA Assessment
    let mraStatus: ContraindicationResult['status'] = 'safe';
    let mraLevel: ContraindicationResult['level'] = 'none';
    const mraReasons: string[] = [];
    const mraAlternatives: string[] = [];
    const mraMonitoring: string[] = ['Potassium levels', 'Renal function', 'Volume status'];

    // Absolute contraindications for MRA
    if (patientData.potassium > 5.0) {
      mraStatus = 'contraindicated';
      mraLevel = 'absolute';
      mraReasons.push('Hyperkalemia (K+ >5.0 mEq/L)');
      mraAlternatives.push('Correct hyperkalemia first', 'Consider potassium binders');
    }
    if (patientData.hasAddisons) {
      mraStatus = 'contraindicated';
      mraLevel = 'absolute';
      mraReasons.push("Addison's disease");
      mraAlternatives.push('Contraindicated due to aldosterone deficiency');
    }
    if (patientData.eGFR < 30) {
      mraStatus = 'contraindicated';
      mraLevel = 'absolute';
      mraReasons.push('Severe renal impairment (eGFR <30)');
      mraAlternatives.push('Consider after renal function improves');
    }

    // Relative contraindications for MRA
    if (patientData.potassium > 4.5 && mraStatus !== 'contraindicated') {
      mraStatus = 'caution';
      mraLevel = 'relative';
      mraReasons.push('Borderline hyperkalemia (K+ 4.5-5.0)');
      mraMonitoring.push('Weekly K+ monitoring initially', 'Consider lower starting dose');
    }
    if (patientData.eGFR < 45 && mraStatus !== 'contraindicated') {
      mraStatus = 'caution';
      mraLevel = 'relative';
      mraReasons.push('Moderate renal impairment (eGFR 30-45)');
      mraMonitoring.push('Frequent renal function monitoring');
    }

    results.push({
      drug: 'MRA',
      status: mraStatus,
      level: mraLevel,
      reasons: mraReasons,
      alternatives: mraAlternatives,
      monitoring: mraMonitoring,
      dosing: {
        startDose: mraStatus === 'caution' ? 'Spironolactone 12.5mg daily' : 'Spironolactone 25mg daily',
        targetDose: 'Spironolactone 25-50mg daily',
        titrationSchedule: 'Increase after 4-8 weeks if K+ <5.0'
      },
      labsRequired: ['K+', 'Creatinine', 'eGFR'],
      labFrequency: '1 week after initiation, then 1, 3, 6, 9, 12 months'
    });

    return results;
  };

  const results = checkContraindications();

  const updatePatientData = (key: keyof PatientData, value: any) => {
    setPatientData(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status: ContraindicationResult['status']) => {
    switch (status) {
      case 'contraindicated': return 'text-red-800 bg-red-100 border-red-300';
      case 'caution': return 'text-medical-amber-800 bg-medical-amber-100 border-medical-amber-300';
      case 'monitor': return 'text-medical-blue-800 bg-medical-blue-100 border-medical-blue-300';
      case 'safe': return 'text-medical-green-800 bg-medical-green-100 border-medical-green-300';
      default: return 'text-steel-600 bg-steel-50 border-steel-200';
    }
  };

  const getStatusIcon = (status: ContraindicationResult['status']) => {
    switch (status) {
      case 'contraindicated': return <XCircle className="w-5 h-5" />;
      case 'caution': return <AlertTriangle className="w-5 h-5" />;
      case 'monitor': return <Clock className="w-5 h-5" />;
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getDrugIcon = (drug: ContraindicationResult['drug']) => {
    switch (drug) {
      case 'ARNi': return <Heart className="w-5 h-5" />;
      case 'Beta-Blocker': return <Zap className="w-5 h-5" />;
      case 'SGLT2i': return <Pill className="w-5 h-5" />;
      case 'MRA': return <Shield className="w-5 h-5" />;
      default: return <Pill className="w-5 h-5" />;
    }
  };

  return (
    <div className="retina-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-medical-red-500" />
        <div>
          <h2 className="text-2xl font-bold text-steel-900 font-sf">GDMT Contraindication Checker</h2>
          <p className="text-steel-600">Evidence-based safety screening for heart failure therapy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Patient Data Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 bg-medical-blue-50 border border-medical-blue-200 rounded-lg">
            <h3 className="font-semibold text-medical-blue-800 mb-3">Vital Signs & Labs</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">SBP (mmHg)</label>
                  <input
                    type="number"
                    value={patientData.systolicBP}
                    onChange={(e) => updatePatientData('systolicBP', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">DBP (mmHg)</label>
                  <input
                    type="number"
                    value={patientData.diastolicBP}
                    onChange={(e) => updatePatientData('diastolicBP', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">HR (bpm)</label>
                  <input
                    type="number"
                    value={patientData.heartRate}
                    onChange={(e) => updatePatientData('heartRate', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={patientData.age}
                    onChange={(e) => updatePatientData('age', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">K+ (mEq/L)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={patientData.potassium}
                    onChange={(e) => updatePatientData('potassium', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-steel-700 mb-1">eGFR</label>
                  <input
                    type="number"
                    value={patientData.eGFR}
                    onChange={(e) => updatePatientData('eGFR', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-medical-amber-50 border border-medical-amber-200 rounded-lg">
            <h3 className="font-semibold text-medical-amber-800 mb-3">Clinical Conditions</h3>
            <div className="space-y-3">
              {[
                { key: 'isPregnant', label: 'Pregnant' },
                { key: 'hasAngioedemaHistory', label: 'Angioedema history' },
                { key: 'hasRecentDKA', label: 'Recent DKA' },
                { key: 'hasAddisons', label: "Addison's disease" },
                { key: 'hasAsthma', label: 'Bronchial asthma' },
                { key: 'hasCOPD', label: 'COPD' },
                { key: 'hasCardiogenicShock', label: 'Cardiogenic shock' },
                { key: 'hasBilateralRAS', label: 'Bilateral RAS' }
              ].map((condition) => (
                <label key={condition.key} className="flex items-center space-x-3 p-2 bg-white rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={patientData[condition.key as keyof PatientData] as boolean}
                    onChange={(e) => updatePatientData(condition.key as keyof PatientData, e.target.checked)}
                    className="rounded text-medical-amber-600"
                  />
                  <span className="text-sm font-medium text-steel-700">{condition.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {results.map((result) => (
              <div key={result.drug} className={`p-6 rounded-xl border-2 ${getStatusColor(result.status)}`}>
                <div className="flex items-center gap-3 mb-4">
                  {getDrugIcon(result.drug)}
                  <div className="flex-1">
                    <div className="font-bold text-lg">{result.drug}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(result.status)}
                      <span className="text-sm font-medium capitalize">{result.status}</span>
                      {result.level !== 'none' && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                          {result.level}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {result.reasons.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold mb-2">Concerns:</div>
                    <ul className="text-sm space-y-1">
                      {result.reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></div>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold">Start:</span> {result.dosing.startDose}
                  </div>
                  <div>
                    <span className="font-semibold">Target:</span> {result.dosing.targetDose}
                  </div>
                  <div>
                    <span className="font-semibold">Labs:</span> {result.labFrequency}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Monitoring Summary */}
          <div className="p-6 bg-white rounded-xl border border-steel-200 shadow-retina-2">
            <h3 className="text-lg font-semibold text-steel-900 mb-4">Monitoring Requirements</h3>
            <div className="grid grid-cols-2 gap-6">
              {results.map((result) => (
                <div key={result.drug} className="space-y-3">
                  <div className="font-semibold text-steel-900 flex items-center gap-2">
                    {getDrugIcon(result.drug)}
                    {result.drug} Monitoring
                  </div>
                  <ul className="text-sm text-steel-700 space-y-1">
                    {result.monitoring.map((item, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <div className="w-1 h-1 bg-steel-400 rounded-full mt-2 flex-shrink-0"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Alternatives */}
          {results.some(r => r.alternatives.length > 0) && (
            <div className="p-6 bg-medical-amber-50 border border-medical-amber-200 rounded-xl">
              <h3 className="text-lg font-semibold text-medical-amber-800 mb-4">Alternative Therapies</h3>
              <div className="space-y-4">
                {results.filter(r => r.alternatives.length > 0).map((result) => (
                  <div key={result.drug}>
                    <div className="font-semibold text-medical-amber-800 mb-2">{result.drug} Alternatives:</div>
                    <ul className="text-sm text-medical-amber-700 space-y-1">
                      {result.alternatives.map((alt, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <div className="w-1 h-1 bg-medical-amber-600 rounded-full mt-2 flex-shrink-0"></div>
                          {alt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GDMTContraindicationChecker;