import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Clock, 
  Activity, 
  Users, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Download, 
  Settings,
  Zap,
  Timer,
  Shield,
  Home,
  Building2,
  UserCheck,
  Stethoscope,
  FlaskConical,
  User,
  Monitor,
  FileText,
  Clipboard,
  UserPlus,
  HeartHandshake,
  Layers,
  ClipboardCheck,
  Gauge,
  FileSearch,
  Scissors,
  Building
} from 'lucide-react';

interface ValvularNetworkNode {
  id: string;
  name: string;
  type: 'echo' | 'cardiology' | 'heart-team' | 'cath-lab' | 'surgery' | 'surgical-team' | 'sts-assessment' | 'surveillance' | 'anticoag' | 'patient-group' | 'outcome';
  specialty?: string;
  patientVolume?: number;
  conversionRate?: number;
  timeToEvaluation?: number; // in days
  timeToIntervention?: number; // in days
  successRate?: number;
  complicationRate?: number;
  avgStsScore?: number;
  complianceRate?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isHighVolume?: boolean;
  status?: 'active' | 'busy' | 'available' | 'scheduled';
}

interface ValvularNetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'echo-evaluation' | 'heart-team-decision' | 'surgical-planning' | 'tavr-pathway' | 'savr-pathway' | 'surveillance' | 'anticoag-management' | 'risk-assessment' | 'multidisciplinary' | 'follow-up';
  patientFlow: number;
  avgTimeToNext?: number; // in days
  conversionRate?: number;
  procedureType?: 'tavr' | 'savr' | 'mitral-repair' | 'mitral-replacement' | 'tricuspid' | 'ross' | 'complex';
  priority?: 'urgent' | 'standard' | 'routine' | 'elective';
  complianceRate?: number;
}

interface ValvularMetrics {
  totalValvePatients: number;
  heartTeamUtilization: number;
  avgTimeToIntervention: number;
  avgTimeFromDiagnosisToSurgery: number;
  surgicalVsTranscatheterRate: number;
  postOpSurveillanceCompliance: number;
  riskAssessmentAccuracy: number;
  overallSurgicalSuccessRate: number;
  savrVolume: number;
  tavrVolume: number;
  mitralVolume: number;
  longTermSurveillance: number;
}

const ValvularSurgicalNetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<ValvularNetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'surgical-planning' | 'tavr-pathway' | 'savr-pathway' | 'surveillance' | 'risk-assessment'>('surgical-planning');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate Valvular Disease surgical planning network data
  const nodes: ValvularNetworkNode[] = [
    // Initial Echo Evaluation
    { 
      id: 'echo-lab', 
      name: 'Echo Laboratory', 
      type: 'echo', 
      patientVolume: 2847, 
      conversionRate: 0.627, 
      timeToEvaluation: 3, 
      connectionStrength: 0.94, 
      x: 120, 
      y: 180, 
      color: '#8b5cf6',
      status: 'busy'
    },
    
    // Cardiology Evaluation
    { 
      id: 'valve-cardiology', 
      name: 'Valve Cardiology', 
      type: 'cardiology', 
      specialty: 'Valvular Disease', 
      patientVolume: 1784, 
      conversionRate: 0.82, 
      timeToEvaluation: 7, 
      connectionStrength: 0.91, 
      x: 280, 
      y: 120, 
      color: '#7c3aed',
      status: 'active'
    },
    
    // Heart Team Multidisciplinary Conference
    { 
      id: 'heart-team-conference', 
      name: 'Heart Team Conference', 
      type: 'heart-team', 
      specialty: 'Multidisciplinary', 
      patientVolume: 892, 
      conversionRate: 0.94, 
      timeToEvaluation: 14, 
      timeToIntervention: 28, 
      connectionStrength: 0.98, 
      x: 440, 
      y: 160, 
      color: '#6d28d9',
      status: 'scheduled',
      isHighVolume: true
    },
    
    // STS Risk Assessment
    { 
      id: 'sts-assessment', 
      name: 'STS Risk Assessment', 
      type: 'sts-assessment', 
      specialty: 'Risk Stratification', 
      patientVolume: 1456, 
      avgStsScore: 6.8, 
      timeToEvaluation: 2, 
      connectionStrength: 0.87, 
      x: 320, 
      y: 280, 
      color: '#5b21b6',
      status: 'active'
    },
    
    // TAVR Program
    { 
      id: 'tavr-program', 
      name: 'TAVR Program', 
      type: 'cath-lab', 
      specialty: 'Transcatheter Aortic', 
      patientVolume: 374, 
      timeToIntervention: 21, 
      successRate: 0.974, 
      complicationRate: 0.034, 
      connectionStrength: 0.96, 
      x: 240, 
      y: 400, 
      color: '#581c87',
      status: 'active'
    },
    
    // SAVR Program
    { 
      id: 'savr-program', 
      name: 'SAVR Program', 
      type: 'surgery', 
      specialty: 'Surgical Aortic', 
      patientVolume: 1046, 
      timeToIntervention: 35, 
      successRate: 0.968, 
      complicationRate: 0.042, 
      connectionStrength: 0.93, 
      x: 580, 
      y: 240, 
      color: '#4c1d95',
      status: 'active',
      isHighVolume: true
    },
    
    // Mitral Surgery Program
    { 
      id: 'mitral-program', 
      name: 'Mitral Surgery', 
      type: 'surgery', 
      specialty: 'Mitral Valve', 
      patientVolume: 836, 
      timeToIntervention: 42, 
      successRate: 0.961, 
      complicationRate: 0.038, 
      connectionStrength: 0.89, 
      x: 500, 
      y: 350, 
      color: '#3730a3',
      status: 'available'
    },
    
    // Ross Procedure Program
    { 
      id: 'ross-program', 
      name: 'Ross Procedure', 
      type: 'surgery', 
      specialty: 'Complex Aortic', 
      patientVolume: 372, 
      timeToIntervention: 56, 
      successRate: 0.953, 
      complicationRate: 0.061, 
      connectionStrength: 0.84, 
      x: 620, 
      y: 120, 
      color: '#312e81',
      status: 'available'
    },
    
    // Tricuspid Surgery
    { 
      id: 'tricuspid-program', 
      name: 'Tricuspid Surgery', 
      type: 'surgery', 
      specialty: 'Tricuspid Valve', 
      patientVolume: 262, 
      timeToIntervention: 49, 
      successRate: 0.946, 
      complicationRate: 0.071, 
      connectionStrength: 0.78, 
      x: 680, 
      y: 300, 
      color: '#1e1b4b',
      status: 'available'
    },
    
    // Surgical Planning Team
    { 
      id: 'surgical-planning', 
      name: 'Surgical Planning', 
      type: 'surgical-team', 
      specialty: 'Pre-operative', 
      patientVolume: 1674, 
      timeToIntervention: 14, 
      connectionStrength: 0.92, 
      x: 440, 
      y: 280, 
      color: '#4338ca',
      status: 'busy'
    },
    
    // CT Planning (for TAVR)
    { 
      id: 'ct-planning', 
      name: 'CT Planning', 
      type: 'surgical-team', 
      specialty: 'TAVR Imaging', 
      patientVolume: 374, 
      timeToEvaluation: 5, 
      connectionStrength: 0.89, 
      x: 160, 
      y: 320, 
      color: '#3730a3',
      status: 'active'
    },
    
    // Post-operative Surveillance
    { 
      id: 'surveillance-program', 
      name: 'Valve Surveillance', 
      type: 'surveillance', 
      specialty: 'Long-term Monitoring', 
      patientVolume: 1456, 
      complianceRate: 0.847, 
      timeToEvaluation: 90, 
      connectionStrength: 0.86, 
      x: 380, 
      y: 420, 
      color: '#1d4ed8',
      status: 'active'
    },
    
    // Anticoagulation Management
    { 
      id: 'anticoag-clinic', 
      name: 'Anticoagulation Clinic', 
      type: 'anticoag', 
      specialty: 'INR Management', 
      patientVolume: 1823, 
      complianceRate: 0.923, 
      timeToEvaluation: 14, 
      connectionStrength: 0.91, 
      x: 540, 
      y: 420, 
      color: '#1e40af',
      status: 'busy'
    },
    
    // Patient Groups
    { 
      id: 'severe-as', 
      name: 'Severe Aortic Stenosis', 
      type: 'patient-group', 
      patientVolume: 896, 
      conversionRate: 0.89, 
      connectionStrength: 0.92, 
      x: 80, 
      y: 60, 
      color: '#be185d'
    },
    { 
      id: 'severe-mr', 
      name: 'Severe Mitral Regurg', 
      type: 'patient-group', 
      patientVolume: 634, 
      conversionRate: 0.74, 
      connectionStrength: 0.84, 
      x: 280, 
      y: 40, 
      color: '#c2410c'
    },
    { 
      id: 'complex-valve', 
      name: 'Complex Valve Disease', 
      type: 'patient-group', 
      patientVolume: 254, 
      conversionRate: 0.67, 
      connectionStrength: 0.78, 
      x: 480, 
      y: 60, 
      color: '#dc2626'
    },
    
    // Outcomes Registry
    { 
      id: 'outcomes-registry', 
      name: 'Valve Outcomes Registry', 
      type: 'outcome', 
      successRate: 0.964, 
      connectionStrength: 0.95, 
      x: 460, 
      y: 480, 
      color: '#059669'
    }
  ];

  const connections: ValvularNetworkConnection[] = [
    // Echo → Cardiology → Heart Team pathway
    { 
      from: 'echo-lab', 
      to: 'valve-cardiology', 
      strength: 0.94, 
      type: 'echo-evaluation', 
      patientFlow: 1784, 
      avgTimeToNext: 3,
      conversionRate: 0.627,
      priority: 'standard'
    },
    { 
      from: 'valve-cardiology', 
      to: 'heart-team-conference', 
      strength: 0.91, 
      type: 'heart-team-decision', 
      patientFlow: 892, 
      avgTimeToNext: 7,
      conversionRate: 0.82,
      priority: 'standard'
    },
    
    // Risk Assessment pathways
    { 
      from: 'valve-cardiology', 
      to: 'sts-assessment', 
      strength: 0.87, 
      type: 'risk-assessment', 
      patientFlow: 1456, 
      avgTimeToNext: 2,
      priority: 'standard'
    },
    { 
      from: 'sts-assessment', 
      to: 'heart-team-conference', 
      strength: 0.89, 
      type: 'multidisciplinary', 
      patientFlow: 892, 
      avgTimeToNext: 12,
      priority: 'standard'
    },
    
    // Heart Team → Surgical Planning
    { 
      from: 'heart-team-conference', 
      to: 'surgical-planning', 
      strength: 0.94, 
      type: 'surgical-planning', 
      patientFlow: 842, 
      avgTimeToNext: 5,
      priority: 'urgent'
    },
    
    // TAVR Pathway
    { 
      from: 'heart-team-conference', 
      to: 'ct-planning', 
      strength: 0.89, 
      type: 'tavr-pathway', 
      patientFlow: 374, 
      avgTimeToNext: 7,
      procedureType: 'tavr',
      priority: 'standard'
    },
    { 
      from: 'ct-planning', 
      to: 'tavr-program', 
      strength: 0.96, 
      type: 'tavr-pathway', 
      patientFlow: 374, 
      avgTimeToNext: 14,
      procedureType: 'tavr',
      priority: 'standard'
    },
    
    // SAVR Pathways
    { 
      from: 'surgical-planning', 
      to: 'savr-program', 
      strength: 0.93, 
      type: 'savr-pathway', 
      patientFlow: 1046, 
      avgTimeToNext: 21,
      procedureType: 'savr',
      priority: 'elective'
    },
    { 
      from: 'surgical-planning', 
      to: 'mitral-program', 
      strength: 0.89, 
      type: 'savr-pathway', 
      patientFlow: 836, 
      avgTimeToNext: 28,
      procedureType: 'mitral-repair',
      priority: 'elective'
    },
    { 
      from: 'surgical-planning', 
      to: 'ross-program', 
      strength: 0.84, 
      type: 'savr-pathway', 
      patientFlow: 372, 
      avgTimeToNext: 42,
      procedureType: 'ross',
      priority: 'elective'
    },
    { 
      from: 'surgical-planning', 
      to: 'tricuspid-program', 
      strength: 0.78, 
      type: 'savr-pathway', 
      patientFlow: 262, 
      avgTimeToNext: 35,
      procedureType: 'tricuspid',
      priority: 'elective'
    },
    
    // Patient Group connections
    { 
      from: 'severe-as', 
      to: 'echo-lab', 
      strength: 0.92, 
      type: 'echo-evaluation', 
      patientFlow: 896, 
      avgTimeToNext: 5,
      priority: 'urgent'
    },
    { 
      from: 'severe-mr', 
      to: 'valve-cardiology', 
      strength: 0.84, 
      type: 'echo-evaluation', 
      patientFlow: 634, 
      avgTimeToNext: 7,
      priority: 'standard'
    },
    { 
      from: 'complex-valve', 
      to: 'heart-team-conference', 
      strength: 0.78, 
      type: 'multidisciplinary', 
      patientFlow: 254, 
      avgTimeToNext: 14,
      priority: 'urgent'
    },
    
    // Post-operative Surveillance
    { 
      from: 'tavr-program', 
      to: 'surveillance-program', 
      strength: 0.86, 
      type: 'surveillance', 
      patientFlow: 374, 
      avgTimeToNext: 30,
      complianceRate: 0.847,
      priority: 'routine'
    },
    { 
      from: 'savr-program', 
      to: 'surveillance-program', 
      strength: 0.89, 
      type: 'surveillance', 
      patientFlow: 1046, 
      avgTimeToNext: 90,
      complianceRate: 0.847,
      priority: 'routine'
    },
    { 
      from: 'mitral-program', 
      to: 'surveillance-program', 
      strength: 0.84, 
      type: 'surveillance', 
      patientFlow: 836, 
      avgTimeToNext: 90,
      complianceRate: 0.847,
      priority: 'routine'
    },
    
    // Anticoagulation Management
    { 
      from: 'savr-program', 
      to: 'anticoag-clinic', 
      strength: 0.91, 
      type: 'anticoag-management', 
      patientFlow: 627, 
      avgTimeToNext: 7,
      complianceRate: 0.923,
      priority: 'urgent'
    },
    { 
      from: 'mitral-program', 
      to: 'anticoag-clinic', 
      strength: 0.88, 
      type: 'anticoag-management', 
      patientFlow: 501, 
      avgTimeToNext: 7,
      complianceRate: 0.923,
      priority: 'urgent'
    },
    { 
      from: 'tricuspid-program', 
      to: 'anticoag-clinic', 
      strength: 0.85, 
      type: 'anticoag-management', 
      patientFlow: 157, 
      avgTimeToNext: 7,
      complianceRate: 0.923,
      priority: 'urgent'
    },
    
    // Long-term Follow-up pathways
    { 
      from: 'surveillance-program', 
      to: 'valve-cardiology', 
      strength: 0.78, 
      type: 'follow-up', 
      patientFlow: 425, 
      avgTimeToNext: 365,
      priority: 'routine'
    },
    { 
      from: 'anticoag-clinic', 
      to: 'valve-cardiology', 
      strength: 0.73, 
      type: 'follow-up', 
      patientFlow: 327, 
      avgTimeToNext: 90,
      priority: 'routine'
    },
    
    // Outcomes tracking
    { 
      from: 'tavr-program', 
      to: 'outcomes-registry', 
      strength: 0.96, 
      type: 'surveillance', 
      patientFlow: 374,
      priority: 'routine'
    },
    { 
      from: 'savr-program', 
      to: 'outcomes-registry', 
      strength: 0.93, 
      type: 'surveillance', 
      patientFlow: 1046,
      priority: 'routine'
    },
    { 
      from: 'mitral-program', 
      to: 'outcomes-registry', 
      strength: 0.89, 
      type: 'surveillance', 
      patientFlow: 836,
      priority: 'routine'
    },
    { 
      from: 'ross-program', 
      to: 'outcomes-registry', 
      strength: 0.84, 
      type: 'surveillance', 
      patientFlow: 372,
      priority: 'routine'
    },
    { 
      from: 'tricuspid-program', 
      to: 'outcomes-registry', 
      strength: 0.78, 
      type: 'surveillance', 
      patientFlow: 262,
      priority: 'routine'
    }
  ];

  // Calculate metrics
  const metrics: ValvularMetrics = {
    totalValvePatients: 1784,
    heartTeamUtilization: 0.89, // 89% of eligible cases reviewed by heart team
    avgTimeToIntervention: 32, // days from heart team decision to procedure
    avgTimeFromDiagnosisToSurgery: 45, // days from initial echo to surgery
    surgicalVsTranscatheterRate: 2.8, // ratio of SAVR to TAVR
    postOpSurveillanceCompliance: 0.847,
    riskAssessmentAccuracy: 0.93,
    overallSurgicalSuccessRate: 0.964,
    savrVolume: 1046,
    tavrVolume: 374,
    mitralVolume: 836,
    longTermSurveillance: 1456
  };

  const getNodeSize = (node: ValvularNetworkNode) => {
    const baseSize = 8;
    const volume = node.patientVolume || 0;
    const scaleFactor = volume / 300;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 15, 30));
  };

  const getConnectionOpacity = (connection: ValvularNetworkConnection) => {
    if (connection.priority === 'urgent') return 1.0;
    if (connection.priority === 'standard') return 0.8;
    return Math.max(0.4, connection.strength * 0.8);
  };

  const getConnectionWidth = (connection: ValvularNetworkConnection) => {
    const baseWidth = connection.priority === 'urgent' ? 4 : 2;
    return Math.max(baseWidth, connection.patientFlow / 150);
  };

  const getConnectionColor = (connection: ValvularNetworkConnection) => {
    switch (connection.type) {
      case 'echo-evaluation': return '#8b5cf6';
      case 'heart-team-decision': return '#7c3aed';
      case 'surgical-planning': return '#6d28d9';
      case 'tavr-pathway': return '#5b21b6';
      case 'savr-pathway': return '#4c1d95';
      case 'risk-assessment': return '#3730a3';
      case 'multidisciplinary': return '#312e81';
      case 'surveillance': return '#1d4ed8';
      case 'anticoag-management': return '#1e40af';
      case 'follow-up': return '#1e3a8a';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = (node: ValvularNetworkNode) => {
    setSelectedNode(node);
    // Highlight connections
    const relatedConnections = connections
      .filter(conn => conn.from === node.id || conn.to === node.id)
      .map(conn => conn.from === node.id ? conn.to : conn.from);
    setHighlightConnections(relatedConnections);
  };

  const exportNetworkData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      viewMode,
      nodes: nodes.map(n => ({ ...n })),
      connections: connections.map(c => ({ ...c })),
      metrics,
      summary: {
        totalNodes: nodes.length,
        totalConnections: connections.length,
        avgConnectionStrength: connections.reduce((sum, c) => sum + c.strength, 0) / connections.length,
        totalPatients: metrics.totalValvePatients,
        heartTeamUtilization: metrics.heartTeamUtilization
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valvular-surgical-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: ValvularNetworkNode) => {
    if (!node.status) return null;
    const colors = {
      active: '#22c55e',
      busy: '#f59e0b',
      available: '#6b7280',
      scheduled: '#8b5cf6'
    };
    return colors[node.status];
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'echo': return Monitor;
      case 'cardiology': return Stethoscope;
      case 'heart-team': return Users;
      case 'cath-lab': return Activity;
      case 'surgery': return Scissors;
      case 'surgical-team': return UserCheck;
      case 'sts-assessment': return FileSearch;
      case 'surveillance': return Shield;
      case 'anticoag': return FlaskConical;
      case 'patient-group': return User;
      case 'outcome': return Target;
      default: return Heart;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-steel-900">Valvular Disease Surgical Planning Network</h3>
          <p className="text-steel-600">Echo → Cath → Surgery decision pathways and Heart Team coordination</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-steel-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-steel-600" />
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="surgical-planning">Surgical Planning Workflow</option>
              <option value="tavr-pathway">TAVR vs SAVR Evaluation</option>
              <option value="savr-pathway">Surgical Planning Pathways</option>
              <option value="surveillance">Long-term Surveillance</option>
              <option value="risk-assessment">STS Risk Assessment</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-purple-100 text-medical-purple-700 hover:bg-medical-purple-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Users className={`w-6 h-6 ${metrics.heartTeamUtilization >= 0.85 ? 'text-green-600' : 'text-orange-600'}`} />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.heartTeamUtilization * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Heart Team Util</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgTimeToIntervention}d</div>
              <div className="text-xs text-steel-600">Time to Procedure</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.surgicalVsTranscatheterRate.toFixed(1)}:1</div>
              <div className="text-xs text-steel-600">SAVR:TAVR Ratio</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.postOpSurveillanceCompliance * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Surveillance</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.riskAssessmentAccuracy * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Risk Accuracy</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-medical-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.totalValvePatients.toLocaleString()}</div>
              <div className="text-xs text-steel-600">Total Patients</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Visualization */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-steel-200">
          <svg
            ref={svgRef}
            width="700"
            height="520"
            className="border border-steel-100 rounded-lg bg-gradient-to-br from-purple-50 to-white"
          >
            {/* Render connections */}
            {connections.map((connection, index) => {
              const fromNode = nodes.find(n => n.id === connection.from);
              const toNode = nodes.find(n => n.id === connection.to);
              
              if (!fromNode || !toNode) return null;
              
              const isHighlighted = highlightConnections.includes(connection.from) || highlightConnections.includes(connection.to);
              
              return (
                <g key={index}>
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={getConnectionColor(connection)}
                    strokeWidth={isHighlighted ? getConnectionWidth(connection) * 1.5 : getConnectionWidth(connection)}
                    opacity={isHighlighted ? 1 : getConnectionOpacity(connection)}
                    strokeDasharray={connection.priority === 'urgent' ? 'none' : connection.priority === 'standard' ? '8,4' : '4,4'}
                  />
                  
                  {/* Connection labels for urgent pathways */}
                  {connection.priority === 'urgent' && connection.avgTimeToNext && (
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 8}
                      textAnchor="middle"
                      className="text-xs fill-purple-700 font-bold"
                      style={{ fontSize: '10px' }}
                    >
                      {connection.avgTimeToNext}d
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Render nodes */}
            {nodes.map((node) => {
              const isHighlighted = highlightConnections.includes(node.id) || selectedNode?.id === node.id;
              const nodeSize = getNodeSize(node);
              const statusColor = getNodeStatusIndicator(node);
              
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize}
                    fill={node.color}
                    opacity={isHighlighted || !selectedNode ? 1 : 0.3}
                    stroke={isHighlighted ? '#374151' : 'white'}
                    strokeWidth={isHighlighted ? 3 : 2}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleNodeClick(node)}
                  />
                  
                  {/* High volume indicator */}
                  {node.isHighVolume && (
                    <circle
                      cx={node.x + nodeSize - 3}
                      cy={node.y - nodeSize + 3}
                      r="4"
                      fill="#8b5cf6"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Status indicator */}
                  {statusColor && (
                    <circle
                      cx={node.x - nodeSize + 3}
                      cy={node.y - nodeSize + 3}
                      r="3"
                      fill={statusColor}
                    />
                  )}
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + nodeSize + 15}
                    textAnchor="middle"
                    className="text-xs fill-steel-700 font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
                  </text>
                  
                  {/* Volume or rate indicator */}
                  {(node.patientVolume || node.conversionRate) && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.patientVolume ? node.patientVolume : `${(node.conversionRate! * 100).toFixed(0)}%`}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-purple-600"></div>
                <span>Echo Evaluation (Urgent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-indigo-600" style={{ background: 'repeating-linear-gradient(90deg, #4f46e5, #4f46e5 4px, transparent 4px, transparent 8px)' }}></div>
                <span>Heart Team Decision (Standard)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-600"></div>
                <span>Surveillance & Follow-up</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-violet-700"></div>
                <span>Surgical Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-600 rounded-full animate-pulse"></div>
                <span>High Volume Programs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Active</span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Busy</span>
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Scheduled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-medical-purple-600" />
            Network Details
          </h4>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="font-medium text-steel-900">{selectedNode.name}</div>
                <div className="text-sm text-steel-600 capitalize">{selectedNode.type.replace('-', ' ')}</div>
                {selectedNode.specialty && (
                  <div className="text-sm text-steel-600">{selectedNode.specialty}</div>
                )}
                {selectedNode.status && (
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                    selectedNode.status === 'active' ? 'bg-green-100 text-green-700' :
                    selectedNode.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                    selectedNode.status === 'scheduled' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {selectedNode.patientVolume && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{selectedNode.patientVolume}</div>
                    <div className="text-xs text-purple-700">Patient Volume</div>
                  </div>
                )}
                {selectedNode.conversionRate && (
                  <div className={`p-3 rounded-lg ${selectedNode.conversionRate >= 0.8 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.conversionRate >= 0.8 ? 'text-green-600' : 'text-orange-600'}`}>
                      {(selectedNode.conversionRate * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${selectedNode.conversionRate >= 0.8 ? 'text-green-700' : 'text-orange-700'}`}>
                      Conversion Rate
                    </div>
                  </div>
                )}
                {selectedNode.timeToEvaluation && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{selectedNode.timeToEvaluation}d</div>
                    <div className="text-xs text-blue-700">Time to Eval</div>
                  </div>
                )}
                {selectedNode.timeToIntervention && (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-indigo-600">{selectedNode.timeToIntervention}d</div>
                    <div className="text-xs text-indigo-700">Time to Procedure</div>
                  </div>
                )}
                {selectedNode.successRate && (
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600">{(selectedNode.successRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-emerald-700">Success Rate</div>
                  </div>
                )}
                {selectedNode.avgStsScore && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-red-600">{selectedNode.avgStsScore.toFixed(1)}%</div>
                    <div className="text-xs text-red-700">Avg STS Score</div>
                  </div>
                )}
                {selectedNode.complianceRate && (
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-teal-600">{(selectedNode.complianceRate * 100).toFixed(0)}%</div>
                    <div className="text-xs text-teal-700">Compliance</div>
                  </div>
                )}
                {selectedNode.complicationRate && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{(selectedNode.complicationRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-orange-700">Complications</div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm font-medium text-steel-700 mb-2">Connected pathways:</div>
                <div className="space-y-1">
                  {connections
                    .filter(conn => conn.from === selectedNode.id || conn.to === selectedNode.id)
                    .slice(0, 5)
                    .map((conn, index) => {
                      const connectedNodeId = conn.from === selectedNode.id ? conn.to : conn.from;
                      const connectedNode = nodes.find(n => n.id === connectedNodeId);
                      return (
                        <div key={index} className="text-xs bg-steel-50 p-2 rounded flex justify-between">
                          <span>{connectedNode?.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-steel-500">{conn.patientFlow} pts</span>
                            {conn.avgTimeToNext && (
                              <span className={`text-xs px-1 rounded ${conn.avgTimeToNext <= 7 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                {conn.avgTimeToNext}d
                              </span>
                            )}
                            {conn.priority === 'urgent' && (
                              <span className="text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setHighlightConnections([]);
                }}
                className="w-full px-3 py-2 bg-steel-100 text-steel-700 rounded-lg hover:bg-steel-200 transition-colors text-sm"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div className="text-center text-steel-500 py-8">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Click on a node to view surgical planning pathway details and performance metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-purple-600" />
            Surgical Planning Efficiency
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Heart Team Utilization</span>
              <span className={`font-bold ${metrics.heartTeamUtilization >= 0.85 ? 'text-green-600' : 'text-orange-600'}`}>
                {(metrics.heartTeamUtilization * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Time to Intervention</span>
              <span className="font-bold text-blue-600">{metrics.avgTimeToIntervention} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Risk Assessment Accuracy</span>
              <span className="font-bold text-purple-600">{(metrics.riskAssessmentAccuracy * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Surgical Volumes & Outcomes
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">SAVR Procedures</span>
              <span className="font-bold text-purple-600">{metrics.savrVolume}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">TAVR Procedures</span>
              <span className="font-bold text-indigo-600">{metrics.tavrVolume}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Overall Success Rate</span>
              <span className="font-bold text-green-600">{(metrics.overallSurgicalSuccessRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Long-term Management
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Surveillance Compliance</span>
              <span className="font-bold text-emerald-600">{(metrics.postOpSurveillanceCompliance * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Long-term Patients</span>
              <span className="font-bold text-blue-600">{metrics.longTermSurveillance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">SAVR:TAVR Ratio</span>
              <span className="font-bold text-purple-600">{metrics.surgicalVsTranscatheterRate.toFixed(1)}:1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValvularSurgicalNetworkVisualization;