import React, { useState, useEffect } from 'react';
import { Download, Calendar, Clock, Send, Settings, FileText, TrendingUp, Users, Target, Activity, Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface ReportSchedule {
  id: string;
  name: string;
  type: 'gdmt' | 'provider' | 'quality' | 'executive' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  recipients: string[];
  lastRun: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'failed';
  template: string;
}

interface ReportMetric {
  name: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

const AutomatedReportingSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'templates' | 'history'>('dashboard');
  const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [schedules, setSchedules] = useState<ReportSchedule[]>([
    {
      id: 'gdmt-weekly',
      name: 'Weekly GDMT Performance Report',
      type: 'gdmt',
      frequency: 'weekly',
      format: 'pdf',
      recipients: ['sarah.williams@hospital.com', 'michael.chen@hospital.com'],
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'standard-gdmt'
    },
    {
      id: 'exec-monthly',
      name: 'Monthly Executive Dashboard',
      type: 'executive',
      frequency: 'monthly',
      format: 'pdf',
      recipients: ['chief.medical@hospital.com', 'ceo@hospital.com'],
      lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'active',
      template: 'executive-summary'
    },
    {
      id: 'provider-daily',
      name: 'Daily Provider Metrics',
      type: 'provider',
      frequency: 'daily',
      format: 'excel',
      recipients: ['quality.director@hospital.com'],
      lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'active',
      template: 'provider-detail'
    },
    {
      id: 'quality-quarterly',
      name: 'Quarterly Quality Metrics',
      type: 'quality',
      frequency: 'quarterly',
      format: 'pdf',
      recipients: ['compliance@hospital.com', 'quality.committee@hospital.com'],
      lastRun: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'paused',
      template: 'quality-comprehensive'
    }
  ]);

  const reportMetrics: ReportMetric[] = [
    { name: 'Total Reports Generated', value: 1247, change: 12.3, trend: 'up' },
    { name: 'Active Schedules', value: schedules.filter(s => s.status === 'active').length, change: 0, trend: 'stable' },
    { name: 'Recipients Reached', value: '89 users', change: 8.7, trend: 'up' },
    { name: 'Delivery Success Rate', value: '98.2%', change: 1.2, trend: 'up' },
  ];

  const generateInstantReport = async (type: string) => {
    setIsGeneratingReport(true);
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const reportData = {
      timestamp: new Date().toISOString(),
      type,
      metrics: reportMetrics,
      schedules: schedules.filter(s => s.type === type || type === 'all'),
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
    a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
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

  const sendTestReport = async (schedule: ReportSchedule) => {
    // Simulate sending test report
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`Test report sent to: ${schedule.recipients.join(', ')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-steel-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-steel-900 mb-2">Automated Reporting System</h2>
            <p className="text-steel-600">Schedule, generate, and distribute comprehensive analytics reports</p>
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
              {isGeneratingReport ? 'Generating...' : 'Generate Report'}
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {reportMetrics.map((metric, index) => (
              <div key={index} className="bg-white p-4 rounded-xl border border-steel-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-steel-600 font-medium">{metric.name}</div>
                    <div className="text-2xl font-bold text-steel-900">{metric.value}</div>
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

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h3 className="text-xl font-bold text-steel-900 mb-4">Quick Report Generation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { type: 'gdmt', label: 'GDMT Performance', icon: Target, description: 'Current 4-pillar therapy metrics' },
                { type: 'provider', label: 'Provider Analytics', icon: Users, description: 'Individual physician performance' },
                { type: 'quality', label: 'Quality Metrics', icon: Activity, description: 'Core quality indicators' },
                { type: 'executive', label: 'Executive Summary', icon: TrendingUp, description: 'High-level strategic insights' }
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
                      <IconComponent className="w-5 h-5 text-medical-blue-600" />
                      <span className="font-semibold text-steel-900">{reportType.label}</span>
                    </div>
                    <p className="text-sm text-steel-600">{reportType.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <h3 className="text-xl font-bold text-steel-900 mb-4">Recent Report Activity</h3>
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
        </div>
      )}

      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-steel-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-steel-900">Report Schedules</h3>
              <button 
                className="px-4 py-2 bg-medical-blue-500 text-white rounded-lg hover:bg-medical-blue-600 transition-colors"
                onClick={() => {
                  console.log('Opening Create New Schedule modal');
                  // TODO: Implement Create New Schedule modal
                  alert('Create New Schedule - Schedule creation wizard will open');
                }}
              >
                Create New Schedule
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
                      <button 
                        className="p-2 text-steel-600 hover:text-steel-800 hover:bg-steel-50 rounded-lg transition-colors"
                        onClick={() => {
                          console.log('Opening schedule settings for:', schedule.name);
                          // TODO: Implement schedule settings modal
                          alert(`Schedule Settings - Configure settings for ${schedule.name}`);
                        }}
                      >
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
          <h3 className="text-xl font-bold text-steel-900 mb-4">Report Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'standard-gdmt', name: 'Standard GDMT Report', description: 'Comprehensive 4-pillar therapy analysis' },
              { id: 'executive-summary', name: 'Executive Summary', description: 'High-level KPIs and strategic insights' },
              { id: 'provider-detail', name: 'Provider Detail Report', description: 'Individual physician performance metrics' },
              { id: 'quality-comprehensive', name: 'Quality Metrics Report', description: 'Core and supplemental quality indicators' },
              { id: 'custom-dashboard', name: 'Custom Dashboard', description: 'Configurable metrics and visualizations' },
              { id: 'financial-impact', name: 'Financial Impact Analysis', description: 'ROI and cost-effectiveness metrics' }
            ].map((template) => (
              <div 
                key={template.id} 
                className="border border-steel-200 rounded-lg p-4 hover:border-medical-blue-300 hover:bg-medical-blue-50 transition-all cursor-pointer"
                onClick={() => {
                  console.log('Opening template:', template.name);
                  // TODO: Implement template editor/preview
                  alert(`Template Editor - ${template.name} template editor will open`);
                }}
              >
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
          <h3 className="text-xl font-bold text-steel-900 mb-4">Report History</h3>
          <div className="space-y-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-steel-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-steel-400" />
                  <div>
                    <div className="font-medium text-steel-900">
                      {['Weekly GDMT Performance Report', 'Monthly Executive Dashboard', 'Daily Provider Metrics'][i % 3]}
                    </div>
                    <div className="text-sm text-steel-600">
                      Generated {i + 1} day{i === 0 ? '' : 's'} ago • Sent to {Math.floor(Math.random() * 5) + 2} recipients
                    </div>
                  </div>
                </div>
                <button 
                  className="p-2 text-steel-600 hover:text-medical-blue-600 hover:bg-medical-blue-50 rounded-lg transition-colors"
                  onClick={() => {
                    const reportName = ['Weekly GDMT Performance Report', 'Monthly Executive Dashboard', 'Daily Provider Metrics'][i % 3];
                    console.log('Downloading report:', reportName);
                    // TODO: Implement report download functionality
                    alert(`Download Report - ${reportName} will be downloaded`);
                  }}
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedReportingSystem;