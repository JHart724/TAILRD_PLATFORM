import React, { useState, useEffect, useRef } from 'react';
import { 
  Footprints, 
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
  Heart,
  PhoneCall,
  Monitor,
  Stethoscope,
  Apple,
  User,
  Scissors,
  Bandage,
  Droplets,
  Camera,
  FlaskConical,
  Thermometer
} from 'lucide-react';

interface PVWoundNode {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'home-health' | 'provider' | 'monitoring' | 'treatment' | 'patient-group' | 'outcome';
  specialty?: string;
  patientVolume?: number;
  healingRate?: number;
  amputationRate?: number;
  responseTime?: number; // in hours
  coordinationScore?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isHighRisk?: boolean;
  status?: 'active' | 'busy' | 'available';
  woundStage?: 1 | 2 | 3 | 4;
}

interface PVWoundConnection {
  from: string;
  to: string;
  strength: number;
  type: 'referral' | 'wound-pathway' | 'monitoring' | 'prevention' | 'coordination' | 'follow-up' | 'limb-salvage';
  patientFlow: number;
  avgResponseTime?: number;
  woundStage?: 1 | 2 | 3 | 4;
  priority?: 'high' | 'medium' | 'routine';
}

interface PVWoundMetrics {
  overallHealingRate: number;
  amputationPreventionRate: number;
  careCoordinationScore: number;
  avgTimeToHealing: number;
  avgResponseTime: number;
  totalWoundPatients: number;
  limbSalvageRate: number;
}

const PVWoundCareNetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<PVWoundNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'wound-flow' | 'limb-salvage' | 'prevention' | 'monitoring'>('wound-flow');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate PV wound care network data
  const nodes: PVWoundNode[] = [
    // Care Settings
    { 
      id: 'main-hospital', 
      name: 'Main Hospital', 
      type: 'hospital', 
      patientVolume: 156, 
      healingRate: 0.82, 
      amputationRate: 0.08, 
      connectionStrength: 0.95, 
      x: 100, 
      y: 150, 
      color: '#0f766e',
      status: 'active'
    },
    { 
      id: 'wound-clinic', 
      name: 'Wound Care Clinic', 
      type: 'clinic', 
      patientVolume: 284, 
      healingRate: 0.91, 
      amputationRate: 0.04, 
      connectionStrength: 0.96, 
      x: 300, 
      y: 120, 
      color: '#0d9488',
      status: 'active'
    },
    { 
      id: 'podiatry-clinic', 
      name: 'Podiatry Clinic', 
      type: 'clinic', 
      patientVolume: 234, 
      healingRate: 0.88, 
      amputationRate: 0.03, 
      connectionStrength: 0.92, 
      x: 500, 
      y: 180, 
      color: '#14b8a6',
      status: 'busy'
    },
    { 
      id: 'hyperbaric-center', 
      name: 'Hyperbaric Center', 
      type: 'clinic', 
      patientVolume: 45, 
      healingRate: 0.94, 
      amputationRate: 0.02, 
      connectionStrength: 0.89, 
      x: 450, 
      y: 80, 
      color: '#22d3ee',
      status: 'available'
    },
    { 
      id: 'home-health', 
      name: 'Home Health Services', 
      type: 'home-health', 
      patientVolume: 187, 
      healingRate: 0.76, 
      amputationRate: 0.12, 
      connectionStrength: 0.84, 
      x: 150, 
      y: 320, 
      color: '#059669',
      status: 'active'
    },
    
    // Care Team Members
    { 
      id: 'vascular-surgeon', 
      name: 'Dr. Lisa Chen', 
      type: 'provider', 
      specialty: 'Vascular Surgeon', 
      patientVolume: 198, 
      healingRate: 0.89, 
      responseTime: 3.2, 
      connectionStrength: 0.94, 
      x: 200, 
      y: 80, 
      color: '#dc2626',
      status: 'active'
    },
    { 
      id: 'wound-specialist', 
      name: 'Dr. Michael Torres', 
      type: 'provider', 
      specialty: 'Wound Specialist', 
      patientVolume: 267, 
      healingRate: 0.93, 
      responseTime: 2.1, 
      connectionStrength: 0.97, 
      x: 350, 
      y: 80, 
      color: '#7c3aed',
      status: 'busy'
    },
    { 
      id: 'podiatrist', 
      name: 'Dr. Sarah Kim', 
      type: 'provider', 
      specialty: 'Podiatrist', 
      patientVolume: 234, 
      healingRate: 0.87, 
      responseTime: 4.8, 
      connectionStrength: 0.91, 
      x: 520, 
      y: 120, 
      color: '#ea580c',
      status: 'available'
    },
    { 
      id: 'wound-nurse', 
      name: 'Linda Martinez, RN', 
      type: 'provider', 
      specialty: 'Wound Care Nurse', 
      patientVolume: 156, 
      coordinationScore: 0.89, 
      responseTime: 1.5, 
      connectionStrength: 0.88, 
      x: 250, 
      y: 200, 
      color: '#16a34a',
      status: 'active'
    },
    { 
      id: 'limb-salvage-coordinator', 
      name: 'Jennifer Wilson, NP', 
      type: 'provider', 
      specialty: 'Limb Salvage Coordinator', 
      patientVolume: 156, 
      healingRate: 0.96, 
      responseTime: 2.8, 
      connectionStrength: 0.95, 
      x: 400, 
      y: 150, 
      color: '#be123c',
      status: 'active'
    },
    
    // Wound Stage Pathways
    { 
      id: 'stage-1-pathway', 
      name: 'Stage 1 Wound Care', 
      type: 'treatment', 
      patientVolume: 68, 
      healingRate: 0.96, 
      connectionStrength: 0.91, 
      x: 150, 
      y: 50, 
      color: '#16a34a',
      woundStage: 1
    },
    { 
      id: 'stage-2-pathway', 
      name: 'Stage 2 Treatment', 
      type: 'treatment', 
      patientVolume: 56, 
      healingRate: 0.89, 
      connectionStrength: 0.87, 
      x: 250, 
      y: 40, 
      color: '#ca8a04',
      woundStage: 2
    },
    { 
      id: 'stage-3-pathway', 
      name: 'Stage 3 Management', 
      type: 'treatment', 
      patientVolume: 38, 
      healingRate: 0.73, 
      connectionStrength: 0.82, 
      x: 350, 
      y: 50, 
      color: '#ea580c',
      woundStage: 3
    },
    { 
      id: 'stage-4-pathway', 
      name: 'Stage 4 Intervention', 
      type: 'treatment', 
      patientVolume: 24, 
      healingRate: 0.58, 
      connectionStrength: 0.79, 
      x: 450, 
      y: 40, 
      color: '#dc2626',
      woundStage: 4,
      isHighRisk: true
    },
    
    // Monitoring and Assessment
    { 
      id: 'remote-monitoring', 
      name: 'Remote Monitoring', 
      type: 'monitoring', 
      patientVolume: 134, 
      coordinationScore: 0.81, 
      responseTime: 0.8, 
      connectionStrength: 0.86, 
      x: 50, 
      y: 250, 
      color: '#0891b2',
      status: 'active'
    },
    { 
      id: 'wound-imaging', 
      name: 'Wound Photography', 
      type: 'monitoring', 
      patientVolume: 198, 
      coordinationScore: 0.88, 
      responseTime: 2.0, 
      connectionStrength: 0.89, 
      x: 450, 
      y: 250, 
      color: '#7c2d12'
    },
    { 
      id: 'vascular-assessment', 
      name: 'Vascular Studies', 
      type: 'monitoring', 
      patientVolume: 167, 
      responseTime: 24.0, 
      connectionStrength: 0.85, 
      x: 100, 
      y: 380, 
      color: '#1e40af'
    },
    { 
      id: 'diabetic-screening', 
      name: 'Diabetic Foot Screen', 
      type: 'monitoring', 
      patientVolume: 278, 
      responseTime: 48.0, 
      connectionStrength: 0.83, 
      x: 350, 
      y: 350, 
      color: '#7c3aed'
    },
    
    // Patient Groups
    { 
      id: 'high-risk-wounds', 
      name: 'High-Risk Wounds', 
      type: 'patient-group', 
      patientVolume: 62, 
      amputationRate: 0.18, 
      connectionStrength: 0.72, 
      x: 50, 
      y: 80, 
      color: '#be123c',
      isHighRisk: true
    },
    { 
      id: 'diabetic-wounds', 
      name: 'Diabetic Ulcers', 
      type: 'patient-group', 
      patientVolume: 156, 
      healingRate: 0.78, 
      connectionStrength: 0.81, 
      x: 550, 
      y: 300, 
      color: '#1d4ed8'
    },
    { 
      id: 'ischemic-wounds', 
      name: 'Ischemic Ulcers', 
      type: 'patient-group', 
      patientVolume: 89, 
      healingRate: 0.65, 
      connectionStrength: 0.74, 
      x: 200, 
      y: 380, 
      color: '#dc2626'
    },
    { 
      id: 'post-intervention', 
      name: 'Post-Revascularization', 
      type: 'patient-group', 
      patientVolume: 134, 
      healingRate: 0.92, 
      connectionStrength: 0.89, 
      x: 500, 
      y: 350, 
      color: '#059669'
    },
    
    // Outcomes
    { 
      id: 'outcomes-center', 
      name: 'Outcomes Tracking', 
      type: 'outcome', 
      healingRate: 0.87, 
      amputationRate: 0.035, 
      connectionStrength: 0.91, 
      x: 300, 
      y: 280, 
      color: '#166534'
    }
  ];

  const connections: PVWoundConnection[] = [
    // Initial assessment and triage
    { 
      from: 'main-hospital', 
      to: 'wound-clinic', 
      strength: 0.94, 
      type: 'referral', 
      patientFlow: 89, 
      avgResponseTime: 24,
      priority: 'high'
    },
    { 
      from: 'wound-clinic', 
      to: 'podiatry-clinic', 
      strength: 0.89, 
      type: 'referral', 
      patientFlow: 134, 
      avgResponseTime: 48,
      priority: 'medium'
    },
    { 
      from: 'wound-clinic', 
      to: 'hyperbaric-center', 
      strength: 0.76, 
      type: 'referral', 
      patientFlow: 45, 
      avgResponseTime: 72,
      priority: 'medium'
    },
    
    // Wound stage pathways
    { 
      from: 'stage-1-pathway', 
      to: 'stage-2-pathway', 
      strength: 0.78, 
      type: 'wound-pathway', 
      patientFlow: 23, 
      woundStage: 1,
      priority: 'medium'
    },
    { 
      from: 'stage-2-pathway', 
      to: 'stage-3-pathway', 
      strength: 0.69, 
      type: 'wound-pathway', 
      patientFlow: 18, 
      woundStage: 2,
      priority: 'medium'
    },
    { 
      from: 'stage-3-pathway', 
      to: 'stage-4-pathway', 
      strength: 0.65, 
      type: 'wound-pathway', 
      patientFlow: 14, 
      woundStage: 3,
      priority: 'high'
    },
    
    // Limb salvage team coordination
    { 
      from: 'vascular-surgeon', 
      to: 'limb-salvage-coordinator', 
      strength: 0.96, 
      type: 'limb-salvage', 
      patientFlow: 156, 
      avgResponseTime: 2.1,
      priority: 'high'
    },
    { 
      from: 'limb-salvage-coordinator', 
      to: 'wound-specialist', 
      strength: 0.94, 
      type: 'limb-salvage', 
      patientFlow: 134, 
      avgResponseTime: 1.8,
      priority: 'high'
    },
    { 
      from: 'wound-specialist', 
      to: 'podiatrist', 
      strength: 0.88, 
      type: 'coordination', 
      patientFlow: 187, 
      avgResponseTime: 4.2,
      priority: 'medium'
    },
    { 
      from: 'podiatrist', 
      to: 'wound-nurse', 
      strength: 0.85, 
      type: 'coordination', 
      patientFlow: 143, 
      avgResponseTime: 3.5,
      priority: 'routine'
    },
    
    // Monitoring and surveillance
    { 
      from: 'remote-monitoring', 
      to: 'wound-clinic', 
      strength: 0.91, 
      type: 'monitoring', 
      patientFlow: 134, 
      avgResponseTime: 0.8,
      priority: 'high'
    },
    { 
      from: 'wound-imaging', 
      to: 'wound-specialist', 
      strength: 0.87, 
      type: 'monitoring', 
      patientFlow: 198, 
      avgResponseTime: 2.0,
      priority: 'medium'
    },
    { 
      from: 'vascular-assessment', 
      to: 'vascular-surgeon', 
      strength: 0.92, 
      type: 'monitoring', 
      patientFlow: 167, 
      avgResponseTime: 12.0,
      priority: 'medium'
    },
    { 
      from: 'diabetic-screening', 
      to: 'podiatrist', 
      strength: 0.83, 
      type: 'prevention', 
      patientFlow: 234, 
      avgResponseTime: 48.0,
      priority: 'routine'
    },
    
    // High-risk patient pathways
    { 
      from: 'high-risk-wounds', 
      to: 'limb-salvage-coordinator', 
      strength: 0.97, 
      type: 'limb-salvage', 
      patientFlow: 62, 
      avgResponseTime: 1.0,
      priority: 'high'
    },
    { 
      from: 'high-risk-wounds', 
      to: 'remote-monitoring', 
      strength: 0.95, 
      type: 'monitoring', 
      patientFlow: 48, 
      avgResponseTime: 0.5,
      priority: 'high'
    },
    { 
      from: 'stage-4-pathway', 
      to: 'hyperbaric-center', 
      strength: 0.82, 
      type: 'referral', 
      patientFlow: 18, 
      avgResponseTime: 24.0,
      priority: 'high'
    },
    
    // Patient group connections
    { 
      from: 'diabetic-wounds', 
      to: 'diabetic-screening', 
      strength: 0.86, 
      type: 'prevention', 
      patientFlow: 156,
      priority: 'medium'
    },
    { 
      from: 'ischemic-wounds', 
      to: 'vascular-assessment', 
      strength: 0.91, 
      type: 'monitoring', 
      patientFlow: 89,
      priority: 'high'
    },
    { 
      from: 'post-intervention', 
      to: 'wound-clinic', 
      strength: 0.89, 
      type: 'follow-up', 
      patientFlow: 134,
      priority: 'medium'
    },
    
    // Home health integration
    { 
      from: 'wound-clinic', 
      to: 'home-health', 
      strength: 0.84, 
      type: 'referral', 
      patientFlow: 112, 
      avgResponseTime: 72,
      priority: 'medium'
    },
    { 
      from: 'home-health', 
      to: 'remote-monitoring', 
      strength: 0.88, 
      type: 'monitoring', 
      patientFlow: 98, 
      avgResponseTime: 4.0,
      priority: 'medium'
    },
    
    // Outcomes tracking
    { 
      from: 'wound-specialist', 
      to: 'outcomes-center', 
      strength: 0.95, 
      type: 'coordination', 
      patientFlow: 267,
      priority: 'routine'
    },
    { 
      from: 'limb-salvage-coordinator', 
      to: 'outcomes-center', 
      strength: 0.93, 
      type: 'coordination', 
      patientFlow: 156,
      priority: 'routine'
    },
    { 
      from: 'remote-monitoring', 
      to: 'outcomes-center', 
      strength: 0.87, 
      type: 'monitoring', 
      patientFlow: 134,
      priority: 'routine'
    }
  ];

  // Calculate metrics
  const metrics: PVWoundMetrics = {
    overallHealingRate: 0.873, // 87.3% healing rate
    amputationPreventionRate: 0.965, // 96.5% limb salvage success
    careCoordinationScore: 0.89,
    avgTimeToHealing: 89, // days
    avgResponseTime: 2.4, // hours
    totalWoundPatients: 284,
    limbSalvageRate: 0.943
  };

  const getNodeSize = (node: PVWoundNode) => {
    const baseSize = 8;
    const volume = node.patientVolume || 0;
    const scaleFactor = volume / 50;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 8, 28));
  };

  const getConnectionOpacity = (connection: PVWoundConnection) => {
    if (connection.priority === 'high') return 1.0;
    if (connection.priority === 'medium') return 0.8;
    return Math.max(0.3, connection.strength * 0.7);
  };

  const getConnectionWidth = (connection: PVWoundConnection) => {
    const baseWidth = connection.priority === 'high' ? 3 : 1;
    return Math.max(baseWidth, connection.patientFlow / 30);
  };

  const getConnectionColor = (connection: PVWoundConnection) => {
    switch (connection.type) {
      case 'wound-pathway': return '#dc2626';
      case 'limb-salvage': return '#b91c1c';
      case 'referral': return '#0f766e';
      case 'monitoring': return '#0891b2';
      case 'coordination': return '#059669';
      case 'prevention': return '#7c3aed';
      case 'follow-up': return '#ea580c';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = (node: PVWoundNode) => {
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
        totalWoundPatients: metrics.totalWoundPatients,
        overallHealingRate: metrics.overallHealingRate
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pv-wound-care-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: PVWoundNode) => {
    if (!node.status) return null;
    const colors = {
      active: '#22c55e',
      busy: '#f59e0b',
      available: '#6b7280'
    };
    return colors[node.status];
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'hospital': return Building2;
      case 'clinic': return Stethoscope;
      case 'home-health': return Home;
      case 'provider': return User;
      case 'monitoring': return Camera;
      case 'treatment': return Bandage;
      case 'patient-group': return Users;
      case 'outcome': return Target;
      default: return Footprints;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-steel-900">PV Wound Care Network</h3>
          <p className="text-steel-600">Peripheral vascular wound care coordination and limb salvage pathways</p>
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
              <option value="wound-flow">Wound Care Flow</option>
              <option value="limb-salvage">Limb Salvage Team</option>
              <option value="prevention">Prevention Pathways</option>
              <option value="monitoring">Wound Monitoring</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-teal-100 text-medical-teal-700 hover:bg-medical-teal-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Bandage className={`w-6 h-6 ${metrics.overallHealingRate >= 0.85 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.overallHealingRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-steel-600">Wound Healing</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Footprints className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.limbSalvageRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-steel-600">Limb Salvage</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.amputationPreventionRate * 100).toFixed(1)}%</div>
              <div className="text-xs text-steel-600">Amputation Prev.</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.careCoordinationScore * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Care Coordination</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgTimeToHealing}</div>
              <div className="text-xs text-steel-600">Days to Heal</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgResponseTime.toFixed(1)}h</div>
              <div className="text-xs text-steel-600">Response Time</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-teal-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.totalWoundPatients}</div>
              <div className="text-xs text-steel-600">Active Wounds</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Visualization */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-steel-200">
          <svg
            ref={svgRef}
            width="600"
            height="450"
            className="border border-steel-100 rounded-lg bg-gradient-to-br from-teal-50 to-white"
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
                    strokeDasharray={connection.priority === 'high' ? 'none' : connection.priority === 'medium' ? '8,4' : '4,4'}
                  />
                  
                  {/* Connection labels for high priority pathways */}
                  {connection.priority === 'high' && connection.avgResponseTime && (
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 8}
                      textAnchor="middle"
                      className="text-xs fill-teal-700 font-bold"
                      style={{ fontSize: '10px' }}
                    >
                      {connection.avgResponseTime < 24 ? `${connection.avgResponseTime.toFixed(1)}h` : `${(connection.avgResponseTime / 24).toFixed(1)}d`}
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
                  
                  {/* High risk indicator */}
                  {node.isHighRisk && (
                    <circle
                      cx={node.x + nodeSize - 3}
                      cy={node.y - nodeSize + 3}
                      r="4"
                      fill="#dc2626"
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
                  
                  {/* Wound stage indicator */}
                  {node.woundStage && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      S{node.woundStage}
                    </text>
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
                  
                  {/* Healing rate or response time indicator */}
                  {!node.woundStage && (node.healingRate || node.responseTime) && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.healingRate ? `${(node.healingRate * 100).toFixed(0)}%` : `${node.responseTime}h`}
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
                <div className="w-4 h-1 bg-red-600"></div>
                <span>Wound Stage Progression</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-red-800"></div>
                <span>Limb Salvage Team</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-600"></div>
                <span>Referral Pathways</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-600"></div>
                <span>Wound Monitoring</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-600"></div>
                <span>Care Coordination</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-purple-600"></div>
                <span>Prevention Screening</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span>High-Risk/Stage 4</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available</span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Busy</span>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-medical-teal-600" />
            Wound Care Details
          </h4>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="font-medium text-steel-900">{selectedNode.name}</div>
                <div className="text-sm text-steel-600 capitalize">{selectedNode.type.replace('-', ' ')}</div>
                {selectedNode.specialty && (
                  <div className="text-sm text-steel-600">{selectedNode.specialty}</div>
                )}
                {selectedNode.woundStage && (
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                    selectedNode.woundStage <= 2 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    STAGE {selectedNode.woundStage}
                  </div>
                )}
                {selectedNode.status && (
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                    selectedNode.status === 'active' ? 'bg-green-100 text-green-700' :
                    selectedNode.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {selectedNode.patientVolume && (
                  <div className="bg-teal-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-teal-600">{selectedNode.patientVolume}</div>
                    <div className="text-xs text-teal-700">Patient Volume</div>
                  </div>
                )}
                {selectedNode.healingRate && (
                  <div className={`p-3 rounded-lg ${selectedNode.healingRate >= 0.85 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.healingRate >= 0.85 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {(selectedNode.healingRate * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${selectedNode.healingRate >= 0.85 ? 'text-green-700' : 'text-yellow-700'}`}>
                      Healing Rate
                    </div>
                  </div>
                )}
                {selectedNode.amputationRate && (
                  <div className={`p-3 rounded-lg ${selectedNode.amputationRate <= 0.05 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.amputationRate <= 0.05 ? 'text-green-600' : 'text-red-600'}`}>
                      {(selectedNode.amputationRate * 100).toFixed(1)}%
                    </div>
                    <div className={`text-xs ${selectedNode.amputationRate <= 0.05 ? 'text-green-700' : 'text-red-700'}`}>
                      Amputation Rate
                    </div>
                  </div>
                )}
                {selectedNode.responseTime && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{selectedNode.responseTime}h</div>
                    <div className="text-xs text-purple-700">Response Time</div>
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
                            {conn.avgResponseTime && (
                              <span className={`text-xs px-1 rounded ${conn.avgResponseTime <= 24 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                {conn.avgResponseTime < 24 ? `${conn.avgResponseTime.toFixed(1)}h` : `${(conn.avgResponseTime / 24).toFixed(1)}d`}
                              </span>
                            )}
                            {conn.priority === 'high' && (
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
              <p className="text-sm">Click on a node to view wound care pathway details and coordination metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Bandage className="w-5 h-5 text-teal-600" />
            Wound Healing
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Stage 1 Healing</span>
              <span className="font-bold text-green-600">96%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Stage 2 Healing</span>
              <span className="font-bold text-green-600">89%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Stage 3 Healing</span>
              <span className="font-bold text-yellow-600">73%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Stage 4 Healing</span>
              <span className="font-bold text-red-600">58%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-green-600" />
            Limb Salvage
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Success Rate</span>
              <span className="font-bold text-green-600">{(metrics.limbSalvageRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">High-Risk Cases</span>
              <span className="font-bold text-red-600">156</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Prevention Rate</span>
              <span className="font-bold text-green-600">{(metrics.amputationPreventionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Team Response</span>
              <span className="font-bold text-blue-600">2.1h</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Care Coordination
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Coordination Score</span>
              <span className="font-bold text-blue-600">{(metrics.careCoordinationScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Avg Response Time</span>
              <span className="font-bold text-orange-600">{metrics.avgResponseTime.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Podiatry Referrals</span>
              <span className="font-bold text-purple-600">234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Hyperbaric Cases</span>
              <span className="font-bold text-cyan-600">45</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-purple-600" />
            Monitoring & Prevention
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Remote Monitoring</span>
              <span className="font-bold text-blue-600">134 pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Diabetic Screening</span>
              <span className="font-bold text-purple-600">278 pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Wound Photography</span>
              <span className="font-bold text-brown-600">198 pts</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Home Health</span>
              <span className="font-bold text-green-600">187 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PVWoundCareNetworkVisualization;