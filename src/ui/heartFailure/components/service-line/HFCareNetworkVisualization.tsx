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
  Pill,
  PhoneCall,
  Monitor,
  FlaskConical,
  Stethoscope,
  Apple,
  User
} from 'lucide-react';
import { toFixed } from '../../../../utils/formatters';

interface HFNetworkNode {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'home-health' | 'provider' | 'monitoring' | 'medication' | 'patient-group' | 'outcome';
  specialty?: string;
  patientVolume?: number;
  gdmtOptimizationRate?: number;
  readmissionRate?: number;
  responseTime?: number; // in hours
  engagementScore?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isHighRisk?: boolean;
  status?: 'active' | 'busy' | 'available';
}

interface HFNetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'transition' | 'gdmt-pathway' | 'monitoring' | 'readmission-prevention' | 'coordination' | 'follow-up';
  patientFlow: number;
  avgResponseTime?: number;
  gdmtStep?: 'ace-arb' | 'beta-blocker' | 'mra' | 'sglt2i' | 'combination';
  priority?: 'high' | 'medium' | 'routine';
}

interface HFMetrics {
  gdmtOptimizationRate: number;
  readmissionRateReduction: number;
  careCoordinationScore: number;
  remoteMonitoringAdherence: number;
  avgResponseTime: number;
  totalHFPatients: number;
}

const HFCareNetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<HFNetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'care-flow' | 'gdmt-optimization' | 'readmission-prevention' | 'monitoring'>('care-flow');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
 const timer = setInterval(() => {
 setCurrentTime(new Date());
 }, 30000);
 return () => clearInterval(timer);
  }, []);

  // Generate HF care network data
  const nodes: HFNetworkNode[] = [
 // Care Settings
 { 
 id: 'main-hospital', 
 name: 'Main Hospital', 
 type: 'hospital', 
 patientVolume: 892, 
 gdmtOptimizationRate: 0.78, 
 readmissionRate: 0.14, 
 connectionStrength: 0.95, 
 x: 100, 
 y: 150, 
 color: '#1E3347',
 status: 'active'
 },
 { 
 id: 'hf-clinic', 
 name: 'HF Specialty Clinic', 
 type: 'clinic', 
 patientVolume: 1247, 
 gdmtOptimizationRate: 0.91, 
 readmissionRate: 0.08, 
 connectionStrength: 0.92, 
 x: 300, 
 y: 120, 
 color: '#1E3347',
 status: 'active'
 },
 { 
 id: 'cardiology-clinic', 
 name: 'General Cardiology', 
 type: 'clinic', 
 patientVolume: 643, 
 gdmtOptimizationRate: 0.73, 
 readmissionRate: 0.18, 
 connectionStrength: 0.82, 
 x: 500, 
 y: 180, 
 color: '#2C4A60',
 status: 'busy'
 },
 { 
 id: 'home-health', 
 name: 'Home Health Services', 
 type: 'home-health', 
 patientVolume: 356, 
 gdmtOptimizationRate: 0.65, 
 readmissionRate: 0.22, 
 connectionStrength: 0.78, 
 x: 150, 
 y: 320, 
 color: '#2C4A60',
 status: 'available'
 },
 
 // Care Team Members
 { 
 id: 'hf-cardiologist', 
 name: 'Dr. Sarah Martinez', 
 type: 'provider', 
 specialty: 'HF Cardiologist', 
 patientVolume: 487, 
 gdmtOptimizationRate: 0.94, 
 responseTime: 2.3, 
 connectionStrength: 0.96, 
 x: 350, 
 y: 80, 
 color: '#7A1A2E',
 status: 'active'
 },
 { 
 id: 'nurse-practitioner', 
 name: 'Jessica Chen, NP', 
 type: 'provider', 
 specialty: 'Nurse Practitioner', 
 patientVolume: 623, 
 gdmtOptimizationRate: 0.87, 
 responseTime: 1.8, 
 connectionStrength: 0.89, 
 x: 450, 
 y: 100, 
 color: '#7A1A2E',
 status: 'busy'
 },
 { 
 id: 'pharmacist', 
 name: 'Clinical Pharmacist', 
 type: 'provider', 
 specialty: 'GDMT Optimization', 
 patientVolume: 312, 
 gdmtOptimizationRate: 0.96, 
 responseTime: 4.1, 
 connectionStrength: 0.91, 
 x: 250, 
 y: 220, 
 color: '#7A1A2E',
 status: 'available'
 },
 { 
 id: 'dietitian', 
 name: 'HF Dietitian', 
 type: 'provider', 
 specialty: 'Nutrition Counseling', 
 patientVolume: 234, 
 engagementScore: 0.82, 
 responseTime: 6.2, 
 connectionStrength: 0.73, 
 x: 400, 
 y: 280, 
 color: '#4A6880',
 status: 'active'
 },
 
 // GDMT Pathway Nodes
 { 
 id: 'ace-arb-pathway', 
 name: 'ACE/ARB Initiation', 
 type: 'medication', 
 patientVolume: 1847, 
 gdmtOptimizationRate: 0.89, 
 connectionStrength: 0.94, 
 x: 200, 
 y: 50, 
 color: '#7A1A2E',
 isHighRisk: false
 },
 { 
 id: 'beta-blocker-pathway', 
 name: 'Beta-Blocker Optimization', 
 type: 'medication', 
 patientVolume: 1623, 
 gdmtOptimizationRate: 0.82, 
 connectionStrength: 0.87, 
 x: 350, 
 y: 40, 
 color: '#7A1A2E'
 },
 { 
 id: 'mra-pathway', 
 name: 'MRA Addition', 
 type: 'medication', 
 patientVolume: 1245, 
 gdmtOptimizationRate: 0.67, 
 connectionStrength: 0.79, 
 x: 500, 
 y: 60, 
 color: '#8B6914'
 },
 { 
 id: 'sglt2i-pathway', 
 name: 'SGLT2i Integration', 
 type: 'medication', 
 patientVolume: 892, 
 gdmtOptimizationRate: 0.54, 
 connectionStrength: 0.71, 
 x: 550, 
 y: 120, 
 color: '#7A1A2E'
 },
 
 // Monitoring and Follow-up
 { 
 id: 'remote-monitoring', 
 name: 'Remote Monitoring', 
 type: 'monitoring', 
 patientVolume: 567, 
 engagementScore: 0.76, 
 responseTime: 1.2, 
 connectionStrength: 0.85, 
 x: 50, 
 y: 250, 
 color: '#4A6880',
 status: 'active'
 },
 { 
 id: 'clinic-visits', 
 name: 'Scheduled Visits', 
 type: 'monitoring', 
 patientVolume: 1456, 
 engagementScore: 0.91, 
 responseTime: 48.0, 
 connectionStrength: 0.88, 
 x: 350, 
 y: 200, 
 color: '#2C4A60'
 },
 { 
 id: 'lab-monitoring', 
 name: 'Lab Work Tracking', 
 type: 'monitoring', 
 patientVolume: 987, 
 responseTime: 24.5, 
 connectionStrength: 0.82, 
 x: 150, 
 y: 380, 
 color: '#7c2d12'
 },
 
 // Patient Groups
 { 
 id: 'high-risk-patients', 
 name: 'High-Risk HF Patients', 
 type: 'patient-group', 
 patientVolume: 423, 
 readmissionRate: 0.31, 
 connectionStrength: 0.69, 
 x: 50, 
 y: 80, 
 color: '#7A1A2E',
 isHighRisk: true
 },
 { 
 id: 'stable-patients', 
 name: 'Stable HF Patients', 
 type: 'patient-group', 
 patientVolume: 1678, 
 readmissionRate: 0.09, 
 connectionStrength: 0.85, 
 x: 450, 
 y: 350, 
 color: '#1E3347'
 },
 { 
 id: 'new-diagnosis', 
 name: 'Newly Diagnosed', 
 type: 'patient-group', 
 patientVolume: 393, 
 gdmtOptimizationRate: 0.34, 
 connectionStrength: 0.72, 
 x: 300, 
 y: 380, 
 color: '#7c2d12'
 },
 
 // Outcomes
 { 
 id: 'outcomes-center', 
 name: 'Outcomes Tracking', 
 type: 'outcome', 
 gdmtOptimizationRate: 0.78, 
 readmissionRate: 0.14, 
 connectionStrength: 0.87, 
 x: 300, 
 y: 250, 
 color: '#2D6147'
 }
  ];

  const connections: HFNetworkConnection[] = [
 // Hospital to clinic transitions
 { 
 from: 'main-hospital', 
 to: 'hf-clinic', 
 strength: 0.94, 
 type: 'transition', 
 patientFlow: 234, 
 avgResponseTime: 24,
 priority: 'high'
 },
 { 
 from: 'main-hospital', 
 to: 'cardiology-clinic', 
 strength: 0.78, 
 type: 'transition', 
 patientFlow: 156, 
 avgResponseTime: 48,
 priority: 'medium'
 },
 { 
 from: 'hf-clinic', 
 to: 'home-health', 
 strength: 0.85, 
 type: 'transition', 
 patientFlow: 189, 
 avgResponseTime: 72,
 priority: 'medium'
 },
 
 // GDMT pathway connections
 { 
 from: 'ace-arb-pathway', 
 to: 'beta-blocker-pathway', 
 strength: 0.89, 
 type: 'gdmt-pathway', 
 patientFlow: 1432, 
 gdmtStep: 'ace-arb',
 priority: 'high'
 },
 { 
 from: 'beta-blocker-pathway', 
 to: 'mra-pathway', 
 strength: 0.76, 
 type: 'gdmt-pathway', 
 patientFlow: 1087, 
 gdmtStep: 'beta-blocker',
 priority: 'high'
 },
 { 
 from: 'mra-pathway', 
 to: 'sglt2i-pathway', 
 strength: 0.68, 
 type: 'gdmt-pathway', 
 patientFlow: 678, 
 gdmtStep: 'mra',
 priority: 'medium'
 },
 
 // Provider coordination
 { 
 from: 'hf-cardiologist', 
 to: 'nurse-practitioner', 
 strength: 0.92, 
 type: 'coordination', 
 patientFlow: 287, 
 avgResponseTime: 2.1,
 priority: 'high'
 },
 { 
 from: 'nurse-practitioner', 
 to: 'pharmacist', 
 strength: 0.88, 
 type: 'coordination', 
 patientFlow: 312, 
 avgResponseTime: 3.5,
 priority: 'medium'
 },
 { 
 from: 'pharmacist', 
 to: 'hf-cardiologist', 
 strength: 0.85, 
 type: 'coordination', 
 patientFlow: 198, 
 avgResponseTime: 6.2,
 priority: 'routine'
 },
 { 
 from: 'dietitian', 
 to: 'nurse-practitioner', 
 strength: 0.73, 
 type: 'coordination', 
 patientFlow: 145, 
 avgResponseTime: 8.4,
 priority: 'routine'
 },
 
 // Monitoring connections
 { 
 from: 'remote-monitoring', 
 to: 'hf-clinic', 
 strength: 0.91, 
 type: 'monitoring', 
 patientFlow: 423, 
 avgResponseTime: 1.2,
 priority: 'high'
 },
 { 
 from: 'clinic-visits', 
 to: 'lab-monitoring', 
 strength: 0.82, 
 type: 'follow-up', 
 patientFlow: 567, 
 avgResponseTime: 24.0,
 priority: 'medium'
 },
 { 
 from: 'lab-monitoring', 
 to: 'pharmacist', 
 strength: 0.87, 
 type: 'monitoring', 
 patientFlow: 298, 
 avgResponseTime: 12.5,
 priority: 'medium'
 },
 
 // Readmission prevention
 { 
 from: 'high-risk-patients', 
 to: 'remote-monitoring', 
 strength: 0.95, 
 type: 'readmission-prevention', 
 patientFlow: 312, 
 avgResponseTime: 1.0,
 priority: 'high'
 },
 { 
 from: 'high-risk-patients', 
 to: 'hf-cardiologist', 
 strength: 0.93, 
 type: 'readmission-prevention', 
 patientFlow: 278, 
 avgResponseTime: 2.3,
 priority: 'high'
 },
 { 
 from: 'new-diagnosis', 
 to: 'ace-arb-pathway', 
 strength: 0.86, 
 type: 'gdmt-pathway', 
 patientFlow: 334, 
 gdmtStep: 'ace-arb',
 priority: 'high'
 },
 
 // Outcomes tracking
 { 
 from: 'hf-cardiologist', 
 to: 'outcomes-center', 
 strength: 0.94, 
 type: 'coordination', 
 patientFlow: 487,
 priority: 'routine'
 },
 { 
 from: 'pharmacist', 
 to: 'outcomes-center', 
 strength: 0.89, 
 type: 'coordination', 
 patientFlow: 312,
 priority: 'routine'
 },
 { 
 from: 'remote-monitoring', 
 to: 'outcomes-center', 
 strength: 0.85, 
 type: 'monitoring', 
 patientFlow: 567,
 priority: 'routine'
 }
  ];

  // Calculate metrics
  const metrics: HFMetrics = {
 gdmtOptimizationRate: 0.78, // 78% on optimal GDMT
 readmissionRateReduction: 0.32, // 32% reduction from baseline
 careCoordinationScore: 0.85,
 remoteMonitoringAdherence: 0.76,
 avgResponseTime: 3.2, // hours
 totalHFPatients: 2494
  };

  const getNodeSize = (node: HFNetworkNode) => {
 const baseSize = 8;
 const volume = node.patientVolume || 0;
 const scaleFactor = volume / 300;
 return Math.max(baseSize, Math.min(baseSize + scaleFactor * 15, 30));
  };

  const getConnectionOpacity = (connection: HFNetworkConnection) => {
 if (connection.priority === 'high') return 1.0;
 if (connection.priority === 'medium') return 0.8;
 return Math.max(0.2, connection.strength * 0.7);
  };

  const getConnectionWidth = (connection: HFNetworkConnection) => {
 const baseWidth = connection.priority === 'high' ? 3 : 1;
 return Math.max(baseWidth, connection.patientFlow / 50);
  };

  const getConnectionColor = (connection: HFNetworkConnection) => {
 switch (connection.type) {
 case 'gdmt-pathway': return '#7A1A2E';
 case 'readmission-prevention': return '#7A1A2E';
 case 'transition': return '#1E3347';
 case 'monitoring': return '#4A6880';
 case 'coordination': return '#2C4A60';
 case 'follow-up': return '#7A1A2E';
 default: return '#6b7280';
 }
  };

  const handleNodeClick = (node: HFNetworkNode) => {
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
 totalHFPatients: metrics.totalHFPatients,
 gdmtOptimizationRate: metrics.gdmtOptimizationRate
 }
 };
 
 const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `hf-care-network-${new Date().toISOString().split('T')[0]}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: HFNetworkNode) => {
 if (!node.status) return null;
 const colors = {
 active: '#4A6880',
 busy: '#C8D4DC',
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
 case 'monitoring': return Monitor;
 case 'medication': return Pill;
 case 'patient-group': return Users;
 case 'outcome': return Target;
 default: return Heart;
 }
  };

  return (
 <div className="space-y-6">
 {/* Header and Controls */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-bold text-titanium-900">HF Care Coordination Network</h3>
 <p className="text-titanium-600">Real-time heart failure care pathways and GDMT optimization</p>
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
 <option value="care-flow">Care Flow Analysis</option>
 <option value="gdmt-optimization">GDMT Optimization</option>
 <option value="readmission-prevention">Readmission Prevention</option>
 <option value="monitoring">Remote Monitoring</option>
 </select>
 </div>
 
 <button
 onClick={exportNetworkData}
 className="p-2 rounded-lg bg-porsche-100 text-porsche-700 hover:bg-porsche-200 transition-colors"
 >
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>

 {/* Key Metrics Bar */}
 <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Pill className={`w-6 h-6 ${metrics.gdmtOptimizationRate >= 0.75 ? 'text-[#2C4A60]' : 'text-red-600'}`} />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.gdmtOptimizationRate * 100, 0)}%</div>
 <div className="text-xs text-titanium-600">GDMT Optimized</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <AlertTriangle className="w-6 h-6 text-red-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.readmissionRateReduction * 100, 0)}%</div>
 <div className="text-xs text-titanium-600">Readm. Reduction</div>
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
 <Monitor className="w-6 h-6 text-arterial-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.remoteMonitoringAdherence * 100, 0)}%</div>
 <div className="text-xs text-titanium-600">Remote Monitoring</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Timer className="w-6 h-6 text-[#6B7280]" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{toFixed(metrics.avgResponseTime, 1)}h</div>
 <div className="text-xs text-titanium-600">Avg Response</div>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-4 rounded-xl border border-titanium-200">
 <div className="flex items-center gap-3">
 <Heart className="w-6 h-6 text-red-600" />
 <div>
 <div className="text-lg font-bold text-titanium-900">{metrics.totalHFPatients.toLocaleString()}</div>
 <div className="text-xs text-titanium-600">Total HF Patients</div>
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
 className="border border-titanium-100 rounded-lg bg-gradient-to-br from-chrome-50 to-white"
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
 className="text-xs fill-blue-700 font-bold"
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
 fill="#7A1A2E"
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
 className="text-xs fill-titanium-700 font-medium"
 style={{ fontSize: '10px' }}
 >
 {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
 </text>
 
 {/* GDMT rate or response time indicator */}
 {(node.gdmtOptimizationRate || node.responseTime) && (
 <text
 x={node.x}
 y={node.y + 3}
 textAnchor="middle"
 className="text-xs fill-white font-bold"
 style={{ fontSize: '8px' }}
 >
 {node.gdmtOptimizationRate ? `${toFixed(node.gdmtOptimizationRate * 100, 0)}%` : `${node.responseTime}h`}
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
 <span>GDMT Pathways (High Priority)</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-chrome-600"></div>
 <span>Care Transitions</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-[#C8D4DC]"></div>
 <span>Remote Monitoring</span>
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className="w-4 h-1 bg-[#C8D4DC]"></div>
 <span>Care Coordination</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
 <span>High-Risk Patients</span>
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
 <Heart className="w-5 h-5 text-porsche-600" />
 HF Network Details
 </h4>
 
 {selectedNode ? (
 <div className="space-y-4">
 <div>
 <div className="font-medium text-titanium-900">{selectedNode.name}</div>
 <div className="text-sm text-titanium-600 capitalize">{selectedNode.type.replace('-', ' ')}</div>
 {selectedNode.specialty && (
 <div className="text-sm text-titanium-600">{selectedNode.specialty}</div>
 )}
 {selectedNode.status && (
 <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
 selectedNode.status === 'active' ? 'bg-[#F0F7F4] text-[#2D6147]' :
 selectedNode.status === 'busy' ? 'bg-[#FAF6E8] text-[#8B6914]' :
 'bg-gray-100 text-gray-700'
 }`}>
 {selectedNode.status.toUpperCase()}
 </div>
 )}
 </div>
 
 <div className="grid grid-cols-2 gap-2">
 {selectedNode.patientVolume && (
 <div className="bg-chrome-50 p-3 rounded-lg">
 <div className="text-lg font-bold text-chrome-600">{selectedNode.patientVolume}</div>
 <div className="text-xs text-chrome-700">Patient Volume</div>
 </div>
 )}
 {selectedNode.gdmtOptimizationRate && (
 <div className={`p-3 rounded-lg ${selectedNode.gdmtOptimizationRate >= 0.8 ? 'bg-[#C8D4DC]' : 'bg-[#F0F5FA]'}`}>
 <div className={`text-lg font-bold ${selectedNode.gdmtOptimizationRate >= 0.8 ? 'text-[#2C4A60]' : 'text-[#6B7280]'}`}>
 {toFixed(selectedNode.gdmtOptimizationRate * 100, 0)}%
 </div>
 <div className={`text-xs ${selectedNode.gdmtOptimizationRate >= 0.8 ? 'text-[#2C4A60]' : 'text-[#6B7280]'}`}>
 GDMT Optimized
 </div>
 </div>
 )}
 {selectedNode.readmissionRate && (
 <div className={`p-3 rounded-lg ${selectedNode.readmissionRate <= 0.15 ? 'bg-[#C8D4DC]' : 'bg-red-50'}`}>
 <div className={`text-lg font-bold ${selectedNode.readmissionRate <= 0.15 ? 'text-[#2C4A60]' : 'text-red-600'}`}>
 {toFixed(selectedNode.readmissionRate * 100, 0)}%
 </div>
 <div className={`text-xs ${selectedNode.readmissionRate <= 0.15 ? 'text-[#2C4A60]' : 'text-red-700'}`}>
 Readmission Rate
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
 <span className={`text-xs px-1 rounded ${conn.avgResponseTime <= 24 ? 'bg-[#F0F7F4] text-[#2D6147]' : 'bg-[#FAF6E8] text-[#8B6914]'}`}>
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
 <p className="text-sm">Click on a node to view care pathway details and coordination metrics</p>
 </div>
 )}
 </div>
 </div>

 {/* Performance Summary */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Pill className="w-5 h-5 text-red-600" />
 GDMT Optimization
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Overall GDMT Rate</span>
 <span className={`font-bold ${metrics.gdmtOptimizationRate >= 0.75 ? 'text-[#2C4A60]' : 'text-red-600'}`}>
 {toFixed(metrics.gdmtOptimizationRate * 100, 1)}%
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">ACE/ARB Optimization</span>
 <span className="font-bold text-chrome-600">89%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">SGLT2i Adoption</span>
 <span className="font-bold text-arterial-600">54%</span>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <Monitor className="w-5 h-5 text-chrome-600" />
 Care Coordination
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Coordination Score</span>
 <span className="font-bold text-chrome-600">{toFixed(metrics.careCoordinationScore * 100, 1)}%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Avg Response Time</span>
 <span className="font-bold text-[#6B7280]">{toFixed(metrics.avgResponseTime, 1)} hrs</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Remote Monitoring</span>
 <span className="font-bold text-[#2C4A60]">{toFixed(metrics.remoteMonitoringAdherence * 100, 1)}%</span>
 </div>
 </div>
 </div>
 
 <div className="bg-white p-6 rounded-xl border border-titanium-200">
 <h4 className="font-semibold text-titanium-900 mb-4 flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-red-600" />
 Readmission Prevention
 </h4>
 <div className="space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Reduction Rate</span>
 <span className="font-bold text-[#2C4A60]">{toFixed(metrics.readmissionRateReduction * 100, 1)}%</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">High-Risk Patients</span>
 <span className="font-bold text-red-600">{nodes.find(n => n.id === 'high-risk-patients')?.patientVolume}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-titanium-600">Total HF Patients</span>
 <span className="font-bold text-chrome-600">{metrics.totalHFPatients.toLocaleString()}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
  );
};

export default HFCareNetworkVisualization;