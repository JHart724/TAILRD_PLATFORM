import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Shield, 
  Timer,
  Zap,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Heart
} from 'lucide-react';

const CoronaryServiceLineView: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('month');

  // PCI Performance Metrics
  const pciMetrics = {
    totalProcedures: 428,
    stemiCases: 67,
    nonStemiCases: 184,
    electivePci: 177,
    avgDoorToBalloon: 72,
    targetDoorToBalloon: 90,
    successRate: 96.8,
    complicationRate: 2.1
  };

  // Lesion Complexity Distribution
  const lesionComplexity = [
    { type: 'Type A (Simple)', count: 156, percentage: 36.4, color: 'bg-emerald-500' },
    { type: 'Type B1 (Moderate)', count: 142, percentage: 33.2, color: 'bg-medical-amber-500' },
    { type: 'Type B2 (Complex)', count: 89, percentage: 20.8, color: 'bg-orange-500' },
    { type: 'Type C (High Risk)', count: 41, percentage: 9.6, color: 'bg-red-500' }
  ];

  // Device Utilization
  const deviceUtilization = [
    { device: 'Drug-Eluting Stents', usage: 312, percentage: 87.2, trend: '+2.1%' },
    { device: 'Bare Metal Stents', usage: 28, percentage: 7.8, trend: '-1.4%' },
    { device: 'Drug-Coated Balloons', usage: 18, percentage: 5.0, trend: '+0.8%' },
    { device: 'Rotational Atherectomy', usage: 15, percentage: 4.2, trend: '+1.2%' },
    { device: 'IVUS Guidance', usage: 89, percentage: 24.9, trend: '+3.4%' },
    { device: 'FFR Assessment', usage: 34, percentage: 9.5, trend: '+2.1%' }
  ];

  // Quality Metrics
  const qualityMetrics = [
    { metric: 'Radial Access Rate', value: 92.3, target: 85.0, status: 'above', unit: '%' },
    { metric: 'Contrast Volume (avg)', value: 127, target: 150, status: 'below', unit: 'ml' },
    { metric: 'Fluoroscopy Time (avg)', value: 14.2, target: 18.0, status: 'below', unit: 'min' },
    { metric: 'Radiation Dose (avg)', value: 1.8, target: 2.5, status: 'below', unit: 'Gy' },
    { metric: 'Same-Day Discharge', value: 34.7, target: 40.0, status: 'below', unit: '%' },
    { metric: 'Length of Stay (avg)', value: 1.4, target: 1.2, status: 'above', unit: 'days' }
  ];

  // Operator Performance
  const operatorPerformance = [
    { name: 'Dr. Chen', procedures: 89, successRate: 98.9, avgTime: 68, complexity: 'High' },
    { name: 'Dr. Rodriguez', procedures: 76, successRate: 97.4, avgTime: 72, complexity: 'Mixed' },
    { name: 'Dr. Park', procedures: 71, successRate: 95.8, avgTime: 76, complexity: 'Mixed' },
    { name: 'Dr. Thompson', procedures: 63, successRate: 96.8, avgTime: 71, complexity: 'Standard' },
    { name: 'Dr. Williams', procedures: 58, successRate: 98.3, avgTime: 69, complexity: 'High' },
    { name: 'Dr. Davis', procedures: 47, successRate: 95.7, avgTime: 74, complexity: 'Standard' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-medical-amber-100">
              <Activity className="w-5 h-5 text-medical-amber-600" />
            </div>
            <span className="text-sm text-steel-600">This Month</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{pciMetrics.totalProcedures}</div>
          <div className="text-sm text-steel-600">Total PCI Procedures</div>
          <div className="text-xs text-emerald-600 mt-1">+12.3% from last month</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-red-100">
              <Timer className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-steel-600">STEMI Average</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{pciMetrics.avgDoorToBalloon}min</div>
          <div className="text-sm text-steel-600">Door-to-Balloon Time</div>
          <div className="text-xs text-emerald-600 mt-1">18min under target</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-steel-600">Overall</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{pciMetrics.successRate}%</div>
          <div className="text-sm text-steel-600">Procedural Success</div>
          <div className="text-xs text-emerald-600 mt-1">Above benchmark</div>
        </div>

        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-steel-600">This Month</span>
          </div>
          <div className="text-2xl font-bold text-steel-900 font-sf">{pciMetrics.complicationRate}%</div>
          <div className="text-sm text-steel-600">Major Complications</div>
          <div className="text-xs text-emerald-600 mt-1">Within target range</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Lesion Complexity Analysis */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Lesion Complexity Distribution</h3>
            <Target className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {lesionComplexity.map((lesion, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-steel-700">{lesion.type}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-steel-900">{lesion.count}</span>
                    <span className="text-xs text-steel-600 ml-1">({lesion.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-steel-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${lesion.color}`}
                    style={{ width: `${lesion.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Utilization */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Device Utilization</h3>
            <Shield className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {deviceUtilization.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-steel-100">
                <div>
                  <div className="text-sm font-medium text-steel-900">{device.device}</div>
                  <div className="text-xs text-steel-600">{device.usage} cases ({device.percentage}%)</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    device.trend.startsWith('+') 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {device.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quality Metrics Dashboard */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Quality Metrics</h3>
            <BarChart3 className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-4">
            {qualityMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-steel-100">
                <div>
                  <div className="text-sm font-medium text-steel-900">{metric.metric}</div>
                  <div className="text-xs text-steel-600">Target: {metric.target}{metric.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-steel-900">{metric.value}{metric.unit}</div>
                  <div className={`text-xs ${
                    metric.status === 'above' && metric.metric.includes('Rate') || 
                    metric.status === 'below' && !metric.metric.includes('Rate')
                      ? 'text-emerald-600' 
                      : 'text-orange-600'
                  }`}>
                    {metric.status === 'above' ? '↑' : '↓'} Target
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operator Performance */}
        <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-steel-900 font-sf">Operator Performance</h3>
            <Users className="w-5 h-5 text-steel-400" />
          </div>
          
          <div className="space-y-3">
            {operatorPerformance.map((operator, index) => (
              <div key={index} className="p-4 rounded-lg border border-steel-100 hover:bg-steel-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-steel-900">{operator.name}</div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      operator.complexity === 'High' 
                        ? 'bg-red-100 text-red-700'
                        : operator.complexity === 'Mixed'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {operator.complexity}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-steel-600">Procedures</div>
                    <div className="font-semibold text-steel-900">{operator.procedures}</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Success Rate</div>
                    <div className="font-semibold text-steel-900">{operator.successRate}%</div>
                  </div>
                  <div>
                    <div className="text-steel-600">Avg Time</div>
                    <div className="font-semibold text-steel-900">{operator.avgTime}min</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PCI Case Distribution */}
      <div className="bg-white rounded-xl border border-steel-200 p-6 shadow-retina-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-steel-900 font-sf">PCI Case Distribution</h3>
          <Heart className="w-5 h-5 text-steel-400" />
        </div>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="text-2xl font-bold text-red-600 font-sf">{pciMetrics.stemiCases}</div>
            <div className="text-sm text-red-700 font-medium">STEMI Cases</div>
            <div className="text-xs text-red-600 mt-1">Primary PCI</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-2xl font-bold text-orange-600 font-sf">{pciMetrics.nonStemiCases}</div>
            <div className="text-sm text-orange-700 font-medium">NSTEMI/UA Cases</div>
            <div className="text-xs text-orange-600 mt-1">Urgent PCI</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-600 font-sf">{pciMetrics.electivePci}</div>
            <div className="text-sm text-emerald-700 font-medium">Elective PCI</div>
            <div className="text-xs text-emerald-600 mt-1">Scheduled Cases</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoronaryServiceLineView;