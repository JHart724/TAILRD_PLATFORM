import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../theme';
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
import { toFixed } from '../../../utils/formatters';

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
 color: 'var(--chart-tertiary)',
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
 color: 'var(--chart-primary)',
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
 color: 'var(--status-success)',
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
 color: 'var(--status-info)',
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
 color: 'var(--risk-low)',
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
 color: 'var(--status-danger)',
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
 color: 'var(--chart-quaternary)',
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
 color: 'var(--status-warning)',
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
 color: 'var(--status-success)',
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
 color: 'var(--risk-critical)',
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
 color: 'var(--status-success)',
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
 color: 'var(--risk-moderate)',
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
 color: 'var(--status-warning)',
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
 color: 'var(--status-danger)',
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
 color: 'var(--chart-tertiary)',
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
 color: 'var(--chart-secondary)'
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
 color: 'var(--chart-primary)'
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
 color: 'var(--chart-quaternary)'
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
 color: 'var(--risk-critical)',
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
 color: 'var(--chart-primary)'
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
 color: 'var(--status-danger)'
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
 color: 'var(--risk-low)'
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
 case 'wound-pathway': return 'var(--status-danger)';
 case 'limb-salvage': return 'var(--risk-critical)';
 case 'referral': return 'var(--chart-tertiary)';
 case 'monitoring': return 'var(--chart-tertiary)';
 case 'coordination': return 'var(--risk-low)';
 case 'prevention': return 'var(--chart-quaternary)';
 case 'follow-up': return 'var(--status-warning)';
 default: return 'var(--chart-secondary)';
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
 active: 'var(--status-success)',
 busy: 'var(--status-warning)',
 available: 'var(--chart-secondary)'
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
 <h3 className="text-2xl font-bold text-titanium-900">PV Wound Care Network</h3>
 <p className="text-titanium-600">Peripheral vascular wound care coordination and limb salvage pathways</p>
 <div className="flex items-center gap-2 mt-2 text-sm text-titanium-500">
 <Clock className="w-4 h-4" />
 <span>Last updated: {currentTime.toLocaleTimeString()}</span>
 </div>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2">
 <Settings className="w-4 h-4 text-titanium-600" />
 <select 
 value={viewMode} 
 onChange={(e) => setViewMode(e.target.value as any)}
 className="px-3 py-1 border border-titanium-300 rounded-lg text-sm"
 >
 <option value="wound-flow">Wound Care Flow</option>
 <option value="limb-salvage">Limb Salvage Team</option>
 <option value="prevention">Prevention Pathways</option>
 <option value="monitoring">Wound Monitoring</option>
 </select>
 </div>
 
 <button
 onClick={exportNetworkData}
 className="p-2 rounded-lg bg-[#e0eaf3] text-[#2C4A60] hover:bg-[#C8D4DC] transition-colors"
 >
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Key Metrics Bar */}
 <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Bandage className={`w-6 h-6 ${metrics.overallHealingRate >= 0.85 ? 'text-[#2C4A60]' : 'text-red-600'}`} />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.overallHealingRate * 100, 1)}%</div>
 <div className="text-xs text-titanium-600">Wound Healing</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Footprints className="w-6 h-6 text-[#2C4A60]" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.limbSalvageRate * 100, 1)}%</div>
 <div className="text-xs text-titanium-600">Limb Salvage</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Shield className="w-6 h-6 text-red-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.amputationPreventionRate * 100, 1)}%</div>
 <div className="text-xs text-titanium-600">Amputation Prev.</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Users className="w-6 h-6 text-chrome-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.careCoordinationScore * 100, 0)}%</div>
 <div className="text-xs text-titanium-600">Care Coordination</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Timer className="w-6 h-6 text-[#6B7280]" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{metrics.avgTimeToHealing}</div>
 <div className="text-xs text-titanium-600">Days to Heal</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Clock className="w-6 h-6 text-arterial-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.avgResponseTime, 1)}h</div>
 <div className="text-xs text-titanium-600">Response Time</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Activity className="w-6 h-6 text-[#2C4A60]" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{metrics.totalWoundPatients}</div>
 <div className="text-xs text-titanium-600">Active Wounds</div>
 </div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
 {/* Network Visualization */}
 <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-titanium-200">
 <svg
 ref={svgRef}
 width="600"
 height="450"
 className="border border-titanium-100 rounded-lg bg-gradient-to-br from-teal-50 to-white"
 >
 {/* Render connections */}
 {connections.map((connection, index) => {
 const fromNode = nodes.find(n => n.id === connection.from);
 const toNode = nodes.find(n => n.id === connection.to);
 
 if (!fromNode || !toNode) return null;
 
 const isHighlighted = highlightConnections.includes(connection.from) || highlightConnections.includes(connection.to);
 
 return (
 <g key={`${connection.from}-${connection.to}`}>
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
 {connection.avgResponseTime < 24 ? `${toFixed(connection.avgResponseTime, 1)}h` : `${toFixed(connection.avgResponseTime / 24, 1)}d`}
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
 fill="var(--status-danger)"
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
 className="text-xs fill-titanium-700 font-medium"
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
 {node.healingRate ? `${toFixed(node.healingRate * 100, 0)}%` : `${node.responseTime}h`}
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
 <div className="w-4 h-1 bg-[#C8D4DC]"></div>
 <span>Referral Pathways</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-[#C8D4DC]"></div>
 <span>Wound Monitoring</span>
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-[#C8D4DC]"></div>
 <span>Care Coordination</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-arterial-600"></div>
 <span>Prevention Screening</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
 <span>High-Risk/Stage 4</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 bg-[#C8D4DC] rounded-full"></div>
 <span>Available</span>
 <div className="w-2 h-2 bg-[#F0F5FA] rounded-full"></div>
 <span>Busy</span>
 <div className="w-2 h-2 bg-chrome-500 rounded-full"></div>
 <span>Active</span>
 </div>
 </div>
 </div>
 </div>

 {/* Node Details Panel */}
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Footprints className="w-5 h-5 text-[#2C4A60]" />
 Wound Care Details
 </h4>
 
 {selectedNode ? (
 <div className="space-y-4">
 <div>
 <div className="font-medium text-titanium-900">{selectedNode.name}</div>
 <div className="text-sm text-titanium-600 capitalize">{selectedNode.type.replace('-', ' ')}</div>
 {selectedNode.specialty && (
 <div className="text-sm text-titanium-600">{selectedNode.specialty}</div>
 )}
 {selectedNode.woundStage && (
 <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
 selectedNode.woundStage <= 2 ? 'bg-[#C8D4DC] text-[#2C4A60]' : 'bg-red-100 text-red-700'
 }`}>
 STAGE {selectedNode.woundStage}
 </div>
 )}
 {selectedNode.status && (
 <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
 selectedNode.status === 'active' ? 'bg-[#C8D4DC] text-[#2C4A60]' :
 selectedNode.status === 'busy' ? 'bg-[#F0F5FA] text-[#6B7280]' :
 'bg-gray-100 text-gray-700'
 }`}>
 {selectedNode.status.toUpperCase()}
 </div>
 )}
 </div>
 
 <div className="grid grid-cols-2 gap-2">
 {selectedNode.patientVolume && (
 <div className="bg-[#C8D4DC] p-3 rounded-lg">
 <div className="text-lg font-bold text-[#2C4A60]">{selectedNode.patientVolume}</div>
 <div className="text-xs text-[#2C4A60]">Patient Volume</div>
 </div>
 )}
 {selectedNode.healingRate && (
 <div className={`p-3 rounded-lg ${selectedNode.healingRate >= 0.85 ? 'bg-[#C8D4DC]' : 'bg-[#F0F5FA]'}`}>
 <div className={`text-lg font-bold ${selectedNode.healingRate >= 0.85 ? 'text-[#2C4A60]' : 'text-[#6B7280]'}`}>
 {toFixed(selectedNode.healingRate * 100, 0)}%
 </div>
 <div className={`text-xs ${selectedNode.healingRate >= 0.85 ? 'text-[#2C4A60]' : 'text-[#6B7280]'}`}>
 Healing Rate
 </div>
 </div>
 )}
 {selectedNode.amputationRate && (
 <div className={`p-3 rounded-lg ${selectedNode.amputationRate <= 0.05 ? 'bg-[#C8D4DC]' : 'bg-red-50'}`}>
 <div className={`text-lg font-bold ${selectedNode.amputationRate <= 0.05 ? 'text-[#2C4A60]' : 'text-red-600'}`}>
 {toFixed(selectedNode.amputationRate * 100, 1)}%
 </div>
 <div className={`text-xs ${selectedNode.amputationRate <= 0.05 ? 'text-[#2C4A60]' : 'text-red-700'}`}>
 Amputation Rate
 </div>
 </div>
 )}
 {selectedNode.responseTime && (
 <div className="bg-arterial-50 p-3 rounded-lg">
 <div className="text-lg font-bold text-arterial-600">{selectedNode.responseTime}h</div>
 <div className="text-xs text-arterial-700">Response Time</div>
 </div>
 )}
 </div>
 
 <div>
 <div className="text-sm font-medium text-titanium-700 mb-2">Connected pathways:</div>
 <div className="space-y-1">
 {connections
 .filter(conn => conn.from === selectedNode.id || conn.to === selectedNode.id)
 .slice(0, 5)
 .map((conn, index) => {
 const connectedNodeId = conn.from === selectedNode.id ? conn.to : conn.from;
 const connectedNode = nodes.find(n => n.id === connectedNodeId);
 return (
 <div key={`${conn.from}-${conn.to}`} className="text-xs bg-titanium-50 p-2 rounded flex justify-between">
 <span>{connectedNode?.name}</span>
 <div className="flex items-center gap-2">
 <span className="text-titanium-500">{conn.patientFlow} pts</span>
 {conn.avgResponseTime && (
 <span className={`text-xs px-1 rounded ${conn.avgResponseTime <= 24 ? 'bg-[#C8D4DC] text-[#2C4A60]' : 'bg-[#F0F5FA] text-[#6B7280]'}`}>
 {conn.avgResponseTime < 24 ? `${toFixed(conn.avgResponseTime, 1)}h` : `${toFixed(conn.avgResponseTime / 24, 1)}d`}
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
 className="w-full px-3 py-2 bg-titanium-100 text-titanium-700 rounded-lg hover:bg-titanium-200 transition-colors text-sm"
 >
 Clear Selection
 </button>
 </div>
 ) : (
 <div className="text-center text-titanium-500 py-8">
 <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
 <p className="text-sm">Click on a node to view wound care pathway details and coordination metrics</p>
 </div>
 )}
 </div>
 </div>

 {/* Performance Summary */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Bandage className="w-5 h-5 text-[#2C4A60]" />
 Wound Healing
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Stage 1 Healing</span>
 <span className="font-bold text-[#2C4A60]">96%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Stage 2 Healing</span>
 <span className="font-bold text-[#2C4A60]">89%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Stage 3 Healing</span>
 <span className="font-bold text-[#6B7280]">73%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Stage 4 Healing</span>
 <span className="font-bold text-red-600">58%</span>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Footprints className="w-5 h-5 text-[#2C4A60]" />
 Limb Salvage
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Success Rate</span>
 <span className="font-bold text-[#2C4A60]">{toFixed(metrics.limbSalvageRate * 100, 1)}%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">High-Risk Cases</span>
 <span className="font-bold text-red-600">156</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Prevention Rate</span>
 <span className="font-bold text-[#2C4A60]">{toFixed(metrics.amputationPreventionRate * 100, 1)}%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Team Response</span>
 <span className="font-bold text-chrome-600">2.1h</span>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Users className="w-5 h-5 text-chrome-600" />
 Care Coordination
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Coordination Score</span>
 <span className="font-bold text-chrome-600">{toFixed(metrics.careCoordinationScore * 100, 0)}%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Avg Response Time</span>
 <span className="font-bold text-[#6B7280]">{toFixed(metrics.avgResponseTime, 1)} hrs</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Podiatry Referrals</span>
 <span className="font-bold text-arterial-600">234</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Hyperbaric Cases</span>
 <span className="font-bold text-cyan-600">45</span>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Monitor className="w-5 h-5 text-arterial-600" />
 Monitoring & Prevention
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Remote Monitoring</span>
 <span className="font-bold text-chrome-600">134 pts</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Diabetic Screening</span>
 <span className="font-bold text-arterial-600">278 pts</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Wound Photography</span>
 <span className="font-bold text-brown-600">198 pts</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Home Health</span>
 <span className="font-bold text-[#2C4A60]">187 pts</span>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default PVWoundCareNetworkVisualization;