import React, { useState } from 'react';
import {
  Bandage,
  Camera,
  Clock,
  Users,
  AlertTriangle,
  Activity,
  TrendingUp,
  MapPin,
  Shield,
  Calendar,
  FileText,
  Target,
  Heart,
  Stethoscope
} from 'lucide-react';

interface WoundDetails {
  location: string;
  size: number; // cm²
  depth: 'Superficial' | 'Partial thickness' | 'Full thickness' | 'Bone/Joint';
  tissueType: 'Granulation' | 'Slough' | 'Necrotic' | 'Epithelial' | 'Mixed';
  drainage: 'None' | 'Minimal' | 'Moderate' | 'Heavy';
  odor: 'None' | 'Mild' | 'Strong' | 'Foul';
  pain: number; // 0-10 scale
}

interface InfectionStatus {
  status: 'None' | 'Cellulitis' | 'Deep tissue' | 'Osteomyelitis';
  culture: string;
  antibiotics: string;
  duration: string;
}

interface OffloadingStrategy {
  method: 'None' | 'Boot' | 'TCC' | 'Wheelchair' | 'Bed rest' | 'Other';
  compliance: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  notes: string;
}

interface VascularStatus {
  phase: 'Pre-revasc' | 'Post-revasc' | 'Surveillance' | 'No intervention';
  abi: number;
  tcpo2: number;
  lastIntervention?: string;
  nextSurveillance: string;
}

interface HealingMilestone {
  date: string;
  size: number;
  tissueType: string;
  photo?: string;
  notes: string;
}

interface TeamMember {
  role: 'Vascular' | 'Podiatry' | 'Wound care' | 'Infectious disease' | 'Endocrine' | 'Nursing';
  name: string;
  lastContact: string;
  nextAppointment: string;
  recommendations: string[];
}

interface WoundCarePatient {
  id: string;
  name: string;
  diagnosis: 'CLI' | 'CLTI';
  wound: WoundDetails;
  infection: InfectionStatus;
  offloading: OffloadingStrategy;
  vascular: VascularStatus;
  healingTracker: HealingMilestone[];
  team: TeamMember[];
  debridementSchedule: {
    frequency: 'Weekly' | 'Bi-weekly' | 'As needed' | 'Daily';
    nextDate: string;
    provider: string;
  };
  goalHealingTime: string;
  actualHealingTime?: string;
}

const WoundCareIntegration: React.FC = () => {
  const [patient, setPatient] = useState<WoundCarePatient>({
    id: 'WC001234',
    name: 'John Anderson',
    diagnosis: 'CLTI',
    wound: {
      location: 'Right heel',
      size: 4.2,
      depth: 'Full thickness',
      tissueType: 'Mixed',
      drainage: 'Moderate',
      odor: 'Mild',
      pain: 6
    },
    infection: {
      status: 'Cellulitis',
      culture: 'MRSA positive',
      antibiotics: 'Vancomycin',
      duration: '14 days'
    },
    offloading: {
      method: 'TCC',
      compliance: 'Good',
      notes: 'Patient tolerates TCC well, minimal weight bearing'
    },
    vascular: {
      phase: 'Post-revasc',
      abi: 0.65,
      tcpo2: 35,
      lastIntervention: '2024-11-01',
      nextSurveillance: '2024-12-15'
    },
    healingTracker: [
      {
        date: '2024-11-01',
        size: 6.8,
        tissueType: 'Necrotic',
        notes: 'Initial presentation, post-angioplasty'
      },
      {
        date: '2024-11-08',
        size: 5.9,
        tissueType: 'Mixed',
        notes: 'Debridement performed, some granulation tissue forming'
      },
      {
        date: '2024-11-15',
        size: 4.8,
        tissueType: 'Granulation',
        notes: 'Good progress, healthy granulation tissue'
      },
      {
        date: '2024-11-22',
        size: 4.2,
        tissueType: 'Mixed',
        notes: 'Continued healing, epithelialization at edges'
      }
    ],
    team: [
      {
        role: 'Vascular',
        name: 'Dr. Smith',
        lastContact: '2024-11-20',
        nextAppointment: '2024-12-15',
        recommendations: ['Continue current antiplatelet therapy', 'Monitor for restenosis']
      },
      {
        role: 'Wound care',
        name: 'Sarah RN',
        lastContact: '2024-11-22',
        nextAppointment: '2024-11-29',
        recommendations: ['Continue silver dressing', 'Weekly debridement']
      },
      {
        role: 'Podiatry',
        name: 'Dr. Johnson',
        lastContact: '2024-11-15',
        nextAppointment: '2024-12-01',
        recommendations: ['Maintain TCC', 'Assess for foot deformity correction']
      },
      {
        role: 'Infectious disease',
        name: 'Dr. Lee',
        lastContact: '2024-11-10',
        nextAppointment: '2024-11-24',
        recommendations: ['Complete 14-day vancomycin course', 'Repeat culture if no improvement']
      }
    ],
    debridementSchedule: {
      frequency: 'Weekly',
      nextDate: '2024-11-29',
      provider: 'Sarah RN'
    },
    goalHealingTime: '8-12 weeks',
    actualHealingTime: undefined
  });

  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  const updateWound = (field: keyof WoundDetails, value: any) => {
    setPatient(prev => ({
      ...prev,
      wound: { ...prev.wound, [field]: value }
    }));
  };

  const updateInfection = (field: keyof InfectionStatus, value: any) => {
    setPatient(prev => ({
      ...prev,
      infection: { ...prev.infection, [field]: value }
    }));
  };

  const updateVascular = (field: keyof VascularStatus, value: any) => {
    setPatient(prev => ({
      ...prev,
      vascular: { ...prev.vascular, [field]: value }
    }));
  };

  const addHealingMilestone = () => {
    const newMilestone: HealingMilestone = {
      date: new Date().toISOString().split('T')[0],
      size: patient.wound.size,
      tissueType: patient.wound.tissueType,
      notes: 'Regular assessment'
    };
    
    setPatient(prev => ({
      ...prev,
      healingTracker: [...prev.healingTracker, newMilestone]
    }));
  };

  const updateWoundStatus = () => {
    addHealingMilestone();
    alert(`Wound status updated for ${patient.name}`);
  };

  const getDepthColor = (depth: string) => {
    switch (depth) {
      case 'Superficial': return 'text-green-600 bg-green-100';
      case 'Partial thickness': return 'text-amber-600 bg-amber-100';
      case 'Full thickness': return 'text-red-600 bg-red-100';
      case 'Bone/Joint': return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getInfectionColor = (status: string) => {
    switch (status) {
      case 'None': return 'text-green-600 bg-green-100';
      case 'Cellulitis': return 'text-amber-600 bg-amber-100';
      case 'Deep tissue': return 'text-red-600 bg-red-100';
      case 'Osteomyelitis': return 'text-red-800 bg-red-200';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getVascularPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Pre-revasc': return 'text-red-600 bg-red-100';
      case 'Post-revasc': return 'text-blue-600 bg-blue-100';
      case 'Surveillance': return 'text-green-600 bg-green-100';
      case 'No intervention': return 'text-steel-600 bg-steel-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Vascular': return 'text-red-600 bg-red-100';
      case 'Podiatry': return 'text-blue-600 bg-blue-100';
      case 'Wound care': return 'text-green-600 bg-green-100';
      case 'Infectious disease': return 'text-purple-600 bg-purple-100';
      case 'Endocrine': return 'text-amber-600 bg-amber-100';
      case 'Nursing': return 'text-pink-600 bg-pink-100';
      default: return 'text-steel-600 bg-steel-100';
    }
  };

  const calculateHealingRate = () => {
    if (patient.healingTracker.length < 2) return 0;
    
    const initial = patient.healingTracker[0];
    const latest = patient.healingTracker[patient.healingTracker.length - 1];
    const sizeReduction = initial.size - latest.size;
    const daysBetween = (new Date(latest.date).getTime() - new Date(initial.date).getTime()) / (1000 * 60 * 60 * 24);
    
    return daysBetween > 0 ? (sizeReduction / daysBetween) * 7 : 0; // cm²/week
  };

  const getExpectedHealingDate = () => {
    const healingRate = calculateHealingRate();
    if (healingRate <= 0) return 'Unable to calculate';
    
    const weeksToHeal = patient.wound.size / healingRate;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + (weeksToHeal * 7));
    
    return expectedDate.toLocaleDateString();
  };

  const filteredTeam = selectedTeamFilter === 'all' 
    ? patient.team 
    : patient.team.filter(member => member.role === selectedTeamFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-steel-800 mb-2 flex items-center gap-3">
              <Bandage className="w-8 h-8 text-medical-green-600" />
              Wound Care Integration
            </h2>
            <p className="text-steel-600">
              Patient: {patient.name} • {patient.diagnosis} • Wound: {patient.wound.location}
            </p>
          </div>
          <button
            onClick={updateWoundStatus}
            className="flex items-center gap-2 px-6 py-3 bg-medical-green-600 text-white rounded-lg hover:bg-medical-green-700 transition-colors"
          >
            <Activity className="w-4 h-4" />
            Update Wound Status
          </button>
        </div>
      </div>

      {/* Wound Assessment */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-red-500" />
          Current Wound Assessment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Location</label>
            <input
              type="text"
              value={patient.wound.location}
              onChange={(e) => updateWound('location', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Size (cm²)</label>
            <input
              type="number"
              value={patient.wound.size}
              onChange={(e) => updateWound('size', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
              step="0.1"
              min="0"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Depth</label>
            <div className="grid grid-cols-2 gap-1">
              {(['Superficial', 'Partial thickness', 'Full thickness', 'Bone/Joint'] as const).map(depth => (
                <button
                  key={depth}
                  onClick={() => updateWound('depth', depth)}
                  className={`p-2 rounded border text-xs font-medium transition-all ${
                    patient.wound.depth === depth
                      ? getDepthColor(depth)
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {depth}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Tissue Type</label>
            <select
              value={patient.wound.tissueType}
              onChange={(e) => updateWound('tissueType', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            >
              <option value="Granulation">Granulation</option>
              <option value="Slough">Slough</option>
              <option value="Necrotic">Necrotic</option>
              <option value="Epithelial">Epithelial</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Drainage</label>
            <select
              value={patient.wound.drainage}
              onChange={(e) => updateWound('drainage', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            >
              <option value="None">None</option>
              <option value="Minimal">Minimal</option>
              <option value="Moderate">Moderate</option>
              <option value="Heavy">Heavy</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Pain Level (0-10)</label>
            <input
              type="range"
              min="0"
              max="10"
              value={patient.wound.pain}
              onChange={(e) => updateWound('pain', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-steel-700 font-medium">{patient.wound.pain}/10</div>
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="mt-6">
          <button
            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Camera className="w-4 h-4" />
            Document with Photo
          </button>
          
          {showPhotoUpload && (
            <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700 mb-2">Photo Upload Placeholder</div>
              <div className="h-32 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center">
                <div className="text-blue-600 text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm">Click to upload wound photo</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Infection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Infection Status
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Infection Level</label>
              <div className="grid grid-cols-2 gap-2">
                {(['None', 'Cellulitis', 'Deep tissue', 'Osteomyelitis'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => updateInfection('status', status)}
                    className={`p-2 rounded border text-sm font-medium transition-all ${
                      patient.infection.status === status
                        ? getInfectionColor(status)
                        : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Culture Result</label>
              <input
                type="text"
                value={patient.infection.culture}
                onChange={(e) => updateInfection('culture', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
                placeholder="e.g., MRSA positive"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Current Antibiotics</label>
              <input
                type="text"
                value={patient.infection.antibiotics}
                onChange={(e) => updateInfection('antibiotics', e.target.value)}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
                placeholder="e.g., Vancomycin"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
          <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Offloading Strategy
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Method</label>
              <select
                value={patient.offloading.method}
                onChange={(e) => setPatient(prev => ({
                  ...prev,
                  offloading: { ...prev.offloading, method: e.target.value as any }
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
              >
                <option value="None">None</option>
                <option value="Boot">Offloading boot</option>
                <option value="TCC">Total contact cast</option>
                <option value="Wheelchair">Wheelchair</option>
                <option value="Bed rest">Bed rest</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Compliance</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Excellent', 'Good', 'Fair', 'Poor'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setPatient(prev => ({
                      ...prev,
                      offloading: { ...prev.offloading, compliance: level }
                    }))}
                    className={`p-2 rounded border text-sm font-medium transition-all ${
                      patient.offloading.compliance === level
                        ? level === 'Excellent' || level === 'Good' ? 'text-green-600 bg-green-100' :
                          level === 'Fair' ? 'text-amber-600 bg-amber-100' : 'text-red-600 bg-red-100'
                        : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-steel-600 mb-2 block">Notes</label>
              <textarea
                value={patient.offloading.notes}
                onChange={(e) => setPatient(prev => ({
                  ...prev,
                  offloading: { ...prev.offloading, notes: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vascular Status */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          Vascular Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Current Phase</label>
            <div className="space-y-1">
              {(['Pre-revasc', 'Post-revasc', 'Surveillance', 'No intervention'] as const).map(phase => (
                <button
                  key={phase}
                  onClick={() => updateVascular('phase', phase)}
                  className={`w-full p-2 rounded border text-sm font-medium transition-all ${
                    patient.vascular.phase === phase
                      ? getVascularPhaseColor(phase)
                      : 'bg-white border-steel-200 text-steel-700 hover:bg-steel-50'
                  }`}
                >
                  {phase}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">ABI</label>
            <input
              type="number"
              value={patient.vascular.abi}
              onChange={(e) => updateVascular('abi', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
              step="0.01"
              min="0"
              max="2"
            />
            <div className="text-xs text-steel-500 mt-1">
              {patient.vascular.abi < 0.4 ? 'Severe PAD' :
               patient.vascular.abi < 0.7 ? 'Moderate PAD' :
               patient.vascular.abi < 0.9 ? 'Mild PAD' : 'Normal'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">TcPO₂ (mmHg)</label>
            <input
              type="number"
              value={patient.vascular.tcpo2}
              onChange={(e) => updateVascular('tcpo2', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
              min="0"
              max="100"
            />
            <div className="text-xs text-steel-500 mt-1">
              {patient.vascular.tcpo2 < 30 ? 'Poor healing potential' :
               patient.vascular.tcpo2 < 40 ? 'Marginal' : 'Good healing potential'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Next Surveillance</label>
            <input
              type="date"
              value={patient.vascular.nextSurveillance}
              onChange={(e) => updateVascular('nextSurveillance', e.target.value)}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            />
          </div>
        </div>
      </div>

      {/* Healing Timeline Tracker */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Healing Timeline Tracker
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {patient.healingTracker.map((milestone, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-steel-50 rounded-lg">
                  <div className="text-sm font-medium text-steel-700 min-w-24">
                    {new Date(milestone.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-steel-600">Size:</div>
                    <div className="font-medium text-steel-800">{milestone.size} cm²</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-steel-600">Tissue:</div>
                    <div className="font-medium text-steel-800">{milestone.tissueType}</div>
                  </div>
                  <div className="flex-1 text-sm text-steel-600">{milestone.notes}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-sm text-green-600 mb-1">Healing Rate</div>
              <div className="text-2xl font-bold text-green-700">
                {calculateHealingRate().toFixed(2)} cm²/week
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <div className="text-sm text-blue-600 mb-1">Expected Healing</div>
              <div className="text-lg font-bold text-blue-700">
                {getExpectedHealingDate()}
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-sm text-amber-600 mb-1">Goal Timeline</div>
              <div className="text-lg font-bold text-amber-700">
                {patient.goalHealingTime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multidisciplinary Team Coordination */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-steel-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Multidisciplinary Team
          </h3>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
          >
            <option value="all">All Team Members</option>
            <option value="Vascular">Vascular</option>
            <option value="Podiatry">Podiatry</option>
            <option value="Wound care">Wound Care</option>
            <option value="Infectious disease">Infectious Disease</option>
            <option value="Endocrine">Endocrine</option>
            <option value="Nursing">Nursing</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeam.map((member, index) => (
            <div key={index} className="p-4 border border-steel-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-steel-800">{member.name}</div>
                  <div className={`text-xs px-2 py-1 rounded font-medium ${getRoleColor(member.role)}`}>
                    {member.role}
                  </div>
                </div>
                <div className="text-sm text-steel-600">
                  Next: {new Date(member.nextAppointment).toLocaleDateString()}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-steel-600">
                  Last contact: {new Date(member.lastContact).toLocaleDateString()}
                </div>
                
                <div>
                  <div className="text-sm font-medium text-steel-700 mb-1">Recommendations:</div>
                  <ul className="text-sm text-steel-600 space-y-1">
                    {member.recommendations.map((rec, recIndex) => (
                      <li key={recIndex} className="flex items-start gap-2">
                        <div className="w-1 h-1 bg-steel-400 rounded-full mt-2 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debridement Schedule */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-medical-card border border-white/20">
        <h3 className="text-lg font-semibold text-steel-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Debridement Schedule
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Frequency</label>
            <select
              value={patient.debridementSchedule.frequency}
              onChange={(e) => setPatient(prev => ({
                ...prev,
                debridementSchedule: { ...prev.debridementSchedule, frequency: e.target.value as any }
              }))}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
              <option value="As needed">As needed</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Next Date</label>
            <input
              type="date"
              value={patient.debridementSchedule.nextDate}
              onChange={(e) => setPatient(prev => ({
                ...prev,
                debridementSchedule: { ...prev.debridementSchedule, nextDate: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-steel-600 mb-2 block">Provider</label>
            <input
              type="text"
              value={patient.debridementSchedule.provider}
              onChange={(e) => setPatient(prev => ({
                ...prev,
                debridementSchedule: { ...prev.debridementSchedule, provider: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WoundCareIntegration;