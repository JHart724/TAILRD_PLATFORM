import React, { useState, useMemo } from 'react';
import {
  Heart,
  Check,
  Clock,
  AlertTriangle,
  Cpu,
  Battery,
  Shield,
  FileText,
  Download,
  Calculator,
  Activity,
  Zap,
  Settings
} from 'lucide-react';

interface DeviceEligibility {
  indication: string;
  ef: number;
  qrs: number;
  nyhaClass: 'I' | 'II' | 'III' | 'IV';
  eligible: boolean;
  recommendation: string;
}

interface LeadStrategy {
  type: 'Single chamber' | 'Dual chamber' | 'CRT-P' | 'CRT-D' | 'S-ICD';
  leads: string[];
  description: string;
  indication: string;
}

interface InfectionRisk {
  factor: string;
  present: boolean;
  riskLevel: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

interface DeviceImplantPlan {
  patientId: string;
  indication: 'Primary prevention' | 'Secondary prevention' | 'Heart failure' | 'Bradycardia' | 'Other';
  eligibility: DeviceEligibility;
  selectedStrategy: LeadStrategy;
  deviceModel: string;
  mriCompatible: boolean;
  anticoagulationPlan: {
    preop: string;
    intraop: string;
    postop: string;
    bridging: boolean;
  };
  infectionRisks: InfectionRisk[];
  expectedBatteryLife: number;
  implantDate?: string;
  status: 'planning' | 'approved' | 'scheduled' | 'completed';
}

const DeviceImplantChecklist: React.FC = () => {
  const [implantPlan, setImplantPlan] = useState<DeviceImplantPlan>({
    patientId: 'P001234',
    indication: 'Primary prevention',
    eligibility: {
      indication: 'Ischemic cardiomyopathy',
      ef: 25,
      qrs: 145,
      nyhaClass: 'III',
      eligible: true,
      recommendation: 'CRT-D recommended based on EF ≤35%, QRS ≥150ms, NYHA III on optimal medical therapy'
    },
    selectedStrategy: {
      type: 'CRT-D',
      leads: ['RA lead', 'RV lead', 'LV lead'],
      description: 'Cardiac resynchronization therapy with defibrillator',
      indication: 'Heart failure with wide QRS and low EF'
    },
    deviceModel: 'Medtronic Cobalt CRT-D',
    mriCompatible: true,
    anticoagulationPlan: {
      preop: 'Hold warfarin 5 days prior, bridge with heparin',
      intraop: 'Minimal heparin for pocket irrigation',
      postop: 'Resume warfarin POD #1',
      bridging: true
    },
    infectionRisks: [
      {
        factor: 'Diabetes mellitus',
        present: true,
        riskLevel: 'Medium',
        mitigation: 'Perioperative glucose control, prophylactic antibiotics'
      },
      {
        factor: 'Chronic steroid use',
        present: false,
        riskLevel: 'Low',
        mitigation: 'Standard antibiotic prophylaxis'
      },
      {
        factor: 'Prior device infection',
        present: false,
        riskLevel: 'Low',
        mitigation: 'No additional precautions needed'
      },
      {
        factor: 'Renal dysfunction',
        present: true,
        riskLevel: 'Medium',
        mitigation: 'Minimize contrast, ensure adequate hydration'
      }
    ],
    expectedBatteryLife: 8,
    status: 'planning'
  });

  const leadStrategies: LeadStrategy[] = [
    {
      type: 'Single chamber',
      leads: ['RV lead'],
      description: 'Single chamber ICD or pacemaker',
      indication: 'VT/VF with normal AV conduction'
    },
    {
      type: 'Dual chamber',
      leads: ['RA lead', 'RV lead'],
      description: 'Dual chamber ICD or pacemaker',
      indication: 'AV block or sinus node dysfunction'
    },
    {
      type: 'CRT-P',
      leads: ['RA lead', 'RV lead', 'LV lead'],
      description: 'Cardiac resynchronization therapy pacemaker',
      indication: 'Heart failure with wide QRS, no VT/VF risk'
    },
    {
      type: 'CRT-D',
      leads: ['RA lead', 'RV lead', 'LV lead'],
      description: 'Cardiac resynchronization therapy with defibrillator',
      indication: 'Heart failure with wide QRS and VT/VF risk'
    },
    {
      type: 'S-ICD',
      leads: ['Subcutaneous lead'],
      description: 'Subcutaneous implantable cardioverter defibrillator',
      indication: 'VT/VF risk with no pacing needs'
    }
  ];

  const deviceModels = {
    'Single chamber': ['Medtronic Evera VR', 'Boston Scientific Dynagen VR', 'Abbott Ellipse VR'],
    'Dual chamber': ['Medtronic Evera DR', 'Boston Scientific Dynagen DR', 'Abbott Ellipse DR'],
    'CRT-P': ['Medtronic Serena CRT-P', 'Boston Scientific Resonate CRT-P', 'Abbott Gallant CRT-P'],
    'CRT-D': ['Medtronic Cobalt CRT-D', 'Boston Scientific Resonate CRT-D', 'Abbott Gallant CRT-D'],
    'S-ICD': ['Boston Scientific Emblem S-ICD', 'Boston Scientific Emblem MRI S-ICD']
  };

  const batteryLife = {
    'Single chamber': 12,
    'Dual chamber': 10,
    'CRT-P': 8,
    'CRT-D': 6,
    'S-ICD': 7
  };

  const calculateCRTEligibility = (ef: number, qrs: number, nyha: string) => {
    if (ef <= 35 && qrs >= 150 && (nyha === 'II' || nyha === 'III' || nyha === 'IV')) {
      return {
        eligible: true,
        recommendation: 'CRT-D recommended (Class I indication)',
        level: 'strong'
      };
    } else if (ef <= 35 && qrs >= 120 && qrs < 150 && (nyha === 'III' || nyha === 'IV')) {
      return {
        eligible: true,
        recommendation: 'CRT-D may be considered (Class IIa)',
        level: 'moderate'
      };
    } else if (ef <= 30 && (nyha === 'II' || nyha === 'III')) {
      return {
        eligible: true,
        recommendation: 'ICD recommended for primary prevention',
        level: 'strong'
      };
    }
    return {
      eligible: false,
      recommendation: 'Does not meet current guidelines',
      level: 'none'
    };
  };

  const crtEligibility = useMemo(() => 
    calculateCRTEligibility(implantPlan.eligibility.ef, implantPlan.eligibility.qrs, implantPlan.eligibility.nyhaClass),
    [implantPlan.eligibility]
  );

  const overallInfectionRisk = useMemo(() => {
    const presentRisks = implantPlan.infectionRisks.filter(risk => risk.present);
    const highRisks = presentRisks.filter(risk => risk.riskLevel === 'High').length;
    const mediumRisks = presentRisks.filter(risk => risk.riskLevel === 'Medium').length;
    
    if (highRisks > 0 || mediumRisks > 2) return 'High';
    if (mediumRisks > 0) return 'Medium';
    return 'Low';
  }, [implantPlan.infectionRisks]);

  const updateEligibilityParameter = (param: keyof DeviceEligibility, value: any) => {
    setImplantPlan(prev => ({
      ...prev,
      eligibility: {
        ...prev.eligibility,
        [param]: value
      }
    }));
  };

  const updateLeadStrategy = (strategy: LeadStrategy) => {
    setImplantPlan(prev => ({
      ...prev,
      selectedStrategy: strategy,
      deviceModel: deviceModels[strategy.type][0],
      expectedBatteryLife: batteryLife[strategy.type]
    }));
  };

  const updateInfectionRisk = (index: number, present: boolean) => {
    setImplantPlan(prev => ({
      ...prev,
      infectionRisks: prev.infectionRisks.map((risk, i) =>
        i === index ? { ...risk, present } : risk
      )
    }));
  };

  const generateImplantPlan = () => {
    const planData = {
      patientId: implantPlan.patientId,
      timestamp: new Date().toISOString(),
      indication: implantPlan.indication,
      eligibility: implantPlan.eligibility,
      crtEligibility: crtEligibility,
      selectedStrategy: implantPlan.selectedStrategy,
      deviceModel: implantPlan.deviceModel,
      mriCompatible: implantPlan.mriCompatible,
      anticoagulationPlan: implantPlan.anticoagulationPlan,
      infectionRisk: overallInfectionRisk,
      mitigation: implantPlan.infectionRisks.filter(r => r.present).map(r => r.mitigation),
      expectedBatteryLife: implantPlan.expectedBatteryLife
    };

    const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `device-implant-plan-${implantPlan.patientId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-amber-600 bg-amber-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getRecommendationColor = (level: string) => {
    switch (level) {
      case 'strong': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-amber-600 bg-amber-100';
      case 'none': return 'text-red-600 bg-red-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2 flex items-center gap-3">
              <Cpu className="w-8 h-8 text-medical-blue-600" />
              Device Implant Planning
            </h2>
            <p className="text-steel-600">Patient: {implantPlan.patientId} • Indication: {implantPlan.indication}</p>
          </div>
          <button
            onClick={generateImplantPlan}
            className="flex items-center gap-2 px-6 py-3 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Generate Implant Plan
          </button>
        </div>
      </div>

      {/* CRT/ICD Eligibility Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-green-500" />
            Device Eligibility Calculator
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600">Primary Indication</label>
              <select
                value={implantPlan.indication}
                onChange={(e) => setImplantPlan(prev => ({ 
                  ...prev, 
                  indication: e.target.value as DeviceImplantPlan['indication']
                }))}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="Primary prevention">Primary prevention</option>
                <option value="Secondary prevention">Secondary prevention</option>
                <option value="Heart failure">Heart failure</option>
                <option value="Bradycardia">Bradycardia</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-steel-600">Ejection Fraction (%)</label>
                <input
                  type="number"
                  value={implantPlan.eligibility.ef}
                  onChange={(e) => updateEligibilityParameter('ef', parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                  min="10"
                  max="80"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-steel-600">QRS Duration (ms)</label>
                <input
                  type="number"
                  value={implantPlan.eligibility.qrs}
                  onChange={(e) => updateEligibilityParameter('qrs', parseInt(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
                  min="60"
                  max="200"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600">NYHA Class</label>
              <select
                value={implantPlan.eligibility.nyhaClass}
                onChange={(e) => updateEligibilityParameter('nyhaClass', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                <option value="I">Class I</option>
                <option value="II">Class II</option>
                <option value="III">Class III</option>
                <option value="IV">Class IV</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Recommendation
          </h3>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${getRecommendationColor(crtEligibility.level)}`}>
              <div className="font-medium mb-2">
                {crtEligibility.eligible ? 'Device Recommended' : 'Guidelines Not Met'}
              </div>
              <div className="text-sm">{crtEligibility.recommendation}</div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-steel-50 rounded-lg">
                <div className="text-steel-600">Ejection Fraction</div>
                <div className="font-semibold text-steel-800">{implantPlan.eligibility.ef}%</div>
              </div>
              <div className="p-3 bg-steel-50 rounded-lg">
                <div className="text-steel-600">QRS Duration</div>
                <div className="font-semibold text-steel-800">{implantPlan.eligibility.qrs}ms</div>
              </div>
              <div className="p-3 bg-steel-50 rounded-lg">
                <div className="text-steel-600">NYHA Class</div>
                <div className="font-semibold text-steel-800">{implantPlan.eligibility.nyhaClass}</div>
              </div>
              <div className="p-3 bg-steel-50 rounded-lg">
                <div className="text-steel-600">Indication</div>
                <div className="font-semibold text-steel-800">{implantPlan.indication}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Strategy Selection */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Lead Strategy Selection
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {leadStrategies.map((strategy) => (
            <button
              key={strategy.type}
              onClick={() => updateLeadStrategy(strategy)}
              className={`p-4 rounded-lg border text-left transition-all ${
                implantPlan.selectedStrategy.type === strategy.type
                  ? 'bg-medical-blue-50 border-medical-blue-300 text-medical-blue-800'
                  : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
              }`}
            >
              <div className="font-semibold text-sm mb-2">{strategy.type}</div>
              <div className="text-xs opacity-75 mb-2">{strategy.description}</div>
              <div className="text-xs text-steel-500">{strategy.indication}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Device Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Device Selection
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600">Device Model</label>
              <select
                value={implantPlan.deviceModel}
                onChange={(e) => setImplantPlan(prev => ({ ...prev, deviceModel: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              >
                {deviceModels[implantPlan.selectedStrategy.type].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={implantPlan.mriCompatible}
                onChange={(e) => setImplantPlan(prev => ({ ...prev, mriCompatible: e.target.checked }))}
                className="rounded border-steel-300"
              />
              <label className="text-sm font-medium text-steel-700">MRI Compatibility Required</label>
            </div>

            <div className="p-3 bg-steel-50 rounded-lg">
              <div className="text-sm text-steel-600">Lead Configuration</div>
              <div className="text-xs text-steel-500 mt-1">
                {implantPlan.selectedStrategy.leads.join(' • ')}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Battery className="w-5 h-5 text-green-500" />
            Battery Life
          </h3>
          
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {implantPlan.expectedBatteryLife}
            </div>
            <div className="text-steel-600">Years</div>
            <div className="text-sm text-steel-500 mt-4">
              Expected battery longevity for {implantPlan.selectedStrategy.type}
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Infection Risk
          </h3>
          
          <div className="text-center mb-4">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(overallInfectionRisk)}`}>
              {overallInfectionRisk} Risk
            </div>
          </div>

          <div className="space-y-2">
            {implantPlan.infectionRisks.map((risk, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-steel-50 rounded">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={risk.present}
                    onChange={(e) => updateInfectionRisk(index, e.target.checked)}
                    className="rounded border-steel-300"
                  />
                  <span className="text-sm text-steel-700">{risk.factor}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getRiskColor(risk.riskLevel)}`}>
                  {risk.riskLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Anticoagulation Plan */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-red-500" />
          Anticoagulation Plan
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600">Pre-operative</label>
            <textarea
              value={implantPlan.anticoagulationPlan.preop}
              onChange={(e) => setImplantPlan(prev => ({
                ...prev,
                anticoagulationPlan: { ...prev.anticoagulationPlan, preop: e.target.value }
              }))}
              className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-steel-600">Intra-operative</label>
            <textarea
              value={implantPlan.anticoagulationPlan.intraop}
              onChange={(e) => setImplantPlan(prev => ({
                ...prev,
                anticoagulationPlan: { ...prev.anticoagulationPlan, intraop: e.target.value }
              }))}
              className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-steel-600">Post-operative</label>
            <textarea
              value={implantPlan.anticoagulationPlan.postop}
              onChange={(e) => setImplantPlan(prev => ({
                ...prev,
                anticoagulationPlan: { ...prev.anticoagulationPlan, postop: e.target.value }
              }))}
              className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={implantPlan.anticoagulationPlan.bridging}
            onChange={(e) => setImplantPlan(prev => ({
              ...prev,
              anticoagulationPlan: { ...prev.anticoagulationPlan, bridging: e.target.checked }
            }))}
            className="rounded border-steel-300"
          />
          <label className="text-sm font-medium text-steel-700">Bridging anticoagulation required</label>
        </div>
      </div>

      {/* Summary and Actions */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4">Implant Plan Summary</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Device Strategy</div>
            <div className="font-semibold text-steel-800">{implantPlan.selectedStrategy.type}</div>
          </div>
          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Device Model</div>
            <div className="font-semibold text-steel-800">{implantPlan.deviceModel}</div>
          </div>
          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Battery Life</div>
            <div className="font-semibold text-steel-800">{implantPlan.expectedBatteryLife} years</div>
          </div>
          <div className="p-3 bg-steel-50 rounded-lg">
            <div className="text-sm text-steel-600">Infection Risk</div>
            <div className={`font-semibold ${
              overallInfectionRisk === 'High' ? 'text-red-600' :
              overallInfectionRisk === 'Medium' ? 'text-amber-600' : 'text-green-600'
            }`}>
              {overallInfectionRisk}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-steel-600">Plan Status</div>
            <div className="font-medium text-steel-800 capitalize">{implantPlan.status}</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setImplantPlan(prev => ({ ...prev, status: 'approved' }))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Approve Plan
            </button>
            <button
              onClick={() => setImplantPlan(prev => ({ ...prev, status: 'scheduled' }))}
              className="px-4 py-2 bg-medical-blue-600 text-white rounded-lg hover:bg-medical-blue-700 transition-colors text-sm"
            >
              Schedule Implant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceImplantChecklist;