import React, { useState, useEffect } from 'react';
import { Download, Calendar, Clock, Send, Settings, FileText, TrendingUp, Users, Target, Activity, Mail, CheckCircle, AlertCircle, Heart, Zap, Shield, BarChart3, Scissors, FlaskConical } from 'lucide-react';

interface PADReportSchedule {
  id: string;
  name: string;
  type: 'pad-screening' | 'limb-salvage' | 'wound-care' | 'cli-monitoring' | 'access-site' | 'revascularization' | 'executive' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  recipients: string[];
  lastRun: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'failed';
  template: string;
}

interface PADReportMetric {
  name: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}

const PADReportingSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'templates' | 'history'>('dashboard');
  const [selectedSchedule, setSelectedSchedule] = useState<PADReportSchedule | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [schedules, setSchedules] = useState<PADReportSchedule[]>([
    {
      id: 'pad-screening-weekly',
      name: 'Weekly PAD Screening Performance',
      type: 'pad-screening',
      frequency: 'weekly',
      format: 'pdf',
      recipients: ['vascular.director@hospital.com', 'quality.coordinator@hospital.com'],
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'pad-screening-standard'
    },
    {
      id: 'limb-salvage-monthly',
      name: 'Monthly Limb Salvage Analytics',
      type: 'limb-salvage',
      frequency: 'monthly',
      format: 'excel',
      recipients: ['vascular.chief@hospital.com', 'surgery.director@hospital.com'],
      lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'limb-salvage-comprehensive'
    },
    {
      id: 'wound-care-daily',
      name: 'Daily Wound Care Outcomes',
      type: 'wound-care',
      frequency: 'daily',
      format: 'excel',
      recipients: ['wound.specialist@hospital.com', 'nursing.director@hospital.com'],
      lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'active',
      template: 'wound-care-tracking'
    },
    {
      id: 'cli-monitoring-weekly',
      name: 'Weekly CLI Monitoring Report',
      type: 'cli-monitoring',
      frequency: 'weekly',
      format: 'pdf',
      recipients: ['critical.care@hospital.com', 'vascular.team@hospital.com'],
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'cli-comprehensive'
    },
    {
      id: 'access-site-monthly',
      name: 'Monthly Access Site Optimization',
      type: 'access-site',
      frequency: 'monthly',
      format: 'pdf',
      recipients: ['interventional.team@hospital.com', 'quality.director@hospital.com'],
      lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'paused',
      template: 'access-site-analysis'
    },
    {
      id: 'revasc-quarterly',
      name: 'Quarterly Revascularization Outcomes',
      type: 'revascularization',
      frequency: 'quarterly',
      format: 'pdf',
      recipients: ['vascular.surgery@hospital.com', 'cardiology.director@hospital.com'],
      lastRun: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'revascularization-outcomes'
    }
  ]);

  const padReportMetrics: PADReportMetric[] = [
    { name: 'PAD Screening Rate', value: '87.3%', change: 5.2, trend: 'up', target: 90 },
    { name: 'Limb Salvage Success', value: '92.1%', change: 2.8, trend: 'up', target: 85 },
    { name: 'Wound Healing Rate', value: '78.4%', change: -1.2, trend: 'down', target: 80 },
    { name: 'CLI Detection Time', value: '4.2 days', change: -12.5, trend: 'up', target: 3 },
    { name: 'Access Site Complications', value: '2.1%', change: -8.7, trend: 'up', target: 3 },
    { name: 'Amputation Prevention', value: '94.6%', change: 3.1, trend: 'up', target: 90 },
    { name: 'Procedure Success Rate', value: '89.7%', change: 1.9, trend: 'up', target: 85 },
    { name: 'Total Reports Generated', value: 892, change: 15.3, trend: 'up' }
  ];

  const generateInstantReport = async (type: string) => {
    setIsGeneratingReport(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const reportData = {
      timestamp: new Date().toISOString(),
      type,
      module: 'Peripheral Vascular',
      metrics: padReportMetrics,
      schedules: schedules.filter(s => s.type === type || type === 'all'),
      padSpecificData: {
        screeningMetrics: {
          totalScreenings: 1247,
          positiveScreenings: 289,
          diagnosticAccuracy: 94.2,
          falsePositiveRate: 5.8
        },
        limbSalvageMetrics: {
          totalProcedures: 156,
          successfulSalvages: 144,
          majorAmputations: 12,
          revascularizationSuccess: 89.7
        },
        woundCareMetrics: {
          activeWounds: 234,
          healedWounds: 183,
          averageHealingTime: 42.3,
          infectionRate: 3.8
        },
        cliMetrics: {
          cliPatients: 67,
          urgentInterventions: 23,
          averageResponseTime: 4.2,
          mortalityRate: 2.1
        }
      },
      summary: {
        totalSchedules: schedules.length,
        activeSchedules: schedules.filter(s => s.status === 'active').length,
        upcomingReports: schedules.filter(s => s.nextRun < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
      }
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pad-${type}-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsGeneratingReport(false);
  };

  const toggleScheduleStatus = (scheduleId: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === scheduleId 
        ? { ...schedule, status: schedule.status === 'active' ? 'paused' : 'active' }
        : schedule
    ));
  };

  const sendTestReport = async (schedule: PADReportSchedule) => {
    // Simulate sending test report
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`Test PAD report sent to: ${schedule.recipients.join(', ')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">Advanced PAD Reporting System</h2>
            <p className="text-steel-600">Comprehensive peripheral arterial disease analytics and automated reporting</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => generateInstantReport('all')}
              disabled={isGeneratingReport}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isGeneratingReport 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-medical-blue-500 text-white hover:bg-medical-blue-600'
              } transition-colors`}
            >
              <Download className="w-4 h-4" />
              {isGeneratingReport ? 'Generating...' : 'Generate PAD Report'}
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-4 mt-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'schedules', label: 'Schedules', icon: Calendar },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'history', label: 'History', icon: Clock }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-medical-blue-500 text-white' : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
                } transition-colors`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Key PAD Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {padReportMetrics.slice(0, 8).map((metric, index) => (
              <div key={index} className="bg-white p-4 rounded-xl border border-steel-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-steel-600 font-medium">{metric.name}</div>
                    <div className="text-2xl font-bold text-steel-900">{metric.value}</div>
                    {metric.target && (
                      <div className="text-xs text-steel-500">Target: {metric.target}{typeof metric.value === 'string' && metric.value.includes('%') ? '%' : typeof metric.target === 'number' && metric.target < 10 ? ' days' : ''}</div>
                    )}
                  </div>
                  <div className={`flex items-center text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-steel-600'
                  }`}>
                    {metric.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                     metric.trend === 'down' ? <TrendingUp className="w-4 h-4 rotate-180" /> : null}
                    {metric.change !== 0 && (
                      <span>{metric.change > 0 ? '+' : ''}{metric.change}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick PAD Report Generation */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h3 className="text-xl font-bold text-steel-900 mb-4">Quick PAD Report Generation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  type: 'pad-screening', 
                  label: 'PAD Screening Analytics', 
                  icon: FlaskConical, 
                  description: 'Screening rates and diagnostic accuracy metrics',
                  color: 'text-blue-600'
                },
                { 
                  type: 'limb-salvage', 
                  label: 'Limb Salvage Performance', 
                  icon: Shield, 
                  description: 'Real-time limb preservation outcomes',
                  color: 'text-green-600'
                },
                { 
                  type: 'wound-care', 
                  label: 'Wound Care Tracking', 
                  icon: Heart, 
                  description: 'Healing progression and outcomes analysis',
                  color: 'text-red-600'
                },
                { 
                  type: 'cli-monitoring', 
                  label: 'CLI Monitoring', 
                  icon: Zap, 
                  description: 'Critical limb ischemia detection and response',
                  color: 'text-orange-600'
                },
                { 
                  type: 'access-site', 
                  label: 'Access Site Optimization', 
                  icon: Target, 
                  description: 'Procedure access site complication tracking',
                  color: 'text-purple-600'
                },
                { 
                  type: 'revascularization', 
                  label: 'Revascularization Outcomes', 
                  icon: BarChart3, 
                  description: 'Procedure success rates and patient outcomes',
                  color: 'text-indigo-600'
                }
              ].map((reportType) => {
                const IconComponent = reportType.icon;
                return (
                  <button
                    key={reportType.type}
                    onClick={() => generateInstantReport(reportType.type)}
                    disabled={isGeneratingReport}
                    className="p-4 border border-steel-200 rounded-lg hover:border-medical-blue-300 hover:bg-medical-blue-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className={`w-5 h-5 ${reportType.color}`} />
                      <span className="font-semibold text-steel-900">{reportType.label}</span>
                    </div>
                    <p className="text-sm text-steel-600">{reportType.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent PAD Report Activity */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h3 className="text-xl font-bold text-steel-900 mb-4">Recent PAD Report Activity</h3>
            <div className="space-y-3">
              {schedules.slice(0, 5).map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 bg-steel-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      schedule.status === 'active' ? 'bg-green-500' : 
                      schedule.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium text-steel-900">{schedule.name}</div>
                      <div className="text-sm text-steel-600">
                        Last run: {schedule.lastRun.toLocaleDateString()} | 
                        Next: {schedule.nextRun.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-steel-500 capitalize">{schedule.frequency}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PAD Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-steel-200">
              <h3 className="text-lg font-bold text-steel-900 mb-4">Screening Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">ABI Screening Rate</span>
                  <span className="font-semibold text-steel-900">89.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Diagnostic Accuracy</span>
                  <span className="font-semibold text-steel-900">94.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">False Positive Rate</span>
                  <span className="font-semibold text-steel-900">5.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Time to Diagnosis</span>
                  <span className="font-semibold text-steel-900">2.3 days</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-steel-200">
              <h3 className="text-lg font-bold text-steel-900 mb-4">Intervention Outcomes</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Successful Interventions</span>
                  <span className="font-semibold text-steel-900">92.1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Complication Rate</span>
                  <span className="font-semibold text-steel-900">2.1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Amputation Prevention</span>
                  <span className="font-semibold text-steel-900">94.6%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-steel-600">Patient Satisfaction</span>
                  <span className="font-semibold text-steel-900">4.7/5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-steel-900">PAD Report Schedules</h3>
              <button className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors">
                Create New PAD Schedule
              </button>
            </div>
            
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="border border-steel-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        schedule.status === 'active' ? 'bg-green-500' : 
                        schedule.status === 'paused' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-semibold text-steel-900">{schedule.name}</div>
                        <div className="text-sm text-steel-600">
                          {schedule.frequency} • {schedule.format.toUpperCase()} • {schedule.recipients.length} recipients
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendTestReport(schedule)}
                        className="p-2 text-steel-600 hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleScheduleStatus(schedule.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          schedule.status === 'active' 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-yellow-600 hover:bg-yellow-50'
                        }`}
                      >
                        {schedule.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </button>
                      <button className="p-2 text-steel-600 hover:text-steel-800 hover:bg-steel-50 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-steel-600">Last Run:</span>
                      <div className="font-medium">{schedule.lastRun.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-steel-600">Next Run:</span>
                      <div className="font-medium">{schedule.nextRun.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-steel-600">Recipients:</span>
                      <div className="font-medium">{schedule.recipients[0]} {schedule.recipients.length > 1 && `+${schedule.recipients.length - 1} more`}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">PAD Report Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'pad-screening-standard', name: 'PAD Screening Report', description: 'Comprehensive screening rates and diagnostic accuracy analysis' },
              { id: 'limb-salvage-comprehensive', name: 'Limb Salvage Analytics', description: 'Real-time limb preservation outcomes and success metrics' },
              { id: 'wound-care-tracking', name: 'Wound Care Outcomes', description: 'Healing progression tracking and intervention effectiveness' },
              { id: 'cli-comprehensive', name: 'CLI Monitoring Report', description: 'Critical limb ischemia detection and response time analytics' },
              { id: 'access-site-analysis', name: 'Access Site Optimization', description: 'Procedure access site complications and optimization strategies' },
              { id: 'revascularization-outcomes', name: 'Revascularization Success', description: 'Procedure success rates and patient outcome tracking' },
              { id: 'pad-executive-summary', name: 'PAD Executive Dashboard', description: 'High-level peripheral vascular performance indicators' },
              { id: 'risk-stratification-report', name: 'Risk Stratification Analysis', description: 'Patient risk assessment and procedural outcome predictions' },
              { id: 'amputation-prevention', name: 'Amputation Prevention Metrics', description: 'Limb salvage success and amputation prevention tracking' }
            ].map((template) => (
              <div key={template.id} className="border border-steel-200 rounded-lg p-4 hover:border-medical-blue-300 hover:bg-medical-blue-50 transition-all cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-medical-blue-600" />
                  <span className="font-semibold text-steel-900">{template.name}</span>
                </div>
                <p className="text-sm text-steel-600">{template.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-steel-200">
          <h3 className="text-xl font-bold text-steel-900 mb-4">PAD Report History</h3>
          <div className="space-y-3">
            {Array.from({ length: 10 }, (_, i) => {
              const reportTypes = [
                'Weekly PAD Screening Performance',
                'Monthly Limb Salvage Analytics', 
                'Daily Wound Care Outcomes',
                'Weekly CLI Monitoring Report',
                'Monthly Access Site Optimization',
                'Quarterly Revascularization Outcomes'
              ];
              return (
                <div key={i} className="flex items-center justify-between p-3 border border-steel-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-steel-400" />
                    <div>
                      <div className="font-medium text-steel-900">
                        {reportTypes[i % reportTypes.length]}
                      </div>
                      <div className="text-sm text-steel-600">
                        Generated {i + 1} day{i === 0 ? '' : 's'} ago • Sent to {Math.floor(Math.random() * 4) + 2} recipients
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-steel-600 hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PADReportingSystem;