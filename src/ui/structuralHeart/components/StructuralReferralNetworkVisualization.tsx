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
  Gauge
} from 'lucide-react';

interface StructuralNetworkNode {
  id: string;
  name: string;
  type: 'pcp' | 'cardiology' | 'structural-team' | 'echo-lab' | 'cath-lab' | 'surgery' | 'heart-team' | 'patient-group' | 'outcome';
  specialty?: string;
  patientVolume?: number;
  referralConversionRate?: number;
  timeToEvaluation?: number; // in days
  timeToIntervention?: number; // in days
  successRate?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isHighVolume?: boolean;
  status?: 'active' | 'busy' | 'available';
}

interface StructuralNetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'referral' | 'evaluation' | 'procedure' | 'follow-up' | 'heart-team' | 'surveillance' | 'collaboration';
  patientFlow: number;
  avgTimeToNext?: number; // in days
  conversionRate?: number;
  procedureType?: 'tavr' | 'teer' | 'tmvr' | 'tricuspid' | 'pvl' | 'evaluation';
  priority?: 'urgent' | 'standard' | 'routine';
}

interface StructuralMetrics {
  totalPatients: number;
  referralConversionRate: number;
  avgTimeToEvaluation: number;
  avgTimeToIntervention: number;
  heartTeamUtilization: number;
  overallSuccessRate: number;
  tavrVolume: number;
  teerVolume: number;
}

const StructuralReferralNetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<StructuralNetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'referral-flow' | 'tavr-pathway' | 'teer-pathway' | 'heart-team'>('referral-flow');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate Structural Heart referral network data
  const nodes: StructuralNetworkNode[] = [
    // Primary Care
    { 
      id: 'pcp-network', 
      name: 'Primary Care Network', 
      type: 'pcp', 
      patientVolume: 1247, 
      referralConversionRate: 0.76, 
      timeToEvaluation: 14, 
      connectionStrength: 0.82, 
      x: 80, 
      y: 180, 
      color: '#dc2626',
      status: 'active'
    },
    
    // General Cardiology
    { 
      id: 'general-cardiology', 
      name: 'General Cardiology', 
      type: 'cardiology', 
      specialty: 'Non-invasive Cardiology', 
      patientVolume: 1658, 
      referralConversionRate: 0.84, 
      timeToEvaluation: 8, 
      connectionStrength: 0.89, 
      x: 220, 
      y: 120, 
      color: '#dc2626',
      status: 'busy'
    },
    { 
      id: 'interventional-cardiology', 
      name: 'Interventional Cardiology', 
      type: 'cardiology', 
      specialty: 'Interventional', 
      patientVolume: 534, 
      referralConversionRate: 0.91, 
      timeToEvaluation: 5, 
      connectionStrength: 0.93, 
      x: 360, 
      y: 80, 
      color: '#b91c1c',
      status: 'active'
    },
    
    // Structural Heart Team
    { 
      id: 'structural-heart-team', 
      name: 'Structural Heart Team', 
      type: 'structural-team', 
      specialty: 'Multidisciplinary', 
      patientVolume: 892, 
      referralConversionRate: 0.87, 
      timeToEvaluation: 3, 
      timeToIntervention: 21, 
      successRate: 0.94, 
      connectionStrength: 0.96, 
      x: 500, 
      y: 150, 
      color: '#7f1d1d',
      status: 'active',
      isHighVolume: true
    },
    
    // Heart Team
    { 
      id: 'heart-team', 
      name: 'Heart Team Conference', 
      type: 'heart-team', 
      patientVolume: 423, 
      referralConversionRate: 0.79, 
      timeToEvaluation: 7, 
      connectionStrength: 0.94, 
      x: 380, 
      y: 220, 
      color: '#991b1b',
      status: 'available'
    },
    
    // Echo Lab
    { 
      id: 'echo-lab', 
      name: 'Echo Laboratory', 
      type: 'echo-lab', 
      patientVolume: 2156, 
      timeToEvaluation: 2, 
      connectionStrength: 0.88, 
      x: 180, 
      y: 280, 
      color: '#ea580c',
      status: 'busy'
    },
    
    // TAVR Program
    { 
      id: 'tavr-program', 
      name: 'TAVR Program', 
      type: 'cath-lab', 
      specialty: 'Aortic Valve', 
      patientVolume: 180, 
      timeToIntervention: 28, 
      successRate: 0.986, 
      connectionStrength: 0.95, 
      x: 320, 
      y: 350, 
      color: '#b91c1c',
      status: 'active'
    },
    
    // TEER Program
    { 
      id: 'teer-program', 
      name: 'TEER Program', 
      type: 'cath-lab', 
      specialty: 'Mitral Valve', 
      patientVolume: 67, 
      timeToIntervention: 35, 
      successRate: 0.968, 
      connectionStrength: 0.91, 
      x: 480, 
      y: 320, 
      color: '#dc2626',
      status: 'available'
    },
    
    // Cardiac Surgery
    { 
      id: 'cardiac-surgery', 
      name: 'Cardiac Surgery', 
      type: 'surgery', 
      specialty: 'Surgical Team', 
      patientVolume: 145, 
      timeToIntervention: 42, 
      successRate: 0.974, 
      connectionStrength: 0.89, 
      x: 580, 
      y: 240, 
      color: '#7c2d12',
      status: 'active'
    },
    
    // Patient Groups
    { 
      id: 'aortic-stenosis', 
      name: 'Severe Aortic Stenosis', 
      type: 'patient-group', 
      patientVolume: 623, 
      referralConversionRate: 0.89, 
      connectionStrength: 0.85, 
      x: 120, 
      y: 60, 
      color: '#be123c'
    },
    { 
      id: 'mitral-regurg', 
      name: 'Severe Mitral Regurg', 
      type: 'patient-group', 
      patientVolume: 378, 
      referralConversionRate: 0.71, 
      connectionStrength: 0.78, 
      x: 450, 
      y: 60, 
      color: '#1d4ed8'
    },
    { 
      id: 'tricuspid-disease', 
      name: 'Tricuspid Disease', 
      type: 'patient-group', 
      patientVolume: 89, 
      referralConversionRate: 0.34, 
      connectionStrength: 0.62, 
      x: 580, 
      y: 120, 
      color: '#7c3aed'
    },
    { 
      id: 'complex-cases', 
      name: 'Complex Anatomy', 
      type: 'patient-group', 
      patientVolume: 156, 
      referralConversionRate: 0.58, 
      connectionStrength: 0.69, 
      x: 320, 
      y: 40, 
      color: '#7c2d12'
    },
    
    // Outcomes
    { 
      id: 'outcomes-registry', 
      name: 'Outcomes Registry', 
      type: 'outcome', 
      successRate: 0.94, 
      connectionStrength: 0.91, 
      x: 420, 
      y: 380, 
      color: '#166534'
    }
  ];

  const connections: StructuralNetworkConnection[] = [
    // Primary referral pathway
    { 
      from: 'pcp-network', 
      to: 'general-cardiology', 
      strength: 0.89, 
      type: 'referral', 
      patientFlow: 947, 
      avgTimeToNext: 14,
      conversionRate: 0.76,
      priority: 'standard'
    },
    { 
      from: 'general-cardiology', 
      to: 'structural-heart-team', 
      strength: 0.92, 
      type: 'referral', 
      patientFlow: 623, 
      avgTimeToNext: 8,
      conversionRate: 0.84,
      priority: 'standard'
    },
    { 
      from: 'interventional-cardiology', 
      to: 'structural-heart-team', 
      strength: 0.94, 
      type: 'referral', 
      patientFlow: 269, 
      avgTimeToNext: 5,
      conversionRate: 0.91,
      priority: 'urgent'
    },
    
    // Echo Lab pathways
    { 
      from: 'general-cardiology', 
      to: 'echo-lab', 
      strength: 0.85, 
      type: 'evaluation', 
      patientFlow: 1234, 
      avgTimeToNext: 3,
      priority: 'standard'
    },
    { 
      from: 'echo-lab', 
      to: 'heart-team', 
      strength: 0.78, 
      type: 'evaluation', 
      patientFlow: 423, 
      avgTimeToNext: 2,
      priority: 'standard'
    },
    { 
      from: 'echo-lab', 
      to: 'structural-heart-team', 
      strength: 0.82, 
      type: 'evaluation', 
      patientFlow: 567, 
      avgTimeToNext: 4,
      priority: 'standard'
    },
    
    // Heart Team decision pathways
    { 
      from: 'heart-team', 
      to: 'tavr-program', 
      strength: 0.91, 
      type: 'heart-team', 
      patientFlow: 180, 
      avgTimeToNext: 21,
      procedureType: 'tavr',
      priority: 'standard'
    },
    { 
      from: 'heart-team', 
      to: 'teer-program', 
      strength: 0.87, 
      type: 'heart-team', 
      patientFlow: 67, 
      avgTimeToNext: 28,
      procedureType: 'teer',
      priority: 'standard'
    },
    { 
      from: 'heart-team', 
      to: 'cardiac-surgery', 
      strength: 0.89, 
      type: 'heart-team', 
      patientFlow: 145, 
      avgTimeToNext: 35,
      priority: 'standard'
    },
    
    // Direct structural team pathways
    { 
      from: 'structural-heart-team', 
      to: 'tavr-program', 
      strength: 0.93, 
      type: 'procedure', 
      patientFlow: 134, 
      avgTimeToNext: 18,
      procedureType: 'tavr',
      priority: 'urgent'
    },
    { 
      from: 'structural-heart-team', 
      to: 'teer-program', 
      strength: 0.88, 
      type: 'procedure', 
      patientFlow: 45, 
      avgTimeToNext: 25,
      procedureType: 'teer',
      priority: 'standard'
    },
    
    // Patient group connections
    { 
      from: 'aortic-stenosis', 
      to: 'general-cardiology', 
      strength: 0.92, 
      type: 'referral', 
      patientFlow: 556, 
      avgTimeToNext: 12,
      priority: 'standard'
    },
    { 
      from: 'mitral-regurg', 
      to: 'interventional-cardiology', 
      strength: 0.78, 
      type: 'referral', 
      patientFlow: 268, 
      avgTimeToNext: 9,
      priority: 'standard'
    },
    { 
      from: 'complex-cases', 
      to: 'structural-heart-team', 
      strength: 0.86, 
      type: 'referral', 
      patientFlow: 91, 
      avgTimeToNext: 6,
      priority: 'urgent'
    },
    { 
      from: 'tricuspid-disease', 
      to: 'cardiac-surgery', 
      strength: 0.73, 
      type: 'referral', 
      patientFlow: 30, 
      avgTimeToNext: 28,
      priority: 'routine'
    },
    
    // Collaboration pathways
    { 
      from: 'structural-heart-team', 
      to: 'cardiac-surgery', 
      strength: 0.84, 
      type: 'collaboration', 
      patientFlow: 89, 
      avgTimeToNext: 14,
      priority: 'standard'
    },
    { 
      from: 'interventional-cardiology', 
      to: 'cardiac-surgery', 
      strength: 0.76, 
      type: 'collaboration', 
      patientFlow: 56, 
      avgTimeToNext: 21,
      priority: 'routine'
    },
    
    // Follow-up and surveillance
    { 
      from: 'tavr-program', 
      to: 'general-cardiology', 
      strength: 0.88, 
      type: 'surveillance', 
      patientFlow: 314, 
      avgTimeToNext: 90,
      priority: 'routine'
    },
    { 
      from: 'teer-program', 
      to: 'echo-lab', 
      strength: 0.91, 
      type: 'surveillance', 
      patientFlow: 112, 
      avgTimeToNext: 30,
      priority: 'standard'
    },
    { 
      from: 'cardiac-surgery', 
      to: 'general-cardiology', 
      strength: 0.85, 
      type: 'follow-up', 
      patientFlow: 145, 
      avgTimeToNext: 30,
      priority: 'routine'
    },
    
    // Outcomes tracking
    { 
      from: 'tavr-program', 
      to: 'outcomes-registry', 
      strength: 0.96, 
      type: 'surveillance', 
      patientFlow: 180,
      priority: 'routine'
    },
    { 
      from: 'teer-program', 
      to: 'outcomes-registry', 
      strength: 0.93, 
      type: 'surveillance', 
      patientFlow: 67,
      priority: 'routine'
    },
    { 
      from: 'cardiac-surgery', 
      to: 'outcomes-registry', 
      strength: 0.89, 
      type: 'surveillance', 
      patientFlow: 145,
      priority: 'routine'
    }
  ];

  // Calculate metrics
  const metrics: StructuralMetrics = {
    totalPatients: 2570,
    referralConversionRate: 0.81, // 81% of referrals result in evaluation
    avgTimeToEvaluation: 12, // days
    avgTimeToIntervention: 28, // days
    heartTeamUtilization: 0.73,
    overallSuccessRate: 0.94,
    tavrVolume: 180,
    teerVolume: 67
  };

  const getNodeSize = (node: StructuralNetworkNode) => {
    const baseSize = 8;
    const volume = node.patientVolume || 0;
    const scaleFactor = volume / 400;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 20, 35));
  };

  const getConnectionOpacity = (connection: StructuralNetworkConnection) => {
    if (connection.priority === 'urgent') return 1.0;
    if (connection.priority === 'standard') return 0.8;
    return Math.max(0.3, connection.strength * 0.7);
  };

  const getConnectionWidth = (connection: StructuralNetworkConnection) => {
    const baseWidth = connection.priority === 'urgent' ? 4 : 2;
    return Math.max(baseWidth, connection.patientFlow / 100);
  };

  const getConnectionColor = (connection: StructuralNetworkConnection) => {
    switch (connection.type) {
      case 'referral': return '#dc2626';
      case 'evaluation': return '#ea580c';
      case 'procedure': return '#b91c1c';
      case 'heart-team': return '#991b1b';
      case 'collaboration': return '#7c2d12';
      case 'surveillance': return '#059669';
      case 'follow-up': return '#0891b2';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = (node: StructuralNetworkNode) => {
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
        totalPatients: metrics.totalPatients,
        referralConversionRate: metrics.referralConversionRate
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `structural-heart-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: StructuralNetworkNode) => {
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
      case 'pcp': return Home;
      case 'cardiology': return Stethoscope;
      case 'structural-team': return HeartHandshake;
      case 'heart-team': return Users;
      case 'echo-lab': return Monitor;
      case 'cath-lab': return Activity;
      case 'surgery': return UserCheck;
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
          <h3 className="text-2xl font-bold text-steel-900">Structural Heart Referral Network</h3>
          <p className="text-steel-600">Comprehensive referral pathways and Heart Team coordination</p>
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
              <option value="referral-flow">Referral Flow Analysis</option>
              <option value="tavr-pathway">TAVR Pathway</option>
              <option value="teer-pathway">TEER Pathway</option>
              <option value="heart-team">Heart Team Coordination</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-red-100 text-medical-red-700 hover:bg-medical-red-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <UserPlus className={`w-6 h-6 ${metrics.referralConversionRate >= 0.75 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.referralConversionRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Referral Conversion</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgTimeToEvaluation}d</div>
              <div className="text-xs text-steel-600">Time to Eval</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgTimeToIntervention}d</div>
              <div className="text-xs text-steel-600">Time to Procedure</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.heartTeamUtilization * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Heart Team Util</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.overallSuccessRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Success Rate</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.totalPatients.toLocaleString()}</div>
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
            width="600"
            height="450"
            className="border border-steel-100 rounded-lg bg-gradient-to-br from-red-50 to-white"
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
                      className="text-xs fill-red-700 font-bold"
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
                  
                  {/* Volume or conversion rate indicator */}
                  {(node.patientVolume || node.referralConversionRate) && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.patientVolume ? node.patientVolume : `${(node.referralConversionRate! * 100).toFixed(0)}%`}
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
                <span>Primary Referrals (Urgent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-orange-600" style={{ background: 'repeating-linear-gradient(90deg, #ea580c, #ea580c 4px, transparent 4px, transparent 8px)' }}></div>
                <span>Evaluations (Standard)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-600"></div>
                <span>Follow-up & Surveillance</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-amber-800"></div>
                <span>Heart Team Decisions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span>High Volume Centers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Available</span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Busy</span>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-medical-red-600" />
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
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {selectedNode.patientVolume && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-red-600">{selectedNode.patientVolume}</div>
                    <div className="text-xs text-red-700">Patient Volume</div>
                  </div>
                )}
                {selectedNode.referralConversionRate && (
                  <div className={`p-3 rounded-lg ${selectedNode.referralConversionRate >= 0.8 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.referralConversionRate >= 0.8 ? 'text-green-600' : 'text-orange-600'}`}>
                      {(selectedNode.referralConversionRate * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${selectedNode.referralConversionRate >= 0.8 ? 'text-green-700' : 'text-orange-700'}`}>
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
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">{selectedNode.timeToIntervention}d</div>
                    <div className="text-xs text-purple-700">Time to Procedure</div>
                  </div>
                )}
                {selectedNode.successRate && (
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600">{(selectedNode.successRate * 100).toFixed(1)}%</div>
                    <div className="text-xs text-emerald-700">Success Rate</div>
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
              <p className="text-sm">Click on a node to view referral pathway details and performance metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-red-600" />
            Referral Efficiency
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Overall Conversion</span>
              <span className={`font-bold ${metrics.referralConversionRate >= 0.75 ? 'text-green-600' : 'text-red-600'}`}>
                {(metrics.referralConversionRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Avg Time to Evaluation</span>
              <span className="font-bold text-blue-600">{metrics.avgTimeToEvaluation} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Avg Time to Procedure</span>
              <span className="font-bold text-purple-600">{metrics.avgTimeToIntervention} days</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-orange-600" />
            Heart Team Coordination
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Team Utilization</span>
              <span className="font-bold text-orange-600">{(metrics.heartTeamUtilization * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Weekly Conferences</span>
              <span className="font-bold text-blue-600">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Cases Reviewed</span>
              <span className="font-bold text-green-600">{nodes.find(n => n.id === 'heart-team')?.patientVolume}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Procedure Volumes
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">TAVR Procedures</span>
              <span className="font-bold text-red-600">{metrics.tavrVolume}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">TEER Procedures</span>
              <span className="font-bold text-blue-600">{metrics.teerVolume}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Overall Success Rate</span>
              <span className="font-bold text-green-600">{(metrics.overallSuccessRate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructuralReferralNetworkVisualization;