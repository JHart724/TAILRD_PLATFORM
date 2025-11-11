import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Heart,
  Shield,
  FileText,
  Download,
  Calculator,
  Zap,
  Target,
  TrendingUp,
  MapPin,
  Scissors
} from 'lucide-react';

interface WIfIScore {
  wound: 0 | 1 | 2 | 3;
  ischemia: 0 | 1 | 2 | 3;
  infection: 0 | 1 | 2 | 3;
  stage: 1 | 2 | 3 | 4;
}

interface TASCClassification {
  grade: 'A' | 'B' | 'C' | 'D';
  location: 'Aortoiliac' | 'Femoropopliteal' | 'Infrapopliteal';
  description: string;
  recommendedTreatment: 'Endovascular' | 'Surgical' | 'Either' | 'Medical';
}

interface RunoffAssessment {
  vessels: 'Single' | 'Dual' | 'Triple';
  quality: 'Good' | 'Fair' | 'Poor';
  targets: string[];
}

interface ConduitAvailability {
  gsv: 'Available' | 'Used' | 'Inadequate' | 'Unknown';
  armVein: 'Available' | 'Used' | 'Inadequate' | 'Unknown';
  prosthetic: boolean;
}

interface LimbSalvagePlan {
  patientId: string;
  wifi: WIfIScore;
  tasc: TASCClassification;
  runoff: RunoffAssessment;
  conduit: ConduitAvailability;
  infectionControl: 'Adequate' | 'Inadequate' | 'Pending';
  comorbidities: {
    diabetes: boolean;
    dialysis: boolean;
    coronaryDisease: boolean;
    smoking: boolean;
    immunocompromised: boolean;
  };
  amputationRisk: number;
  limbSalvageRate: number;
  urgency: 'Emergent' | 'Urgent' | 'Elective';
  timeline: string;
  status: 'Assessment' | 'Planning' | 'Approved' | 'Scheduled';
}

const LimbSalvageChecklist: React.FC = () => {
  const [salvagePlan, setSalvagePlan] = useState<LimbSalvagePlan>({
    patientId: 'PV001234',
    wifi: {
      wound: 2,
      ischemia: 2,
      infection: 1,
      stage: 3
    },
    tasc: {
      grade: 'C',
      location: 'Femoropopliteal',
      description: 'Multiple stenoses or occlusions, each >5cm in length',
      recommendedTreatment: 'Either'
    },
    runoff: {
      vessels: 'Single',
      quality: 'Fair',
      targets: ['Posterior tibial artery']
    },
    conduit: {
      gsv: 'Available',
      armVein: 'Available',
      prosthetic: false
    },
    infectionControl: 'Adequate',
    comorbidities: {
      diabetes: true,
      dialysis: false,
      coronaryDisease: true,
      smoking: true,
      immunocompromised: false
    },
    amputationRisk: 35,
    limbSalvageRate: 78,
    urgency: 'Urgent',
    timeline: '< 2 weeks',
    status: 'Assessment'
  });

  const calculateWIfIStage = (wound: number, ischemia: number, infection: number): 1 | 2 | 3 | 4 => {
    const maxGrade = Math.max(wound, ischemia, infection);
    const hasMultipleHigh = [wound, ischemia, infection].filter(grade => grade >= 2).length >= 2;
    
    if (maxGrade === 3 || hasMultipleHigh) return 4;
    if (maxGrade === 2) return 3;
    if (maxGrade === 1) return 2;
    return 1;
  };

  const calculateAmputationRisk = useMemo(() => {
    let risk = 0;
    
    // WIfI stage risk contribution
    switch (salvagePlan.wifi.stage) {
      case 1: risk += 5; break;
      case 2: risk += 15; break;
      case 3: risk += 30; break;
      case 4: risk += 50; break;
    }
    
    // TASC grade risk contribution
    switch (salvagePlan.tasc.grade) {
      case 'A': risk += 5; break;
      case 'B': risk += 10; break;
      case 'C': risk += 20; break;
      case 'D': risk += 35; break;
    }
    
    // Comorbidity adjustments
    if (salvagePlan.comorbidities.diabetes) risk += 10;
    if (salvagePlan.comorbidities.dialysis) risk += 25;
    if (salvagePlan.comorbidities.immunocompromised) risk += 15;
    if (salvagePlan.comorbidities.smoking) risk += 10;
    
    // Run-off vessel adjustment
    switch (salvagePlan.runoff.vessels) {
      case 'Triple': risk -= 10; break;
      case 'Dual': risk -= 5; break;
      case 'Single': risk += 10; break;
    }
    
    // Infection control adjustment
    if (salvagePlan.infectionControl === 'Inadequate') risk += 20;
    if (salvagePlan.infectionControl === 'Pending') risk += 10;
    
    return Math.max(5, Math.min(90, risk));
  }, [salvagePlan]);

  const calculateLimbSalvageRate = useMemo(() => {
    let rate = 85; // Base rate
    
    // WIfI stage adjustment
    switch (salvagePlan.wifi.stage) {
      case 1: rate += 10; break;
      case 2: rate += 5; break;
      case 3: rate -= 10; break;
      case 4: rate -= 25; break;
    }
    
    // TASC grade adjustment
    switch (salvagePlan.tasc.grade) {
      case 'A': rate += 5; break;
      case 'B': rate += 0; break;
      case 'C': rate -= 5; break;
      case 'D': rate -= 15; break;
    }
    
    // Run-off and conduit adjustments
    if (salvagePlan.runoff.vessels === 'Triple') rate += 10;
    if (salvagePlan.runoff.vessels === 'Single') rate -= 10;
    if (salvagePlan.conduit.gsv === 'Available') rate += 5;
    
    // Comorbidity adjustments
    if (salvagePlan.comorbidities.diabetes) rate -= 5;
    if (salvagePlan.comorbidities.dialysis) rate -= 15;
    if (salvagePlan.comorbidities.smoking) rate -= 8;
    
    return Math.max(40, Math.min(95, rate));
  }, [salvagePlan]);

  const updateWiFI = (component: 'wound' | 'ischemia' | 'infection', value: 0 | 1 | 2 | 3) => {
    setSalvagePlan(prev => {
      const newWifi = { ...prev.wifi, [component]: value };
      newWifi.stage = calculateWIfIStage(newWifi.wound, newWifi.ischemia, newWifi.infection);
      return { ...prev, wifi: newWifi };
    });
  };

  const updateTASC = (field: keyof TASCClassification, value: any) => {
    setSalvagePlan(prev => ({
      ...prev,
      tasc: { ...prev.tasc, [field]: value }
    }));
  };

  const updateComorbidity = (comorbidity: keyof typeof salvagePlan.comorbidities, value: boolean) => {
    setSalvagePlan(prev => ({
      ...prev,
      comorbidities: { ...prev.comorbidities, [comorbidity]: value }
    }));
  };

  const generateLimbSalvagePlan = () => {
    const planData = {
      patientId: salvagePlan.patientId,
      timestamp: new Date().toISOString(),
      wifi: salvagePlan.wifi,
      tasc: salvagePlan.tasc,
      runoff: salvagePlan.runoff,
      conduit: salvagePlan.conduit,
      infectionControl: salvagePlan.infectionControl,
      comorbidities: salvagePlan.comorbidities,
      riskAssessment: {
        amputationRisk: calculateAmputationRisk,
        limbSalvageRate: calculateLimbSalvageRate
      },
      urgency: salvagePlan.urgency,
      timeline: salvagePlan.timeline,
      recommendations: getRecommendations()
    };

    const blob = new Blob([JSON.stringify(planData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `limb-salvage-plan-${salvagePlan.patientId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    if (salvagePlan.wifi.stage >= 3) {
      recommendations.push('High-risk limb: Consider urgent revascularization');
    }
    
    if (salvagePlan.tasc.grade === 'D') {
      recommendations.push('Complex lesion: Multidisciplinary planning recommended');
    }
    
    if (salvagePlan.runoff.vessels === 'Single') {
      recommendations.push('Limited outflow: Consider aggressive wound care and optimization');
    }
    
    if (salvagePlan.comorbidities.diabetes && salvagePlan.comorbidities.smoking) {
      recommendations.push('High-risk profile: Intensive risk factor modification essential');
    }
    
    return recommendations;
  };

  const getWiFIColor = (stage: number) => {
    switch (stage) {
      case 1: return 'text-green-600 bg-green-100';
      case 2: return 'text-amber-600 bg-amber-100';
      case 3: return 'text-red-600 bg-red-100';
      case 4: return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getTASCColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-amber-600 bg-amber-100';
      case 'C': return 'text-red-600 bg-red-100';
      case 'D': return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getAmputationRiskColor = (risk: number) => {
    if (risk <= 20) return 'text-green-600 bg-green-100';
    if (risk <= 40) return 'text-amber-600 bg-amber-100';
    if (risk <= 60) return 'text-red-600 bg-red-100';
    return 'text-red-800 bg-red-200';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Emergent': return 'text-red-600 bg-red-100';
      case 'Urgent': return 'text-amber-600 bg-amber-100';
      case 'Elective': return 'text-green-600 bg-green-100';
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
              <Scissors className="w-8 h-8 text-medical-red-600" />
              Limb Salvage Assessment
            </h2>
            <p className="text-steel-600">Patient: {salvagePlan.patientId} • WIfI Stage {salvagePlan.wifi.stage}</p>
          </div>
          <button
            onClick={generateLimbSalvagePlan}
            className="flex items-center gap-2 px-6 py-3 bg-medical-red-600 text-white rounded-lg hover:bg-medical-red-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Generate Limb Salvage Plan
          </button>
        </div>
      </div>

      {/* WIfI Calculator */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-500" />
          WIfI Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Wound */}
          <div>
            <label className="text-sm font-medium text-steel-600 mb-3 block">Wound (W)</label>
            <div className="space-y-2">
              {[
                { value: 0, label: 'No ulcer', desc: 'No open lesion' },
                { value: 1, label: 'Small ulcer', desc: '<2cm, shallow' },
                { value: 2, label: 'Large ulcer', desc: '>2cm, deep to tendon' },
                { value: 3, label: 'Extensive ulcer', desc: 'Bone, joint exposed' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateWiFI('wound', option.value as 0 | 1 | 2 | 3)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    salvagePlan.wifi.wound === option.value
                      ? 'bg-medical-red-50 border-medical-red-300 text-medical-red-800'
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Ischemia */}
          <div>
            <label className="text-sm font-medium text-steel-600 mb-3 block">Ischemia (I)</label>
            <div className="space-y-2">
              {[
                { value: 0, label: 'No CLI', desc: 'ABI >0.8, TcPO₂ >60' },
                { value: 1, label: 'Mild CLI', desc: 'ABI 0.6-0.8, TcPO₂ 40-59' },
                { value: 2, label: 'Moderate CLI', desc: 'ABI 0.4-0.59, TcPO₂ 30-39' },
                { value: 3, label: 'Severe CLI', desc: 'ABI <0.4, TcPO₂ <30' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateWiFI('ischemia', option.value as 0 | 1 | 2 | 3)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    salvagePlan.wifi.ischemia === option.value
                      ? 'bg-medical-red-50 border-medical-red-300 text-medical-red-800'
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Infection */}
          <div>
            <label className="text-sm font-medium text-steel-600 mb-3 block">Infection (fI)</label>
            <div className="space-y-2">
              {[
                { value: 0, label: 'No infection', desc: 'No signs of infection' },
                { value: 1, label: 'Mild infection', desc: 'Superficial, local signs' },
                { value: 2, label: 'Moderate infection', desc: 'Deep, spreading cellulitis' },
                { value: 3, label: 'Severe infection', desc: 'Systemic sepsis, osteomyelitis' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateWiFI('infection', option.value as 0 | 1 | 2 | 3)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    salvagePlan.wifi.infection === option.value
                      ? 'bg-medical-red-50 border-medical-red-300 text-medical-red-800'
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* WIfI Stage Result */}
        <div className="flex items-center justify-center p-4 bg-steel-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-steel-600 mb-1">WIfI Stage</div>
            <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getWiFIColor(salvagePlan.wifi.stage)}`}>
              Stage {salvagePlan.wifi.stage}
            </div>
            <div className="text-xs text-steel-500 mt-1">
              W{salvagePlan.wifi.wound} I{salvagePlan.wifi.ischemia} fI{salvagePlan.wifi.infection}
            </div>
          </div>
        </div>
      </div>

      {/* TASC Classification and Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-500" />
            TASC Classification
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600">Location</label>
              <select
                value={salvagePlan.tasc.location}
                onChange={(e) => updateTASC('location', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-red-500"
              >
                <option value="Aortoiliac">Aortoiliac</option>
                <option value="Femoropopliteal">Femoropopliteal</option>
                <option value="Infrapopliteal">Infrapopliteal</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600">TASC Grade</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {['A', 'B', 'C', 'D'].map(grade => (
                  <button
                    key={grade}
                    onClick={() => updateTASC('grade', grade)}
                    className={`p-3 rounded-lg border font-medium transition-all ${
                      salvagePlan.tasc.grade === grade
                        ? getTASCColor(grade)
                        : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-steel-50 rounded-lg">
              <div className="text-xs text-steel-600">Description</div>
              <div className="text-sm text-steel-800">{salvagePlan.tasc.description}</div>
              <div className="text-xs text-steel-500 mt-1">
                Recommended: {salvagePlan.tasc.recommendedTreatment}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Run-off Assessment
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600">Run-off Vessels</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['Single', 'Dual', 'Triple'] as const).map(vessels => (
                  <button
                    key={vessels}
                    onClick={() => setSalvagePlan(prev => ({
                      ...prev,
                      runoff: { ...prev.runoff, vessels }
                    }))}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      salvagePlan.runoff.vessels === vessels
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                    }`}
                  >
                    {vessels}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600">Vessel Quality</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['Good', 'Fair', 'Poor'] as const).map(quality => (
                  <button
                    key={quality}
                    onClick={() => setSalvagePlan(prev => ({
                      ...prev,
                      runoff: { ...prev.runoff, quality }
                    }))}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      salvagePlan.runoff.quality === quality
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                    }`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600">Target Vessels</label>
              <textarea
                value={salvagePlan.runoff.targets.join(', ')}
                onChange={(e) => setSalvagePlan(prev => ({
                  ...prev,
                  runoff: { ...prev.runoff, targets: e.target.value.split(', ').filter(Boolean) }
                }))}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-red-500"
                placeholder="e.g., Posterior tibial, Dorsalis pedis"
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conduit Availability */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Conduit Availability Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Great Saphenous Vein</label>
            <div className="space-y-2">
              {(['Available', 'Used', 'Inadequate', 'Unknown'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setSalvagePlan(prev => ({
                    ...prev,
                    conduit: { ...prev.conduit, gsv: status }
                  }))}
                  className={`w-full p-2 rounded border text-sm text-left transition-all ${
                    salvagePlan.conduit.gsv === status
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Arm Vein</label>
            <div className="space-y-2">
              {(['Available', 'Used', 'Inadequate', 'Unknown'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setSalvagePlan(prev => ({
                    ...prev,
                    conduit: { ...prev.conduit, armVein: status }
                  }))}
                  className={`w-full p-2 rounded border text-sm text-left transition-all ${
                    salvagePlan.conduit.armVein === status
                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Options</label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={salvagePlan.conduit.prosthetic}
                  onChange={(e) => setSalvagePlan(prev => ({
                    ...prev,
                    conduit: { ...prev.conduit, prosthetic: e.target.checked }
                  }))}
                  className="rounded border-steel-300"
                />
                <span className="text-sm text-steel-700">Prosthetic conduit acceptable</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Comorbidities and Risk Factors */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Comorbidities & Risk Factors
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(salvagePlan.comorbidities).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 p-3 bg-steel-50 rounded-lg">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => updateComorbidity(key as keyof typeof salvagePlan.comorbidities, e.target.checked)}
                className="rounded border-steel-300"
              />
              <span className="text-sm text-steel-700 capitalize">
                {key === 'coronaryDisease' ? 'CAD' : key}
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-steel-600 mb-2 block">Infection Control Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['Adequate', 'Inadequate', 'Pending'] as const).map(status => (
              <button
                key={status}
                onClick={() => setSalvagePlan(prev => ({ ...prev, infectionControl: status }))}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                  salvagePlan.infectionControl === status
                    ? status === 'Adequate' ? 'bg-green-50 border-green-300 text-green-800' :
                      status === 'Pending' ? 'bg-amber-50 border-amber-300 text-amber-800' :
                      'bg-red-50 border-red-300 text-red-800'
                    : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Assessment Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20 text-center">
          <div className="mb-2">
            <Zap className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-sm text-steel-600">Amputation Risk</div>
          </div>
          <div className={`text-3xl font-bold px-3 py-1 rounded-lg ${getAmputationRiskColor(calculateAmputationRisk)}`}>
            {calculateAmputationRisk}%
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20 text-center">
          <div className="mb-2">
            <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-sm text-steel-600">Limb Salvage Rate</div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {calculateLimbSalvageRate}%
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20 text-center">
          <div className="mb-2">
            <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <div className="text-sm text-steel-600">Urgency</div>
          </div>
          <div className={`text-lg font-bold px-3 py-1 rounded-lg ${getUrgencyColor(salvagePlan.urgency)}`}>
            {salvagePlan.urgency}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20 text-center">
          <div className="mb-2">
            <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-sm text-steel-600">Timeline</div>
          </div>
          <div className="text-lg font-medium text-steel-800">
            {salvagePlan.timeline}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {getRecommendations().length > 0 && (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Clinical Recommendations
          </h3>
          
          <div className="space-y-2">
            {getRecommendations().map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Check className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-steel-800">Plan Status</div>
            <div className="text-steel-600">Current: {salvagePlan.status}</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSalvagePlan(prev => ({ ...prev, status: 'Planning' }))}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              Advance to Planning
            </button>
            <button
              onClick={() => setSalvagePlan(prev => ({ ...prev, status: 'Approved' }))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Approve Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LimbSalvageChecklist;