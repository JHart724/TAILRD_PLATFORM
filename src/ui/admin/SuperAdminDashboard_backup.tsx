import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  BarChart3, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Settings,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Search,
  Zap,
  Database,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Send,
  UserCheck,
  Key,
  Globe,
  Copy,
  RefreshCw,
  Calendar,
  Phone,
  MapPin,
  FileText,
  HelpCircle,
  Wifi,
  WifiOff,
  AlertCircle,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  MonitorSpeaker,
  RotateCcw,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Trash,
  Archive,
  FolderOpen,
  Terminal,
  Code
} from 'lucide-react';

// API utility functions for backend integration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const apiCall = async (endpoint: string, options: any = {}) => {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success ? data : { data: data }; // Handle both wrapped and unwrapped responses
  } catch (error) {
    console.warn(`API call to ${endpoint} failed, using fallback data:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Analytics Dashboard Component
const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/analytics/dashboard?timeRange=${timeRange}`);
      
      // Use real data if available, fallback to mock data
      if (response.data) {
        setAnalytics(response.data);
      } else {
        // Enhanced mock data that simulates real EMR-connected analytics
        const mockData = {
          totalHospitals: 247,
          activeUsers: 15420,
          monthlyGrowth: 12.3,
          platformRevenue: 2850000,
          systemHealth: 99.7,
          criticalAlerts: 3,
          emrConnections: {
            epic: 145,
            cerner: 67,
            allscripts: 23,
            other: 12
          },
          dataVolume: {
            webhooksToday: 12840,
            patientsProcessed: 8920,
            alertsGenerated: 456,
            avgProcessingTime: '89ms'
          }
        };
        setAnalytics(mockData);
        console.info('Using enhanced mock analytics data - backend integration ready');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Fallback mock data
      setAnalytics({
        totalHospitals: 247,
        activeUsers: 15420,
        monthlyGrowth: 12.3,
        platformRevenue: 2850000,
        systemHealth: 99.7,
        criticalAlerts: 3
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">Platform Analytics</h2>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-steel-300 rounded-lg"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Total Hospitals</p>
              <p className="text-3xl font-bold text-steel-900">{analytics.totalHospitals}</p>
            </div>
            <Building2 className="w-12 h-12 text-medical-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Active Users</p>
              <p className="text-3xl font-bold text-steel-900">{analytics.activeUsers.toLocaleString()}</p>
            </div>
            <Users className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Monthly Growth</p>
              <p className="text-3xl font-bold text-green-600">+{analytics.monthlyGrowth}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Platform Revenue</p>
              <p className="text-3xl font-bold text-steel-900">${(analytics.platformRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">System Health</p>
              <p className="text-3xl font-bold text-green-600">{analytics.systemHealth}%</p>
            </div>
            <Activity className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Critical Alerts</p>
              <p className="text-3xl font-bold text-red-600">{analytics.criticalAlerts}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

// System Health Dashboard Component
const SystemHealthDashboard: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthMetrics();
    if (autoRefresh) {
      const interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchHealthMetrics = async () => {
    try {
      const data = await apiCall('/system/health');
      setHealthMetrics(data.data);
    } catch (error) {
      console.error('Failed to fetch health metrics:', error);
      // Mock data for demo
      setHealthMetrics({
        serverStatus: 'healthy',
        databaseStatus: 'healthy',
        apiResponseTime: 145,
        uptime: '99.97%',
        activeConnections: 1247,
        memoryUsage: 67,
        cpuUsage: 23,
        diskUsage: 45,
        networkLatency: 12
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">System Health</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-steel-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealthMetrics}
            className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Server Status</p>
              <p className="text-lg font-semibold text-green-600 capitalize">{healthMetrics.serverStatus}</p>
            </div>
            <Server className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Database</p>
              <p className="text-lg font-semibold text-green-600 capitalize">{healthMetrics.databaseStatus}</p>
            </div>
            <Database className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">API Response</p>
              <p className="text-lg font-semibold text-steel-900">{healthMetrics.apiResponseTime}ms</p>
            </div>
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Uptime</p>
              <p className="text-lg font-semibold text-green-600">{healthMetrics.uptime}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">Memory Usage</h3>
            <MemoryStick className="w-6 h-6 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-steel-600">Used</span>
              <span className="font-semibold">{healthMetrics.memoryUsage}%</span>
            </div>
            <div className="w-full bg-steel-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${healthMetrics.memoryUsage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">CPU Usage</h3>
            <Cpu className="w-6 h-6 text-green-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-steel-600">Used</span>
              <span className="font-semibold">{healthMetrics.cpuUsage}%</span>
            </div>
            <div className="w-full bg-steel-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${healthMetrics.cpuUsage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">Disk Usage</h3>
            <HardDrive className="w-6 h-6 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-steel-600">Used</span>
              <span className="font-semibold">{healthMetrics.diskUsage}%</span>
            </div>
            <div className="w-full bg-steel-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${healthMetrics.diskUsage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Security Center Component
const SecurityCenter: React.FC = () => {
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const fetchSecurityMetrics = async () => {
    try {
      const data = await apiCall('/security/metrics');
      setSecurityMetrics(data.data);
    } catch (error) {
      console.error('Failed to fetch security metrics:', error);
      // Mock data for demo
      setSecurityMetrics({
        activeSessions: 1247,
        failedLogins: 23,
        suspiciousActivity: 5,
        blockedIPs: 12,
        lastSecurityScan: '2024-01-15T10:30:00Z'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-steel-900">Security Center</h2>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Active Sessions</p>
              <p className="text-3xl font-bold text-steel-900">{securityMetrics.activeSessions}</p>
            </div>
            <Shield className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Failed Logins</p>
              <p className="text-3xl font-bold text-yellow-600">{securityMetrics.failedLogins}</p>
            </div>
            <XCircle className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Suspicious Activity</p>
              <p className="text-3xl font-bold text-red-600">{securityMetrics.suspiciousActivity}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Blocked IPs</p>
              <p className="text-3xl font-bold text-steel-900">{securityMetrics.blockedIPs}</p>
            </div>
            <Globe className="w-12 h-12 text-steel-500" />
          </div>
        </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
        <h3 className="text-xl font-semibold text-steel-900 mb-4">Security Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="p-4 border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors text-left">
            <Shield className="w-6 h-6 text-blue-500 mb-2" />
            <h4 className="font-semibold text-steel-900">Run Security Scan</h4>
            <p className="text-sm text-steel-600">Perform comprehensive security audit</p>
          </button>

          <button className="p-4 border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors text-left">
            <Key className="w-6 h-6 text-purple-500 mb-2" />
            <h4 className="font-semibold text-steel-900">Update Certificates</h4>
            <p className="text-sm text-steel-600">Renew SSL/TLS certificates</p>
          </button>

          <button className="p-4 border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors text-left">
            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
            <h4 className="font-semibold text-steel-900">Review Alerts</h4>
            <p className="text-sm text-steel-600">Check recent security alerts</p>
          </button>
        </div>
      </div>
    </div>
  );
};

// Database Management Component
const DatabaseManagement: React.FC = () => {
  const [dbMetrics, setDbMetrics] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatabaseMetrics = async () => {
    try {
      const data = await apiCall('/database/metrics');
      setDbMetrics(data.data);
    } catch (error) {
      console.error('Failed to fetch database metrics:', error);
      // Mock data for demo
      setDbMetrics({
        totalSize: '2.4TB',
        activeConnections: 157,
        queryPerformance: 'Good',
        lastBackup: '2024-01-15T02:00:00Z',
        replicationStatus: 'Healthy'
      });
    }
  };

  const fetchBackups = async () => {
    try {
      const data = await apiCall('/database/backups');
      setBackups(data.data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      // Mock data for demo
      setBackups([
        { id: 1, type: 'Full', timestamp: '2024-01-15T02:00:00Z', size: '2.4TB', status: 'Completed' },
        { id: 2, type: 'Incremental', timestamp: '2024-01-14T14:00:00Z', size: '156GB', status: 'Completed' },
        { id: 3, type: 'Full', timestamp: '2024-01-14T02:00:00Z', size: '2.3TB', status: 'Completed' }
      ]);
    }
  };

  useEffect(() => {
    fetchDatabaseMetrics();
    fetchBackups();
    setLoading(false);
  }, []);

  const runBackup = async (type: 'full' | 'incremental') => {
    try {
      await apiCall('/database/backup', {
        method: 'POST',
        body: JSON.stringify({ type })
      });
      fetchBackups();
    } catch (error) {
      console.error('Failed to run backup:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-steel-900">Database Management</h2>

      {/* Database Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Total Size</p>
              <p className="text-3xl font-bold text-steel-900">{dbMetrics.totalSize}</p>
            </div>
            <Database className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Active Connections</p>
              <p className="text-3xl font-bold text-steel-900">{dbMetrics.activeConnections}</p>
            </div>
            <Network className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Query Performance</p>
              <p className="text-lg font-semibold text-green-600">{dbMetrics.queryPerformance}</p>
            </div>
            <Zap className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-steel-600 text-sm">Replication</p>
              <p className="text-lg font-semibold text-green-600">{dbMetrics.replicationStatus}</p>
            </div>
            <Copy className="w-12 h-12 text-green-500" />
          </div>
        </div>
      </div>

      {/* Backup Management */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-steel-900">Backup Management</h3>
          <div className="flex gap-2">
            <button
              onClick={() => runBackup('incremental')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Archive className="w-4 h-4 inline mr-2" />
              Incremental
            </button>
            <button
              onClick={() => runBackup('full')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Archive className="w-4 h-4 inline mr-2" />
              Full Backup
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-steel-200">
                <th className="text-left py-3 px-4 font-semibold text-steel-900">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-steel-900">Timestamp</th>
                <th className="text-left py-3 px-4 font-semibold text-steel-900">Size</th>
                <th className="text-left py-3 px-4 font-semibold text-steel-900">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-steel-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id} className="border-b border-steel-100 hover:bg-steel-50">
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      backup.type === 'Full' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {backup.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-steel-700">
                    {new Date(backup.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-steel-700">{backup.size}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {backup.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="p-1 text-steel-600 hover:text-blue-600">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-steel-600 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Hospital Management Component
const HospitalManagement: React.FC = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const data = await apiCall('/hospitals');
      setHospitals(data.data);
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
      // Mock data for demo
      setHospitals([
        { id: 1, name: 'General Hospital', location: 'New York, NY', status: 'Active', users: 245, modules: ['HF', 'EP', 'CI'] },
        { id: 2, name: 'Memorial Medical Center', location: 'Los Angeles, CA', status: 'Active', users: 189, modules: ['HF', 'VD'] },
        { id: 3, name: 'Regional Healthcare', location: 'Chicago, IL', status: 'Trial', users: 67, modules: ['HF'] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">Hospital Management</h2>
        <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Add Hospital
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-steel-200">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-steel-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search hospitals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-steel-300 rounded-lg focus:ring-2 focus:ring-medical-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button className="px-4 py-2 border border-steel-300 rounded-lg hover:bg-steel-50 transition-colors">
            <Filter className="w-4 h-4 inline mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Hospitals Table */}
      <div className="bg-white rounded-lg shadow-md border border-steel-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Hospital</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Location</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Status</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Users</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Modules</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHospitals.map((hospital) => (
                <tr key={hospital.id} className="border-b border-steel-100 hover:bg-steel-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <Building2 className="w-8 h-8 text-medical-blue-500 mr-3" />
                      <div>
                        <div className="font-semibold text-steel-900">{hospital.name}</div>
                        <div className="text-sm text-steel-600">ID: {hospital.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-steel-700">{hospital.location}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      hospital.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hospital.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-steel-700">{hospital.users}</td>
                  <td className="py-4 px-6">
                    <div className="flex gap-1">
                      {hospital.modules.map((module: string) => (
                        <span key={module} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {module}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button className="p-1 text-steel-600 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-steel-600 hover:text-green-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-steel-600 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiCall('/users');
      setUsers(data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Mock data for demo
      setUsers([
        { id: 1, name: 'Dr. Sarah Williams', email: 'sarah.williams@hospital.com', role: 'Admin', hospital: 'General Hospital', lastLogin: '2024-01-15T09:30:00Z', status: 'Active' },
        { id: 2, name: 'Dr. Michael Chen', email: 'michael.chen@medical.com', role: 'Clinician', hospital: 'Memorial Medical Center', lastLogin: '2024-01-15T08:45:00Z', status: 'Active' },
        { id: 3, name: 'Nurse Johnson', email: 'j.johnson@regional.com', role: 'Care Team', hospital: 'Regional Healthcare', lastLogin: '2024-01-14T16:20:00Z', status: 'Inactive' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">User Management</h2>
        <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md border border-steel-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">User</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Role</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Hospital</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Last Login</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Status</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-steel-100 hover:bg-steel-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-steel-900">{user.name}</div>
                        <div className="text-sm text-steel-600">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'Clinician' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-steel-700">{user.hospital}</td>
                  <td className="py-4 px-6 text-steel-700">
                    {new Date(user.lastLogin).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      <button className="p-1 text-steel-600 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-steel-600 hover:text-green-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-steel-600 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Onboarding Center Component
const OnboardingCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hospitals');
  const [invitations, setInvitations] = useState<any[]>([]);

  useEffect(() => {
    // Mock data for demo
    setInvitations([
      { id: 1, hospitalName: 'City General Hospital', contactEmail: 'admin@citygeneral.com', status: 'Pending', sentDate: '2024-01-15T10:00:00Z' },
      { id: 2, hospitalName: 'Regional Medical', contactEmail: 'contact@regional.med', status: 'Accepted', sentDate: '2024-01-14T15:30:00Z' },
      { id: 3, hospitalName: 'Community Health', contactEmail: 'info@community.health', status: 'Expired', sentDate: '2024-01-10T09:15:00Z' }
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-steel-900">Onboarding Center</h2>

      {/* Tab Navigation */}
      <div className="border-b border-steel-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'hospitals', label: 'Hospital Onboarding', icon: Building2 },
            { id: 'invitations', label: 'Pending Invitations', icon: Mail },
            { id: 'templates', label: 'Email Templates', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-medical-blue-500 text-medical-blue-600'
                    : 'border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'hospitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
            <Building2 className="w-12 h-12 text-medical-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-steel-900 mb-2">New Hospital Setup</h3>
            <p className="text-steel-600 text-sm mb-4">Complete onboarding workflow for new hospital partners</p>
            <button className="w-full px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
              <Plus className="w-4 h-4 inline mr-2" />
              Start Onboarding
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
            <Mail className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-steel-900 mb-2">Send Invitation</h3>
            <p className="text-steel-600 text-sm mb-4">Invite new hospitals to join the platform</p>
            <button className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <Send className="w-4 h-4 inline mr-2" />
              Send Invite
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
            <HelpCircle className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold text-steel-900 mb-2">Training Resources</h3>
            <p className="text-steel-600 text-sm mb-4">Access onboarding guides and training materials</p>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <HelpCircle className="w-4 h-4 inline mr-2" />
              View Resources
            </button>
          </div>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="bg-white rounded-lg shadow-md border border-steel-200 overflow-hidden">
          <div className="p-6 border-b border-steel-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-steel-900">Pending Invitations</h3>
              <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
                <Plus className="w-4 h-4 inline mr-2" />
                New Invitation
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-steel-50">
                <tr>
                  <th className="text-left py-3 px-6 font-semibold text-steel-900">Hospital</th>
                  <th className="text-left py-3 px-6 font-semibold text-steel-900">Contact Email</th>
                  <th className="text-left py-3 px-6 font-semibold text-steel-900">Status</th>
                  <th className="text-left py-3 px-6 font-semibold text-steel-900">Sent Date</th>
                  <th className="text-left py-3 px-6 font-semibold text-steel-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-steel-100 hover:bg-steel-50">
                    <td className="py-4 px-6 font-semibold text-steel-900">{invitation.hospitalName}</td>
                    <td className="py-4 px-6 text-steel-700">{invitation.contactEmail}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        invitation.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        invitation.status === 'Accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-steel-700">
                      {new Date(invitation.sentDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button className="p-1 text-steel-600 hover:text-blue-600">
                          <Send className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-steel-600 hover:text-green-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-steel-600 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Permission Management Component
const PermissionManagement: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demo
    setRoles([
      { id: 1, name: 'Super Admin', description: 'Full platform access', users: 3, permissions: ['all'] },
      { id: 2, name: 'Hospital Admin', description: 'Hospital-level management', users: 47, permissions: ['hospital_management', 'user_management', 'reports'] },
      { id: 3, name: 'Clinician', description: 'Clinical features access', users: 892, permissions: ['patient_management', 'clinical_tools', 'reports'] },
      { id: 4, name: 'Care Team', description: 'Basic care team features', users: 1247, permissions: ['patient_view', 'care_coordination'] }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">Permission Management</h2>
        <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                  role.name === 'Super Admin' ? 'bg-purple-100 text-purple-600' :
                  role.name === 'Hospital Admin' ? 'bg-blue-100 text-blue-600' :
                  role.name === 'Clinician' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                }`}>
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-steel-900">{role.name}</h3>
                  <p className="text-sm text-steel-600">{role.description}</p>
                </div>
              </div>
              <button className="p-1 text-steel-600 hover:text-blue-600">
                <Edit className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-steel-700">Users</span>
                <span className="text-sm font-semibold text-steel-900">{role.users}</span>
              </div>
              <div className="text-xs text-steel-600">
                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''} assigned
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 bg-steel-100 text-steel-700 rounded-lg hover:bg-steel-200 transition-colors text-sm">
                <Eye className="w-4 h-4 inline mr-1" />
                View Details
              </button>
              <button className="flex-1 px-3 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors text-sm">
                <Key className="w-4 h-4 inline mr-1" />
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
        <h3 className="text-xl font-semibold text-steel-900 mb-4">Permission Matrix</h3>
        <div className="text-sm text-steel-600 mb-4">
          Comprehensive overview of role-based permissions across the platform
        </div>
        <button className="px-4 py-2 bg-steel-100 text-steel-700 rounded-lg hover:bg-steel-200 transition-colors">
          <Eye className="w-4 h-4 inline mr-2" />
          View Full Matrix
        </button>
      </div>
    </div>
  );
};

// Platform Operations Component
const PlatformOperations: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);

  useEffect(() => {
    // Mock data for demo
    setFeatureFlags([
      { id: 1, name: 'New Dashboard UI', description: 'Updated dashboard interface', enabled: true, rollout: 75 },
      { id: 2, name: 'Advanced Analytics', description: 'Enhanced analytics features', enabled: false, rollout: 0 },
      { id: 3, name: 'Mobile App Integration', description: 'Mobile application features', enabled: true, rollout: 100 },
      { id: 4, name: 'AI Clinical Support', description: 'AI-powered clinical decision support', enabled: false, rollout: 15 }
    ]);
  }, []);

  const toggleFeatureFlag = (id: number) => {
    setFeatureFlags(flags => 
      flags.map(flag => 
        flag.id === id ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-steel-900">Platform Operations</h2>

      {/* System Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">Maintenance Mode</h3>
            <Settings className="w-6 h-6 text-steel-500" />
          </div>
          <p className="text-sm text-steel-600 mb-4">
            {maintenanceMode ? 'Platform is in maintenance mode' : 'Platform is operational'}
          </p>
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              maintenanceMode 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {maintenanceMode ? (
              <>
                <PlayCircle className="w-4 h-4 inline mr-2" />
                Exit Maintenance
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 inline mr-2" />
                Enter Maintenance
              </>
            )}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">System Restart</h3>
            <RotateCcw className="w-6 h-6 text-steel-500" />
          </div>
          <p className="text-sm text-steel-600 mb-4">Restart platform services</p>
          <button className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Restart System
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steel-900">Cache Management</h3>
            <Database className="w-6 h-6 text-steel-500" />
          </div>
          <p className="text-sm text-steel-600 mb-4">Clear system cache</p>
          <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Trash className="w-4 h-4 inline mr-2" />
            Clear Cache
          </button>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-steel-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-steel-900">Feature Flags</h3>
          <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
            <Plus className="w-4 h-4 inline mr-2" />
            New Feature Flag
          </button>
        </div>

        <div className="space-y-4">
          {featureFlags.map((flag) => (
            <div key={flag.id} className="border border-steel-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-steel-900">{flag.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      flag.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-steel-600 mb-3">{flag.description}</p>
                  {flag.enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-steel-600">Rollout:</span>
                      <div className="flex-1 bg-steel-200 rounded-full h-2 max-w-32">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${flag.rollout}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold text-steel-700">{flag.rollout}%</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleFeatureFlag(flag.id)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      flag.enabled 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {flag.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="p-1 text-steel-600 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Audit Logs Component
const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchAuditLogs();
  }, [filterType]);

  const fetchAuditLogs = async () => {
    try {
      const data = await apiCall(`/audit/logs?type=${filterType}`);
      setLogs(data.data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      // Mock data for demo
      setLogs([
        { id: 1, type: 'User Login', user: 'Dr. Sarah Williams', action: 'User logged in', timestamp: '2024-01-15T09:30:00Z', ip: '192.168.1.100' },
        { id: 2, type: 'Data Access', user: 'Dr. Michael Chen', action: 'Accessed patient records', timestamp: '2024-01-15T09:25:00Z', ip: '192.168.1.101' },
        { id: 3, type: 'System Change', user: 'Admin User', action: 'Updated system configuration', timestamp: '2024-01-15T09:15:00Z', ip: '192.168.1.102' },
        { id: 4, type: 'Security Event', user: 'System', action: 'Failed login attempt detected', timestamp: '2024-01-15T09:10:00Z', ip: '192.168.1.103' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-medical-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-steel-900">Audit Logs</h2>
        <div className="flex gap-4">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-steel-300 rounded-lg"
          >
            <option value="all">All Events</option>
            <option value="user_login">User Logins</option>
            <option value="data_access">Data Access</option>
            <option value="system_change">System Changes</option>
            <option value="security_event">Security Events</option>
          </select>
          <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-md border border-steel-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-steel-50">
              <tr>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Type</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">User</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Action</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">Timestamp</th>
                <th className="text-left py-3 px-6 font-semibold text-steel-900">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-steel-100 hover:bg-steel-50">
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      log.type === 'User Login' ? 'bg-blue-100 text-blue-800' :
                      log.type === 'Data Access' ? 'bg-green-100 text-green-800' :
                      log.type === 'System Change' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-steel-700">{log.user}</td>
                  <td className="py-4 px-6 text-steel-700">{log.action}</td>
                  <td className="py-4 px-6 text-steel-700">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-steel-700">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main Super Admin Dashboard Component
const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [backendConnected, setBackendConnected] = useState(false);

  // Check backend connectivity on component mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
          setBackendConnected(true);
          console.info('✅ Backend API connected - real EMR data available');
        }
      } catch (error) {
        setBackendConnected(false);
        console.warn('⚠️ Backend API not available - using mock data');
      }
    };

    checkBackendConnection();
    // Check every 30 seconds
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'onboarding', label: 'Onboarding', icon: UserCheck },
    { id: 'permissions', label: 'Permissions', icon: Key },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'audit', label: 'Audit Logs', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-steel-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-steel-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-steel-900">Super Admin Dashboard</h1>
              <span className="ml-3 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                ADMIN
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-steel-600">
                Last updated: {new Date().toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-steel-600">
                  {backendConnected ? 'EMR Integration Active' : 'Demo Mode - Mock Data'}
                </span>
              </div>
              {backendConnected && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-600">Redox Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-steel-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-medical-blue-500 text-medical-blue-600'
                      : 'border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'health' && <SystemHealthDashboard />}
        {activeTab === 'security' && <SecurityCenter />}
        {activeTab === 'database' && <DatabaseManagement />}
        {activeTab === 'hospitals' && <HospitalManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'onboarding' && <OnboardingCenter />}
        {activeTab === 'permissions' && <PermissionManagement />}
        {activeTab === 'operations' && <PlatformOperations />}
        {activeTab === 'audit' && <AuditLogs />}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;