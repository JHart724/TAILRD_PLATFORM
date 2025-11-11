import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Check, 
  Clock, 
  AlertTriangle, 
  Heart, 
  Users, 
  Droplets,
  Stethoscope,
  Activity,
  Play,
  Pause,
  Square,
  Download
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  completed: boolean;
  timestamp?: string;
  notes?: string;
}

interface HemodynamicGoal {
  parameter: string;
  target: string;
  current?: string;
  achieved: boolean;
}

interface ProcedurePhase {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  status: 'pending' | 'active' | 'completed';
  checklist: ChecklistItem[];
}

interface ProtectedPCIState {
  patientId: string;
  caseId: string;
  startTime?: string;
  currentPhase: string;
  status: 'preparation' | 'active' | 'completed' | 'paused';
  preVerification: ChecklistItem[];
  devicePrep: ChecklistItem[];
  hemodynamicGoals: HemodynamicGoal[];
  procedurePhases: ProcedurePhase[];
  complications: string[];
}

const ProtectedPCIChecklist: React.FC = () => {
  const [pciState, setPciState] = useState<ProtectedPCIState>({
    patientId: 'P001234',
    caseId: `PCI-${Date.now()}`,
    currentPhase: 'preparation',
    status: 'preparation',
    preVerification: [
      {
        id: 'access-adequacy',
        label: 'Access site adequacy confirmed (size for Impella)',
        required: true,
        completed: false
      },
      {
        id: 'perfusion-team',
        label: 'Perfusion team on standby',
        required: true,
        completed: false
      },
      {
        id: 'blood-products',
        label: 'Blood products available (2 units PRBC, FFP)',
        required: true,
        completed: false
      },
      {
        id: 'surgical-backup',
        label: 'Backup surgical team notified',
        required: true,
        completed: false
      },
      {
        id: 'anesthesia-ready',
        label: 'Anesthesia team ready for sedation',
        required: false,
        completed: false
      }
    ],
    devicePrep: [
      {
        id: 'impella-size',
        label: 'Impella size confirmed (CP/2.5/5.0/5.5)',
        required: true,
        completed: false
      },
      {
        id: 'anticoag-plan',
        label: 'Anticoagulation plan set (Heparin/Bivalirudin)',
        required: true,
        completed: false
      },
      {
        id: 'device-primed',
        label: 'Impella device primed and ready',
        required: true,
        completed: false
      },
      {
        id: 'console-check',
        label: 'Impella console functional check completed',
        required: true,
        completed: false
      }
    ],
    hemodynamicGoals: [
      {
        parameter: 'Mean Arterial Pressure (MAP)',
        target: '> 70 mmHg',
        achieved: false
      },
      {
        parameter: 'Cardiac Output (CO)',
        target: '> 4.0 L/min',
        achieved: false
      },
      {
        parameter: 'Cardiac Power Output',
        target: '> 1.0 W',
        achieved: false
      },
      {
        parameter: 'PCWP',
        target: '< 18 mmHg',
        achieved: false
      }
    ],
    procedurePhases: [
      {
        id: 'access',
        name: 'Vascular Access',
        status: 'pending',
        checklist: [
          { id: 'access-1', label: 'Femoral access obtained', required: true, completed: false },
          { id: 'access-2', label: 'Arterial sheath placed', required: true, completed: false },
          { id: 'access-3', label: 'ACT checked', required: true, completed: false }
        ]
      },
      {
        id: 'support',
        name: 'MCS Deployment',
        status: 'pending',
        checklist: [
          { id: 'support-1', label: 'Impella positioned across aortic valve', required: true, completed: false },
          { id: 'support-2', label: 'Device parameters optimized', required: true, completed: false },
          { id: 'support-3', label: 'Hemodynamic improvement confirmed', required: true, completed: false }
        ]
      },
      {
        id: 'intervention',
        name: 'Coronary Intervention',
        status: 'pending',
        checklist: [
          { id: 'intervention-1', label: 'Coronary access achieved', required: true, completed: false },
          { id: 'intervention-2', label: 'Lesion crossed', required: true, completed: false },
          { id: 'intervention-3', label: 'Stent deployed successfully', required: true, completed: false }
        ]
      }
    ],
    complications: []
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [procedureDuration, setProcedureDuration] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (pciState.startTime) {
        const start = new Date(pciState.startTime);
        const duration = new Date().getTime() - start.getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        setProcedureDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pciState.startTime]);

  const toggleChecklistItem = (section: 'preVerification' | 'devicePrep', itemId: string) => {
    setPciState(prev => ({
      ...prev,
      [section]: prev[section].map(item =>
        item.id === itemId
          ? { ...item, completed: !item.completed, timestamp: !item.completed ? new Date().toISOString() : undefined }
          : item
      )
    }));
  };

  const togglePhaseItem = (phaseId: string, itemId: string) => {
    setPciState(prev => ({
      ...prev,
      procedurePhases: prev.procedurePhases.map(phase =>
        phase.id === phaseId
          ? {
              ...phase,
              checklist: phase.checklist.map(item =>
                item.id === itemId
                  ? { ...item, completed: !item.completed, timestamp: !item.completed ? new Date().toISOString() : undefined }
                  : item
              )
            }
          : phase
      )
    }));
  };

  const updateHemodynamicGoal = (parameter: string, current: string) => {
    setPciState(prev => ({
      ...prev,
      hemodynamicGoals: prev.hemodynamicGoals.map(goal =>
        goal.parameter === parameter
          ? { ...goal, current, achieved: evaluateGoalAchievement(parameter, current, goal.target) }
          : goal
      )
    }));
  };

  const evaluateGoalAchievement = (parameter: string, current: string, target: string): boolean => {
    const currentValue = parseFloat(current);
    if (isNaN(currentValue)) return false;

    if (parameter.includes('MAP') && target.includes('> 70')) {
      return currentValue > 70;
    }
    if (parameter.includes('Cardiac Output') && target.includes('> 4.0')) {
      return currentValue > 4.0;
    }
    if (parameter.includes('Power Output') && target.includes('> 1.0')) {
      return currentValue > 1.0;
    }
    if (parameter.includes('PCWP') && target.includes('< 18')) {
      return currentValue < 18;
    }
    return false;
  };

  const startProcedure = () => {
    const requiredPreChecks = pciState.preVerification.filter(item => item.required);
    const completedPreChecks = requiredPreChecks.filter(item => item.completed);
    
    if (completedPreChecks.length < requiredPreChecks.length) {
      alert('Please complete all required pre-procedure verifications before starting.');
      return;
    }

    setPciState(prev => ({
      ...prev,
      status: 'active',
      startTime: new Date().toISOString(),
      procedurePhases: prev.procedurePhases.map((phase, index) =>
        index === 0 ? { ...phase, status: 'active', startTime: new Date().toISOString() } : phase
      )
    }));
  };

  const pauseProcedure = () => {
    setPciState(prev => ({ ...prev, status: 'paused' }));
  };

  const resumeProcedure = () => {
    setPciState(prev => ({ ...prev, status: 'active' }));
  };

  const completeProcedure = () => {
    setPciState(prev => ({
      ...prev,
      status: 'completed',
      procedurePhases: prev.procedurePhases.map(phase => ({
        ...phase,
        status: 'completed',
        endTime: phase.endTime || new Date().toISOString()
      }))
    }));
  };

  const getCompletionPercentage = (items: ChecklistItem[]) => {
    const completed = items.filter(item => item.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const exportChecklist = () => {
    const data = {
      caseId: pciState.caseId,
      patientId: pciState.patientId,
      timestamp: new Date().toISOString(),
      duration: procedureDuration,
      preVerification: pciState.preVerification,
      devicePrep: pciState.devicePrep,
      hemodynamicGoals: pciState.hemodynamicGoals,
      procedurePhases: pciState.procedurePhases,
      complications: pciState.complications
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `protected-pci-checklist-${pciState.caseId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderChecklistSection = (
    title: string,
    items: ChecklistItem[],
    section: 'preVerification' | 'devicePrep',
    icon: React.ReactNode
  ) => (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-lg font-semibold text-steel-800">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getCompletionPercentage(items) === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-sm text-steel-600">{getCompletionPercentage(items)}% Complete</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-steel-50/50">
            <button
              onClick={() => toggleChecklistItem(section, item.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors ${
                item.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-steel-300 hover:border-emerald-400'
              }`}
            >
              {item.completed && <Check className="w-3 h-3" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${item.completed ? 'text-steel-600 line-through' : 'text-steel-800'}`}>
                  {item.label}
                </span>
                {item.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Required</span>}
              </div>
              {item.timestamp && (
                <span className="text-xs text-steel-500">
                  Completed: {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Case Info and Controls */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2">Protected PCI Checklist</h2>
            <div className="flex items-center gap-6 text-sm text-steel-600">
              <span>Case ID: {pciState.caseId}</span>
              <span>Patient: {pciState.patientId}</span>
              <span>Time: {currentTime.toLocaleTimeString()}</span>
              {pciState.startTime && <span>Duration: {procedureDuration}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg font-medium ${
              pciState.status === 'preparation' ? 'bg-blue-100 text-blue-700' :
              pciState.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              pciState.status === 'paused' ? 'bg-amber-100 text-amber-700' :
              'bg-steel-100 text-steel-700'
            }`}>
              {pciState.status.toUpperCase()}
            </div>
            <button
              onClick={exportChecklist}
              className="p-2 text-steel-600 hover:text-steel-800 hover:bg-steel-100 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Procedure Controls */}
        <div className="flex items-center gap-3">
          {pciState.status === 'preparation' && (
            <button
              onClick={startProcedure}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Play className="w-4 h-4" />
              Start Procedure
            </button>
          )}
          
          {pciState.status === 'active' && (
            <>
              <button
                onClick={pauseProcedure}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={completeProcedure}
                className="flex items-center gap-2 px-4 py-2 bg-steel-600 text-white rounded-lg hover:bg-steel-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Complete
              </button>
            </>
          )}
          
          {pciState.status === 'paused' && (
            <button
              onClick={resumeProcedure}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}
        </div>
      </div>

      {/* Pre-procedure and Device Preparation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChecklistSection(
          'Pre-procedure Verification',
          pciState.preVerification,
          'preVerification',
          <Shield className="w-5 h-5 text-medical-blue-600" />
        )}
        
        {renderChecklistSection(
          'Device Preparation',
          pciState.devicePrep,
          'devicePrep',
          <Heart className="w-5 h-5 text-medical-red-600" />
        )}
      </div>

      {/* Hemodynamic Goals */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-medical-purple-600" />
          <h3 className="text-lg font-semibold text-steel-800">Hemodynamic Goals</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pciState.hemodynamicGoals.map(goal => (
            <div key={goal.parameter} className="p-4 rounded-lg bg-steel-50/50 border border-steel-200">
              <div className="text-sm font-medium text-steel-700 mb-2">{goal.parameter}</div>
              <div className="text-xs text-steel-500 mb-2">Target: {goal.target}</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Current"
                  value={goal.current || ''}
                  onChange={(e) => updateHemodynamicGoal(goal.parameter, e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-steel-300 rounded focus:outline-none focus:ring-1 focus:ring-medical-blue-500"
                />
                <div className={`w-3 h-3 rounded-full ${goal.achieved ? 'bg-emerald-500' : 'bg-steel-300'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Procedure Phases */}
      {pciState.status !== 'preparation' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-steel-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-medical-blue-600" />
            Procedure Phases
          </h3>
          
          {pciState.procedurePhases.map((phase, index) => (
            <div
              key={phase.id}
              className={`bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-medical-card border border-white/20 ${
                phase.status === 'active' ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    phase.status === 'completed' ? 'bg-emerald-500 text-white' :
                    phase.status === 'active' ? 'bg-medical-blue-500 text-white' :
                    'bg-steel-300 text-steel-600'
                  }`}>
                    {index + 1}
                  </div>
                  <h4 className="font-medium text-steel-800">{phase.name}</h4>
                </div>
                <div className="text-xs text-steel-500">
                  {phase.startTime && `Started: ${new Date(phase.startTime).toLocaleTimeString()}`}
                  {phase.endTime && ` | Ended: ${new Date(phase.endTime).toLocaleTimeString()}`}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {phase.checklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded bg-steel-50/30">
                    <button
                      onClick={() => togglePhaseItem(phase.id, item.id)}
                      disabled={phase.status !== 'active'}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : phase.status === 'active'
                          ? 'border-steel-300 hover:border-emerald-400'
                          : 'border-steel-200 bg-steel-100'
                      }`}
                    >
                      {item.completed && <Check className="w-2 h-2" />}
                    </button>
                    <span className={`text-sm ${item.completed ? 'text-steel-600 line-through' : 'text-steel-800'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProtectedPCIChecklist;