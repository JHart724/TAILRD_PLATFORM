import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
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
  User,
  Heart,
  Battery,
  Wifi,
  Radio,
  Phone,
  Smartphone
} from 'lucide-react';

interface EPDeviceNetworkNode {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'home-health' | 'provider' | 'monitoring' | 'device-type' | 'patient-group' | 'outcome' | 'anticoag-clinic' | 'emergency-dept';
  specialty?: string;
  patientVolume?: number;
  devicePerformance?: number;
  adherenceRate?: number;
  responseTime?: number; // in hours
  alertVolume?: number;
  connectionStrength: number;
  x: number;
  y: number;
  color: string;
  isHighRisk?: boolean;
  status?: 'active' | 'busy' | 'available' | 'critical';
  batteryStatus?: 'good' | 'warning' | 'critical';
}

interface EPDeviceNetworkConnection {
  from: string;
  to: string;
  strength: number;
  type: 'device-flow' | 'monitoring-pathway' | 'alert-response' | 'follow-up' | 'coordination' | 'anticoag-referral' | 'emergency-pathway';
  patientFlow: number;
  avgResponseTime?: number;
  alertType?: 'battery-eol' | 'lead-issue' | 'af-detection' | 'vt-episode' | 'device-malfunction';
  priority?: 'high' | 'medium' | 'routine';
}

interface EPDeviceMetrics {
  totalDevicePatients: number;
  remoteMonitoringAdherence: number;
  avgAlertResponseTime: number;
  devicePerformanceScore: number;
  anticoagulationCompliance: number;
  emergencyUtilizationReduction: number;
}

const EPDeviceNetworkVisualization: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<EPDeviceNetworkNode | null>(null);
  const [highlightConnections, setHighlightConnections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'device-flow' | 'monitoring-alerts' | 'anticoagulation' | 'emergency-response'>('device-flow');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every 30 seconds for real-time simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Generate EP device network data
  const nodes: EPDeviceNetworkNode[] = [
    // Healthcare Settings
    { 
      id: 'main-hospital', 
      name: 'Main Hospital EP Lab', 
      type: 'hospital', 
      patientVolume: 1247, 
      devicePerformance: 0.94, 
      responseTime: 1.2, 
      connectionStrength: 0.95, 
      x: 100, 
      y: 150, 
      color: '#059669',
      status: 'active'
    },
    { 
      id: 'device-clinic', 
      name: 'Device Clinic', 
      type: 'clinic', 
      patientVolume: 2847, 
      adherenceRate: 0.77, 
      responseTime: 4.5, 
      connectionStrength: 0.92, 
      x: 300, 
      y: 120, 
      color: '#0d9488',
      status: 'busy'
    },
    { 
      id: 'anticoag-clinic', 
      name: 'Anticoagulation Clinic', 
      type: 'anticoag-clinic', 
      patientVolume: 1234, 
      adherenceRate: 0.82, 
      responseTime: 24.0, 
      connectionStrength: 0.85, 
      x: 500, 
      y: 180, 
      color: '#0f766e',
      status: 'active'
    },
    { 
      id: 'emergency-dept', 
      name: 'Emergency Department', 
      type: 'emergency-dept', 
      patientVolume: 456, 
      responseTime: 0.5, 
      connectionStrength: 0.88, 
      x: 150, 
      y: 320, 
      color: '#dc2626',
      status: 'critical'
    },
    
    // Care Team Members
    { 
      id: 'ep-cardiologist', 
      name: 'Dr. Sarah Martinez', 
      type: 'provider', 
      specialty: 'EP Cardiologist', 
      patientVolume: 1894, 
      devicePerformance: 0.96, 
      responseTime: 1.8, 
      connectionStrength: 0.98, 
      x: 350, 
      y: 80, 
      color: '#16a34a',
      status: 'active'
    },
    { 
      id: 'device-tech', 
      name: 'Device Technician', 
      type: 'provider', 
      specialty: 'Device Programming', 
      patientVolume: 2847, 
      responseTime: 2.5, 
      connectionStrength: 0.94, 
      x: 450, 
      y: 100, 
      color: '#15803d',
      status: 'busy'
    },
    { 
      id: 'nurse-practitioner', 
      name: 'EP Nurse Practitioner', 
      type: 'provider', 
      specialty: 'Device Follow-up', 
      patientVolume: 1623, 
      responseTime: 3.2, 
      connectionStrength: 0.91, 
      x: 250, 
      y: 220, 
      color: '#166534',
      status: 'available'
    },
    { 
      id: 'pcp-network', 
      name: 'Primary Care Network', 
      type: 'provider', 
      specialty: 'Primary Care', 
      patientVolume: 3694, 
      responseTime: 72.0, 
      connectionStrength: 0.73, 
      x: 400, 
      y: 280, 
      color: '#14532d',
      status: 'active'
    },
    
    // Device Types
    { 
      id: 'icd-devices', 
      name: 'ICD Devices', 
      type: 'device-type', 
      patientVolume: 648, 
      devicePerformance: 0.97, 
      batteryStatus: 'good',
      connectionStrength: 0.95, 
      x: 200, 
      y: 50, 
      color: '#22c55e'
    },
    { 
      id: 'crt-d-devices', 
      name: 'CRT-D Devices', 
      type: 'device-type', 
      patientVolume: 423, 
      devicePerformance: 0.94, 
      batteryStatus: 'warning',
      connectionStrength: 0.92, 
      x: 350, 
      y: 40, 
      color: '#16a34a'
    },
    { 
      id: 'pacemaker-devices', 
      name: 'Pacemaker Devices', 
      type: 'device-type', 
      patientVolume: 1287, 
      devicePerformance: 0.98, 
      batteryStatus: 'good',
      connectionStrength: 0.89, 
      x: 500, 
      y: 60, 
      color: '#15803d'
    },
    { 
      id: 'loop-recorders', 
      name: 'Loop Recorders', 
      type: 'device-type', 
      patientVolume: 356, 
      devicePerformance: 0.92, 
      batteryStatus: 'good',
      connectionStrength: 0.86, 
      x: 550, 
      y: 120, 
      color: '#166534'
    },
    { 
      id: 'laac-devices', 
      name: 'LAAC Devices', 
      type: 'device-type', 
      patientVolume: 267, 
      devicePerformance: 0.96, 
      connectionStrength: 0.91, 
      x: 450, 
      y: 40, 
      color: '#14532d'
    },
    
    // Monitoring Systems
    { 
      id: 'remote-monitoring', 
      name: 'Remote Monitoring Center', 
      type: 'monitoring', 
      patientVolume: 2847, 
      adherenceRate: 0.77, 
      alertVolume: 1245,
      responseTime: 1.5, 
      connectionStrength: 0.96, 
      x: 50, 
      y: 250, 
      color: '#22c55e',
      status: 'active'
    },
    { 
      id: 'device-alerts', 
      name: 'Device Alert System', 
      type: 'monitoring', 
      alertVolume: 2156,
      responseTime: 0.8, 
      connectionStrength: 0.93, 
      x: 150, 
      y: 180, 
      color: '#16a34a',
      status: 'critical'
    },
    { 
      id: 'af-monitoring', 
      name: 'AF Detection System', 
      type: 'monitoring', 
      patientVolume: 1456, 
      alertVolume: 892,
      responseTime: 2.1, 
      connectionStrength: 0.88, 
      x: 350, 
      y: 200, 
      color: '#15803d'
    },
    
    // Patient Groups
    { 
      id: 'high-risk-devices', 
      name: 'High-Risk Device Patients', 
      type: 'patient-group', 
      patientVolume: 742, 
      devicePerformance: 0.89, 
      connectionStrength: 0.92, 
      x: 50, 
      y: 80, 
      color: '#dc2626',
      isHighRisk: true
    },
    { 
      id: 'af-patients', 
      name: 'AF Patients', 
      type: 'patient-group', 
      patientVolume: 1234, 
      adherenceRate: 0.82, 
      connectionStrength: 0.85, 
      x: 450, 
      y: 350, 
      color: '#ea580c'
    },
    { 
      id: 'battery-eol', 
      name: 'Battery EOL Patients', 
      type: 'patient-group', 
      patientVolume: 189, 
      connectionStrength: 0.96, 
      x: 300, 
      y: 380, 
      color: '#f59e0b',
      isHighRisk: true
    },
    { 
      id: 'lead-revision', 
      name: 'Lead Revision Patients', 
      type: 'patient-group', 
      patientVolume: 67, 
      connectionStrength: 0.89, 
      x: 150, 
      y: 380, 
      color: '#dc2626',
      isHighRisk: true
    },
    
    // Outcomes
    { 
      id: 'outcomes-center', 
      name: 'Device Outcomes Tracking', 
      type: 'outcome', 
      devicePerformance: 0.94, 
      adherenceRate: 0.77, 
      connectionStrength: 0.87, 
      x: 300, 
      y: 250, 
      color: '#059669'
    }
  ];

  const connections: EPDeviceNetworkConnection[] = [
    // Device implant to monitoring flow
    { 
      from: 'main-hospital', 
      to: 'device-clinic', 
      strength: 0.94, 
      type: 'device-flow', 
      patientFlow: 1247, 
      avgResponseTime: 24,
      priority: 'high'
    },
    { 
      from: 'device-clinic', 
      to: 'remote-monitoring', 
      strength: 0.92, 
      type: 'monitoring-pathway', 
      patientFlow: 2847, 
      avgResponseTime: 4.5,
      priority: 'high'
    },
    
    // Device-specific connections
    { 
      from: 'icd-devices', 
      to: 'remote-monitoring', 
      strength: 0.96, 
      type: 'monitoring-pathway', 
      patientFlow: 648, 
      alertType: 'vt-episode',
      priority: 'high'
    },
    { 
      from: 'crt-d-devices', 
      to: 'remote-monitoring', 
      strength: 0.94, 
      type: 'monitoring-pathway', 
      patientFlow: 423, 
      alertType: 'battery-eol',
      priority: 'medium'
    },
    { 
      from: 'pacemaker-devices', 
      to: 'remote-monitoring', 
      strength: 0.91, 
      type: 'monitoring-pathway', 
      patientFlow: 1287, 
      alertType: 'lead-issue',
      priority: 'medium'
    },
    { 
      from: 'loop-recorders', 
      to: 'af-monitoring', 
      strength: 0.89, 
      type: 'monitoring-pathway', 
      patientFlow: 356, 
      alertType: 'af-detection',
      priority: 'medium'
    },
    
    // Alert response pathways
    { 
      from: 'remote-monitoring', 
      to: 'device-alerts', 
      strength: 0.98, 
      type: 'alert-response', 
      patientFlow: 2156, 
      avgResponseTime: 1.5,
      priority: 'high'
    },
    { 
      from: 'device-alerts', 
      to: 'ep-cardiologist', 
      strength: 0.95, 
      type: 'alert-response', 
      patientFlow: 1894, 
      avgResponseTime: 1.8,
      priority: 'high'
    },
    { 
      from: 'device-alerts', 
      to: 'device-tech', 
      strength: 0.92, 
      type: 'alert-response', 
      patientFlow: 1456, 
      avgResponseTime: 2.5,
      priority: 'medium'
    },
    { 
      from: 'device-alerts', 
      to: 'emergency-dept', 
      strength: 0.88, 
      type: 'emergency-pathway', 
      patientFlow: 456, 
      avgResponseTime: 0.5,
      priority: 'high'
    },
    
    // AF and anticoagulation pathways
    { 
      from: 'af-monitoring', 
      to: 'anticoag-clinic', 
      strength: 0.87, 
      type: 'anticoag-referral', 
      patientFlow: 1234, 
      avgResponseTime: 24.0,
      priority: 'high'
    },
    { 
      from: 'af-patients', 
      to: 'anticoag-clinic', 
      strength: 0.82, 
      type: 'anticoag-referral', 
      patientFlow: 1234, 
      avgResponseTime: 48.0,
      priority: 'medium'
    },
    { 
      from: 'laac-devices', 
      to: 'af-patients', 
      strength: 0.91, 
      type: 'device-flow', 
      patientFlow: 267,
      priority: 'routine'
    },
    
    // High-risk patient pathways
    { 
      from: 'high-risk-devices', 
      to: 'remote-monitoring', 
      strength: 0.97, 
      type: 'monitoring-pathway', 
      patientFlow: 742, 
      avgResponseTime: 0.5,
      priority: 'high'
    },
    { 
      from: 'high-risk-devices', 
      to: 'ep-cardiologist', 
      strength: 0.95, 
      type: 'alert-response', 
      patientFlow: 742, 
      avgResponseTime: 1.8,
      priority: 'high'
    },
    
    // Battery and lead management
    { 
      from: 'battery-eol', 
      to: 'main-hospital', 
      strength: 0.96, 
      type: 'device-flow', 
      patientFlow: 189, 
      avgResponseTime: 168.0,
      priority: 'high'
    },
    { 
      from: 'lead-revision', 
      to: 'main-hospital', 
      strength: 0.89, 
      type: 'device-flow', 
      patientFlow: 67, 
      avgResponseTime: 24.0,
      priority: 'high'
    },
    
    // Care coordination
    { 
      from: 'ep-cardiologist', 
      to: 'nurse-practitioner', 
      strength: 0.94, 
      type: 'coordination', 
      patientFlow: 1623, 
      avgResponseTime: 3.2,
      priority: 'medium'
    },
    { 
      from: 'nurse-practitioner', 
      to: 'pcp-network', 
      strength: 0.78, 
      type: 'coordination', 
      patientFlow: 3694, 
      avgResponseTime: 72.0,
      priority: 'routine'
    },
    { 
      from: 'device-tech', 
      to: 'device-clinic', 
      strength: 0.91, 
      type: 'follow-up', 
      patientFlow: 2847, 
      avgResponseTime: 4.5,
      priority: 'routine'
    },
    
    // Outcomes tracking
    { 
      from: 'ep-cardiologist', 
      to: 'outcomes-center', 
      strength: 0.94, 
      type: 'coordination', 
      patientFlow: 1894,
      priority: 'routine'
    },
    { 
      from: 'remote-monitoring', 
      to: 'outcomes-center', 
      strength: 0.89, 
      type: 'monitoring-pathway', 
      patientFlow: 2847,
      priority: 'routine'
    },
    { 
      from: 'anticoag-clinic', 
      to: 'outcomes-center', 
      strength: 0.85, 
      type: 'coordination', 
      patientFlow: 1234,
      priority: 'routine'
    }
  ];

  // Calculate metrics
  const metrics: EPDeviceMetrics = {
    totalDevicePatients: 3694,
    remoteMonitoringAdherence: 0.77, // 77% adherence
    avgAlertResponseTime: 2.3, // hours
    devicePerformanceScore: 0.94,
    anticoagulationCompliance: 0.82,
    emergencyUtilizationReduction: 0.31 // 31% reduction
  };

  const getNodeSize = (node: EPDeviceNetworkNode) => {
    const baseSize = 8;
    const volume = node.patientVolume || node.alertVolume || 0;
    const scaleFactor = volume / 500;
    return Math.max(baseSize, Math.min(baseSize + scaleFactor * 15, 30));
  };

  const getConnectionOpacity = (connection: EPDeviceNetworkConnection) => {
    if (connection.priority === 'high') return 1.0;
    if (connection.priority === 'medium') return 0.8;
    return Math.max(0.3, connection.strength * 0.7);
  };

  const getConnectionWidth = (connection: EPDeviceNetworkConnection) => {
    const baseWidth = connection.priority === 'high' ? 3 : 1;
    return Math.max(baseWidth, connection.patientFlow / 200);
  };

  const getConnectionColor = (connection: EPDeviceNetworkConnection) => {
    switch (connection.type) {
      case 'device-flow': return '#059669';
      case 'monitoring-pathway': return '#16a34a';
      case 'alert-response': return '#dc2626';
      case 'emergency-pathway': return '#b91c1c';
      case 'anticoag-referral': return '#ea580c';
      case 'coordination': return '#0d9488';
      case 'follow-up': return '#15803d';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = (node: EPDeviceNetworkNode) => {
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
        totalDevicePatients: metrics.totalDevicePatients,
        remoteMonitoringAdherence: metrics.remoteMonitoringAdherence
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ep-device-network-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeStatusIndicator = (node: EPDeviceNetworkNode) => {
    if (!node.status) return null;
    const colors = {
      active: '#22c55e',
      busy: '#f59e0b',
      available: '#6b7280',
      critical: '#dc2626'
    };
    return colors[node.status];
  };

  const getBatteryStatusColor = (status?: string) => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'warning': return '#f59e0b';
      case 'critical': return '#dc2626';
      default: return null;
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'hospital': return Building2;
      case 'clinic': return Stethoscope;
      case 'anticoag-clinic': return Pill;
      case 'emergency-dept': return AlertTriangle;
      case 'provider': return User;
      case 'monitoring': return Monitor;
      case 'device-type': return Zap;
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
          <h3 className="text-2xl font-bold text-steel-900">EP Device Clinic Network</h3>
          <p className="text-steel-600">Real-time device monitoring and care coordination pathways</p>
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
              <option value="device-flow">Device Flow Analysis</option>
              <option value="monitoring-alerts">Monitoring & Alerts</option>
              <option value="anticoagulation">Anticoagulation Management</option>
              <option value="emergency-response">Emergency Response</option>
            </select>
          </div>
          
          <button
            onClick={exportNetworkData}
            className="p-2 rounded-lg bg-medical-green-100 text-medical-green-700 hover:bg-medical-green-200 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Zap className={`w-6 h-6 ${metrics.devicePerformanceScore >= 0.9 ? 'text-medical-green-600' : 'text-red-600'}`} />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.devicePerformanceScore * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Device Performance</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.remoteMonitoringAdherence * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Monitor Adherence</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-orange-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.avgAlertResponseTime.toFixed(1)}h</div>
              <div className="text-xs text-steel-600">Alert Response</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Pill className="w-6 h-6 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.anticoagulationCompliance * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">Anticoag Compliance</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-green-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{(metrics.emergencyUtilizationReduction * 100).toFixed(0)}%</div>
              <div className="text-xs text-steel-600">ED Reduction</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-steel-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-medical-green-600" />
            <div>
              <div className="text-lg font-bold text-steel-900">{metrics.totalDevicePatients.toLocaleString()}</div>
              <div className="text-xs text-steel-600">Device Patients</div>
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
            className="border border-steel-100 rounded-lg bg-gradient-to-br from-green-50 to-white"
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
                      className="text-xs fill-medical-green-700 font-bold"
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
              const batteryColor = getBatteryStatusColor(node.batteryStatus);
              
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
                  
                  {/* Battery status indicator */}
                  {batteryColor && (
                    <circle
                      cx={node.x + nodeSize - 3}
                      cy={node.y + nodeSize - 3}
                      r="3"
                      fill={batteryColor}
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
                  
                  {/* Performance indicator */}
                  {(node.devicePerformance || node.adherenceRate) && (
                    <text
                      x={node.x}
                      y={node.y + 3}
                      textAnchor="middle"
                      className="text-xs fill-white font-bold"
                      style={{ fontSize: '8px' }}
                    >
                      {node.devicePerformance ? `${(node.devicePerformance * 100).toFixed(0)}%` : `${(node.adherenceRate! * 100).toFixed(0)}%`}
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
                <div className="w-4 h-1 bg-medical-green-600"></div>
                <span>Device Flow (High Priority)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-red-600"></div>
                <span>Alert Response</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-orange-600"></div>
                <span>Anticoagulation Referral</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-teal-600"></div>
                <span>Care Coordination</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span>High-Risk Patients</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Good Battery</span>
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>EOL Warning</span>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Critical</span>
              </div>
            </div>
          </div>
        </div>

        {/* Node Details Panel */}
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-medical-green-600" />
            Device Network Details
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
                    selectedNode.status === 'critical' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedNode.status.toUpperCase()}
                  </div>
                )}
                {selectedNode.batteryStatus && (
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ml-2 ${
                    selectedNode.batteryStatus === 'good' ? 'bg-green-100 text-green-700' :
                    selectedNode.batteryStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {selectedNode.batteryStatus.toUpperCase()} BATTERY
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {selectedNode.patientVolume && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{selectedNode.patientVolume}</div>
                    <div className="text-xs text-blue-700">Patient Volume</div>
                  </div>
                )}
                {selectedNode.devicePerformance && (
                  <div className={`p-3 rounded-lg ${selectedNode.devicePerformance >= 0.9 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.devicePerformance >= 0.9 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {(selectedNode.devicePerformance * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${selectedNode.devicePerformance >= 0.9 ? 'text-green-700' : 'text-yellow-700'}`}>
                      Device Performance
                    </div>
                  </div>
                )}
                {selectedNode.adherenceRate && (
                  <div className={`p-3 rounded-lg ${selectedNode.adherenceRate >= 0.8 ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <div className={`text-lg font-bold ${selectedNode.adherenceRate >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {(selectedNode.adherenceRate * 100).toFixed(0)}%
                    </div>
                    <div className={`text-xs ${selectedNode.adherenceRate >= 0.8 ? 'text-green-700' : 'text-yellow-700'}`}>
                      Adherence Rate
                    </div>
                  </div>
                )}
                {selectedNode.responseTime && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {selectedNode.responseTime < 24 ? `${selectedNode.responseTime}h` : `${(selectedNode.responseTime / 24).toFixed(1)}d`}
                    </div>
                    <div className="text-xs text-purple-700">Response Time</div>
                  </div>
                )}
                {selectedNode.alertVolume && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-lg font-bold text-orange-600">{selectedNode.alertVolume}</div>
                    <div className="text-xs text-orange-700">Alert Volume</div>
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
                            {conn.alertType && (
                              <span className="text-xs px-1 bg-red-100 text-red-600 rounded">
                                {conn.alertType.replace('-', ' ')}
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
              <p className="text-sm">Click on a node to view device pathway details and performance metrics</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-medical-green-600" />
            Device Performance
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Overall Performance</span>
              <span className={`font-bold ${metrics.devicePerformanceScore >= 0.9 ? 'text-green-600' : 'text-red-600'}`}>
                {(metrics.devicePerformanceScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">ICD Performance</span>
              <span className="font-bold text-green-600">97%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Pacemaker Performance</span>
              <span className="font-bold text-green-600">98%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">CRT-D Performance</span>
              <span className="font-bold text-yellow-600">94%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            Remote Monitoring
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Adherence Rate</span>
              <span className="font-bold text-blue-600">{(metrics.remoteMonitoringAdherence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Avg Alert Response</span>
              <span className="font-bold text-orange-600">{metrics.avgAlertResponseTime.toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Active Patients</span>
              <span className="font-bold text-green-600">2,847</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Daily Alerts</span>
              <span className="font-bold text-purple-600">156</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h4 className="font-semibold text-steel-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            Clinical Outcomes
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Anticoag Compliance</span>
              <span className="font-bold text-green-600">{(metrics.anticoagulationCompliance * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">ED Utilization ↓</span>
              <span className="font-bold text-green-600">{(metrics.emergencyUtilizationReduction * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Device Patients</span>
              <span className="font-bold text-blue-600">{metrics.totalDevicePatients.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-steel-600">Stroke Prevention</span>
              <span className="font-bold text-green-600">94.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPDeviceNetworkVisualization;