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
  Shield
} from 'lucide-react';

interface PCINetworkNode {
  id: string;
  name: string;
  type: 'provider' | 'cath-lab' | 'emergency' | 'pathway' | 'patient-group' | 'outcome';
  specialty?: string;
  pciVolume?: number;
  doorToBalloonTime?: number; // in minutes
  syntaxScore?: number;
  successRate?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isEmergency?: boolean;
  status?: 'active' | 'busy' | 'available';
}

interface PCINetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'stemi-pathway' | 'nstemi-pathway' | 'referral' | 'transfer' | 'collaboration' | 'emergency';
  patientFlow: number;
  avgDoorToBalloon?: number;
  procedureType?: 'primary-pci' | 'elective-pci' | 'complex-pci' | 'cto' | 'protected-pci';
  urgency?: 'stat' | 'urgent' | 'elective';
}

interface PCIMetrics {
  doorToBalloonCompliance: number;
  stemiFmiTime: number;
  cathLabUtilization: number;
  complexPciSuccessRate: number;
  averageSyntaxScore: number;
  totalPciVolume: number;
}

const PCINetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<PCINetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'real-time' | 'pathways' | 'outcomes' | 'scheduling'>('real-time');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate PCI network data
  const nodes: PCINetworkNode[] = [
    // Providers
    { 
      id: 'interventional-1', 
      name: 'Dr. Sarah Chen', 
      type: 'provider', 
      specialty: 'Interventional Cardiology', 
      pciVolume: 340, 
      doorToBalloonTime: 78, 
      successRate: 0.96, 
      connectionStrength: 0.95, 
      x: 200, 
      y: 120, 
      color: '#dc2626',
      status: 'active'
    },
    { 
      id: 'interventional-2', 
      name: 'Dr. Michael Torres', 
      type: 'provider', 
      specialty: 'Interventional Cardiology', 
      pciVolume: 280, 
      doorToBalloonTime: 85, 
      successRate: 0.94, 
      connectionStrength: 0.88, 
      x: 450, 
      y: 100, 
      color: '#2563eb',
      status: 'busy'
    },
    { 
      id: 'interventional-3', 
      name: 'Dr. Jennifer Kim', 
      type: 'provider', 
      specialty: 'Complex PCI/CTO', 
      pciVolume: 156, 
      doorToBalloonTime: 72, 
      successRate: 0.91, 
      connectionStrength: 0.85, 
      x: 350, 
      y: 280, 
      color: '#7c3aed',
      status: 'available'
    },
    
    // Cath Labs
    { 
      id: 'cath-lab-1', 
      name: 'Cath Lab A', 
      type: 'cath-lab', 
      pciVolume: 420, 
      connectionStrength: 0.92, 
      x: 500, 
      y: 180, 
      color: '#059669',
      status: 'active'
    },
    { 
      id: 'cath-lab-2', 
      name: 'Cath Lab B', 
      type: 'cath-lab', 
      pciVolume: 380, 
      connectionStrength: 0.89, 
      x: 150, 
      y: 220, 
      color: '#0891b2',
      status: 'busy'
    },
    
    // Emergency Pathways
    { 
      id: 'stemi-pathway', 
      name: 'STEMI Pathway', 
      type: 'pathway', 
      pciVolume: 189, 
      doorToBalloonTime: 75, 
      connectionStrength: 0.98, 
      x: 100, 
      y: 80, 
      color: '#dc2626',
      isEmergency: true
    },
    { 
      id: 'nstemi-pathway', 
      name: 'NSTEMI Pathway', 
      type: 'pathway', 
      pciVolume: 267, 
      doorToBalloonTime: 145, 
      connectionStrength: 0.85, 
      x: 550, 
      y: 280, 
      color: '#ea580c'
    },
    
    // Emergency Services
    { 
      id: 'ed', 
      name: 'Emergency Dept', 
      type: 'emergency', 
      pciVolume: 89, 
      connectionStrength: 0.87, 
      x: 50, 
      y: 150, 
      color: '#b91c1c',
      isEmergency: true
    },
    { 
      id: 'ems', 
      name: 'EMS/Transport', 
      type: 'emergency', 
      pciVolume: 134, 
      connectionStrength: 0.82, 
      x: 50, 
      y: 250, 
      color: '#991b1b',
      isEmergency: true
    },
    
    // Patient Groups
    { 
      id: 'stemi-patients', 
      name: 'STEMI Patients', 
      type: 'patient-group', 
      pciVolume: 189, 
      syntaxScore: 18.5, 
      connectionStrength: 0.73, 
      x: 300, 
      y: 50, 
      color: '#be123c'
    },
    { 
      id: 'nstemi-patients', 
      name: 'NSTEMI Patients', 
      type: 'patient-group', 
      pciVolume: 267, 
      syntaxScore: 24.8, 
      connectionStrength: 0.68, 
      x: 450, 
      y: 350, 
      color: '#1d4ed8'
    },
    { 
      id: 'complex-pci', 
      name: 'Complex PCI', 
      type: 'patient-group', 
      pciVolume: 98, 
      syntaxScore: 35.2, 
      connectionStrength: 0.58, 
      x: 200, 
      y: 380, 
      color: '#7c2d12'
    },
    
    // Outcomes
    { 
      id: 'outcomes-center', 
      name: 'Outcomes Tracking', 
      type: 'outcome', 
      successRate: 0.94, 
      connectionStrength: 0.85, 
      x: 350, 
      y: 180, 
      color: '#166534'
    }
  ];

  const connections: PCINetworkConnection[] = [
    // Emergency pathways
    { 
      from: 'ed', 
      to: 'stemi-pathway', 
      strength: 0.95, 
      type: 'emergency', 
      patientFlow: 45, 
      avgDoorToBalloon: 68,
      procedureType: 'primary-pci',
      urgency: 'stat'
    },
    { 
      from: 'ems', 
      to: 'stemi-pathway', 
      strength: 0.92, 
      type: 'emergency', 
      patientFlow: 67, 
      avgDoorToBalloon: 58,
      procedureType: 'primary-pci',
      urgency: 'stat'
    },
    
    // STEMI pathway connections
    { 
      from: 'stemi-pathway', 
      to: 'interventional-1', 
      strength: 0.98, 
      type: 'stemi-pathway', 
      patientFlow: 89, 
      avgDoorToBalloon: 75,
      procedureType: 'primary-pci',
      urgency: 'stat'
    },
    { 
      from: 'stemi-pathway', 
      to: 'cath-lab-1', 
      strength: 0.96, 
      type: 'stemi-pathway', 
      patientFlow: 89, 
      avgDoorToBalloon: 72,
      procedureType: 'primary-pci',
      urgency: 'stat'
    },
    
    // NSTEMI pathway connections
    { 
      from: 'nstemi-pathway', 
      to: 'interventional-2', 
      strength: 0.85, 
      type: 'nstemi-pathway', 
      patientFlow: 134, 
      avgDoorToBalloon: 145,
      procedureType: 'elective-pci',
      urgency: 'urgent'
    },
    { 
      from: 'nstemi-pathway', 
      to: 'cath-lab-2', 
      strength: 0.87, 
      type: 'nstemi-pathway', 
      patientFlow: 133, 
      avgDoorToBalloon: 142,
      procedureType: 'elective-pci',
      urgency: 'urgent'
    },
    
    // Complex PCI connections
    { 
      from: 'complex-pci', 
      to: 'interventional-3', 
      strength: 0.95, 
      type: 'referral', 
      patientFlow: 78, 
      avgDoorToBalloon: 180,
      procedureType: 'complex-pci',
      urgency: 'elective'
    },
    { 
      from: 'interventional-3', 
      to: 'cath-lab-1', 
      strength: 0.88, 
      type: 'collaboration', 
      patientFlow: 67, 
      avgDoorToBalloon: 165,
      procedureType: 'cto',
      urgency: 'elective'
    },
    
    // Provider collaborations
    { 
      from: 'interventional-1', 
      to: 'interventional-2', 
      strength: 0.82, 
      type: 'collaboration', 
      patientFlow: 23, 
      procedureType: 'complex-pci',
      urgency: 'urgent'
    },
    { 
      from: 'interventional-2', 
      to: 'interventional-3', 
      strength: 0.75, 
      type: 'collaboration', 
      patientFlow: 18, 
      procedureType: 'protected-pci',
      urgency: 'elective'
    },
    
    // Outcomes tracking
    { 
      from: 'interventional-1', 
      to: 'outcomes-center', 
      strength: 0.96, 
      type: 'collaboration', 
      patientFlow: 340,
      urgency: 'elective'
    },
    { 
      from: 'interventional-2', 
      to: 'outcomes-center', 
      strength: 0.94, 
      type: 'collaboration', 
      patientFlow: 280,
      urgency: 'elective'
    },
    { 
      from: 'interventional-3', 
      to: 'outcomes-center', 
      strength: 0.91, 
      type: 'collaboration', 
      patientFlow: 156,
      urgency: 'elective'
    }
  ];

  // Calculate metrics
  const metrics: PCIMetrics = {
    doorToBalloonCompliance: 0.87, // 87% under 90 minutes
    stemiFmiTime: 26, // minutes
    cathLabUtilization: 0.78,
    complexPciSuccessRate: 0.91,
    averageSyntaxScore: 24.3,
    totalPciVolume: connections.reduce((sum, c) => sum + c.patientFlow, 0)
  };

  const getNodeSize = (node: PCINetworkNode) => {
    const baseSize = 8;
    const volume = node.pciVolume || 0;
    const scaleFactor = volume / 200;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 15, 30));
  };

  const getConnectionOpacity = (connection: PCINetworkConnection) => {
    if (connection.urgency === 'stat') return 1.0;
    if (connection.urgency === 'urgent') return 0.8;
    return Math.max(0.2, connection.strength * 0.7);
  };

  const getConnectionWidth = (connection: PCINetworkConnection) => {
    const baseWidth = connection.urgency === 'stat' ? 3 : 1;
    return Math.max(baseWidth, connection.patientFlow / 25);
  };

  const getConnectionColor = (connection: PCINetworkConnection) => {
    switch (connection.type) {
      case 'stemi-pathway': return '#dc2626';
      case 'nstemi-pathway': return '#ea580c';
      case 'emergency': return '#b91c1c';
      case 'referral': return '#059669';
      case 'collaboration': return '#2563eb';
      case 'transfer': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = (node: PCINetworkNode) => {
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
        totalPciVolume: metrics.totalPciVolume,
        doorToBalloonCompliance: metrics.doorToBalloonCompliance
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pci-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: PCINetworkNode) => {
    if (!node.status) return null;
    const colors = {
      active: '#22c55e',
      busy: '#f59e0b',
      available: '#6b7280'
    };
    return colors[node.status];
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-steel-900">PCI Network Visualization</h3>
          <p className="text-steel-600">Real-time coronary intervention pathways and door-to-balloon optimization</p>
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
              <option value="real-time">Real-Time Flow</option>
              <option value="pathways">Pathway Analysis</option>
              <option value="outcomes">Outcomes Tracking</option>
              <option value="scheduling">Lab Scheduling</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-amber-100 text-medical-amber-700 hover:bg-medical-amber-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Timer className={`w-6 h-6 ${metrics.doorToBalloonCompliance >= 0.85 ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.doorToBalloonCompliance * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">D2B &lt;90min</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-red-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.stemiFmiTime}min</div>
              <div className="text-xs text-steel-600">STEMI FMC-I</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.cathLabUtilization * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Lab Utilization</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.complexPciSuccessRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Complex PCI</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.averageSyntaxScore.toFixed(1)}</div>
              <div className="text-xs text-steel-600">Avg SYNTAX</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.totalPciVolume}</div>
              <div className="text-xs text-steel-600">Total Volume</div>
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
            className="border border-steel-100 rounded-lg bg-gradient-to-br from-slate-50 to-white"
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
                    strokeDasharray={connection.urgency === 'stat' ? 'none' : connection.urgency === 'urgent' ? '8,4' : '4,4'}
                  />
                  
                  {/* Connection labels for emergency pathways */}
                  {connection.urgency === 'stat' && connection.avgDoorToBalloon && (
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 8}
                      textAnchor="middle"
                      className="text-xs fill-red-700 font-bold"
                      style={{ fontSize: '10px' }}
                    >
                      {connection.avgDoorToBalloon}min
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
                  
                  {/* Emergency indicator */}
                  {node.isEmergency && (
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
                  
                  {/* Door-to-balloon time or volume indicator */}
                  {(node.doorToBalloonTime || node.pciVolume) && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.doorToBalloonTime ? `${node.doorToBalloonTime}m` : node.pciVolume}
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
                <span>STEMI Pathway (STAT)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-orange-600" style={{ background: 'repeating-linear-gradient(90deg, #ea580c, #ea580c 4px, transparent 4px, transparent 8px)' }}></div>
                <span>NSTEMI Pathway (Urgent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-600"></div>
                <span>Referrals</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-600"></div>
                <span>Collaborations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span>Emergency Services</span>
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
            <Heart className="w-5 h-5 text-medical-amber-600" />
            PCI Network Details
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
                {selectedNode.pciVolume && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{selectedNode.pciVolume}</div>
                    <div className="text-xs text-blue-700">PCI Volume</div>
                  </div>
                )}
                {selectedNode.doorToBalloonTime && (
                  <div className={`p-3 rounded-lg ${selectedNode.doorToBalloonTime <= 90 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.doorToBalloonTime <= 90 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedNode.doorToBalloonTime}min
                    </div>
                    <div className={`text-xs ${selectedNode.doorToBalloonTime <= 90 ? 'text-green-700' : 'text-red-700'}`}>
                      Door-to-Balloon
                    </div>
                  </div>
                )}
                {selectedNode.successRate && (
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-emerald-600">{(selectedNode.successRate * 100).toFixed(0)}%</div>
                    <div className="text-xs text-emerald-700">Success Rate</div>
                  </div>
                )}
                {selectedNode.syntaxScore && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{selectedNode.syntaxScore}</div>
                    <div className="text-xs text-orange-700">SYNTAX Score</div>
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
                            {conn.avgDoorToBalloon && (
                              <span className={`text-xs px-1 rounded ${conn.avgDoorToBalloon <= 90 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {conn.avgDoorToBalloon}m
                              </span>
                            )}
                            {conn.urgency === 'stat' && (
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
              <p className="text-sm">Click on a node to view PCI pathway details and performance metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Quality Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Door-to-Balloon &lt;90min</span>
              <span className={`font-bold ${metrics.doorToBalloonCompliance >= 0.85 ? 'text-green-600' : 'text-red-600'}`}>
                {(metrics.doorToBalloonCompliance * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Complex PCI Success</span>
              <span className="font-bold text-blue-600">{(metrics.complexPciSuccessRate * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Average SYNTAX Score</span>
              <span className="font-bold text-orange-600">{metrics.averageSyntaxScore.toFixed(1)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Cath Lab Efficiency
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Current Utilization</span>
              <span className="font-bold text-blue-600">{(metrics.cathLabUtilization * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">STEMI FMC-to-Device</span>
              <span className="font-bold text-red-600">{metrics.stemiFmiTime} min</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Daily Volume</span>
              <span className="font-bold text-purple-600">{Math.floor(metrics.totalPciVolume / 30)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Provider Network
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Active Interventionalists</span>
              <span className="font-bold text-purple-600">{nodes.filter(n => n.type === 'provider').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Available Cath Labs</span>
              <span className="font-bold text-green-600">{nodes.filter(n => n.type === 'cath-lab').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Emergency Pathways</span>
              <span className="font-bold text-red-600">{nodes.filter(n => n.isEmergency).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PCINetworkVisualization;