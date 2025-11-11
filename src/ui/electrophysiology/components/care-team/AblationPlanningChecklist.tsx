import React, { useState, useMemo } from 'react';
import {
  Heart,
  Check,
  Clock,
  AlertTriangle,
  Stethoscope,
  Activity,
  Calendar,
  FileText,
  Download,
  Zap,
  Shield,
  CircuitBoard,
  Target
} from 'lucide-react';

interface Antiarrhythmic {
  name: string;
  startDate: string;
  endDate?: string;
  reason: string;
  efficacy: 'Effective' | 'Ineffective' | 'Intolerable';
}

interface PreAblationAssessment {
  id: string;
  label: string;
  status: 'complete' | 'pending' | 'missing';
  value?: string | number;
  unit?: string;
  notes?: string;
  required: boolean;
}

interface AblationPlan {
  patientId: string;
  afType: 'Paroxysmal' | 'Persistent' | 'Long-standing persistent';
  laSize: number; // mm
  ablationType: 'PVI only' | 'PVI + CTI' | 'Posterior wall isolation' | 'Complex fractionated';
  priorAntiarrhythmics: Antiarrhythmic[];
  assessments: PreAblationAssessment[];
  expectedSuccessRate: number;
  scheduledDate?: string;
  status: 'planning' | 'scheduled' | 'completed';
}

const AblationPlanningChecklist: React.FC = () => {
  const [ablationPlan, setAblationPlan] = useState<AblationPlan>({
    patientId: 'P001234',
    afType: 'Paroxysmal',
    laSize: 42,
    ablationType: 'PVI only',
    status: 'planning',
    priorAntiarrhythmics: [
      {
        name: 'Flecainide',
        startDate: '2024-01-15',
        endDate: '2024-03-20',
        reason: 'Ineffective',
        efficacy: 'Ineffective'
      },
      {
        name: 'Amiodarone',
        startDate: '2024-04-01',
        endDate: '2024-08-15',
        reason: 'Thyroid dysfunction',
        efficacy: 'Intolerable'
      },
      {
        name: 'Sotalol',
        startDate: '2024-09-01',
        reason: 'Current therapy',
        efficacy: 'Ineffective'
      }
    ],
    assessments: [
      {
        id: 'antiarrhythmics',
        label: 'Prior antiarrhythmics documented',
        status: 'complete',
        required: true,
        notes: '3 medications tried, all failed'
      },
      {
        id: 'echo',
        label: 'Echocardiogram complete',
        status: 'complete',
        value: 42,
        unit: 'mm',
        required: true,
        notes: 'LA size measured'
      },
      {
        id: 'imaging',
        label: 'CT/MRI for pulmonary vein anatomy',
        status: 'pending',
        required: true,
        notes: 'Scheduled for next week'
      },
      {
        id: 'sleepStudy',
        label: 'Sleep apnea screening',
        status: 'missing',
        required: true,
        notes: 'Patient reports snoring, needs evaluation'
      },
      {
        id: 'anticoagulation',
        label: 'Anticoagulation therapeutic ≥3 weeks',
        status: 'complete',
        required: true,
        notes: 'Apixaban 5mg BID x 6 weeks'
      }
    ],
    expectedSuccessRate: 85
  });

  const [selectedAblationType, setSelectedAblationType] = useState<AblationPlan['ablationType']>('PVI only');
  const [showAntiarrhythmicForm, setShowAntiarrhythmicForm] = useState(false);
  const [newAntiarrhythmic, setNewAntiarrhythmic] = useState<Partial<Antiarrhythmic>>({});

  const ablationTypes = [
    {
      type: 'PVI only' as const,
      description: 'Pulmonary vein isolation only',
      indications: 'Paroxysmal AF, first ablation',
      successRate: { paroxysmal: 85, persistent: 65, longstanding: 45 }
    },
    {
      type: 'PVI + CTI' as const,
      description: 'PVI plus cavotricuspid isthmus line',
      indications: 'AF with typical flutter history',
      successRate: { paroxysmal: 80, persistent: 70, longstanding: 55 }
    },
    {
      type: 'Posterior wall isolation' as const,
      description: 'PVI plus posterior wall isolation',
      indications: 'Persistent AF, prior PVI failure',
      successRate: { paroxysmal: 75, persistent: 75, longstanding: 65 }
    },
    {
      type: 'Complex fractionated' as const,
      description: 'CFAE ablation plus PVI',
      indications: 'Long-standing persistent AF',
      successRate: { paroxysmal: 70, persistent: 65, longstanding: 55 }
    }
  ];

  const calculateSuccessRate = useMemo(() => {
    const baseRate = ablationTypes.find(t => t.type === selectedAblationType)?.successRate;
    if (!baseRate) return 0;

    let rate = 0;
    switch (ablationPlan.afType) {
      case 'Paroxysmal':
        rate = baseRate.paroxysmal;
        break;
      case 'Persistent':
        rate = baseRate.persistent;
        break;
      case 'Long-standing persistent':
        rate = baseRate.longstanding;
        break;
    }

    // Adjust for LA size
    if (ablationPlan.laSize > 50) {
      rate -= 15;
    } else if (ablationPlan.laSize > 45) {
      rate -= 10;
    } else if (ablationPlan.laSize > 40) {
      rate -= 5;
    }

    // Adjust for number of failed antiarrhythmics
    const failedDrugs = ablationPlan.priorAntiarrhythmics.filter(
      drug => drug.efficacy === 'Ineffective' || drug.efficacy === 'Intolerable'
    ).length;
    
    if (failedDrugs >= 3) rate += 5; // Higher success if multiple drug failures

    return Math.max(30, Math.min(95, rate));
  }, [selectedAblationType, ablationPlan.afType, ablationPlan.laSize, ablationPlan.priorAntiarrhythmics]);

  const updateAssessmentStatus = (id: string, status: PreAblationAssessment['status'], notes?: string) => {
    setAblationPlan(prev => ({
      ...prev,
      assessments: prev.assessments.map(assessment =>
        assessment.id === id
          ? { ...assessment, status, notes: notes || assessment.notes }
          : assessment
      )
    }));
  };

  const addAntiarrhythmic = () => {
    if (newAntiarrhythmic.name && newAntiarrhythmic.startDate) {
      setAblationPlan(prev => ({
        ...prev,
        priorAntiarrhythmics: [
          ...prev.priorAntiarrhythmics,
          {
            name: newAntiarrhythmic.name!,
            startDate: newAntiarrhythmic.startDate!,
            endDate: newAntiarrhythmic.endDate,
            reason: newAntiarrhythmic.reason || '',
            efficacy: newAntiarrhythmic.efficacy || 'Ineffective'
          }
        ]
      }));
      setNewAntiarrhythmic({});
      setShowAntiarrhythmicForm(false);
    }
  };

  const updateAblationType = (type: AblationPlan['ablationType']) => {
    setSelectedAblationType(type);
    setAblationPlan(prev => ({
      ...prev,
      ablationType: type,
      expectedSuccessRate: calculateSuccessRate
    }));
  };

  const scheduleAblation = () => {
    const requiredIncomplete = ablationPlan.assessments
      .filter(a => a.required && a.status !== 'complete');
    
    if (requiredIncomplete.length > 0) {
      alert(`Please complete required assessments: ${requiredIncomplete.map(a => a.label).join(', ')}`);
      return;
    }

    setAblationPlan(prev => ({
      ...prev,
      status: 'scheduled',
      scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks from now
    }));
  };

  const exportAblationPlan = () => {
    const data = {
      patientId: ablationPlan.patientId,
      timestamp: new Date().toISOString(),
      afType: ablationPlan.afType,
      laSize: ablationPlan.laSize,
      ablationType: selectedAblationType,
      expectedSuccessRate: calculateSuccessRate,
      priorAntiarrhythmics: ablationPlan.priorAntiarrhythmics,
      assessments: ablationPlan.assessments,
      scheduledDate: ablationPlan.scheduledDate
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ablation-plan-${ablationPlan.patientId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: PreAblationAssessment['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="w-5 h-5 text-emerald-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'missing':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: PreAblationAssessment['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-50 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 border-amber-200';
      case 'missing':
        return 'bg-red-50 border-red-200';
    }
  };

  const getEfficacyColor = (efficacy: Antiarrhythmic['efficacy']) => {
    switch (efficacy) {
      case 'Effective':
        return 'bg-emerald-100 text-emerald-800';
      case 'Ineffective':
        return 'bg-red-100 text-red-800';
      case 'Intolerable':
        return 'bg-amber-100 text-amber-800';
    }
  };

  const completionPercentage = Math.round(
    (ablationPlan.assessments.filter(a => a.status === 'complete').length / ablationPlan.assessments.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8 text-medical-purple-600" />
              Ablation Planning Checklist
            </h2>
            <p className="text-steel-600">Patient: {ablationPlan.patientId} • AF Type: {ablationPlan.afType}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-medical-purple-600">{completionPercentage}%</div>
              <div className="text-sm text-steel-500">Complete</div>
            </div>
            <button
              onClick={exportAblationPlan}
              className="p-2 text-steel-600 hover:text-steel-800 hover:bg-steel-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-steel-200 rounded-full h-2">
          <div 
            className="bg-medical-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Patient Info and LA Size */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Patient Profile
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-steel-600">AF Type</label>
              <select
                value={ablationPlan.afType}
                onChange={(e) => setAblationPlan(prev => ({ 
                  ...prev, 
                  afType: e.target.value as AblationPlan['afType']
                }))}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
              >
                <option value="Paroxysmal">Paroxysmal AF</option>
                <option value="Persistent">Persistent AF</option>
                <option value="Long-standing persistent">Long-standing persistent AF</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-steel-600">LA Size (mm)</label>
              <input
                type="number"
                value={ablationPlan.laSize}
                onChange={(e) => setAblationPlan(prev => ({ 
                  ...prev, 
                  laSize: parseInt(e.target.value) || 0
                }))}
                className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                min="20"
                max="80"
              />
              <div className="text-xs text-steel-500 mt-1">
                {ablationPlan.laSize < 40 ? 'Normal size' : 
                 ablationPlan.laSize < 45 ? 'Mildly enlarged' :
                 ablationPlan.laSize < 50 ? 'Moderately enlarged' : 'Severely enlarged'}
              </div>
            </div>
          </div>
        </div>

        {/* Expected Success Rate */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            Expected Success Rate
          </h3>
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${
              calculateSuccessRate >= 80 ? 'text-emerald-600' :
              calculateSuccessRate >= 60 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {calculateSuccessRate}%
            </div>
            <div className="text-sm text-steel-600 mb-4">Single procedure success</div>
            <div className="space-y-2 text-xs text-steel-500">
              <div>Based on AF type: {ablationPlan.afType}</div>
              <div>LA size: {ablationPlan.laSize}mm</div>
              <div>Failed drugs: {ablationPlan.priorAntiarrhythmics.filter(d => d.efficacy !== 'Effective').length}</div>
            </div>
          </div>
        </div>

        {/* Ablation Type Selection */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <CircuitBoard className="w-5 h-5 text-blue-500" />
            Ablation Strategy
          </h3>
          <div className="space-y-2">
            {ablationTypes.map((type) => (
              <button
                key={type.type}
                onClick={() => updateAblationType(type.type)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedAblationType === type.type
                    ? 'bg-medical-purple-50 border-medical-purple-300 text-medical-purple-800'
                    : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                }`}
              >
                <div className="font-medium text-sm">{type.type}</div>
                <div className="text-xs opacity-75">{type.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pre-ablation Assessment Checklist */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-medical-blue-600" />
          Pre-ablation Assessment
        </h3>
        
        <div className="space-y-4">
          {ablationPlan.assessments.map((assessment) => (
            <div
              key={assessment.id}
              className={`p-4 rounded-lg border ${getStatusColor(assessment.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(assessment.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-steel-800">{assessment.label}</span>
                      {assessment.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Required</span>
                      )}
                    </div>
                    {assessment.value && (
                      <div className="text-sm text-steel-600 mt-1">
                        Value: {assessment.value} {assessment.unit}
                      </div>
                    )}
                    {assessment.notes && (
                      <div className="text-sm text-steel-500 mt-1">{assessment.notes}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateAssessmentStatus(assessment.id, 'complete')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      assessment.status === 'complete'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    }`}
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => updateAssessmentStatus(assessment.id, 'pending')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      assessment.status === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => updateAssessmentStatus(assessment.id, 'missing')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      assessment.status === 'missing'
                        ? 'bg-red-600 text-white'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    Missing
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prior Antiarrhythmics */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-steel-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Prior Antiarrhythmic Medications
          </h3>
          <button
            onClick={() => setShowAntiarrhythmicForm(true)}
            className="px-4 py-2 bg-medical-purple-600 text-white rounded-lg hover:bg-medical-purple-700 transition-colors text-sm"
          >
            Add Medication
          </button>
        </div>

        <div className="space-y-3">
          {ablationPlan.priorAntiarrhythmics.map((drug, index) => (
            <div key={index} className="p-4 bg-steel-50 rounded-lg border border-steel-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-steel-800">{drug.name}</div>
                  <div className="text-sm text-steel-600">
                    {new Date(drug.startDate).toLocaleDateString()} - {
                      drug.endDate ? new Date(drug.endDate).toLocaleDateString() : 'Present'
                    }
                  </div>
                  <div className="text-sm text-steel-500">{drug.reason}</div>
                </div>
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEfficacyColor(drug.efficacy)}`}>
                  {drug.efficacy}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add Antiarrhythmic Form */}
        {showAntiarrhythmicForm && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-steel-600">Medication</label>
                <input
                  type="text"
                  value={newAntiarrhythmic.name || ''}
                  onChange={(e) => setNewAntiarrhythmic(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                  placeholder="e.g., Flecainide"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-steel-600">Start Date</label>
                <input
                  type="date"
                  value={newAntiarrhythmic.startDate || ''}
                  onChange={(e) => setNewAntiarrhythmic(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-steel-600">End Date (optional)</label>
                <input
                  type="date"
                  value={newAntiarrhythmic.endDate || ''}
                  onChange={(e) => setNewAntiarrhythmic(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-steel-600">Efficacy</label>
                <select
                  value={newAntiarrhythmic.efficacy || 'Ineffective'}
                  onChange={(e) => setNewAntiarrhythmic(prev => ({ 
                    ...prev, 
                    efficacy: e.target.value as Antiarrhythmic['efficacy']
                  }))}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                >
                  <option value="Effective">Effective</option>
                  <option value="Ineffective">Ineffective</option>
                  <option value="Intolerable">Intolerable</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-steel-600">Reason for discontinuation</label>
                <input
                  type="text"
                  value={newAntiarrhythmic.reason || ''}
                  onChange={(e) => setNewAntiarrhythmic(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-purple-500"
                  placeholder="e.g., Ineffective for AF episodes"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={addAntiarrhythmic}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Add Medication
              </button>
              <button
                onClick={() => {
                  setShowAntiarrhythmicForm(false);
                  setNewAntiarrhythmic({});
                }}
                className="px-4 py-2 bg-steel-600 text-white rounded-lg hover:bg-steel-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Ablation */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-steel-800 mb-2">Schedule Ablation</h3>
            {ablationPlan.scheduledDate ? (
              <div className="text-steel-600">
                Scheduled: {new Date(ablationPlan.scheduledDate).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-steel-500">Complete all required assessments to schedule</div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={scheduleAblation}
              disabled={completionPercentage < 100 || ablationPlan.status === 'scheduled'}
              className="px-6 py-3 bg-medical-purple-600 text-white rounded-lg hover:bg-medical-purple-700 disabled:bg-steel-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {ablationPlan.status === 'scheduled' ? 'Ablation Scheduled' : 'Schedule Ablation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AblationPlanningChecklist;