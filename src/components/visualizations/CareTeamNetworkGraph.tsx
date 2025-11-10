import React, { useState, useEffect, useRef } from 'react';
import { Users, Stethoscope, Heart, Building, Phone, Mail, Download, Settings } from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  type: 'provider' | 'department' | 'service' | 'patient-group';
  specialty?: string;
  patientCount?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
}

interface NetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'referral' | 'collaboration' | 'consultation' | 'transfer';
  patientFlow: number;
}

const CareTeamNetworkGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'providers' | 'departments' | 'referrals'>('providers');
  
  // Generate network data
  const nodes: NetworkNode[] = [
    // Providers
    { id: 'sw', name: 'Dr. Sarah Williams', type: 'provider', specialty: 'Cardiology', patientCount: 89, connectionStrength: 0.95, x: 200, y: 150, color: '#ef4444' },
    { id: 'mc', name: 'Dr. Michael Chen', type: 'provider', specialty: 'Cardiology', patientCount: 127, connectionStrength: 0.88, x: 350, y: 100, color: '#3b82f6' },
    { id: 'jm', name: 'Dr. Jennifer Martinez', type: 'provider', specialty: 'Internal Medicine', patientCount: 203, connectionStrength: 0.67, x: 150, y: 300, color: '#10b981' },
    { id: 'rt', name: 'Dr. Robert Thompson', type: 'provider', specialty: 'Cardiology', patientCount: 156, connectionStrength: 0.85, x: 400, y: 250, color: '#8b5cf6' },
    { id: 'lp', name: 'Dr. Lisa Park', type: 'provider', specialty: 'Internal Medicine', patientCount: 178, connectionStrength: 0.71, x: 300, y: 350, color: '#f59e0b' },
    
    // Departments
    { id: 'cardio', name: 'Cardiology', type: 'department', patientCount: 372, connectionStrength: 0.92, x: 500, y: 150, color: '#dc2626' },
    { id: 'internal', name: 'Internal Medicine', type: 'department', patientCount: 381, connectionStrength: 0.69, x: 100, y: 200, color: '#059669' },
    { id: 'pharmacy', name: 'Pharmacy', type: 'service', patientCount: 753, connectionStrength: 0.78, x: 250, y: 50, color: '#7c3aed' },
    { id: 'lab', name: 'Laboratory', type: 'service', patientCount: 650, connectionStrength: 0.82, x: 450, y: 350, color: '#ea580c' },
    
    // Patient Groups
    { id: 'hfref', name: 'HFrEF Patients', type: 'patient-group', patientCount: 847, connectionStrength: 0.73, x: 550, y: 200, color: '#be123c' },
    { id: 'hfpef', name: 'HFpEF Patients', type: 'patient-group', patientCount: 298, connectionStrength: 0.65, x: 350, y: 400, color: '#1d4ed8' },
    { id: 'hfmref', name: 'HFmrEF Patients', type: 'patient-group', patientCount: 102, connectionStrength: 0.58, x: 150, y: 100, color: '#7c2d12' }
  ];

  const connections: NetworkConnection[] = [
    // Provider to Provider
    { from: 'sw', to: 'mc', strength: 0.8, type: 'collaboration', patientFlow: 23 },
    { from: 'sw', to: 'rt', strength: 0.7, type: 'consultation', patientFlow: 18 },
    { from: 'jm', to: 'sw', strength: 0.9, type: 'referral', patientFlow: 45 },
    { from: 'jm', to: 'mc', strength: 0.6, type: 'referral', patientFlow: 31 },
    { from: 'lp', to: 'rt', strength: 0.7, type: 'referral', patientFlow: 28 },
    
    // Provider to Department
    { from: 'sw', to: 'cardio', strength: 1.0, type: 'collaboration', patientFlow: 89 },
    { from: 'mc', to: 'cardio', strength: 1.0, type: 'collaboration', patientFlow: 127 },
    { from: 'rt', to: 'cardio', strength: 1.0, type: 'collaboration', patientFlow: 156 },
    { from: 'jm', to: 'internal', strength: 1.0, type: 'collaboration', patientFlow: 203 },
    { from: 'lp', to: 'internal', strength: 1.0, type: 'collaboration', patientFlow: 178 },
    
    // Provider to Services
    { from: 'sw', to: 'pharmacy', strength: 0.85, type: 'consultation', patientFlow: 76 },
    { from: 'mc', to: 'pharmacy', strength: 0.82, type: 'consultation', patientFlow: 104 },
    { from: 'sw', to: 'lab', strength: 0.75, type: 'consultation', patientFlow: 67 },
    { from: 'rt', to: 'lab', strength: 0.78, type: 'consultation', patientFlow: 122 },
    
    // Provider to Patient Groups
    { from: 'sw', to: 'hfref', strength: 0.9, type: 'collaboration', patientFlow: 67 },
    { from: 'mc', to: 'hfref', strength: 0.85, type: 'collaboration', patientFlow: 89 },
    { from: 'sw', to: 'hfpef', strength: 0.7, type: 'collaboration', patientFlow: 22 },
    { from: 'jm', to: 'hfpef', strength: 0.6, type: 'referral', patientFlow: 78 }
  ];

  const getNodeSize = (node: NetworkNode) => {
    const baseSize = 8;
    const scaleFactor = (node.patientCount || 0) / 200;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 15, 25));
  };

  const getConnectionOpacity = (connection: NetworkConnection) => {
    return Math.max(0.1, connection.strength * 0.8);
  };

  const getConnectionWidth = (connection: NetworkConnection) => {
    return Math.max(1, connection.patientFlow / 20);
  };

  const handleNodeClick = (node: NetworkNode) => {
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
      summary: {
        totalNodes: nodes.length,
        totalConnections: connections.length,
        avgConnectionStrength: connections.reduce((sum, c) => sum + c.strength, 0) / connections.length,
        totalPatientFlow: connections.reduce((sum, c) => sum + c.patientFlow, 0)
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-team-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-steel-900">Care Team Network Analysis</h3>
          <p className="text-steel-600">Interactive visualization of provider relationships and patient flow patterns</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-steel-600" />
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-1 border border-steel-300 rounded-lg text-sm"
            >
              <option value="providers">Provider Network</option>
              <option value="departments">Department Flow</option>
              <option value="referrals">Referral Patterns</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-blue-100 text-medical-blue-700 hover:bg-medical-blue-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
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
                <line
                  key={index}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={connection.type === 'referral' ? '#10b981' : connection.type === 'collaboration' ? '#3b82f6' : '#f59e0b'}
                  strokeWidth={isHighlighted ? getConnectionWidth(connection) * 2 : getConnectionWidth(connection)}
                  opacity={isHighlighted ? 1 : getConnectionOpacity(connection)}
                  strokeDasharray={connection.type === 'consultation' ? '5,5' : 'none'}
                />
              );
            })}
            
            {/* Render nodes */}
            {nodes.map((node) => {
              const isHighlighted = highlightConnections.includes(node.id) || selectedNode?.id === node.id;
              const nodeSize = getNodeSize(node);
              
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
                  
                  {/* Patient count indicator */}
                  {node.patientCount && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.patientCount > 100 ? `${Math.round(node.patientCount / 10) * 10}` : node.patientCount}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span>Referrals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Collaborations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-yellow-500" style={{ background: 'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 3px, transparent 3px, transparent 6px)' }}></div>
              <span>Consultations</span>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-medical-blue-600" />
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
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{selectedNode.patientCount || 0}</div>
                  <div className="text-xs text-blue-700">Patients</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="text-lg font-bold text-emerald-600">{(selectedNode.connectionStrength * 100).toFixed(0)}%</div>
                  <div className="text-xs text-emerald-700">Connection</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-steel-700 mb-2">Connected to:</div>
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
                          <span className="text-steel-500">{conn.patientFlow} pts</span>
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
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Click on a node to view details and connections</p>
            </div>
          )}
        </div>
      </div>

      {/* Network Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-steel-900">{nodes.filter(n => n.type === 'provider').length}</div>
              <div className="text-sm text-steel-600">Active Providers</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Building className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-steel-900">{nodes.filter(n => n.type === 'department').length + nodes.filter(n => n.type === 'service').length}</div>
              <div className="text-sm text-steel-600">Departments & Services</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-steel-900">{connections.reduce((sum, c) => sum + c.patientFlow, 0)}</div>
              <div className="text-sm text-steel-600">Total Patient Flow</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Phone className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold text-steel-900">{connections.length}</div>
              <div className="text-sm text-steel-600">Active Connections</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareTeamNetworkGraph;